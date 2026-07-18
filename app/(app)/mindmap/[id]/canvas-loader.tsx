"use client";

import dynamic from "next/dynamic";
import type { Json } from "@/lib/database.types";
import type { WorkspaceItem } from "../actions";

// React Flow 는 브라우저 전용 → ssr:false 로 지연 로딩.
const MindMapCanvas = dynamic(
  () => import("./canvas").then((m) => m.MindMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="empty" style={{ padding: 40 }}>
        Loading canvas…
      </div>
    ),
  }
);

export function MindMapCanvasLoader(props: {
  mapId: string;
  initialTitle: string;
  initialData: Json;
  canEdit: boolean;
  isOwner: boolean;
  isPublic: boolean;
  myShareId: string;
  items: WorkspaceItem[];
}) {
  return <MindMapCanvas {...props} />;
}
