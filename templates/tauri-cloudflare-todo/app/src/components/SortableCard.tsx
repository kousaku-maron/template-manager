import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "../lib/api";
import { CardEditor } from "./CardEditor";

export function SortableCard(props: {
  card: Card;
  onClick: (card: Card) => void;
  isDragOverlay: boolean;
}) {
  const { card, onClick } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardEditor card={card} onClick={onClick} />
    </div>
  );
}
