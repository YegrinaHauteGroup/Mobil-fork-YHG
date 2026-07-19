"use client";

// @fortune-sheet/react 는 스타일시트를 스스로 import 하지 않는다(타입 선언에만
// 존재, 런타임 JS 에는 없음) — 소비자가 직접 로드해야 한다.
import "@fortune-sheet/react/dist/index.css";
import "./spreadsheet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "../../workspace/workspace-context";
import { ContributorBadges } from "../../contributors/contributor-badges";
import { Workbook } from "@fortune-sheet/react";
import type { Sheet } from "@fortune-sheet/core";
import type { Json } from "@/lib/database.types";
import { ShareDialog } from "@/components/share-dialog";
import {
  saveSheet,
  deleteSheet,
  setSheetPublic,
  shareSheet,
  revokeSheetShare,
  listSheetShares,
  exportSheet,
  type SheetExportFormat,
} from "../actions";
import { downloadBase64File } from "@/lib/download-file";

type SaveState = "saved" | "dirty" | "saving";
const AUTOSAVE_MS = 1200;

function defaultSheets(): Sheet[] {
  return [{ name: "Sheet1", id: "sheet-01", celldata: [], row: 100, column: 30, status: 1 }];
}

function parseSheets(data: Json): Sheet[] {
  if (Array.isArray(data) && data.length > 0) return data as unknown as Sheet[];
  return defaultSheets();
}

export function Spreadsheet({
  sheetId,
  initialTitle,
  initialData,
  canEdit,
  isOwner,
  isPublic,
  myShareId,
}: {
  sheetId: string;
  initialTitle: string;
  initialData: Json;
  canEdit: boolean;
  isOwner: boolean;
  isPublic: boolean;
  myShareId: string;
}) {
  const router = useRouter();
  const { renameTab } = useWorkspace();
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pub, setPub] = useState(isPublic);
  const [showShare, setShowShare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onExport = async (format: SheetExportFormat) => {
    setShowExport(false);
    setExporting(true);
    setError(null);
    const res = await exportSheet(sheetId, format);
    if ("error" in res) setError(res.error);
    else downloadBase64File(res.fileName, res.mimeType, res.base64);
    setExporting(false);
  };
  const skipFirst = useRef(true);
  const titleRef = useRef(title);
  const sheetsRef = useRef<Sheet[]>(parseSheets(initialData));
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const persist = useCallback(async () => {
    setSaveState("saving");
    const res = await saveSheet(sheetId, titleRef.current, sheetsRef.current as unknown as Json);
    if (res.ok) setSaveState("saved");
    else {
      setSaveState("dirty");
      setError(res.error);
    }
  }, [sheetId]);

  const markDirty = useCallback(() => {
    if (!canEdit) return;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, AUTOSAVE_MS);
  }, [canEdit, persist]);

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

  // 시트 데이터(셀 편집·서식·탭 추가 등) 변경 시 자동 저장. 최초 마운트 콜백은
  // Workbook 초기화 과정에서도 발생하므로 건너뛴다.
  const onSheetChange = useCallback(
    (data: Sheet[]) => {
      sheetsRef.current = data;
      if (skipFirst.current) {
        skipFirst.current = false;
        return;
      }
      markDirty();
    },
    [markDirty]
  );

  const onTitle = (v: string) => {
    setTitle(v);
    renameTab("sheet", sheetId, v.trim() || "Untitled sheet");
    if (canEdit) markDirty();
  };

  const manualSave = () => {
    if (timer.current) clearTimeout(timer.current);
    persist();
  };

  const togglePublic = async () => {
    const next = !pub;
    setPub(next);
    const res = await setSheetPublic(sheetId, next);
    if (!res.ok) {
      setPub(!next);
      setError(res.error);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this sheet? This cannot be undone.")) return;
    const res = await deleteSheet(sheetId);
    if (res.ok) router.push("/sheets");
    else setError(res.error);
  };

  const stateLabel =
    saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved" : "Saved";

  return (
    <div className="sh-shell">
      <div className="sh-bar">
        <div className="sh-bar-left">
          <input
            className="sh-title"
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Untitled sheet"
            disabled={!canEdit}
          />
        </div>
        <div className="row" style={{ gap: 10 }}>
          <ContributorBadges kind="sheet" id={sheetId} refreshToken={saveState} />
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
          <div style={{ position: "relative" }}>
            <button
              className="btn btn-sm"
              onClick={() => setShowExport((v) => !v)}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
            {showExport && (
              <div className="acct-menu" style={{ top: 32, minWidth: 140 }}>
                <button className="acct-item" onClick={() => onExport("csv")}>CSV (.csv)</button>
                <button className="acct-item" onClick={() => onExport("xlsx")}>Excel (.xlsx)</button>
                <button className="acct-item" onClick={() => onExport("pdf")}>PDF (.pdf)</button>
              </div>
            )}
          </div>
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

      <div className="sh-canvas">
        <div className="sh-paper">
          <Workbook
            data={sheetsRef.current}
            onChange={onSheetChange}
            allowEdit={canEdit}
            lang="en"
            showToolbar={canEdit}
            showFormulaBar={canEdit}
          />
        </div>
      </div>

      {showShare && (
        <ShareDialog
          targetLabel={title || "Untitled sheet"}
          myShareId={myShareId}
          loadShares={() => listSheetShares(sheetId)}
          onShare={(rid, perm) => shareSheet(sheetId, rid, perm)}
          onRevoke={(pid) => revokeSheetShare(pid)}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
