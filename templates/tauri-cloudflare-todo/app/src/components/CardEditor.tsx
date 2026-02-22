import type { Card, CardStatus } from "../lib/api";

const STATUS_LABEL: Record<CardStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

export function CardEditor(props: {
  card: Card;
  onClick: (card: Card) => void;
  isDragOverlay?: boolean;
}) {
  const { card, onClick, isDragOverlay } = props;

  return (
    <article className={`card${isDragOverlay ? " card--drag-overlay" : ""}`} onClick={() => onClick(card)}>
      <span className="card-title">{card.title}</span>
      {card.description && (
        <span className="card-description">{card.description}</span>
      )}
      <div className="card-footer">
        <span className={`card-status card-status--${card.status}`}>
          {STATUS_LABEL[card.status]}
        </span>
      </div>
    </article>
  );
}
