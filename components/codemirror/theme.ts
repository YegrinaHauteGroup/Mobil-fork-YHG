import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/**
 * Mobil 다크 테마 — 블랙/다크그레이 기반. 구문 강조는 GitHub 다크 계열의
 * 채도를 낮춘 색을 사용하며 네온/글로우는 배제한다.
 */
export const mobilEditorTheme = EditorView.theme(
  {
    "&": {
      color: "#c3c8cf",
      backgroundColor: "#0e1116",
      fontSize: "13.5px",
      height: "100%",
    },
    ".cm-content": {
      fontFamily:
        '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
      caretColor: "#e6e8eb",
      padding: "12px 0",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#e6e8eb" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "rgba(79,124,172,0.30)" },
    ".cm-panels": { backgroundColor: "#14181e", color: "#c3c8cf" },
    ".cm-searchMatch": {
      backgroundColor: "rgba(201,146,46,0.28)",
      outline: "1px solid rgba(201,146,46,0.5)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(201,146,46,0.45)",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.028)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255,255,255,0.028)" },
    ".cm-selectionMatch": { backgroundColor: "rgba(79,124,172,0.18)" },
    ".cm-gutters": {
      backgroundColor: "#0e1116",
      color: "#5c636d",
      border: "none",
      borderRight: "1px solid #23282f",
    },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 16px" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#222831",
      border: "1px solid #3a424d",
      color: "#8b929c",
    },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "rgba(79,124,172,0.28)",
      outline: "1px solid rgba(79,124,172,0.5)",
    },
    ".cm-tooltip": {
      backgroundColor: "#14181e",
      border: "1px solid #2c333c",
      color: "#c3c8cf",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "#222831",
      color: "#e6e8eb",
    },
    ".cm-scroller": { overflow: "auto" },
  },
  { dark: true }
);

export const mobilHighlightStyle = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#6a7280", fontStyle: "italic" },
  { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: "#cf8a7d" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "#8fb573" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#d3a15f" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#6fa0cf" },
  { tag: [t.definition(t.variableName), t.variableName], color: "#c3c8cf" },
  { tag: [t.propertyName], color: "#6fa0cf" },
  { tag: [t.typeName, t.className, t.namespace], color: "#d0b86a" },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: "#9aa4af" },
  { tag: [t.tagName], color: "#cf8a7d" },
  { tag: [t.attributeName], color: "#d0b86a" },
  { tag: [t.attributeValue], color: "#8fb573" },
  { tag: [t.heading], color: "#6fa0cf", fontWeight: "bold" },
  { tag: [t.link, t.url], color: "#5f8cbd", textDecoration: "underline" },
  { tag: [t.emphasis], fontStyle: "italic" },
  { tag: [t.strong], fontWeight: "bold" },
  { tag: [t.meta, t.processingInstruction], color: "#8b929c" },
  { tag: [t.invalid], color: "#e7a79d" },
]);

export const mobilTheme = [
  mobilEditorTheme,
  syntaxHighlighting(mobilHighlightStyle),
];
