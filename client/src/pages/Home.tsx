import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import {
  BookOpen, Check, ChevronLeft, ChevronRight, FileText, FolderOpen, Heart, Image as ImageIcon,
  Keyboard, Leaf, Menu, Minus, Moon, MoreHorizontal, Plus, Printer, RotateCw, Search,
  Sheet, Sun, X,
} from "lucide-react";
import type { FitMode, ReadingMode } from "@/components/PdfReader";
import AboutModal from "@/components/AboutModal";
import {
  formatFileSize, loadLocalDocument, supportedFormatList,
  type BookChapter, type LoadedDocument, type SpreadsheetSheet,
} from "@/lib/documents";

const PdfReader = lazy(() => import("@/components/PdfReader"));

const OPEN_SOURCE_CREDITS = [
  { name: "PDF.js", author: "Mozilla", desc: "Industry-standard client-side PDF document parser and rendering canvas." },
  { name: "Mammoth", author: "Michael Searle", desc: "DOCX to clean semantic HTML/text document conversion library." },
  { name: "SheetJS (xlsx)", author: "SheetJS LLC", desc: "Spreadsheet parser and table extractor for Excel XLSX, XLS, and CSV files." },
  { name: "JSZip", author: "Stuart Knightley", desc: "Fast in-memory zip archive reader used for EPUB and PowerPoint extraction." },
  { name: "Lucide React", author: "Lucide Project", desc: "Crisp, lightweight, and accessible modern icon system." },
  { name: "Radix UI", author: "WorkOS", desc: "Unstyled, accessible UI component primitives for modern React applications." },
  { name: "Wouter", author: "Alexey Taktarov", desc: "Minimalist, zero-dependency client-side router for React." },
  { name: "Tailwind CSS", author: "Tailwind Labs", desc: "Utility-first CSS styling framework." },
];

type ReaderTheme = "paper" | "night";
interface RecentDocument { id: string; name: string; format: string; size: number; openedAt: number; }
interface Preferences { mode: ReadingMode; zoom: number; fitMode: FitMode; theme: ReaderTheme; }
const RECENTS_KEY = "leaf.reader.recents.v1";
const PREFERENCES_KEY = "leaf.reader.preferences.v1";
const DEFAULT_PREFERENCES: Preferences = { mode: "page", zoom: 1, fitMode: "width", theme: "paper" };

function readStoredRecents(): RecentDocument[] {
  try {
    const saved = localStorage.getItem(RECENTS_KEY);
    return saved ? JSON.parse(saved) as RecentDocument[] : [];
  } catch { return []; }
}
function readStoredPreferences(): Preferences {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY);
    return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) as Partial<Preferences> } : DEFAULT_PREFERENCES;
  } catch { return DEFAULT_PREFERENCES; }
}
function escaped(term: string) { return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function countMatches(text: string, term: string) {
  if (!term.trim()) return 0;
  return Array.from(text.matchAll(new RegExp(escaped(term.trim()), "gi"))).length;
}
function slideReadableLines(slide: NonNullable<LoadedDocument["slides"]>[number]) {
  return [slide.title, ...slide.lines.slice(slide.lines[0] === slide.title ? 1 : 0)];
}
function documentTextForSearch(doc: LoadedDocument) {
  if (doc.kind === "text" || doc.kind === "epub") return doc.text ?? "";
  if (doc.kind === "slides") return (doc.slides ?? []).flatMap(slideReadableLines).join("\n");
  if (doc.kind === "spreadsheet") return (doc.sheets ?? []).flatMap((sheet) => [sheet.name, ...sheet.rows.flat()]).join("\n");
  return "";
}

function pageForSearchHit(doc: LoadedDocument, term: string, targetHit: number) {
  const pages = doc.kind === "spreadsheet" ? (doc.sheets ?? []).map((sheet) => [sheet.name, ...sheet.rows.flat()].join("\n"))
    : doc.kind === "slides" ? (doc.slides ?? []).map((slide) => slideReadableLines(slide).join("\n"))
    : doc.kind === "epub" ? (doc.chapters ?? []).map((chapter) => `${chapter.title}\n${chapter.text}`)
    : [doc.text ?? ""];
  let seen = 0;
  for (const [index, content] of pages.entries()) {
    const count = countMatches(content, term);
    if (targetHit < seen + count) return index + 1;
    seen += count;
  }
  return 1;
}

function matchesBeforePage(doc: LoadedDocument, term: string, page: number) {
  const pages = doc.kind === "spreadsheet" ? (doc.sheets ?? []).map((sheet) => [sheet.name, ...sheet.rows.flat()].join("\n"))
    : doc.kind === "slides" ? (doc.slides ?? []).map((slide) => slideReadableLines(slide).join("\n"))
    : doc.kind === "epub" ? (doc.chapters ?? []).map((chapter) => `${chapter.title}\n${chapter.text}`)
    : [];
  return pages.slice(0, page - 1).reduce((total, content) => total + countMatches(content, term), 0);
}

function HighlightedText({ text, term, selectedHit, offset = 0 }: { text: string; term: string; selectedHit: number; offset?: number }) {
  if (!term.trim()) return <>{text}</>;
  const regex = new RegExp(escaped(term.trim()), "gi");
  const pieces: ReactNode[] = [];
  let lastIndex = 0;
  let localIndex = 0;
  for (const match of text.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) pieces.push(text.slice(lastIndex, index));
    const id = offset + localIndex;
    pieces.push(<mark id={`leaf-hit-${id}`} className={id === selectedHit ? "search-hit search-hit--active" : "search-hit"} key={`${id}-${index}`}>{match[0]}</mark>);
    localIndex += 1;
    lastIndex = index + match[0].length;
  }
  if (!localIndex) return <>{text}</>;
  if (lastIndex < text.length) pieces.push(text.slice(lastIndex));
  return <>{pieces}</>;
}

function ReadableText({ text, term, selectedHit, startOffset = 0 }: { text: string; term: string; selectedHit: number; startOffset?: number }) {
  let offset = startOffset;
  const lines = text.split("\n");
  return <div className="readable-copy">
    {lines.map((line, index) => {
      const start = offset;
      offset += countMatches(line, term);
      const content = <HighlightedText text={line} term={term} selectedHit={selectedHit} offset={start} />;
      const heading = line.match(/^(#{1,3})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        const Heading = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
        const value = heading[2];
        const headingOffset = start;
        return <Heading key={index}><HighlightedText text={value} term={term} selectedHit={selectedHit} offset={headingOffset} /></Heading>;
      }
      if (/^\s*[-*+]\s+/.test(line)) {
        const value = line.replace(/^\s*[-*+]\s+/, "");
        return <div className="readable-list-item" key={index}><span aria-hidden="true">•</span><span>{content}</span></div>;
      }
      if (!line.trim()) return <div className="readable-spacer" key={index} aria-hidden="true" />;
      return <p key={index}>{content}</p>;
    })}
  </div>;
}

function SheetView({ sheets, documentFile, mode, currentPage, term, selectedHit, zoom }: {
  sheets: SpreadsheetSheet[]; documentFile: LoadedDocument; mode: ReadingMode; currentPage: number; term: string; selectedHit: number; zoom: number;
}) {
  const visible = mode === "continuous" ? sheets : [sheets[currentPage - 1]].filter(Boolean);
  let hitOffset = mode === "continuous" ? 0 : matchesBeforePage(documentFile, term, currentPage);
  return <div className="sheet-stack">
    {visible.map((sheet) => {
      const titleOffset = hitOffset;
      hitOffset += countMatches(sheet.name, term);
      return <section className="sheet-section" data-reader-page={sheets.indexOf(sheet) + 1} key={sheet.name}>
        <div className="sheet-title"><span className="sheet-title__icon"><Sheet size={16} /></span><h2><HighlightedText text={sheet.name} term={term} selectedHit={selectedHit} offset={titleOffset} /></h2><span>{sheet.rows.length.toLocaleString()} rows</span></div>
        <div className="sheet-table-wrap"><table aria-label={`${sheet.name} spreadsheet`} style={{ fontSize: `${10 * zoom}px` }}>
          {sheet.rows.length > 0 && <thead><tr>{sheet.rows[0].map((cell, index) => {
            const offset = hitOffset;
            hitOffset += countMatches(cell, term);
            return <th key={index} scope="col"><HighlightedText text={cell || `Column ${index + 1}`} term={term} selectedHit={selectedHit} offset={offset} /></th>;
          })}</tr></thead>}
          <tbody>{sheet.rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>
            {row.map((cell, colIndex) => {
              const offset = hitOffset;
              hitOffset += countMatches(cell, term);
              return <td key={colIndex}><HighlightedText text={cell} term={term} selectedHit={selectedHit} offset={offset} /></td>;
            })}
          </tr>)}</tbody>
        </table></div>
      </section>;
    })}
    {!visible.length && <div className="reader-message">This sheet is empty.</div>}
  </div>;
}

function SlideView({ slides, documentFile, mode, currentPage, term, selectedHit, zoom }: {
  slides: NonNullable<LoadedDocument["slides"]>; documentFile: LoadedDocument; mode: ReadingMode; currentPage: number; term: string; selectedHit: number; zoom: number;
}) {
  const visible = mode === "continuous" ? slides : [slides[currentPage - 1]].filter(Boolean);
  let hitOffset = mode === "continuous" ? 0 : matchesBeforePage(documentFile, term, currentPage);
  return <div className="slide-stack">{visible.map((slide, index) => {
    const slideNo = mode === "continuous" ? slides.indexOf(slide) + 1 : currentPage;
    const titleOffset = hitOffset;
    hitOffset += countMatches(slide.title, term);
    return <article className="slide-card" data-reader-page={slideNo} key={slideNo} aria-label={`Slide ${slideNo}`} style={{ fontSize: `${15 * zoom}px` }}>
      <div className="slide-card__kicker">SLIDE {String(slideNo).padStart(2, "0")}</div>
      <h2><HighlightedText text={slide.title} term={term} selectedHit={selectedHit} offset={titleOffset} /></h2>
      <div className="slide-card__body">{slide.lines.slice(slide.lines[0] === slide.title ? 1 : 0).map((line, lineIndex) => {
        const offset = hitOffset;
        hitOffset += countMatches(line, term);
        return <p key={lineIndex}><HighlightedText text={line} term={term} selectedHit={selectedHit} offset={offset} /></p>;
      })}</div>
      <span className="slide-card__number">{slideNo} / {slides.length}</span>
    </article>;
  })}</div>;
}

function BookView({ chapters, documentFile, mode, currentPage, term, selectedHit, zoom }: {
  chapters: BookChapter[]; documentFile: LoadedDocument; mode: ReadingMode; currentPage: number; term: string; selectedHit: number; zoom: number;
}) {
  const visible = mode === "continuous" ? chapters : [chapters[currentPage - 1]].filter(Boolean);
  let hitOffset = mode === "continuous" ? 0 : matchesBeforePage(documentFile, term, currentPage);
  return <div className="book-stack">{visible.map((chapter, index) => {
    const chapterNo = mode === "continuous" ? chapters.indexOf(chapter) + 1 : currentPage;
    const titleOffset = hitOffset;
    hitOffset += countMatches(chapter.title, term);
    const textOffset = hitOffset;
    hitOffset += countMatches(chapter.text, term);
    return <article className="book-chapter" data-reader-page={chapterNo} key={`${chapterNo}-${index}`} style={{ fontSize: `${16 * zoom}px` }}>
      <span className="book-chapter__kicker">CHAPTER {String(chapterNo).padStart(2, "0")}</span>
      <h2><HighlightedText text={chapter.title} term={term} selectedHit={selectedHit} offset={titleOffset} /></h2>
      <ReadableText text={chapter.text} term={term} selectedHit={selectedHit} startOffset={textOffset} />
    </article>;
  })}</div>;
}

function RecentIcon({ format }: { format: string }) {
  if (format.toLowerCase().includes("image")) return <ImageIcon size={16} />;
  if (format.toLowerCase().includes("spreadsheet")) return <Sheet size={16} />;
  if (format.toLowerCase().includes("book")) return <BookOpen size={16} />;
  return <FileText size={16} />;
}

export default function Home() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [documentFile, setDocumentFile] = useState<LoadedDocument | null>(null);
  const [recents, setRecents] = useState<RecentDocument[]>(readStoredRecents);
  const [preferences, setPreferences] = useState<Preferences>(readStoredPreferences);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputDraft, setPageInputDraft] = useState("1");
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHit, setSelectedHit] = useState(0);
  const [searchCount, setSearchCount] = useState(0);
  const [loadingFile, setLoadingFile] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reopenPrompt, setReopenPrompt] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [printAll, setPrintAll] = useState(false);
  const [navigationRequest, setNavigationRequest] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);

  const pageCount = documentFile?.kind === "pdf" ? pdfPageCount : documentFile?.pageCount ?? 0;
  const isMultipage = Boolean(documentFile && pageCount > 1 && ["pdf", "spreadsheet", "slides", "epub"].includes(documentFile.kind));
  const isTextSearchable = documentFile ? ["text", "spreadsheet", "slides", "epub"].includes(documentFile.kind) : false;

  useEffect(() => {
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* storage can be unavailable in private contexts */ }
  }, [preferences]);
  useEffect(() => {
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(recents)); } catch { /* the reader remains usable without saved recents */ }
  }, [recents]);
  useEffect(() => setPageInputDraft(String(currentPage)), [currentPage]);
  useEffect(() => {
    setSelectedHit(0);
    if (documentFile?.kind === "pdf") {
      setSearchCount(0);
      return;
    }
    setSearchCount(documentFile ? countMatches(documentTextForSearch(documentFile), searchTerm) : 0);
  }, [documentFile, searchTerm]);
  useEffect(() => {
    if (!documentFile || !searchTerm.trim() || searchCount < 1 || documentFile.kind === "pdf" || documentFile.kind === "image") return;
    const targetPage = pageForSearchHit(documentFile, searchTerm, selectedHit);
    if (targetPage !== currentPage) setCurrentPage(targetPage);
    requestAnimationFrame(() => document.getElementById(`leaf-hit-${selectedHit}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }, [selectedHit, searchCount, documentFile, searchTerm, currentPage]);
  useEffect(() => {
    if (!documentFile || preferences.mode !== "continuous" || navigationRequest === 0) return;
    requestAnimationFrame(() => {
      const target = window.document.querySelector(`[data-page="${currentPage}"], [data-reader-page="${currentPage}"]`);
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [navigationRequest, currentPage, preferences.mode, documentFile]);
  useEffect(() => {
    if (!documentFile?.sourceUrl) return;
    const sourceUrl = documentFile.sourceUrl;
    return () => URL.revokeObjectURL(sourceUrl);
  }, [documentFile]);
  useEffect(() => {
    const finishPrint = () => setPrintAll(false);
    window.addEventListener("afterprint", finishPrint);
    return () => window.removeEventListener("afterprint", finishPrint);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setCurrentPage(Math.max(1, nextPage));
  }, []);
  const handlePdfPageCount = useCallback((count: number) => {
    setPdfPageCount(count);
    setCurrentPage((previous) => Math.min(Math.max(1, previous), count));
  }, []);
  const handlePdfSearchCount = useCallback((count: number) => setSearchCount(count), []);

  const openPicker = () => {
    setReopenPrompt("");
    fileInputRef.current?.click();
  };

  const openFile = async (file?: File) => {
    if (!file) return;
    setLoadingFile(true);
    setLoadError("");
    setReopenPrompt("");
    try {
      const loaded = await loadLocalDocument(file);
      setDocumentFile(loaded);
      setCurrentPage(1);
      setPageInputDraft("1");
      setPdfPageCount(loaded.kind === "pdf" ? 0 : loaded.pageCount);
      setRotation(0);
      setSearchTerm("");
      const recent: RecentDocument = { id: loaded.id, name: loaded.name, format: loaded.format, size: loaded.size, openedAt: Date.now() };
      setRecents((previous) => [recent, ...previous.filter((item) => item.name !== recent.name)].slice(0, 8));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "That document could not be opened.");
    } finally {
      setLoadingFile(false);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    void openFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void openFile(file);
  };

  const openRecent = (recent: RecentDocument) => {
    setReopenPrompt(`Choose “${recent.name}” from this device to open it again.`);
    fileInputRef.current?.click();
  };

  const changePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((previous) => ({ ...previous, [key]: value }));
  };

  const turnPage = (direction: -1 | 1) => {
    handlePageChange(pageCount ? Math.max(1, Math.min(pageCount, currentPage + direction)) : 1);
    setNavigationRequest((value) => value + 1);
  };
  const jumpToHit = (direction: -1 | 1) => {
    if (searchCount < 1) return;
    setSelectedHit((previous) => (previous + direction + searchCount) % searchCount);
  };

  const printDocument = () => {
    if (!documentFile) return;
    if (documentFile.kind === "pdf") {
      const frame = window.document.createElement("iframe");
      frame.title = "Print PDF document";
      frame.setAttribute("aria-hidden", "true");
      Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", opacity: "0", border: "0" });
      frame.onload = () => window.setTimeout(() => {
        try { frame.contentWindow?.focus(); frame.contentWindow?.print(); }
        catch { window.print(); }
        window.setTimeout(() => frame.remove(), 4000);
      }, 250);
      frame.src = documentFile.sourceUrl;
      document.body.appendChild(frame);
      return;
    }
    setPrintAll(true);
    window.setTimeout(() => window.print(), 80);
  };

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable='true']");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (!documentFile || typing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); turnPage(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); turnPage(1); }
      if (event.key === "+" || event.key === "=") changePreference("zoom", Math.min(2.5, preferences.zoom + 0.1));
      if (event.key === "-") changePreference("zoom", Math.max(0.5, preferences.zoom - 0.1));
    };
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [documentFile, currentPage, pageCount, preferences.zoom]);

  const visibleContent = useMemo(() => {
    if (!documentFile) return null;
    const viewMode = printAll ? "continuous" : preferences.mode;
    if (documentFile.kind === "pdf") return <Suspense fallback={<div className="reader-message" role="status">Loading PDF tools…</div>}><PdfReader
      file={documentFile.file as File}
      mode={preferences.mode}
      page={currentPage}
      navigationRequest={navigationRequest}
      onPageChange={handlePageChange}
      onPageCount={handlePdfPageCount}
      zoom={preferences.zoom}
      fitMode={preferences.fitMode}
      rotation={rotation}
      searchTerm={searchTerm}
      selectedHit={selectedHit}
      onSearchCount={handlePdfSearchCount}
    /></Suspense>;
    if (documentFile.kind === "image") return <div className="image-document"><img
      src={documentFile.sourceUrl}
      alt={`Opened image: ${documentFile.name}`}
      style={{ transform: `rotate(${rotation}deg) scale(${preferences.zoom})`, maxHeight: preferences.fitMode === "page" ? "calc(100vh - 260px)" : "none" }}
    /></div>;
    if (documentFile.kind === "spreadsheet") return <SheetView sheets={documentFile.sheets ?? []} documentFile={documentFile} mode={viewMode} currentPage={currentPage} term={searchTerm} selectedHit={selectedHit} zoom={preferences.zoom} />;
    if (documentFile.kind === "slides") return <SlideView slides={documentFile.slides ?? []} documentFile={documentFile} mode={viewMode} currentPage={currentPage} term={searchTerm} selectedHit={selectedHit} zoom={preferences.zoom} />;
    if (documentFile.kind === "epub") return <BookView chapters={documentFile.chapters ?? []} documentFile={documentFile} mode={viewMode} currentPage={currentPage} term={searchTerm} selectedHit={selectedHit} zoom={preferences.zoom} />;
    return <article className="text-document" style={{ fontSize: `${18 * preferences.zoom}px` }}>
      <ReadableText text={documentFile.text ?? ""} term={searchTerm} selectedHit={selectedHit} />
    </article>;
  }, [documentFile, preferences, currentPage, handlePageChange, handlePdfPageCount, rotation, searchTerm, selectedHit, handlePdfSearchCount, printAll]);

  const commitPageEntry = () => {
    if (!pageCount) return;
    const parsed = Number(pageInputDraft);
    if (!pageInputDraft.trim() || !Number.isFinite(parsed)) {
      setPageInputDraft(String(currentPage));
      return;
    }
    const nextPage = Math.max(1, Math.min(pageCount, Math.trunc(parsed)));
    handlePageChange(nextPage);
    setPageInputDraft(String(nextPage));
    setNavigationRequest((value) => value + 1);
  };

  return <div className={`app-shell reader-theme--${preferences.theme}`} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
    <input ref={fileInputRef} className="visually-hidden" type="file" accept=".pdf,.docx,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.xls,.csv,.pptx,.epub,.rtf,.odt,.ods,.html,.htm" onChange={handleFileInput} aria-label="Choose a document from this device" />
    <header className="app-header">
      <div className="brand-cluster">
        <button className="icon-button mobile-menu" type="button" aria-label={sidebarOpen ? "Close recent documents" : "Show recent documents"} onClick={() => setSidebarOpen((value) => !value)}>
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <img className="brand-mark" src="./icons/leaf.svg" alt="" />
        <div className="brand-copy"><span className="brand-name">Leaf</span><span className="brand-subtitle">DOCUMENT READER</span></div>
      </div>
      <div className="header-center">
        <span className="privacy-dot" />Your files stay on this device
        <button className="header-tagline-btn" type="button" onClick={() => setAboutOpen(true)} title="About NasirPintu & Credits" style={{ marginLeft: 12 }}>
          <Heart size={12} style={{ fill: '#ff6b6b', color: '#ff6b6b' }} />
          <span>Crafted with ❤️ by <strong>NasirPintu</strong></span>
        </button>
      </div>
      <div className="header-actions">
        <button className="button button--secondary header-open" type="button" onClick={openPicker}><FolderOpen size={16} /> Open a document</button>
      </div>
    </header>

    <div className="reader-layout">
      <aside className={`library-sidebar ${sidebarOpen ? "library-sidebar--open" : ""}`} aria-label="Document library">
        <div className="sidebar-section-heading"><div><span className="section-eyebrow">YOUR LIBRARY</span><h2>Recently opened</h2></div><span className="recent-count">{recents.length}</span></div>
        {recents.length ? <div className="recent-list">{recents.map((recent) => <button className="recent-item" type="button" key={recent.id} onClick={() => openRecent(recent)} title={`Choose ${recent.name} to open it again`}>
          <span className="recent-item__icon"><RecentIcon format={recent.format} /></span>
          <span className="recent-item__copy"><strong>{recent.name}</strong><small>{recent.format} · {formatFileSize(recent.size)}</small></span>
          <MoreHorizontal className="recent-item__more" size={17} />
        </button>)}</div> : <div className="recent-empty"><span className="recent-empty__icon"><BookOpen size={19} /></span><p>Documents you open will appear here.</p></div>}
        {reopenPrompt && <p className="reopen-prompt" role="status">{reopenPrompt}</p>}
        <div className="sidebar-bottom">
          <button className="creator-sidebar-pill" type="button" onClick={() => setAboutOpen(true)} title="View Creator & AI Collaboration Credits">
            <span className="creator-pill-heart"><Heart size={14} style={{ fill: '#ff6b6b' }} /></span>
            <span className="creator-pill-text">Crafted with ❤️ by <strong>NasirPintu</strong></span>
          </button>
          <div className="offline-card"><span className="offline-card__check"><Check size={13} /></span><div><strong>Private by design</strong><p>Files open locally. Nothing is uploaded.</p></div></div>
          <button className="keyboard-hint" type="button" onClick={() => { searchInputRef.current?.focus(); }}><Keyboard size={14} /><span>⌘ / Ctrl + F to find</span></button>
        </div>
      </aside>

      <main className="workspace" aria-label="Document reader">
        {!documentFile ? <section className="welcome-panel">
          <div className="welcome-copy"><span className="section-eyebrow">A QUIETER WAY TO READ</span><h1>Documents, <em>at ease.</em></h1><p>Open what you need. Find your place. Print when you’re ready.</p>
            <button className="button button--primary button--large" type="button" onClick={openPicker} disabled={loadingFile}><FolderOpen size={17} />{loadingFile ? "Opening…" : "Open a document"}</button>
          </div>
          <div className="welcome-visual" aria-hidden="true"><div className="visual-orbit visual-orbit--one" /><div className="visual-orbit visual-orbit--two" /><div className="visual-paper"><div className="visual-paper__leaf"><Leaf size={28} strokeWidth={1.6} /></div><span /><span /><span className="short" /><div className="visual-paper__page">01</div></div><div className="visual-chip visual-chip--top">READY WHEN YOU ARE</div><div className="visual-chip visual-chip--bottom"><span /> PRIVATE & LOCAL</div></div>
          {loadError && <div className="load-error" role="alert">{loadError}</div>}
          <div className="format-strip"><div className="format-strip__heading"><span>FORMATS, ALL IN ONE PLACE</span><span>20 file extensions</span></div><p>{supportedFormatList()}</p></div>
          <div className="dropzone" onClick={openPicker} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openPicker(); }}><span className="dropzone__icon"><FolderOpen size={19} /></span><span><strong>Drop a document anywhere</strong><small>or choose a file from this device</small></span><ChevronRight size={17} className="dropzone__arrow" /></div>
        </section> : <section className={`active-document ${printAll ? "print-all" : ""}`}>
          <div className="document-heading">
            <div className="document-title-block"><span className="section-eyebrow">NOW READING · {documentFile.format.toUpperCase()}</span><h1 title={documentFile.name}>{documentFile.name}</h1><p>{formatFileSize(documentFile.size)} <span>·</span> Saved only in this session</p></div>
            <button className="button button--secondary print-action" type="button" onClick={printDocument}><Printer size={16} />Print</button>
          </div>

          <div className="reader-toolbar" role="toolbar" aria-label="Document reading controls">
            <div className="toolbar-group toolbar-pages">
              <button className="icon-button" type="button" aria-label="Previous page" title="Previous page (←)" disabled={!pageCount || currentPage <= 1} onClick={() => turnPage(-1)}><ChevronLeft size={18} /></button>
              <label className="page-status"><span className="visually-hidden">Current page</span><input ref={pageInputRef} aria-label="Go to page" type="number" min={1} max={pageCount || 1} value={pageCount ? pageInputDraft : ""} onChange={(event) => setPageInputDraft(event.currentTarget.value)} onBlur={commitPageEntry} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} disabled={!pageCount} onFocus={(event) => event.currentTarget.select()} /><span>/ {pageCount || "—"}</span></label>
              <button className="icon-button" type="button" aria-label="Next page" title="Next page (→)" disabled={!pageCount || currentPage >= pageCount} onClick={() => turnPage(1)}><ChevronRight size={18} /></button>
            </div>
            <span className="toolbar-divider" />
            <div className="toolbar-group zoom-control" aria-label="Zoom controls">
              <button className="icon-button" type="button" aria-label="Zoom out" title="Zoom out (−)" onClick={() => { changePreference("fitMode", "manual"); changePreference("zoom", Math.max(0.5, Math.round((preferences.zoom - 0.1) * 10) / 10)); }}><Minus size={16} /></button>
              <span className="zoom-label">{Math.round(preferences.zoom * 100)}%</span>
              <button className="icon-button" type="button" aria-label="Zoom in" title="Zoom in (+)" onClick={() => { changePreference("fitMode", "manual"); changePreference("zoom", Math.min(2.5, Math.round((preferences.zoom + 0.1) * 10) / 10)); }}><Plus size={16} /></button>
            </div>
            <span className="toolbar-divider toolbar-divider--optional" />
            <div className="toolbar-group fit-control" aria-label="Page sizing">
              <button className={preferences.fitMode === "width" ? "tool-pill is-active" : "tool-pill"} type="button" onClick={() => changePreference("fitMode", "width")}>Fit width</button>
              <button className={preferences.fitMode === "page" ? "tool-pill is-active" : "tool-pill"} type="button" onClick={() => changePreference("fitMode", "page")}>Fit page</button>
            </div>
            <span className="toolbar-divider toolbar-divider--optional" />
            <button className="icon-button rotate-action" type="button" aria-label="Rotate document" title="Rotate 90°" disabled={!(["pdf", "image"].includes(documentFile.kind))} onClick={() => setRotation((value) => (value + 90) % 360)}><RotateCw size={16} /></button>
            <div className="toolbar-spacer" />
            {isMultipage && <div className="mode-switch" role="group" aria-label="Reading layout">
              <button className={preferences.mode === "page" ? "is-selected" : ""} type="button" onClick={() => changePreference("mode", "page")}>Pages</button>
              <button className={preferences.mode === "continuous" ? "is-selected" : ""} type="button" onClick={() => changePreference("mode", "continuous")}>Scroll</button>
            </div>}
            <button className="icon-button theme-action" type="button" aria-label={preferences.theme === "paper" ? "Switch to night reading" : "Switch to paper reading"} title={preferences.theme === "paper" ? "Night reading" : "Paper reading"} onClick={() => changePreference("theme", preferences.theme === "paper" ? "night" : "paper")}>{preferences.theme === "paper" ? <Moon size={16} /> : <Sun size={16} />}</button>
          </div>

          <div className="search-row">
            <div className="search-box"><Search size={16} /><input ref={searchInputRef} type="search" placeholder={documentFile.kind === "image" ? "Search isn’t available for images" : "Find in this document…"} aria-label="Search inside this document" value={searchTerm} disabled={documentFile.kind === "image"} onChange={(event) => setSearchTerm(event.target.value)} /><kbd>⌘ F</kbd></div>
            <div className="search-results" aria-live="polite">{searchTerm ? (searchCount ? <><span>{selectedHit + 1}</span> of {searchCount}</> : "No matches") : ""}</div>
            <div className="search-nav"><button type="button" className="icon-button" aria-label="Previous match" disabled={searchCount < 1} onClick={() => jumpToHit(-1)}><ChevronLeft size={16} /></button><button type="button" className="icon-button" aria-label="Next match" disabled={searchCount < 1} onClick={() => jumpToHit(1)}><ChevronRight size={16} /></button></div>
          </div>

          {loadError && <div className="load-error load-error--inline" role="alert">{loadError} <button type="button" onClick={() => setLoadError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
          <div className={`reader-stage ${preferences.theme === "night" ? "reader-stage--night" : ""} ${documentFile.kind === "pdf" ? "reader-stage--pdf" : ""}`}>
            {visibleContent}
          </div>
          <div className="reader-footnote"><span><Check size={13} /> This file hasn’t left your device.</span><span>{documentFile.kind === "slides" ? "Slide text view · original layouts and animations may differ" : documentFile.kind === "spreadsheet" ? "Cell values shown · workbook styling may differ" : documentFile.kind === "epub" ? "Chapter text view · embedded media may not appear" : documentFile.kind === "text" ? "Readable text view · original page styling may differ" : isTextSearchable ? "Text search available" : documentFile.kind === "pdf" ? "Searches selectable PDF text" : "Image document"}</span></div>
        </section>}
      </main>
    </div>
    {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="Close recent documents" onClick={() => setSidebarOpen(false)} />}
    <div className="visually-hidden" aria-live="polite">{loadingFile ? "Opening document" : ""}</div>
    <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} openSourceCredits={OPEN_SOURCE_CREDITS} />
  </div>;
}
