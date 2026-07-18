import type { Json } from "@/lib/database.types";

// "#단어" — 유니코드 문자/숫자/밑줄 1~40자. 공백/구두점은 태그에 포함하지 않는다.
const TAG_RE = /#([\p{L}\p{N}_]{1,40})/gu;

/** 임의 텍스트에서 "#word" 토큰을 뽑아 소문자로 정규화한다(중복 제거). */
export function extractTagsFromText(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(TAG_RE)) {
    out.add(m[1].toLowerCase());
  }
  return [...out];
}

/** Tiptap JSON 문서의 모든 텍스트 노드를 이어붙인다(태그 추출용). */
export function extractTiptapPlainText(content: Json): string {
  const parts: string[] = [];

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === "text" && typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
    }
  }

  walk(content);
  return parts.join(" ");
}

/** 마인드맵 노드 라벨(제목 텍스트)을 이어붙인다(태그 추출용, best-effort). */
export function extractMindmapPlainText(data: Json): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  const nodes = (data as { nodes?: unknown[] }).nodes;
  if (!Array.isArray(nodes)) return "";

  const parts: string[] = [];
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    const node = n as { data?: { label?: string; title?: string } };
    if (typeof node.data?.label === "string") parts.push(node.data.label);
    if (typeof node.data?.title === "string") parts.push(node.data.title);
  }
  return parts.join(" ");
}
