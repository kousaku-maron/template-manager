import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragCancelEvent,
  type CollisionDetection,
  closestCenter,
  getFirstCollision,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { CardDetailPanel } from "../components/CardDetailPanel";
import { CardEditor } from "../components/CardEditor";
import { DroppableColumn } from "../components/DroppableColumn";
import { SortableCard } from "../components/SortableCard";
import {
  type Card,
  type CardPatch,
  type CardStatus,
  fetchCards,
  request,
  setSessionToken,
} from "../lib/api";

const STATUSES: { key: CardStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

function isColumnId(id: string): id is CardStatus {
  return STATUSES.some((s) => s.key === id);
}

function getSortedCardsByStatus(cards: Card[], status: CardStatus): Card[] {
  return cards.filter((card) => card.status === status).sort((a, b) => a.sortOrder - b.sortOrder);
}

function projectCardsForDrag(
  baseCards: Card[],
  activeId: string,
  overId: string,
  isBelowOverItem: boolean,
): Card[] | null {
  const movedCard = baseCards.find((c) => c.id === activeId);
  if (!movedCard) return null;

  let targetStatus: CardStatus | null = null;
  if (isColumnId(overId)) {
    targetStatus = overId;
  } else {
    const overCard = baseCards.find((c) => c.id === overId);
    if (!overCard) return null;
    targetStatus = overCard.status;
  }

  if (!targetStatus) return null;
  if (movedCard.status === targetStatus && activeId === overId) {
    return baseCards;
  }

  if (movedCard.status === targetStatus && !isColumnId(overId)) {
    const sameColumnCards = getSortedCardsByStatus(baseCards, targetStatus);
    const activeIndex = sameColumnCards.findIndex((c) => c.id === activeId);
    const overIndex = sameColumnCards.findIndex((c) => c.id === overId);

    if (activeIndex === -1 || overIndex === -1) return baseCards;

    const reordered = arrayMove(sameColumnCards, activeIndex, overIndex);
    const updates = new Map<string, { status: CardStatus; sortOrder: number }>();
    reordered.forEach((card, index) => {
      updates.set(card.id, { status: targetStatus, sortOrder: index });
    });

    let changed = false;
    const nextCards = baseCards.map((card) => {
      const updated = updates.get(card.id);
      if (!updated) return card;
      if (card.status === updated.status && card.sortOrder === updated.sortOrder) {
        return card;
      }
      changed = true;
      return { ...card, status: updated.status, sortOrder: updated.sortOrder };
    });

    return changed ? nextCards : baseCards;
  }

  const targetCards = getSortedCardsByStatus(baseCards, targetStatus).filter((c) => c.id !== activeId);

  let insertIndex: number;
  if (isColumnId(overId)) {
    insertIndex = targetCards.length;
  } else {
    const overIndex = targetCards.findIndex((c) => c.id === overId);
    if (overIndex === -1) {
      insertIndex = targetCards.length;
    } else {
      insertIndex = overIndex + (isBelowOverItem ? 1 : 0);
    }
  }
  insertIndex = Math.max(0, Math.min(insertIndex, targetCards.length));

  const reorderedTargetCards = [...targetCards];
  reorderedTargetCards.splice(insertIndex, 0, { ...movedCard, status: targetStatus });

  const updates = new Map<string, { status: CardStatus; sortOrder: number }>();
  reorderedTargetCards.forEach((card, index) => {
    updates.set(card.id, { status: targetStatus, sortOrder: index });
  });

  if (movedCard.status !== targetStatus) {
    const sourceCards = getSortedCardsByStatus(baseCards, movedCard.status).filter((c) => c.id !== activeId);
    sourceCards.forEach((card, index) => {
      updates.set(card.id, { status: movedCard.status, sortOrder: index });
    });
  }

  let changed = false;
  const nextCards = baseCards.map((card) => {
    const updated = updates.get(card.id);
    if (!updated) return card;
    if (card.status === updated.status && card.sortOrder === updated.sortOrder) {
      return card;
    }
    changed = true;
    return { ...card, status: updated.status, sortOrder: updated.sortOrder };
  });

  return changed ? nextCards : baseCards;
}

function ColumnComposer(props: {
  status: CardStatus;
  onSubmit: (title: string, description: string, status: CardStatus) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (title.trim().length === 0) return;
    setSubmitting(true);
    try {
      await props.onSubmit(title.trim(), description, props.status);
      setTitle("");
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="column-composer" onSubmit={handleSubmit}>
      <input
        placeholder="Card title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        required
        autoFocus
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <div className="column-composer-actions">
        <button type="submit" disabled={submitting || title.trim().length === 0}>Add</button>
        <button type="button" className="ghost" onClick={props.onClose}>Cancel</button>
      </div>
    </form>
  );
}

export function BoardRoute() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [dragPreviewCards, setDragPreviewCards] = useState<Card[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [composerColumn, setComposerColumn] = useState<CardStatus | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const dragSourceStatusRef = useRef<CardStatus | null>(null);
  const lastOverIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  async function loadCards(): Promise<void> {
    setCards(await fetchCards());
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadCards();
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Failed to load cards");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Keep selectedCard in sync with cards list after reload
  useEffect(() => {
    if (selectedCard) {
      const updated = cards.find((c) => c.id === selectedCard.id);
      if (updated) {
        setSelectedCard(updated);
      } else {
        setSelectedCard(null);
      }
    }
  }, [cards]);

  const cardsForRender = dragPreviewCards ?? cards;

  const collisionDetectionStrategy = useCallback<CollisionDetection>(
    (args) => {
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");

      if (overId) {
        const overIdString = String(overId);

        if (isColumnId(overIdString)) {
          const containerCards = getSortedCardsByStatus(cardsForRender, overIdString);

          if (containerCards.length > 0) {
            const closestCard = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter((container) =>
                containerCards.some((card) => card.id === String(container.id))
              ),
            });
            const closestCardId = closestCard[0]?.id;
            if (closestCardId) {
              overId = closestCardId;
            }
          }
        }

        lastOverIdRef.current = String(overId);
        return [{ id: overId }];
      }

      if (lastOverIdRef.current) {
        return [{ id: lastOverIdRef.current }];
      }

      return [];
    },
    [cardsForRender]
  );

  const columns = useMemo(() => {
    return {
      backlog: cardsForRender.filter((card) => card.status === "backlog").sort((a, b) => a.sortOrder - b.sortOrder),
      todo: cardsForRender.filter((card) => card.status === "todo").sort((a, b) => a.sortOrder - b.sortOrder),
      in_progress: cardsForRender.filter((card) => card.status === "in_progress").sort((a, b) => a.sortOrder - b.sortOrder),
      done: cardsForRender.filter((card) => card.status === "done").sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }, [cardsForRender]);

  async function handleSignOut(): Promise<void> {
    setLoading(true);
    try {
      await request("/api/auth/sign-out", { method: "POST", body: "{}" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to sign out");
      setLoading(false);
      return;
    }
    await setSessionToken(null);
    await navigate({ to: "/login" });
  }

  async function createCard(title: string, description: string, status: CardStatus): Promise<void> {
    const nextOrder = columns[status].length;
    try {
      await request<{ card: Card }>("/api/cards", {
        method: "POST",
        body: JSON.stringify({ title, description, status, sortOrder: nextOrder }),
      });
      setComposerColumn(null);
      await loadCards();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create card");
    }
  }

  async function updateCard(id: string, patch: CardPatch): Promise<void> {
    const existing = cards.find((card) => card.id === id);
    if (!existing) return;

    const nextPatch = { ...patch };
    if (patch.status && patch.status !== existing.status && typeof patch.sortOrder !== "number") {
      nextPatch.sortOrder = columns[patch.status].length;
    }

    try {
      await request<{ card: Card }>(`/api/cards/${id}`, {
        method: "PATCH",
        body: JSON.stringify(nextPatch),
      });
      await loadCards();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update card");
      throw error;
    }
  }

  async function deleteCard(id: string): Promise<void> {
    try {
      await request<{ ok: boolean }>(`/api/cards/${id}`, { method: "DELETE" });
      await loadCards();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete card");
      throw error;
    }
  }

  // --- Drag & Drop ---

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    dragSourceStatusRef.current = card?.status ?? null;
    lastOverIdRef.current = null;
    setActiveCard(card ?? null);
    setDragPreviewCards(null);
  }

  function handleDragCancel(_event: DragCancelEvent) {
    dragSourceStatusRef.current = null;
    lastOverIdRef.current = null;
    setActiveCard(null);
    setDragPreviewCards(null);
  }

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      const isBelowOverItem =
        !!active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height / 2;

      setDragPreviewCards((prevPreview) => {
        const baseCards = prevPreview ?? cards;
        const nextCards = projectCardsForDrag(baseCards, activeId, overId, isBelowOverItem);
        if (!nextCards) return prevPreview;
        return nextCards === baseCards ? prevPreview : nextCards;
      });
    },
    [cards]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const sourceStatusAtStart = dragSourceStatusRef.current;
      dragSourceStatusRef.current = null;
      const { active, over } = event;
      if (!over) {
        lastOverIdRef.current = null;
        setDragPreviewCards(null);
        setActiveCard(null);
        return;
      }
      const activeId = active.id as string;
      const overId = over?.id as string | undefined;
      const isBelowOverItem =
        !!over &&
        !!active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height / 2;

      const projectedFromCurrent =
        overId
          ? projectCardsForDrag(cards, activeId, overId, isBelowOverItem)
          : null;
      const workingCards = dragPreviewCards ?? projectedFromCurrent ?? cards;
      lastOverIdRef.current = null;
      setDragPreviewCards(null);
      setActiveCard(null);
      if (!sourceStatusAtStart) return;

      const movedCardBefore = cards.find((c) => c.id === activeId);
      const movedCardAfter = workingCards.find((c) => c.id === activeId);
      if (!movedCardBefore || !movedCardAfter) return;

      const statusesToSync =
        sourceStatusAtStart === movedCardAfter.status
          ? [sourceStatusAtStart]
          : [sourceStatusAtStart, movedCardAfter.status];

      const items = statusesToSync.flatMap((status) =>
        getSortedCardsByStatus(workingCards, status).map((card, index) => ({
          id: card.id,
          status,
          sortOrder: index,
        }))
      );

      const currentMap = new Map(cards.map((card) => [card.id, card]));
      const changed = items.some((item) => {
        const current = currentMap.get(item.id);
        return !current || current.status !== item.status || current.sortOrder !== item.sortOrder;
      });
      if (!changed) return;

      setCards(workingCards);

      // Persist to backend
      try {
        await request("/api/reorder", {
          method: "POST",
          body: JSON.stringify({ items }),
        });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to reorder");
        await loadCards(); // Rollback on failure
      }
    },
    [cards, dragPreviewCards]
  );

  if (loading && cards.length === 0) {
    return (
      <div className="app-layout">
        <main className="main-content">
          <p style={{ padding: "2rem", color: "#666" }}>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* ---- Sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <span className="sidebar-brand-icon">K</span>
            <span className="sidebar-brand-text">Kanban</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className="sidebar-nav-item active"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              <span>Board</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button className="sidebar-signout" onClick={handleSignOut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ---- Main Content ---- */}
      <main className="main-content">
        <header className="board-header">
          <div className="board-header-left">
            <h1>Board</h1>
            <span className="board-header-count">{cards.length} issues</span>
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <section className="board">
            {STATUSES.map(({ key, label }) => (
              <DroppableColumn key={key} id={key}>
                <div className="column-header">
                  <div className="column-header-left">
                    <h2>{label}</h2>
                    <span className="column-count">{columns[key].length}</span>
                  </div>
                  <button
                    className="column-add-btn"
                    onClick={() => setComposerColumn(composerColumn === key ? null : key)}
                    aria-label={`Add card to ${label}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                </div>
                <SortableContext
                  items={columns[key].map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="column-cards">
                    {composerColumn === key && (
                      <ColumnComposer
                        status={key}
                        onSubmit={createCard}
                        onClose={() => setComposerColumn(null)}
                      />
                    )}
                    {columns[key].map((card) => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        onClick={setSelectedCard}
                        isDragOverlay={false}
                      />
                    ))}
                    {columns[key].length === 0 && composerColumn !== key && (
                      <p className="empty">No cards</p>
                    )}
                  </div>
                </SortableContext>
              </DroppableColumn>
            ))}
          </section>

          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <CardEditor card={activeCard} onClick={() => {}} isDragOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>

        {message && (
          <div className="toast" onClick={() => setMessage("")}>
            {message}
          </div>
        )}
      </main>

      {/* ---- Detail Panel ---- */}
      {selectedCard && (
        <CardDetailPanel
          card={selectedCard}
          onSave={updateCard}
          onDelete={deleteCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
