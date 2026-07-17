"use client";

import "./editor.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { Json } from "@/lib/database.types";
import { ShareDialog } from "@/components/share-dialog";
import {
  saveDocument,
  deleteDocument,
  setDocumentPublic,
  shareDocument,
  revokeDocumentShare,
  listDocumentShares,
} from "../actions";

type SaveState = "saved" | "dirty" | "saving";

const AUTOSAVE_MS = 1200;

function isTiptapDoc(content: Json): boolean {
  return (
    typeof content === "object" &&
    content !== null &&
    !Array.isArray(content) &&
    (content as { type?: string }).type === "doc"
  );
}

export function DocumentEditor({
  docId,
  initialTitle,
  initialContent,
  canEdit,
  isOwner,
  isPublic,
  myShareId,
}: {
  docId: string;
  initialTitle: string;
  initialContent: Json;
  canEdit: boolean;
  isOwner: boolean;
  isPublic: boolean;
  myShareId: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pub, setPub] = useState(isPublic);
  const [showShare, setShowShare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    editable: canEdit,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "여기에 아이디어를 작성하세요…" }),
    ],
    content: isTiptapDoc(initialContent) ? (initialContent as object) : "",
    editorProps: {
      attributes: { class: "ProseMirror" },
    },
    onUpdate: () => {
      if (canEdit) markDirty();
    },
  });

  const persist = useCallback(
    async (nextTitle: string, ed: Editor | null) => {
      if (!ed) return;
      setSaveState("saving");
      const res = await saveDocument(docId, nextTitle, ed.getJSON() as Json);
      if (res.ok) {
        setSaveState("saved");
      } else {
        setSaveState("dirty");
        setError(res.error);
      }
    },
    [docId]
  );

  const markDirty = useCallback(() => {
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      persist(titleRef.current, editorRef.current);
    }, AUTOSAVE_MS);
  }, [persist]);

  // 최신 값 참조용 ref (debounce 클로저 문제 방지)
  const titleRef = useRef(title);
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const manualSave = () => {
    if (timer.current) clearTimeout(timer.current);
    persist(title, editor);
  };

  const onTitle = (v: string) => {
    setTitle(v);
    if (canEdit) markDirty();
  };

  const togglePublic = async () => {
    const next = !pub;
    setPub(next);
    const res = await setDocumentPublic(docId, next);
    if (!res.ok) {
      setPub(!next);
      setError(res.error);
    }
  };

  const onDelete = async () => {
    if (!confirm("이 문서를 삭제할까요? 되돌릴 수 없습니다.")) return;
    const res = await deleteDocument(docId);
    if (res.ok) router.push("/documents");
    else setError(res.error);
  };

  const stateLabel =
    saveState === "saving"
      ? "저장 중…"
      : saveState === "dirty"
      ? "저장되지 않음"
      : "저장됨";

  return (
    <div className="editor-shell">
      <div className="editor-bar">
        <input
          className="editor-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="제목 없음"
          disabled={!canEdit}
        />
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
                {pub ? "공개됨" : "비공개"}
              </button>
              <button className="btn btn-sm" onClick={() => setShowShare(true)}>
                공유
              </button>
              <button className="btn btn-sm btn-danger" onClick={onDelete}>
                삭제
              </button>
            </>
          )}
          {canEdit && (
            <button
              className="btn btn-primary btn-sm"
              onClick={manualSave}
              disabled={saveState === "saving"}
            >
              저장
            </button>
          )}
        </div>
      </div>

      {canEdit && editor && <Toolbar editor={editor} />}

      {error && (
        <div style={{ padding: "10px 24px 0" }}>
          <div className="notice notice-error" style={{ margin: 0 }}>
            {error}
          </div>
        </div>
      )}

      <div className="editor-scroll">
        <div className="editor-doc">
          <EditorContent editor={editor} />
        </div>
      </div>

      {showShare && (
        <ShareDialog
          targetLabel={title || "Untitled"}
          myShareId={myShareId}
          loadShares={() => listDocumentShares(docId)}
          onShare={(rid, perm) => shareDocument(docId, rid, perm)}
          onRevoke={(pid) => revokeDocumentShare(pid)}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean, extra = "") =>
    `tool ${extra} ${active ? "on" : ""}`;

  return (
    <div className="toolbar">
      <button
        className={btn(editor.isActive("heading", { level: 1 }))}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        title="제목 1"
      >
        H1
      </button>
      <button
        className={btn(editor.isActive("heading", { level: 2 }))}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        title="제목 2"
      >
        H2
      </button>
      <button
        className={btn(editor.isActive("heading", { level: 3 }))}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        title="제목 3"
      >
        H3
      </button>
      <span className="tool-sep" />
      <button
        className={btn(editor.isActive("bold"), "strong")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="굵게"
      >
        B
      </button>
      <button
        className={btn(editor.isActive("italic"), "em")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="기울임"
      >
        I
      </button>
      <button
        className={btn(editor.isActive("strike"))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="취소선"
      >
        S
      </button>
      <button
        className={btn(editor.isActive("code"))}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="인라인 코드"
      >
        {"</>"}
      </button>
      <span className="tool-sep" />
      <button
        className={btn(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="글머리 목록"
      >
        •
      </button>
      <button
        className={btn(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="번호 목록"
      >
        1.
      </button>
      <button
        className={btn(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="인용"
      >
        ❝
      </button>
      <button
        className={btn(editor.isActive("codeBlock"))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="코드 블록"
      >
        { }
      </button>
      <span className="tool-sep" />
      <button
        className="tool"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="구분선"
      >
        ―
      </button>
    </div>
  );
}
