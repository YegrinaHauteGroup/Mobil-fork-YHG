"use client";

import "@xyflow/react/dist/style.css";
import "./canvas.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import type { Json } from "@/lib/database.types";
import { ShareDialog } from "@/components/share-dialog";
import type { WorkspaceItem } from "../actions";
import {
  saveMindMap,
  deleteMindMap,
  setMindMapPublic,
  shareMindMap,
  revokeMindMapShare,
  listMindMapShares,
} from "../actions";

type SaveState = "saved" | "dirty" | "saving";
const AUTOSAVE_MS = 1200;

type NoteData = { kind: "note"; label: string };
type RefData = { kind: "file" | "code" | "document"; label: string; refId: string };

// ---- custom nodes ----
function NoteNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const d = data as unknown as NoteData;
  return (
    <div className={`mm-node mm-note ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <textarea
        className="nodrag"
        value={d.label}
        placeholder="Note…"
        onChange={(e) =>
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, label: e.target.value } } : n
            )
          )
        }
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function RefNode({ data, selected }: NodeProps) {
  const d = data as unknown as RefData;
  const href =
    d.kind === "code" ? `/code/${d.refId}` : d.kind === "document" ? `/documents/${d.refId}` : "/files";
  return (
    <div className={`mm-node mm-ref k-${d.kind} ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <span className="mm-kind">{d.kind}</span>
      <Link href={href} className="mm-label">
        {d.label}
      </Link>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { note: NoteNode, ref: RefNode };

function parseGraph(data: Json): { nodes: Node[]; edges: Edge[] } {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as { nodes?: Node[]; edges?: Edge[] };
    return { nodes: Array.isArray(o.nodes) ? o.nodes : [], edges: Array.isArray(o.edges) ? o.edges : [] };
  }
  return { nodes: [], edges: [] };
}

function Inner({
  mapId,
  initialTitle,
  initialData,
  canEdit,
  isOwner,
  isPublic,
  myShareId,
  items,
}: {
  mapId: string;
  initialTitle: string;
  initialData: Json;
  canEdit: boolean;
  isOwner: boolean;
  isPublic: boolean;
  myShareId: string;
  items: WorkspaceItem[];
}) {
  const router = useRouter();
  const initial = useMemo(() => parseGraph(initialData), [initialData]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pub, setPub] = useState(isPublic);
  const [showShare, setShowShare] = useState(false);
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skip = useRef(true);
  const stateRef = useRef({ title, nodes, edges });
  useEffect(() => {
    stateRef.current = { title, nodes, edges };
  }, [title, nodes, edges]);

  const persist = useCallback(async () => {
    setSaveState("saving");
    const { title: t, nodes: n, edges: e } = stateRef.current;
    const clean = {
      nodes: n.map((x) => ({ id: x.id, type: x.type, position: x.position, data: x.data })),
      edges: e.map((x) => ({ id: x.id, source: x.source, target: x.target })),
    };
    const res = await saveMindMap(mapId, t, clean as unknown as Json);
    if (res.ok) setSaveState("saved");
    else {
      setSaveState("dirty");
      setError(res.error);
    }
  }, [mapId]);

  const markDirty = useCallback(() => {
    if (!canEdit) return;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, AUTOSAVE_MS);
  }, [canEdit, persist]);

  // 그래프 변경 감지 → 자동 저장 (최초 마운트는 건너뜀)
  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    markDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, title]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onConnect = useCallback(
    (c: Connection) => {
      if (!canEdit) return;
      setEdges((eds) => addEdge({ ...c, id: crypto.randomUUID() }, eds));
    },
    [canEdit, setEdges]
  );

  const addNote = () => {
    const id = crypto.randomUUID();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "note",
        position: { x: 80 + Math.random() * 240, y: 80 + Math.random() * 160 },
        data: { kind: "note", label: "New note" },
      },
    ]);
  };

  const addReference = () => {
    if (!pick) return;
    const item = items.find((i) => `${i.kind}:${i.id}` === pick);
    if (!item) return;
    const id = crypto.randomUUID();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "ref",
        position: { x: 120 + Math.random() * 240, y: 120 + Math.random() * 160 },
        data: { kind: item.kind, label: item.label, refId: item.id },
      },
    ]);
    setPick("");
  };

  const manualSave = () => {
    if (timer.current) clearTimeout(timer.current);
    persist();
  };

  const togglePublic = async () => {
    const next = !pub;
    setPub(next);
    const res = await setMindMapPublic(mapId, next);
    if (!res.ok) {
      setPub(!next);
      setError(res.error);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this map? This cannot be undone.")) return;
    const res = await deleteMindMap(mapId);
    if (res.ok) router.push("/mindmap");
    else setError(res.error);
  };

  const stateLabel =
    saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved" : "Saved";

  return (
    <div className="mm-shell">
      <div className="mm-bar">
        <div className="mm-bar-left">
          <input
            className="mm-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled map"
            disabled={!canEdit}
          />
          {canEdit && (
            <>
              <button className="btn btn-sm" onClick={addNote}>
                + Note
              </button>
              <select
                className="mm-picker"
                value={pick}
                onChange={(e) => setPick(e.target.value)}
              >
                <option value="">Add reference…</option>
                {items.map((i) => (
                  <option key={`${i.kind}:${i.id}`} value={`${i.kind}:${i.id}`}>
                    [{i.kind}] {i.label}
                  </option>
                ))}
              </select>
              <button className="btn btn-sm" onClick={addReference} disabled={!pick}>
                Add
              </button>
            </>
          )}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span
            className={`save-state ${
              saveState === "dirty" ? "dirty" : saveState === "saved" ? "saved" : ""
            }`}
          >
            ● {stateLabel}
          </span>
          {isOwner && (
            <>
              <button className="btn btn-sm" onClick={togglePublic}>
                {pub ? "Public" : "Private"}
              </button>
              <button className="btn btn-sm" onClick={() => setShowShare(true)}>
                Share
              </button>
              <button className="btn btn-sm btn-danger" onClick={onDelete}>
                Delete
              </button>
            </>
          )}
          {canEdit && (
            <button
              className="btn btn-primary btn-sm"
              onClick={manualSave}
              disabled={saveState === "saving"}
            >
              Save
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 24px 0" }}>
          <div className="notice notice-error" style={{ margin: 0 }}>
            {error}
          </div>
        </div>
      )}

      <div className="mm-canvas">
        <ReactFlow
          colorMode="dark"
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable={canEdit}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} color="#20262e" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      {showShare && (
        <ShareDialog
          targetLabel={title || "Untitled map"}
          myShareId={myShareId}
          loadShares={() => listMindMapShares(mapId)}
          onShare={(rid, perm) => shareMindMap(mapId, rid, perm)}
          onRevoke={(pid) => revokeMindMapShare(pid)}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

export function MindMapCanvas(props: React.ComponentProps<typeof Inner>) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
