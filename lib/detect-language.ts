import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";

/** Languages users can pick. Values are Monaco language ids. */
export const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "csharp", label: "C#" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C / C++" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "ruby", label: "Ruby" },
  { id: "php", label: "PHP" },
  { id: "sql", label: "SQL" },
  { id: "plaintext", label: "Plain text" },
] as const;

const REGISTERED = { cpp, csharp, go, java, javascript, php, python, ruby, rust, sql, typescript };
for (const [name, lang] of Object.entries(REGISTERED)) hljs.registerLanguage(name, lang);

/** Guess the Monaco language for a snippet. Only used for syntax coloring; users can override. */
export function detectLanguage(code: string): string {
  if (!code.trim()) return "javascript";
  const result = hljs.highlightAuto(code.slice(0, 4000), Object.keys(REGISTERED));
  return result.language && result.relevance >= 5 ? result.language : "plaintext";
}

export function languageLabel(id: string): string {
  return LANGUAGES.find((l) => l.id === id)?.label ?? id;
}
