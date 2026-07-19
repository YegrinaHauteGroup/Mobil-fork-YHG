"use client";

import "mind-elixir/style.css";
import "./canvas.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MindElixir, { type MindElixirData, type MindElixirInstance, type NodeObj } from "mind-elixir";
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
import { ContributorBadges } from "../../contributors/contributor-badges";
import { formatBytes } from "@/lib/format";

type SaveState = "saved" | "dirty" | "saving";
const AUTOSAVE_MS = 1200;

type RefKind = "file" | "code" | "document";
type NodeMeta = { kind: "note" } | { kind: RefKind; refId: string };

// ---- 레거시(React Flow 시절) nodes/edges 그래프 → Mind Elixir 트리 변환 ----
// 자유 배치 그래프는 트리가 아닐 수 있으므로: 들어오는 간선이 없는 노드를
// 루트의 자식으로, BFS 로 도달한 간선만 트리 간선으로 채택하고, 남는 간선은
// arrow(화살표)로, 고립/사이클 노드는 루트에 그대로 매단다.
type LegacyNode = { id: string; type?: string; data?: { kind?: string; label?: string; refId?: string } };
type LegacyEdge = { id: string; source: string; target: string };

function isMindElixirData(data: unknown): data is MindElixirData {
  return !!data && typeof data === "object" && "nodeData" in (data as Record<string, unknown>);
}

function legacyNodeToObj(n: LegacyNode): NodeObj {
  const d = n.data ?? {};
  if (n.type === "ref") {
    return {
      id: n.id,
      topic: `[${d.kind}] ${d.label ?? ""}`,
      metadata: { kind: d.kind, refId: d.refId } as NodeMeta,
    };
  }
  return { id: n.id, topic: d.label || "Note", metadata: { kind: "note" } as NodeMeta };
}

function convertLegacyGraph(
  nodes: LegacyNode[],
  edges: LegacyEdge[],
  fallbackTitle: string
): MindElixirData {
  const children = new Map<string, string[]>();
  const incoming = new Map<string, number>();
  for (const n of nodes) {
    incoming.set(n.id, 0);
    children.set(n.id, []);
  }
  for (const e of edges) {
    if (!children.has(e.source) || !incoming.has(e.target)) continue;
    children.get(e.source)!.push(e.target);
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const treeEdges = new Set<string>();
  const buildTree = (id: string): NodeObj => {
    visited.add(id);
    const obj = legacyNodeToObj(byId.get(id)!);
    const kids = (children.get(id) ?? []).filter((c) => !visited.has(c));
    if (kids.length > 0) {
      obj.children = kids.map((c) => {
        treeEdges.add(`${id}->${c}`);
        return buildTree(c);
      });
    }
    return obj;
  };

  let roots = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
  if (roots.length === 0 && nodes.length > 0) roots = [nodes[0].id];

  const rootChildren = roots.filter((id) => !visited.has(id)).map(buildTree);
  const leftover = nodes.filter((n) => !visited.has(n.id)).map((n) => buildTree(n.id));

  const nodeData: NodeObj = {
    id: "root",
    topic: fallbackTitle || "Untitled map",
    children: [...rootChildren, ...leftover],
  };

  const arrows = edges
    .filter((e) => !treeEdges.has(`${e.source}->${e.target}`))
    .map((e) => ({ id: e.id, label: "", from: e.source, to: e.target }));

  return { nodeData, arrows };
}

function parseInitialData(data: Json, fallbackTitle: string): MindElixirData {
  if (isMindElixirData(data)) return data as MindElixirData;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as { nodes?: LegacyNode[]; edges?: LegacyEdge[] };
    if (Array.isArray(o.nodes)) {
      return convertLegacyGraph(o.nodes, Array.isArray(o.edges) ? o.edges : [], fallbackTitle);
    }
  }
  return { nodeData: { id: "root", topic: fallbackTitle || "Untitled map", children: [] } };
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
  const { openTab, renameTab } = useWorkspace();
  const containerRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<MindElixirInstance | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pub, setPub] = useState(isPublic);
  const [showShare, setShowShare] = useState(false);
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ kind: RefKind; refId: string; label: string } | null>(null);
  const [previewInfo, setPreviewInfo] = useState<
    { status: "loading" } | { status: "ready"; data: ReferencePreview } | { status: "error" } | null
  >(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const persist = useCallback(async () => {
    const me = meRef.current;
    if (!me) return;
    setSaveState("saving");
    const data = me.getData();
    const res = await saveMindMap(mapId, titleRef.current, data as unknown as Json);
    if (res.ok) setSaveState("saved");
    else {
      setSaveState("dirty");
      setError(res.error);
    }
  }, [mapId]);

  const markDirty = useCallback(() => {
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, AUTOSAVE_MS);
  }, [persist]);

  const manualSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    persist();
  }, [persist]);

  const closePreview = useCallback(() => {
    setPreview(null);
    setPreviewInfo(null);
  }, []);

  // Mind Elixir 인스턴스는 마운트 시 한 번만 생성한다(내부 상태를 자체적으로
  // 들고 있으므로 React state 로 노드/간선을 다시 렌더링하지 않는다).
  useEffect(() => {
    if (!containerRef.current) return;

    const me = new MindElixir({
      el: containerRef.current,
      direction: MindElixir.SIDE,
      editable: canEdit,
      contextMenu: canEdit,
      toolBar: true,
      keypress: canEdit,
      theme: MindElixir.DARK_THEME,
    }) as MindElixirInstance;
    me.init(parseInitialData(initialData, initialTitle));
    meRef.current = me;

    const onOperation = () => {
      if (canEdit) markDirty();
    };
    me.bus.addListener("operation", onOperation);

    const onDblClick = (e: MouseEvent) => {
      const topicEl = (e.target as HTMLElement).closest("me-tpc") as
        | (HTMLElement & { nodeObj?: NodeObj })
        | null;
      const meta = topicEl?.nodeObj?.metadata as NodeMeta | undefined;
      if (!meta || meta.kind === "note") return;
      setPreview({ kind: meta.kind, refId: meta.refId, label: topicEl!.nodeObj!.topic });
    };
    containerRef.current.addEventListener("dblclick", onDblClick);

    return () => {
      containerRef.current?.removeEventListener("dblclick", onDblClick);
      me.destroy();
      meRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Cmd/Ctrl+S 로 즉시 저장
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!canEdit) return;
        manualSave();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [canEdit, manualSave]);

  const addNote = () => {
    const me = meRef.current;
    if (!me || !canEdit) return;
    const parent = me.currentNode ?? me.findEle(me.nodeData.id);
    me.addChild(parent, {
      id: crypto.randomUUID(),
      topic: "New note",
      metadata: { kind: "note" } as NodeMeta,
    });
  };

  const addReference = () => {
    const me = meRef.current;
    if (!me || !canEdit || !pick) return;
    const item = items.find((i) => `${i.kind}:${i.id}` === pick);
    if (!item) return;
    const parent = me.currentNode ?? me.findEle(me.nodeData.id);
    me.addChild(parent, {
      id: crypto.randomUUID(),
      topic: `[${item.kind}] ${item.label}`,
      metadata: { kind: item.kind, refId: item.id } as NodeMeta,
    });
    setPick("");
  };

  const fitView = () => {
    meRef.current?.scaleFit();
  };

  useEffect(() => {
    if (!preview) return;
    let cancelled = false;
    setPreviewInfo({ status: "loading" });
    getReferencePreview(preview.kind, preview.refId)
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
    const { kind, refId, label } = preview;
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
            onChange={(e) => {
              setTitle(e.target.value);
              renameTab("mindmap", mapId, e.target.value.trim() || "Untitled map");
            }}
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
              <button className="btn btn-sm" onClick={fitView} title="Fit the map to the screen">
                Fit view
              </button>
            </>
          )}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <ContributorBadges kind="mindmap" id={mapId} refreshToken={saveState} />
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
        <div className="mm-fill">
          <div ref={containerRef} className="mm-mount" />
        </div>

        {preview && (
          <div className="mm-preview">
            <div className="mm-preview-head">
              <span className="mm-preview-kind">{preview.kind}</span>
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
              {preview.kind === "file" ? (
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
  return <Inner {...props} />;
}
