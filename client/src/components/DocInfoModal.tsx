import { useEffect } from "react";
import { X, FileText, Download, ShieldCheck, Layers, HardDrive, Clock, Check } from "lucide-react";
import type { LoadedDocument } from "@/lib/documents";
import { formatFileSize } from "@/lib/documents";

interface DocInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LoadedDocument | null;
  pageCount: number;
  onDownload: () => void;
}

export default function DocInfoModal({
  isOpen,
  onClose,
  document,
  pageCount,
  onDownload,
}: DocInfoModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document?.name && (window.document.title = `${document.name} — Properties`);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, document]);

  if (!isOpen || !document) return null;

  const wordCount = document.text
    ? document.text.trim().split(/\s+/).filter(Boolean).length
    : document.slides
    ? document.slides.flatMap((s) => s.lines).join(" ").split(/\s+/).filter(Boolean).length
    : 0;

  const estimatedMinutes = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 220)) : 0;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="doc-info-title">
      <div className="doc-info-card" onClick={(e) => e.stopPropagation()}>
        <header className="doc-info-header">
          <div className="doc-info-title-cluster">
            <span className="doc-info-icon">
              <FileText size={20} />
            </span>
            <div>
              <span className="section-eyebrow">DOCUMENT PROPERTIES</span>
              <h2 id="doc-info-title" title={document.name}>
                {document.name}
              </h2>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close document properties">
            <X size={18} />
          </button>
        </header>

        <div className="doc-info-grid">
          <div className="doc-info-item">
            <span className="doc-info-label">
              <HardDrive size={14} /> File Size
            </span>
            <strong>{formatFileSize(document.size)}</strong>
            <small>{document.size.toLocaleString()} bytes</small>
          </div>

          <div className="doc-info-item">
            <span className="doc-info-label">
              <Layers size={14} /> Format & Kind
            </span>
            <strong>{document.format}</strong>
            <small className="capitalize">{document.kind} document</small>
          </div>

          <div className="doc-info-item">
            <span className="doc-info-label">
              <Layers size={14} /> Total Length
            </span>
            <strong>{pageCount || 1} {document.kind === "slides" ? "Slides" : document.kind === "spreadsheet" ? "Sheets" : document.kind === "epub" ? "Chapters" : "Pages"}</strong>
            <small>Local pagination</small>
          </div>

          {wordCount > 0 && (
            <div className="doc-info-item">
              <span className="doc-info-label">
                <Clock size={14} /> Reading Estimate
              </span>
              <strong>~{estimatedMinutes} min read</strong>
              <small>{wordCount.toLocaleString()} words</small>
            </div>
          )}
        </div>

        <div className="doc-info-privacy-badge">
          <div className="doc-info-privacy-icon">
            <ShieldCheck size={18} />
          </div>
          <div className="doc-info-privacy-text">
            <strong>100% Private & Local Memory</strong>
            <p>
              This file was rendered entirely in browser memory. Nothing was uploaded, cached, or transferred over any network.
            </p>
          </div>
          <span className="doc-info-privacy-verified">
            <Check size={14} /> Verified
          </span>
        </div>

        <footer className="doc-info-footer">
          <button
            type="button"
            className="button button--secondary"
            onClick={onDownload}
            title="Download an offline copy to your downloads folder"
          >
            <Download size={15} /> Save / Download Copy
          </button>
          <button type="button" className="button button--primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
