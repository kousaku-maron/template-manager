import { FormEvent, useEffect, useRef, useState } from "react";
import type { Card, CardPatch, CardStatus } from "../lib/api";

const STATUS_OPTIONS: { key: CardStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export function CardDetailPanel(props: {
  card: Card;
  onSave: (id: string, patch: CardPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const { card, onSave, onDelete, onClose } = props;
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [status, setStatus] = useState<CardStatus>(card.status);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description);
    setStatus(card.status);
    setErrorMessage("");
  }, [card.id, card.title, card.description, card.status]);

  const dirty = title !== card.title || description !== card.description || status !== card.status;

  function animateClose() {
    setClosing(true);
    setTimeout(onClose, 180);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!dirty || title.trim().length === 0) return;
    setSaving(true);
    setErrorMessage("");
    try {
      await onSave(card.id, { title, description, status });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setErrorMessage("");
    try {
      await onDelete(card.id);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete card");
    } finally {
      setSaving(false);
    }
  }

  const created = new Date(card.createdAt);
  const updated = new Date(card.updatedAt);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div
        className={`panel-overlay${closing ? " panel-overlay--closing" : ""}`}
        onClick={animateClose}
      />
      <div
        className={`detail-panel${closing ? " detail-panel--closing" : ""}`}
        ref={panelRef}
      >
        {/* Header */}
        <div className="detail-panel-header">
          <h2>Card Detail</h2>
          <button className="detail-panel-close" onClick={animateClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body */}
        <form className="detail-panel-body" onSubmit={handleSave}>
          <label className="detail-field">
            <span className="detail-label">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </label>

          <label className="detail-field">
            <span className="detail-label">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Add a description..."
            />
          </label>

          <label className="detail-field">
            <span className="detail-label">Status</span>
            <div className="detail-status-group">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`detail-status-btn detail-status-btn--${opt.key}${status === opt.key ? " active" : ""}`}
                  onClick={() => setStatus(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </label>

          <div className="detail-meta">
            <span>Created: {fmt(created)}</span>
            <span>Updated: {fmt(updated)}</span>
          </div>

          <div className="detail-panel-actions">
            <button type="submit" className="detail-save-btn" disabled={!dirty || saving || title.trim().length === 0}>
              Save Changes
            </button>
            <button type="button" className="detail-delete-btn" onClick={handleDelete} disabled={saving}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
              Delete
            </button>
          </div>
          {errorMessage && <p className="detail-error-message">{errorMessage}</p>}
        </form>
      </div>
    </>
  );
}
