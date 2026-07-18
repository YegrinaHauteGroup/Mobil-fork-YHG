import type { Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { sql } from "@codemirror/lang-sql";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { rust } from "@codemirror/lang-rust";
import { php } from "@codemirror/lang-php";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { go } from "@codemirror/lang-go";
import type { LangKey } from "@/lib/languages";

/** LangKey → CodeMirror 언어 확장. plaintext 는 확장 없음. */
export function languageExtension(key: LangKey): Extension {
  switch (key) {
    case "javascript":
      return javascript();
    case "typescript":
      return javascript({ typescript: true });
    case "jsx":
      return javascript({ jsx: true });
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    case "python":
      return python();
    case "html":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "markdown":
      return markdown();
    case "sql":
      return sql();
    case "cpp":
      return cpp();
    case "java":
      return java();
    case "rust":
      return rust();
    case "php":
      return php();
    case "xml":
      return xml();
    case "yaml":
      return yaml();
    case "go":
      return go();
    case "plaintext":
    default:
      return [];
  }
}
