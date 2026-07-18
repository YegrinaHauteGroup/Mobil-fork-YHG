"use client";

import "./editor.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { ResizableImage } from "./resizable-image";
import { SlashCommand } from "./slash-command";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { ShareDialog } from "@/components/share-dialog";
import {
  saveDocument,
  deleteDocument,
  setDocumentPublic,
  shareDocument,
  revokeDocumentShare,
  listDocumentShares,
  exportDocument,
  type DocExportFormat,
} from "../actions";
import { downloadBase64File } from "@/lib/download-file";
import { useWorkspace } from "../../workspace/workspace-context";
import { ContributorBadges } from "../../contributors/contributor-badges";

type SaveState = "saved" | "dirty" | "saving";
const AUTOSAVE_MS = 1200;
const MEDIA_BUCKET = "media";
const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // 50MB

// 동영상 임베드용 커스텀 노드 (Tiptap 코어에 video 노드가 없어 직접 정의)
const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, { controls: "true", class: "doc-video" }),
    ];
  },
});

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
  const { renameTab } = useWorkspace();
  const supabase = createClient();
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pub, setPub] = useState(isPublic);
  const [showShare, setShowShare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onExport = async (format: DocExportFormat) => {
    setShowExport(false);
    setExporting(true);
    setError(null);
    const res = await exportDocument(docId, format);
    if ("error" in res) setError(res.error);
    else downloadBase64File(res.fileName, res.mimeType, res.base64);
    setExporting(false);
  };

  const editor = useEditor({
    editable: canEdit,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } }),
      ResizableImage.configure({ HTMLAttributes: { class: "doc-media" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Video,
      Placeholder.configure({ placeholder: "Write your idea here… (type / for commands)" }),
      SlashCommand,
    ],
    content: isTiptapDoc(initialContent) ? (initialContent as object) : "",
    editorProps: { attributes: { class: "ProseMirror" } },
    onUpdate: () => {
      if (canEdit) markDirty();
    },
  });

  const persist = useCallback(
    async (nextTitle: string, ed: Editor | null) => {
      if (!ed) return;
      setSaveState("saving");
      const res = await saveDocument(docId, nextTitle, ed.getJSON() as Json);
      if (res.ok) setSaveState("saved");
      else {
        setSaveState("dirty");
        setError(res.error);
      }
    },
    [docId]
  );

  const titleRef = useRef(title);
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const markDirty = useCallback(() => {
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      persist(titleRef.current, editorRef.current);
    }, AUTOSAVE_MS);
  }, [persist]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Cmd/Ctrl+S 로 즉시 저장
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!canEdit) return;
        if (timer.current) clearTimeout(timer.current);
        persist(titleRef.current, editorRef.current);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [canEdit, persist]);

  const manualSave = () => {
    if (timer.current) clearTimeout(timer.current);
    persist(title, editor);
  };

  const onTitle = (v: string) => {
    setTitle(v);
    // 제목을 바꾸면 열린 탭 이름도 즉시 갱신한다.
    renameTab("document", docId, v.trim() || "Untitled");
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
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const res = await deleteDocument(docId);
    if (res.ok) router.push("/documents");
    else setError(res.error);
  };

  // 미디어(이미지/동영상) 업로드 → 공개 media 버킷 → URL 삽입
  const uploadMedia = useCallback(
    async (file: File, kind: "image" | "video") => {
      if (!editor) return;
      if (file.size > MAX_MEDIA_BYTES) {
        setError("File exceeds 50MB limit.");
        return;
      }
      setError(null);
      setUploadingMedia(true);
      try {
        const id = crypto.randomUUID();
        const safe = file.name.replace(/[^\w.\-() ]+/g, "_");
        const path = `${myShareId}/${id}/${safe}`;
        const { error: upErr } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(path, file, { contentType: file.type || undefined });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
        const url = data.publicUrl;
        if (kind === "image") {
          editor.chain().focus().setImage({ src: url }).run();
        } else {
          editor.chain().focus().insertContent({ type: "video", attrs: { src: url } }).run();
        }
      } catch {
        setError("Media upload failed.");
      } finally {
        setUploadingMedia(false);
      }
    },
    [editor, supabase, myShareId]
  );

  const stateLabel =
    saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved" : "Saved";

  return (
    <div className="editor-shell">
      <div className="editor-bar">
        <input
          className="editor-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Untitled"
          disabled={!canEdit}
        />
        <div className="row" style={{ gap: 10 }}>
          <ContributorBadges kind="document" id={docId} refreshToken={saveState} />
          <span
            className={`save-state ${
              saveState === "dirty" ? "dirty" : saveState === "saved" ? "saved" : ""
            }`}
          >
            ● {uploadingMedia ? "Uploading…" : stateLabel}
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
                <button className="acct-item" onClick={() => onExport("txt")}>Plain text (.txt)</button>
                <button className="acct-item" onClick={() => onExport("docx")}>Word (.docx)</button>
                <button className="acct-item" onClick={() => onExport("pdf")}>PDF (.pdf)</button>
                <button className="acct-item" onClick={() => onExport("hwpx")}>한글 (.hwpx)</button>
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

      {canEdit && editor && (
        <Toolbar editor={editor} onUploadMedia={uploadMedia} />
      )}

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

function Toolbar({
  editor,
  onUploadMedia,
}: {
  editor: Editor;
  onUploadMedia: (file: File, kind: "image" | "video") => void;
}) {
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const btn = (active: boolean, extra = "") => `tool ${extra} ${active ? "on" : ""}`;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="toolbar">
      <button className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</button>
      <button className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</button>
      <button className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</button>
      <span className="tool-sep" />
      <button className={btn(editor.isActive("bold"), "strong")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">B</button>
      <button className={btn(editor.isActive("italic"), "em")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">I</button>
      <button className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline" style={{ textDecoration: "underline" }}>U</button>
      <button className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" style={{ textDecoration: "line-through" }}>S</button>
      <button className={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">{"</>"}</button>

      {/* text color */}
      <label className="tool-color" title="Text color">
        A
        <span className="tool-swatch" style={{ background: (editor.getAttributes("textStyle").color as string) || "var(--text-1)" }} />
        <input type="color" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
      </label>
      {/* highlight color */}
      <label className="tool-color" title="Highlight">
        ✎
        <span className="tool-swatch" style={{ background: (editor.getAttributes("highlight").color as string) || "var(--warn)" }} />
        <input type="color" defaultValue="#c9922e" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
      </label>
      <button className="tool" onClick={() => editor.chain().focus().unsetColor().unsetHighlight().run()} title="Clear color/highlight">⌫</button>

      <span className="tool-sep" />
      <button className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">•</button>
      <button className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1.</button>
      <button className={btn(editor.isActive("taskList"))} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist">☑</button>
      <button className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">❝</button>
      <button className={btn(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">{"{ }"}</button>

      <span className="tool-sep" />
      <button className={btn(editor.isActive("link"))} onClick={setLink} title="Link">🔗</button>
      <button className="tool" onClick={() => imgRef.current?.click()} title="Insert image">🖼</button>
      <button className="tool" onClick={() => vidRef.current?.click()} title="Insert video">🎬</button>
      <button className="tool" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">―</button>

      <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadMedia(f, "image"); e.target.value = ""; }} />
      <input ref={vidRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadMedia(f, "video"); e.target.value = ""; }} />
    </div>
  );
}
