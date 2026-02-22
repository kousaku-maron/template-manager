import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

export function DroppableColumn(props: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: props.id });

  return (
    <article
      className={`column${isOver ? " column--over" : ""}`}
      ref={setNodeRef}
    >
      {props.children}
    </article>
  );
}
