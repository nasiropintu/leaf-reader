import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type ReadingMode = "page" | "continuous";
export type FitMode = "width" | "page" | "manual";

interface PdfReaderProps {
  file: File;
  mode: ReadingMode;
  page: number;
  navigationRequest: number;
  onPageChange: (page: number) => void;
  onPageCount: (count: number) => void;
  zoom: number;
  fitMode: FitMode;
  rotation: number;
  searchTerm: string;
  selectedHit: number;
  onSearchCount: (count: number) => void;
}

interface MatchRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function PdfPage({
  document,
  pageNumber,
  containerWidth,
  zoom,
  fitMode,
  rotation,
  searchTerm,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  containerWidth: number;
  zoom: number;
  fitMode: FitMode;
  rotation: number;
  searchTerm: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 612, height: 792 });
  const [matches, setMatches] = useState<MatchRect[]>([]);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;

    const render = async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;
        const unscaled = page.getViewport({ scale: 1, rotation });
        const availableWidth = Math.max(260, containerWidth - 54);
        const widthScale = availableWidth / unscaled.width;
        const pageScale = Math.min(widthScale, Math.max(0.35, (window.innerHeight - 225) / unscaled.height));
        const scale = fitMode === "width" ? widthScale : fitMode === "page" ? pageScale : zoom;
        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context || cancelled) return;

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        setSize({ width: viewport.width, height: viewport.height });
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;

        if (searchTerm.trim()) {
          const textContent = await page.getTextContent();
          const needle = searchTerm.trim().toLocaleLowerCase();
          const found: MatchRect[] = [];
          for (const raw of textContent.items) {
            if (!("str" in raw) || !raw.str.toLocaleLowerCase().includes(needle)) continue;
            const item = raw as { str: string; transform: number[]; width: number; height: number };
            const transformed = pdfjs.Util.transform(viewport.transform, item.transform);
            found.push({
              left: transformed[4],
              top: transformed[5] - Math.max(item.height * scale, 8),
              width: Math.max(item.width * scale, 16),
              height: Math.max(item.height * scale, 12),
            });
          }
          if (!cancelled) setMatches(found);
        } else {
          setMatches([]);
        }
      } catch (error) {
        if (!cancelled) console.error("Unable to render PDF page", error);
      }
    };

    void render();
    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // A render task may already have completed.
      }
    };
  }, [document, pageNumber, containerWidth, zoom, fitMode, rotation, searchTerm]);

  return (
    <article className="pdf-page" data-page={pageNumber} aria-label={`Page ${pageNumber}`}>
      <div className="pdf-page__canvas-wrap" style={{ width: size.width, height: size.height }}>
        <canvas ref={canvasRef} aria-label={`PDF page ${pageNumber}`} />
        {matches.map((match, index) => (
          <span
            className="pdf-search-highlight"
            key={`${pageNumber}-${index}`}
            style={{ left: match.left, top: match.top, width: match.width, height: match.height }}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="pdf-page__number">{pageNumber}</span>
    </article>
  );
}

export default function PdfReader({
  file,
  mode,
  page,
  navigationRequest,
  onPageChange,
  onPageCount,
  zoom,
  fitMode,
  rotation,
  searchTerm,
  selectedHit,
  onSearchCount,
}: PdfReaderProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [containerWidth, setContainerWidth] = useState(900);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [searchPages, setSearchPages] = useState<number[]>([]);
  const lastNavigationRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof pdfjs.getDocument> | undefined;
    setPdf(null);
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        const loaded = await task.promise;
        if (cancelled) {
          await task?.destroy();
          return;
        }
        setPdf(loaded);
        onPageCount(loaded.numPages);
        onPageChange(1);
        setLoading(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "This PDF could not be opened.");
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [file, onPageChange, onPageCount]);

  useEffect(() => {
    const element = viewerRef.current;
    if (!element) return;
    const update = () => setContainerWidth(element.clientWidth || 900);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const findMatches = async () => {
      if (!pdf || !searchTerm.trim()) {
        setSearchPages([]);
        onSearchCount(0);
        return;
      }
      const needle = searchTerm.trim().toLocaleLowerCase();
      const found: number[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const text = await pdf.getPage(pageNumber).then((pdfPage) => pdfPage.getTextContent());
        for (const item of text.items) {
          if (!("str" in item)) continue;
          const content = item.str.toLocaleLowerCase();
          let offset = 0;
          while ((offset = content.indexOf(needle, offset)) !== -1) {
            found.push(pageNumber);
            offset += needle.length;
          }
        }
      }
      if (!cancelled) {
        setSearchPages(found);
        onSearchCount(found.length);
      }
    };
    void findMatches();
    return () => { cancelled = true; };
  }, [pdf, searchTerm, onSearchCount]);

  useEffect(() => {
    if (!pdf || searchPages.length === 0 || selectedHit < 0) return;
    const target = searchPages[selectedHit % searchPages.length];
    onPageChange(target);
    if (mode === "continuous") {
      requestAnimationFrame(() => viewerRef.current?.querySelector(`[data-page="${target}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
  }, [selectedHit, searchPages, pdf, mode, onPageChange]);

  useEffect(() => {
    if (!pdf || mode !== "continuous" || navigationRequest === 0 || lastNavigationRequest.current === navigationRequest) return;
    lastNavigationRequest.current = navigationRequest;
    requestAnimationFrame(() => viewerRef.current?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [navigationRequest, page, mode, pdf]);

  const visiblePages = useMemo(() => {
    if (!pdf) return [];
    return mode === "continuous" ? Array.from({ length: pdf.numPages }, (_, index) => index + 1) : [Math.min(Math.max(page, 1), pdf.numPages)];
  }, [pdf, mode, page]);

  useEffect(() => {
    if (!pdf || mode !== "continuous") return;
    const element = viewerRef.current;
    if (!element) return;
    let frame = 0;
    const updatePage = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const center = element.getBoundingClientRect().top + element.clientHeight / 2;
        const candidates = Array.from(element.querySelectorAll<HTMLElement>(".pdf-page"));
        let closest = page;
        let distance = Number.POSITIVE_INFINITY;
        for (const candidate of candidates) {
          const rect = candidate.getBoundingClientRect();
          const nextDistance = Math.abs(rect.top + rect.height / 2 - center);
          if (nextDistance < distance) {
            distance = nextDistance;
            closest = Number(candidate.dataset.page) || page;
          }
        }
        if (closest !== page) onPageChange(closest);
      });
    };
    element.addEventListener("scroll", updatePage, { passive: true });
    return () => {
      element.removeEventListener("scroll", updatePage);
      cancelAnimationFrame(frame);
    };
  }, [pdf, mode, page, onPageChange]);

  if (loading) return <div className="reader-message" role="status">Preparing your PDF…</div>;
  if (error) return <div className="reader-message reader-message--error" role="alert">{error}</div>;
  if (!pdf) return null;

  return (
    <div className={`pdf-viewer ${mode === "continuous" ? "pdf-viewer--continuous" : "pdf-viewer--page"}`} ref={viewerRef}>
      {visiblePages.map((pageNumber) => (
        <PdfPage
          key={`${pageNumber}-${rotation}-${fitMode}`}
          document={pdf}
          pageNumber={pageNumber}
          containerWidth={containerWidth}
          zoom={zoom}
          fitMode={fitMode}
          rotation={rotation}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
}
