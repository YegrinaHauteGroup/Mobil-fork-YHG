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
  type NodeMouseHandler,
} from "@xyflow/react";
import type { Json } from "@/lib/database.types";
import { ShareDialog } from "@/components/share-dialog";
import type { WorkspaceItem, ReferencePreview } from "../actions";
import {
  saveMindMap,
  deleteMindMap,
  setMindMapPublic,
  shareMindMap,
  revokeMindMapShare,
  listMindMapShares,
  getReferencePreview,
} from "../actions";
import { useWorkspace } from "../../workspace/workspace-context";
import { formatBytes } from "@/lib/format";

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
  return (
    <div className={`mm-node mm-ref k-${d.kind} ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <span className="mm-kind">{d.kind}</span>
      <span className="mm-label">{d.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { note: NoteNode, ref: RefNode };

// ---- auto layout ----
// 외부 레이아웃 라이브러리(dagre 등) 없이 간단한 계층형(BFS) 레이아웃을 계산한다.
// 들어오는 간선이 없는 노드를 루트(0단)로 두고, 각 단계를 가로로 중앙 정렬해
// 배치한다. 고립 노드나 사이클에 걸린 노드는 마지막 단에 모아 배치한다.
const LAYOUT_NODE_W = 220;
const LAYOUT_NODE_H = 90;
const LAYOUT_GAP_X = 40;
const LAYOUT_GAP_Y = 110;

function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const incoming = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const n of nodes) {
    incoming.set(n.id, 0);
    children.set(n.id, []);
  }
  for (const e of edges) {
    if (!children.has(e.source) || !incoming.has(e.target)) continue;
    children.get(e.source)!.push(e.target);
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }

  const visited = new Set<string>();
  const levels: string[][] = [];
  let frontier = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
  if (frontier.length === 0) frontier = [nodes[0].id];

  while (frontier.length > 0) {
    const level = frontier.filter((id) => !visited.has(id));
    if (level.length === 0) break;
    levels.push(level);
    for (const id of level) visited.add(id);
    const nextSet = new Set<string>();
    for (const id of level) {
      for (const c of children.get(id) ?? []) {
        if (!visited.has(c)) nextSet.add(c);
      }
    }
    frontier = [...nextSet];
  }

  const leftover = nodes.map((n) => n.id).filter((id) => !visited.has(id));
  if (leftover.length > 0) levels.push(leftover);

  const positions = new Map<string, { x: number; y: number }>();
  levels.forEach((level, li) => {
    const rowWidth = level.length * LAYOUT_NODE_W + (level.length - 1) * LAYOUT_GAP_X;
    const startX = -rowWidth / 2;
    level.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * (LAYOUT_NODE_W + LAYOUT_GAP_X),
        y: li * (LAYOUT_NODE_H + LAYOUT_GAP_Y),
      });
    });
  });

  return nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }));
}

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
  const { openTab } = useWorkspace();
  const { fitView } = useReactFlow();
  const initial = useMemo(() => parseGraph(initialData), [initialData]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pub, setPub] = useState(isPublic);
  const [showShare, setShowShare] = useState(false);
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ data: RefData } | null>(null);
  const [previewInfo, setPreviewInfo] = useState<
    { status: "loading" } | { status: "ready"; data: ReferencePreview } | { status: "error" } | null
  >(null);

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

  // Cmd/Ctrl+S 로 즉시 저장
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!canEdit) return;
        if (timer.current) clearTimeout(timer.current);
        persist();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [canEdit, persist]);

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

  const runAutoLayout = useCallback(() => {
    if (!canEdit) return;
    setNodes((nds) => autoLayout(nds, edges));
    requestAnimationFrame(() => fitView({ duration: 300 }));
  }, [canEdit, edges, setNodes, fitView]);

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    if (node.type !== "ref") return;
    setPreview({ data: node.data as unknown as RefData });
  }, []);

  const closePreview = useCallback(() => {
    setPreview(null);
    setPreviewInfo(null);
  }, []);

  useEffect(() => {
    if (!preview) return;
    let cancelled = false;
    setPreviewInfo({ status: "loading" });
    getReferencePreview(preview.data.kind, preview.data.refId)
      .then((data) => {
        if (cancelled) return;
        setPreviewInfo(data ? { status: "ready", data } : { status: "error" });
      })
      .catch(() => {
        if (!cancelled) setPreviewInfo({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const openPreviewInTab = () => {
    if (!preview) return;
    const { kind, refId, label } = preview.data;
    if (kind === "file") return; // 파일은 탭 종류에 포함되지 않음 — /files 로 안내
    openTab(kind, refId, label);
    closePreview();
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
              <button
                className="btn btn-sm"
                onClick={runAutoLayout}
                disabled={nodes.length === 0}
                title="Arrange nodes into a top-down layered layout"
              >
                Auto layout
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
          onNodeClick={onNodeClick}
          onPaneClick={closePreview}
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

        {preview && (
          <div className="mm-preview">
            <div className="mm-preview-head">
              <span className="mm-preview-kind">{preview.data.kind}</span>
              <button className="mm-preview-close" onClick={closePreview} aria-label="Close preview">✕</button>
            </div>
            {previewInfo?.status === "loading" && (
              <div className="mm-preview-body muted">Loading…</div>
            )}
            {previewInfo?.status === "error" && (
              <div className="mm-preview-body muted">Not found or access denied.</div>
            )}
            {previewInfo?.status === "ready" && (
              <div className="mm-preview-body">
                <div className="mm-preview-title">{previewInfo.data.title}</div>
                {previewInfo.data.kind === "document" && (
                  <p className="mm-preview-snippet">
                    {previewInfo.data.snippet || "Empty document."}
                  </p>
                )}
                {previewInfo.data.kind === "code" && (
                  <>
                    <span className="mm-preview-meta">{previewInfo.data.language}</span>
                    <pre className="mm-preview-code">{previewInfo.data.snippet || "// Empty file"}</pre>
                  </>
                )}
                {previewInfo.data.kind === "file" && (
                  <span className="mm-preview-meta">
                    {previewInfo.data.mimeType || "Unknown type"} · {formatBytes(previewInfo.data.sizeBytes)}
                  </span>
                )}
              </div>
            )}
            <div className="mm-preview-actions">
              {preview.data.kind === "file" ? (
                <Link href="/files" className="btn btn-sm btn-primary" onClick={closePreview}>
                  Open in Repository
                </Link>
              ) : (
                <button className="btn btn-sm btn-primary" onClick={openPreviewInTab}>
                  Open
                </button>
              )}
            </div>
          </div>
        )}
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
