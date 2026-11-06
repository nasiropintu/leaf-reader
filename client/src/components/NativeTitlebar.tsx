import { useEffect, useState } from "react";
import { Minus, Square, X, Copy, Leaf } from "lucide-react";
import {
  isTauri,
  minimizeNativeWindow,
  toggleMaximizeNativeWindow,
  closeNativeWindow,
  isNativeWindowMaximized,
} from "@/lib/native";

interface NativeTitlebarProps {
  documentTitle?: string;
}

export function NativeTitlebar({ documentTitle }: NativeTitlebarProps) {
  const [inTauri, setInTauri] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (isTauri()) {
      setInTauri(true);
      isNativeWindowMaximized().then(setMaximized);

      // Listen for window resize to update maximized state
      const handleResize = () => {
        isNativeWindowMaximized().then(setMaximized);
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  if (!inTauri) return null;

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={toggleMaximizeNativeWindow}
      className="h-9 w-full flex items-center justify-between select-none bg-stone-900/90 text-stone-200 border-b border-stone-800 text-xs px-2 z-50 shrink-0 font-sans backdrop-blur-md"
    >
      {/* Left: Branding & App Title */}
      <div data-tauri-drag-region className="flex items-center gap-2 px-1">
        <Leaf size={14} className="text-emerald-500 fill-emerald-500/20" />
        <span className="font-semibold tracking-tight text-stone-200">Leaf</span>
        {documentTitle && (
          <>
            <span className="text-stone-500">—</span>
            <span className="text-stone-300 truncate max-w-[320px] font-normal" title={documentTitle}>
              {documentTitle}
            </span>
          </>
        )}
      </div>

      {/* Center drag region */}
      <div data-tauri-drag-region className="flex-1 h-full cursor-default" />

      {/* Right: Window Controls */}
      <div className="flex items-center h-full -mr-2">
        <button
          type="button"
          onClick={minimizeNativeWindow}
          title="Minimize"
          aria-label="Minimize"
          className="h-full px-3.5 inline-flex items-center justify-center text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 transition-colors"
        >
          <Minus size={12} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={toggleMaximizeNativeWindow}
          title={maximized ? "Restore" : "Maximize"}
          aria-label={maximized ? "Restore" : "Maximize"}
          className="h-full px-3.5 inline-flex items-center justify-center text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 transition-colors"
        >
          {maximized ? <Copy size={11} strokeWidth={2} className="rotate-180" /> : <Square size={11} strokeWidth={2} />}
        </button>
        <button
          type="button"
          onClick={closeNativeWindow}
          title="Close"
          aria-label="Close"
          className="h-full px-4 inline-flex items-center justify-center text-stone-400 hover:text-white hover:bg-red-600 transition-colors"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

export default NativeTitlebar;
