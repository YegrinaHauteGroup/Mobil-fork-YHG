/**
 * 코드 에디터 언어 메타데이터. CodeMirror 를 import 하지 않으므로 서버/클라이언트
 * 어디서나 안전하게 사용할 수 있다(실제 언어 확장 매핑은 클라이언트 에디터에서).
 */
export type LangKey =
  | "plaintext"
  | "javascript"
  | "typescript"
  | "jsx"
  | "tsx"
  | "python"
  | "html"
  | "css"
  | "json"
  | "markdown"
  | "sql"
  | "cpp"
  | "java"
  | "rust"
  | "php"
  | "xml"
  | "yaml"
  | "go";

export const LANGUAGES: { key: LangKey; label: string }[] = [
  { key: "plaintext", label: "Plain Text" },
  { key: "javascript", label: "JavaScript" },
  { key: "typescript", label: "TypeScript" },
  { key: "jsx", label: "JavaScript (JSX)" },
  { key: "tsx", label: "TypeScript (TSX)" },
  { key: "python", label: "Python" },
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "json", label: "JSON" },
  { key: "markdown", label: "Markdown" },
  { key: "sql", label: "SQL" },
  { key: "cpp", label: "C / C++" },
  { key: "java", label: "Java" },
  { key: "rust", label: "Rust" },
  { key: "php", label: "PHP" },
  { key: "xml", label: "XML" },
  { key: "yaml", label: "YAML" },
  { key: "go", label: "Go" },
];

const EXT_MAP: Record<string, LangKey> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  py: "python",
  html: "html",
  htm: "html",
  css: "css",
  json: "json",
  md: "markdown",
  markdown: "markdown",
  sql: "sql",
  c: "cpp",
  h: "cpp",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  java: "java",
  rs: "rust",
  php: "php",
  xml: "xml",
  yml: "yaml",
  yaml: "yaml",
  go: "go",
};

/** 파일명 확장자로 언어를 추정한다. 알 수 없으면 plaintext. */
export function detectLanguage(filename: string): LangKey {
  const dot = filename.lastIndexOf(".");
  if (dot === -1 || dot === filename.length - 1) return "plaintext";
  const ext = filename.slice(dot + 1).toLowerCase();
  return EXT_MAP[ext] ?? "plaintext";
}

export function isLangKey(v: string): v is LangKey {
  return LANGUAGES.some((l) => l.key === v);
}
