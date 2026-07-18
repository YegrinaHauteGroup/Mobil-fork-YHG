import type { Json } from "@/lib/database.types";

type TTMark = { type: string; attrs?: Record<string, unknown> };
type TTNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TTNode[];
  text?: string;
  marks?: TTMark[];
};

function asDoc(content: Json): TTNode {
  if (
    content &&
    typeof content === "object" &&
    !Array.isArray(content) &&
    (content as TTNode).type === "doc"
  ) {
    return content as TTNode;
  }
  return { type: "doc", content: [] };
}

function textOf(node: TTNode): string {
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  return node.content.map(textOf).join("");
}

function hasMark(node: TTNode, type: string): boolean {
  return !!node.marks?.some((m) => m.type === type);
}

// ============================================================================
// Export: Tiptap JSON → plain text (.txt)
// ============================================================================
export function tiptapToPlainText(content: Json): string {
  const doc = asDoc(content);
  const blocks: string[] = [];

  function walkBlock(node: TTNode) {
    switch (node.type) {
      case "paragraph":
      case "heading":
        blocks.push(textOf(node));
        break;
      case "bulletList":
      case "orderedList":
        for (const item of node.content ?? []) {
          blocks.push(`• ${(item.content ?? []).map(textOf).join(" ")}`);
        }
        break;
      case "taskList":
        for (const item of node.content ?? []) {
          const checked = item.attrs?.checked ? "[x]" : "[ ]";
          blocks.push(`${checked} ${(item.content ?? []).map(textOf).join(" ")}`);
        }
        break;
      case "blockquote":
        for (const child of node.content ?? []) blocks.push(`> ${textOf(child)}`);
        break;
      case "codeBlock":
        blocks.push(textOf(node));
        break;
      case "horizontalRule":
        blocks.push("---");
        break;
      default:
        if (node.content) for (const child of node.content) walkBlock(child);
    }
  }

  for (const node of doc.content ?? []) walkBlock(node);
  return blocks.join("\n\n");
}

// ============================================================================
// Export: Tiptap JSON → Markdown (hwpx 변환의 중간 표현으로 사용)
// ============================================================================
function inlineMarkdown(node: TTNode): string {
  if (node.type === "text") {
    let t = node.text ?? "";
    if (hasMark(node, "code")) t = `\`${t}\``;
    if (hasMark(node, "bold")) t = `**${t}**`;
    if (hasMark(node, "italic")) t = `*${t}*`;
    return t;
  }
  return (node.content ?? []).map(inlineMarkdown).join("");
}

export function tiptapToMarkdown(content: Json): string {
  const doc = asDoc(content);
  const blocks: string[] = [];

  function walkBlock(node: TTNode) {
    switch (node.type) {
      case "heading": {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
        blocks.push(`${"#".repeat(level)} ${(node.content ?? []).map(inlineMarkdown).join("")}`);
        break;
      }
      case "paragraph":
        blocks.push((node.content ?? []).map(inlineMarkdown).join(""));
        break;
      case "bulletList":
        blocks.push(
          (node.content ?? [])
            .map((item) => `- ${(item.content ?? []).map((c) => inlineMarkdown(c)).join(" ")}`)
            .join("\n")
        );
        break;
      case "orderedList":
        blocks.push(
          (node.content ?? [])
            .map(
              (item, i) => `${i + 1}. ${(item.content ?? []).map((c) => inlineMarkdown(c)).join(" ")}`
            )
            .join("\n")
        );
        break;
      case "taskList":
        blocks.push(
          (node.content ?? [])
            .map(
              (item) =>
                `- [${item.attrs?.checked ? "x" : " "}] ${(item.content ?? [])
                  .map((c) => inlineMarkdown(c))
                  .join(" ")}`
            )
            .join("\n")
        );
        break;
      case "blockquote":
        blocks.push((node.content ?? []).map((c) => `> ${inlineMarkdown(c)}`).join("\n"));
        break;
      case "codeBlock":
        blocks.push(`\`\`\`\n${textOf(node)}\n\`\`\``);
        break;
      case "horizontalRule":
        blocks.push("---");
        break;
      default:
        if (node.content) for (const child of node.content) walkBlock(child);
    }
  }

  for (const node of doc.content ?? []) walkBlock(node);
  return blocks.join("\n\n");
}

// ============================================================================
// Import: 임의 텍스트/마크다운 → Tiptap JSON (제목/굵게/기울임/목록만 인식,
// 표는 원본 서식이 이 에디터 스키마에 없어 셀을 " | "로 합친 문단으로 저장한다)
// ============================================================================
// markdown 이스케이프(\., \*, \_ 등) 제거 — mammoth/hwp-convert 출력에 흔함.
function unescapeMarkdown(text: string): string {
  return text.replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1");
}

function parseInline(rawText: string): TTNode[] {
  const text = unescapeMarkdown(rawText);
  const nodes: TTNode[] = [];
  const re = /\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) nodes.push({ type: "text", text: m[1], marks: [{ type: "bold" }] });
    else if (m[2] !== undefined) nodes.push({ type: "text", text: m[2], marks: [{ type: "bold" }] });
    else if (m[3] !== undefined) nodes.push({ type: "text", text: m[3], marks: [{ type: "italic" }] });
    else if (m[4] !== undefined) nodes.push({ type: "text", text: m[4], marks: [{ type: "italic" }] });
    else if (m[5] !== undefined) nodes.push({ type: "text", text: m[5], marks: [{ type: "code" }] });
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push({ type: "text", text: text.slice(last) });
  return nodes.length ? nodes : [{ type: "text", text }];
}

export function markdownToTiptapDoc(markdown: string): Json {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const content: TTNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      content.push({ type: "paragraph", content: parseInline(para.join(" ").trim()) });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      content.push({
        type: list.ordered ? "orderedList" : "bulletList",
        content: list.items.map((t) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(t) }],
        })),
      });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    const tableRow = /^\|(.+)\|$/.exec(line.trim());

    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    if (heading) {
      flushPara();
      flushList();
      content.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: parseInline(heading[2]),
      });
      continue;
    }
    if (bullet) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    if (ordered) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }
    if (tableRow && !/^[-|\s:]+$/.test(tableRow[1])) {
      flushPara();
      flushList();
      const cells = tableRow[1]
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      content.push({ type: "paragraph", content: parseInline(cells.join("  |  ")) });
      continue;
    }
    if (tableRow) continue; // 구분선(---|---) 행은 건너뜀

    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();

  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "doc", content } as unknown as Json;
}

export function plainTextToTiptapDoc(text: string): Json {
  const content: TTNode[] = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => ({ type: "paragraph", content: [{ type: "text", text: block.replace(/\n/g, " ") }] }));
  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "doc", content } as unknown as Json;
}

// ============================================================================
// 확장자별 원본 바이트 → Tiptap JSON
// ============================================================================
export type ImportedDoc = { title: string; content: Json };

export async function importFileToTiptapDoc(
  fileName: string,
  bytes: Buffer
): Promise<ImportedDoc> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const title = fileName.replace(/\.[^./\\]+$/, "") || "Untitled";

  if (ext === "txt" || ext === "md" || ext === "markdown") {
    const text = bytes.toString("utf-8");
    return { title, content: ext === "txt" ? plainTextToTiptapDoc(text) : markdownToTiptapDoc(text) };
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    // mammoth 런타임에는 convertToMarkdown 이 있지만 패키지 타입 선언에는
    // 누락되어 있어(문서화 안 된 API) 안전하게 캐스팅해 호출한다.
    const convertToMarkdown = (
      mammoth as unknown as {
        convertToMarkdown: (input: { buffer: Buffer }) => Promise<{ value: string }>;
      }
    ).convertToMarkdown;
    const { value: markdown } = await convertToMarkdown({ buffer: bytes });
    return { title, content: markdownToTiptapDoc(markdown) };
  }

  if (ext === "hwpx") {
    const { HwpxReader } = await import("hwp-convert");
    const reader = new HwpxReader();
    await reader.loadFromArrayBuffer(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    );
    const markdown = await reader.extractMarkdown();
    return { title, content: markdownToTiptapDoc(markdown) };
  }

  if (ext === "hwp") {
    const { hwpToMarkdown } = await import("hwp-convert");
    const markdown = await hwpToMarkdown(new Uint8Array(bytes));
    return { title, content: markdownToTiptapDoc(markdown) };
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

// ============================================================================
// Export: Tiptap JSON → docx (Buffer)
// ============================================================================
export async function tiptapToDocxBuffer(content: Json, title: string): Promise<Buffer> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
  } = await import("docx");

  const doc = asDoc(content);
  const HEADING_MAP = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];

  function runsOf(node: TTNode): InstanceType<typeof TextRun>[] {
    if (node.type === "text") {
      return [
        new TextRun({
          text: node.text ?? "",
          bold: hasMark(node, "bold"),
          italics: hasMark(node, "italic"),
          underline: hasMark(node, "underline") ? {} : undefined,
          strike: hasMark(node, "strike"),
          font: hasMark(node, "code") ? "Courier New" : undefined,
        }),
      ];
    }
    return (node.content ?? []).flatMap(runsOf);
  }

  const paragraphs: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
  ];

  function walkBlock(node: TTNode) {
    switch (node.type) {
      case "heading": {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
        paragraphs.push(
          new Paragraph({ children: (node.content ?? []).flatMap(runsOf), heading: HEADING_MAP[level - 1] })
        );
        break;
      }
      case "paragraph":
        paragraphs.push(new Paragraph({ children: (node.content ?? []).flatMap(runsOf) }));
        break;
      case "bulletList":
        for (const item of node.content ?? []) {
          paragraphs.push(
            new Paragraph({ children: (item.content ?? []).flatMap(runsOf), bullet: { level: 0 } })
          );
        }
        break;
      case "orderedList":
        for (const item of node.content ?? []) {
          paragraphs.push(
            new Paragraph({
              children: (item.content ?? []).flatMap(runsOf),
              numbering: { reference: "mobil-numbered-list", level: 0 },
            })
          );
        }
        break;
      case "taskList":
        for (const item of node.content ?? []) {
          const prefix = item.attrs?.checked ? "☑ " : "☐ ";
          paragraphs.push(
            new Paragraph({ children: [new TextRun(prefix), ...(item.content ?? []).flatMap(runsOf)] })
          );
        }
        break;
      case "blockquote":
        for (const child of node.content ?? []) {
          paragraphs.push(new Paragraph({ children: runsOf(child), indent: { left: 480 } }));
        }
        break;
      case "codeBlock":
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: textOf(node), font: "Courier New" })] }));
        break;
      case "horizontalRule":
        paragraphs.push(new Paragraph({ text: "───────────" }));
        break;
      default:
        if (node.content) for (const child of node.content) walkBlock(child);
    }
  }

  for (const node of doc.content ?? []) walkBlock(node);

  const docx = new Document({
    numbering: {
      config: [
        {
          reference: "mobil-numbered-list",
          levels: [{ level: 0, format: "decimal" as const, text: "%1.", alignment: "start" as const }],
        },
      ],
    },
    sections: [{ children: paragraphs }],
  });

  return Packer.toBuffer(docx);
}

// ============================================================================
// Export: Tiptap JSON → pdf (기본 텍스트 흐름, 서식은 굵게/제목 크기 정도만 반영)
// ============================================================================
export async function tiptapToPdfBytes(content: Json, title: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  function wrap(text: string, useFont: typeof font, size: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const out: string[] = [];
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (useFont.widthOfTextAtSize(trial, size) > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = trial;
      }
    }
    if (line) out.push(line);
    return out;
  }

  function writeLine(text: string, size: number, useFont: typeof font, gap = 6) {
    for (const line of wrap(text, useFont, size)) {
      if (y < margin + size) newPage();
      page.drawText(line, { x: margin, y, size, font: useFont, color: rgb(0.1, 0.1, 0.12) });
      y -= size + gap;
    }
  }

  writeLine(title || "Untitled", 20, boldFont, 14);

  const doc = asDoc(content);
  function walkBlock(node: TTNode) {
    switch (node.type) {
      case "heading": {
        const level = Math.min(3, Math.max(1, Number(node.attrs?.level) || 1));
        writeLine(textOf(node), 16 - (level - 1) * 2, boldFont, 8);
        break;
      }
      case "paragraph":
        writeLine(textOf(node) || " ", 11, font, 10);
        break;
      case "bulletList":
        for (const item of node.content ?? []) writeLine(`•  ${textOf(item)}`, 11, font, 6);
        break;
      case "orderedList":
        (node.content ?? []).forEach((item, i) => writeLine(`${i + 1}.  ${textOf(item)}`, 11, font, 6));
        break;
      case "taskList":
        for (const item of node.content ?? [])
          writeLine(`${item.attrs?.checked ? "[x]" : "[ ]"}  ${textOf(item)}`, 11, font, 6);
        break;
      case "blockquote":
        for (const child of node.content ?? []) writeLine(`"  ${textOf(child)}`, 11, font, 6);
        break;
      case "codeBlock":
        writeLine(textOf(node), 10, font, 10);
        break;
      case "horizontalRule":
        y -= 6;
        break;
      default:
        if (node.content) for (const child of node.content) walkBlock(child);
    }
  }
  for (const node of doc.content ?? []) walkBlock(node);

  return pdfDoc.save();
}

// ============================================================================
// Export: Tiptap JSON → HWPX (hwp-convert 의 markdownToHwpx 경유)
// ============================================================================
export async function tiptapToHwpxBytes(content: Json, title: string): Promise<Uint8Array> {
  const { markdownToHwpx } = await import("hwp-convert");
  const markdown = `# ${title}\n\n${tiptapToMarkdown(content)}`;
  return markdownToHwpx(markdown, { title });
}
