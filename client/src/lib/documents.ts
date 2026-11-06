export type DocumentKind = "pdf" | "image" | "text" | "spreadsheet" | "slides" | "epub";

export interface SpreadsheetSheet {
  name: string;
  rows: string[][];
}

export interface SlidePage {
  title: string;
  lines: string[];
}

export interface BookChapter {
  title: string;
  text: string;
}

export interface LoadedDocument {
  id: string;
  name: string;
  file: File;
  kind: DocumentKind;
  format: string;
  size: number;
  sourceUrl: string;
  pageCount: number;
  text?: string;
  sheets?: SpreadsheetSheet[];
  slides?: SlidePage[];
  chapters?: BookChapter[];
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "docx", "rtf", "odt", "html", "htm"]);
const SHEET_EXTENSIONS = new Set(["xlsx", "xls", "csv", "ods"]);

function extensionOf(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function supportedFormatList() {
  return "PDF, DOCX, TXT, Markdown, PNG/JPG/WebP/GIF, XLSX/XLS/CSV, PPTX, EPUB, RTF/ODT/ODS, and HTML";
}

function formatLabel(extension: string) {
  const labels: Record<string, string> = {
    pdf: "PDF", docx: "Word document", txt: "Plain text", md: "Markdown", markdown: "Markdown",
    png: "PNG image", jpg: "JPEG image", jpeg: "JPEG image", webp: "WebP image", gif: "GIF image",
    xlsx: "Excel workbook", xls: "Excel workbook", csv: "CSV spreadsheet", ods: "OpenDocument spreadsheet",
    pptx: "PowerPoint presentation", epub: "EPUB book", rtf: "Rich text", odt: "OpenDocument text",
    html: "Web document", htm: "Web document",
  };
  return labels[extension] ?? extension.toUpperCase();
}

function parseRtf(source: string) {
  return source
    .replace(/\\'[0-9a-f]{2}/gi, (match) => String.fromCharCode(parseInt(match.slice(2), 16)))
    .replace(/\\u(-?\d+)\??/g, (_match, raw: string) => {
      const value = Number(raw);
      return String.fromCharCode(value < 0 ? value + 65536 : value);
    })
    .replace(/\\(par|line)\b ?/gi, "\n")
    .replace(/\\tab\b ?/gi, "\t")
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/\\([\\{}])/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function xmlText(xml: string, selectors: string[]) {
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  const nodes = Array.from(parsed.getElementsByTagName("*"));
  const wanted = new Set(selectors);
  const parts = nodes
    .filter((node) => wanted.has(node.localName))
    .map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter(Boolean);
  return parts.join("\n\n");
}

function resolveZipPath(baseFile: string, href: string) {
  const parent = baseFile.split("/").slice(0, -1);
  const segments = [...parent, ...decodeURIComponent(href).split("/")];
  const normalized: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") normalized.pop();
    else normalized.push(segment);
  }
  return normalized.join("/");
}

async function readOdt(file: File) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const content = await zip.file("content.xml")?.async("string");
  if (!content) throw new Error("This OpenDocument file does not contain readable content.");
  return xmlText(content, ["h", "p"]) || content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function readPowerPoint(file: File): Promise<SlidePage[]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const paths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
  if (!paths.length) throw new Error("No readable slides were found in this PowerPoint file.");

  const slides: SlidePage[] = [];
  for (const [index, path] of paths.entries()) {
    const xml = await zip.file(path)?.async("string");
    if (!xml) continue;
    const parsed = new DOMParser().parseFromString(xml, "application/xml");
    const paragraphs = Array.from(parsed.getElementsByTagName("*") )
      .filter((node) => node.localName === "p")
      .map((paragraph) => Array.from(paragraph.getElementsByTagName("*"))
        .filter((node) => node.localName === "t")
        .map((node) => node.textContent ?? "")
        .join("").trim())
      .filter(Boolean);
    slides.push({ title: paragraphs[0] ?? `Slide ${index + 1}`, lines: paragraphs });
  }
  return slides;
}

async function readEpub(file: File): Promise<BookChapter[]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) throw new Error("This EPUB file is missing its package index.");
  const containerDoc = new DOMParser().parseFromString(container, "application/xml");
  const opfPath = containerDoc.getElementsByTagName("rootfile")[0]?.getAttribute("full-path");
  if (!opfPath) throw new Error("This EPUB file does not identify a readable book package.");

  const opf = await zip.file(opfPath)?.async("string");
  if (!opf) throw new Error("The EPUB book package could not be opened.");
  const opfDoc = new DOMParser().parseFromString(opf, "application/xml");
  const manifest = new Map<string, string>();
  for (const item of Array.from(opfDoc.getElementsByTagName("*"))) {
    if (item.localName === "item") {
      const id = item.getAttribute("id");
      const href = item.getAttribute("href");
      if (id && href) manifest.set(id, href);
    }
  }

  const chapters: BookChapter[] = [];
  const spineItems = Array.from(opfDoc.getElementsByTagName("*"))
    .filter((node) => node.localName === "itemref");
  for (const [index, itemref] of spineItems.entries()) {
    const href = manifest.get(itemref.getAttribute("idref") ?? "");
    if (!href) continue;
    const contentPath = resolveZipPath(opfPath, href.split("#")[0]);
    const markup = await zip.file(contentPath)?.async("string");
    if (!markup) continue;
    const html = new DOMParser().parseFromString(markup, "text/html");
    html.querySelectorAll("script, style, nav, svg").forEach((node) => node.remove());
    const title = html.querySelector("h1, h2, title")?.textContent?.trim() || `Chapter ${index + 1}`;
    const text = (html.body.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n\n").trim();
    if (text) chapters.push({ title, text });
  }
  if (!chapters.length) throw new Error("No readable chapters were found in this EPUB file.");
  return chapters;
}

function readHtml(source: string) {
  const parsed = new DOMParser().parseFromString(source, "text/html");
  parsed.querySelectorAll("script, style, noscript, svg, iframe").forEach((node) => node.remove());
  return (parsed.body.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n\n").trim();
}

export async function loadLocalDocument(file: File): Promise<LoadedDocument> {
  const extension = extensionOf(file.name);
  const sourceUrl = URL.createObjectURL(file);
  const base: Pick<LoadedDocument, "id" | "name" | "file" | "format" | "size" | "sourceUrl"> = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name, file, format: formatLabel(extension), size: file.size, sourceUrl,
  };

  try {
    if (extension === "pdf") return { ...base, kind: "pdf", pageCount: 0 };
    if (IMAGE_EXTENSIONS.has(extension)) return { ...base, kind: "image", pageCount: 1 };
    if (SHEET_EXTENSIONS.has(extension)) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
      const sheets = workbook.SheetNames.map((name) => {
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: false, defval: "" });
        const rows = rawRows.map((row) => row.map((cell) => String(cell ?? "")));
        return { name, rows };
      });
      if (!sheets.length) throw new Error("No readable sheets were found in this spreadsheet.");
      return { ...base, kind: "spreadsheet", sheets, pageCount: sheets.length };
    }
    if (extension === "pptx") {
      const slides = await readPowerPoint(file);
      return { ...base, kind: "slides", slides, pageCount: slides.length };
    }
    if (extension === "epub") {
      const chapters = await readEpub(file);
      return { ...base, kind: "epub", chapters, pageCount: chapters.length, text: chapters.map((chapter) => `${chapter.title}\n${chapter.text}`).join("\n\n") };
    }
    if (extension === "docx") {
      const { default: mammoth } = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return { ...base, kind: "text", pageCount: 1, text: result.value.trim() };
    }
    if (extension === "odt") {
      return { ...base, kind: "text", pageCount: 1, text: await readOdt(file) };
    }
    if (extension === "rtf") {
      return { ...base, kind: "text", pageCount: 1, text: parseRtf(await file.text()) };
    }
    if (["txt", "md", "markdown"].includes(extension)) {
      return { ...base, kind: "text", pageCount: 1, text: await file.text() };
    }
    if (["html", "htm"].includes(extension)) {
      return { ...base, kind: "text", pageCount: 1, text: readHtml(await file.text()) };
    }
    throw new Error(`The .${extension || "unknown"} format is not supported yet.`);
  } catch (error) {
    URL.revokeObjectURL(sourceUrl);
    if (error instanceof Error) throw error;
    throw new Error("This document could not be opened. Please try another file.");
  }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
