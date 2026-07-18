export type FileCategory =
  | "image"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "code"
  | "archive"
  | "audio"
  | "video"
  | "other";

export const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  image: "Images",
  document: "Documents",
  spreadsheet: "Spreadsheets",
  presentation: "Presentations",
  code: "Code",
  archive: "Archives",
  audio: "Audio",
  video: "Video",
  other: "Other",
};

const EXT_MAP: Record<string, FileCategory> = {
  // image
  jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image",
  svg: "image", bmp: "image", ico: "image", avif: "image", heic: "image", tiff: "image",
  // document
  pdf: "document", doc: "document", docx: "document", txt: "document",
  md: "document", rtf: "document", odt: "document", hwp: "document", hwpx: "document",
  // spreadsheet
  xls: "spreadsheet", xlsx: "spreadsheet", csv: "spreadsheet", ods: "spreadsheet", tsv: "spreadsheet",
  // presentation
  ppt: "presentation", pptx: "presentation", odp: "presentation", key: "presentation",
  // archive
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive", bz2: "archive",
  // audio
  mp3: "audio", wav: "audio", flac: "audio", aac: "audio", ogg: "audio", m4a: "audio",
  // video
  mp4: "video", mov: "video", avi: "video", mkv: "video", webm: "video", m4v: "video",
  // code
  js: "code", jsx: "code", ts: "code", tsx: "code", py: "code", java: "code",
  c: "code", cpp: "code", h: "code", go: "code", rs: "code", rb: "code",
  php: "code", html: "code", css: "code", json: "code", xml: "code",
  yaml: "code", yml: "code", sql: "code", sh: "code", swift: "code", kt: "code",
};

/** 파일명 확장자로 분류한다(확장자가 없으면 mime type 대분류로 폴백). */
export function getFileCategory(fileName: string, mimeType: string | null): FileCategory {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext in EXT_MAP) return EXT_MAP[ext];

  const mime = mimeType ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf" || mime.startsWith("text/")) return "document";
  if (mime.includes("spreadsheet") || mime.includes("csv")) return "spreadsheet";
  if (mime.includes("presentation")) return "presentation";
  if (mime.includes("zip") || mime.includes("compressed")) return "archive";

  return "other";
}
