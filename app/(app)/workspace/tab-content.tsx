"use client";

import { useEffect, useState } from "react";
import type { TabKind } from "./workspace-context";
import { getDocumentForTab } from "../documents/actions";
import { getCodeFileForTab } from "../code/actions";
import { getSheetForTab } from "../sheets/actions";
import { getMindMapForTab } from "../mindmap/actions";
import { DocumentEditorLoader } from "../documents/[id]/editor-loader";
import { CodeEditor } from "../code/[id]/code-editor";
import { SpreadsheetLoader } from "../sheets/[id]/spreadsheet-loader";
import { MindMapCanvasLoader } from "../mindmap/[id]/canvas-loader";

export function TabContent({ kind, itemId }: { kind: TabKind; itemId: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | { status: "ready"; data: any }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    const load = async () => {
      try {
        let data: unknown = null;
        if (kind === "document") data = await getDocumentForTab(itemId);
        else if (kind === "code") data = await getCodeFileForTab(itemId);
        else if (kind === "sheet") data = await getSheetForTab(itemId);
        else if (kind === "mindmap") data = await getMindMapForTab(itemId);

        if (cancelled) return;
        if (!data) {
          setState({ status: "error", message: "Not found or access denied." });
          return;
        }
        setState({ status: "ready", data });
      } catch (e) {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "Failed to load.",
        });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [kind, itemId]);

  if (state.status === "loading") {
    return <div className="wk-loading">Loading…</div>;
  }
  if (state.status === "error") {
    return (
      <div className="wk-loading">
        <div className="notice notice-error" style={{ margin: 16 }}>
          {state.message}
        </div>
      </div>
    );
  }

  const d = state.data;
  if (kind === "document") {
    return (
      <DocumentEditorLoader
        docId={d.id}
        initialTitle={d.title}
        initialContent={d.content}
        canEdit={d.canEdit}
        isOwner={d.isOwner}
        isPublic={d.isPublic}
        myShareId={d.myShareId}
      />
    );
  }
  if (kind === "code") {
    return (
      <CodeEditor
        fileId={d.id}
        initialName={d.name}
        initialLanguage={d.language}
        initialContent={d.content}
        canEdit={d.canEdit}
        isOwner={d.isOwner}
        isPublic={d.isPublic}
        myShareId={d.myShareId}
      />
    );
  }
  if (kind === "sheet") {
    return (
      <SpreadsheetLoader
        sheetId={d.id}
        initialTitle={d.title}
        initialData={d.data}
        canEdit={d.canEdit}
        isOwner={d.isOwner}
        isPublic={d.isPublic}
        myShareId={d.myShareId}
      />
    );
  }
  if (kind === "mindmap") {
    return (
      <MindMapCanvasLoader
        mapId={d.id}
        initialTitle={d.title}
        initialData={d.data}
        canEdit={d.canEdit}
        isOwner={d.isOwner}
        isPublic={d.isPublic}
        myShareId={d.myShareId}
        items={d.items}
      />
    );
  }
  return null;
}
