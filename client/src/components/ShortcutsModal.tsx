import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Navigation & Pages",
    items: [
      { key: "← / →", label: "Previous / Next page" },
      { key: "PageUp / PageDown", label: "Previous / Next page" },
      { key: "Home / End", label: "First / Last page" },
    ],
  },
  {
    title: "Zoom & Orientation",
    items: [
      { key: "+ / =", label: "Zoom in (+10%)" },
      { key: "-", label: "Zoom out (-10%)" },
      { key: "0", label: "Reset zoom to 100%" },
      { key: "[ / ]", label: "Rotate Left / Right (90°)" },
    ],
  },
  {
    title: "Focus & Fullscreen",
    items: [
      { key: "Z", label: "Toggle Theater / Zen Focus Mode" },
      { key: "F / F11", label: "Toggle Native Browser Fullscreen" },
      { key: "Esc", label: "Exit Zen Mode / Close modals" },
    ],
  },
  {
    title: "Search & Tools",
    items: [
      { key: "Ctrl + F / ⌘ F", label: "Find in document" },
      { key: "?", label: "Toggle keyboard shortcuts" },
    ],
  },
];

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div className="shortcuts-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="shortcuts-modal-header">
          <div className="shortcuts-modal-title">
            <span className="shortcuts-icon">
              <Keyboard size={18} />
            </span>
            <div>
              <span className="section-eyebrow">QUICK ACCESS</span>
              <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close shortcuts">
            <X size={18} />
          </button>
        </header>

        <div className="shortcuts-grid">
          {SHORTCUT_GROUPS.map((group) => (
            <div className="shortcuts-group" key={group.title}>
              <h3>{group.title}</h3>
              <ul className="shortcuts-list">
                {group.items.map((item) => (
                  <li key={item.key}>
                    <span className="shortcuts-desc">{item.label}</span>
                    <kbd className="shortcuts-key">{item.key}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <footer className="shortcuts-modal-footer">
          <button type="button" className="button button--primary" onClick={onClose}>
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}
