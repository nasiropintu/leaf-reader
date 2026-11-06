import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

export interface PdfThumbnailItemProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  rotation?: number;
  onClick: () => void;
}

export function PdfThumbnailItem({
  document,
  pageNumber,
  isActive,
  rotation = 0,
  onClick,
}: PdfThumbnailItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;

    const renderThumb = async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;
        const normRotation = ((rotation % 360) + 360) % 360;
        const unscaled = page.getViewport({ scale: 1, rotation: normRotation });
        const thumbWidth = 120;
        const scale = thumbWidth / unscaled.width;
        const viewport = page.getViewport({ scale, rotation: normRotation });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        const pixelRatio = 1.5;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
        if (!cancelled) setRendered(true);
      } catch {
        // Task cancelled or page load error
      }
    };

    void renderThumb();
    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // already handled
      }
    };
  }, [document, pageNumber, rotation]);

  return (
    <button
      type="button"
      className={`thumb-card ${isActive ? "thumb-card--active" : ""}`}
      onClick={onClick}
      aria-label={`Go to page ${pageNumber}`}
      aria-current={isActive ? "page" : undefined}
    >
      <div className="thumb-card__canvas-box">
        <canvas ref={canvasRef} aria-hidden="true" />
        {!rendered && (
          <div className="thumb-card__placeholder">
            <span>P. {pageNumber}</span>
          </div>
        )}
      </div>
      <span className="thumb-card__badge">Page {pageNumber}</span>
    </button>
  );
}

export default PdfThumbnailItem;
