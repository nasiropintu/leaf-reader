/**
 * Leaf Native Platform Bridge (Tauri v2)
 *
 * Provides a clean, safe abstraction layer between the web application
 * and Tauri native runtime. All functions gracefully degrade to web APIs
 * when running inside a standard browser or PWA.
 */

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    "__TAURI_INTERNALS__" in window ||
    "__TAURI__" in window
  );
}

function mimeTypeForExtension(ext: string): string {
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    epub: "application/epub+zip",
    txt: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    html: "text/html",
    htm: "text/html",
    rtf: "application/rtf",
    odt: "application/vnd.oasis.opendocument.text",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
  };
  return mimeMap[ext.toLowerCase()] ?? "application/octet-stream";
}

export interface NativeFileMetadata {
  name: string;
  size: number;
  modified: number;
  is_file: boolean;
}

/**
 * Open native OS file picker and return a standard browser File object.
 * Returns null if the user cancelled or if not in Tauri.
 */
export async function openNativeFile(): Promise<File | null> {
  if (!isTauri()) return null;

  try {
    const { open } = await import("@tauri-apps/plugin-dialog");

    const selected = await open({
      multiple: false,
      directory: false,
      title: "Open Document in Leaf",
      filters: [
        {
          name: "All Supported Documents",
          extensions: [
            "pdf", "docx", "txt", "md", "markdown",
            "png", "jpg", "jpeg", "webp", "gif",
            "xlsx", "xls", "csv", "pptx", "epub",
            "rtf", "odt", "ods", "html", "htm",
          ],
        },
        { name: "PDF Documents", extensions: ["pdf"] },
        { name: "Word Documents", extensions: ["docx"] },
        { name: "Spreadsheets", extensions: ["xlsx", "xls", "csv", "ods"] },
        { name: "PowerPoint Presentations", extensions: ["pptx"] },
        { name: "E-Books", extensions: ["epub"] },
        { name: "Text & Markdown", extensions: ["txt", "md", "markdown", "rtf", "odt", "html", "htm"] },
        { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!selected || typeof selected !== "string") {
      return null;
    }

    return await readNativeFileFromPath(selected);
  } catch (error) {
    console.error("Failed to open native file via Tauri dialog:", error);
    return null;
  }
}

/**
 * Read a file directly from a native path into a web File object
 */
export async function readNativeFileFromPath(filePath: string): Promise<File | null> {
  if (!isTauri()) return null;

  try {
    const { readFile } = await import("@tauri-apps/plugin-fs");
    const bytes = await readFile(filePath);
    const fileName = filePath.replace(/\\/g, "/").split("/").pop() ?? "document";
    const ext = fileName.split(".").pop() ?? "";
    const file = new File([bytes], fileName, { type: mimeTypeForExtension(ext) });
    // Attach absolute path property for file watching / native capabilities
    Object.defineProperty(file, "nativePath", { value: filePath, writable: false });
    return file;
  } catch (error) {
    // Fallback: try invoke "read_file_binary"
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const bytes = await invoke<number[]>("read_file_binary", { path: filePath });
      const uint8 = new Uint8Array(bytes);
      const fileName = filePath.replace(/\\/g, "/").split("/").pop() ?? "document";
      const ext = fileName.split(".").pop() ?? "";
      const file = new File([uint8], fileName, { type: mimeTypeForExtension(ext) });
      Object.defineProperty(file, "nativePath", { value: filePath, writable: false });
      return file;
    } catch (fallbackError) {
      console.error("Failed to read native file from path:", filePath, error, fallbackError);
      return null;
    }
  }
}

/**
 * Read a chunk of bytes from a large native file without full in-memory loading
 */
export async function readNativeFileChunk(path: string, offset: number, length: number): Promise<Uint8Array | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const bytes = await invoke<number[]>("read_file_chunk", { path, offset, length });
    return new Uint8Array(bytes);
  } catch (error) {
    console.error("Failed to read native file chunk:", error);
    return null;
  }
}

/**
 * Get OS metadata for a native file
 */
export async function getNativeFileMetadata(path: string): Promise<NativeFileMetadata | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<NativeFileMetadata>("get_file_metadata", { path });
  } catch (error) {
    console.error("Failed to get native file metadata:", error);
    return null;
  }
}

/**
 * Save document state (bookmarks, highlights, progress) offline on device
 */
export async function saveNativeDocumentState<T>(docId: string, state: T): Promise<boolean> {
  if (!isTauri()) {
    try {
      localStorage.setItem(`leaf.doc.state.${docId}`, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_document_state", {
      docId,
      stateJson: JSON.stringify(state),
    });
    return true;
  } catch (error) {
    console.error("Failed to save native document state:", error);
    return false;
  }
}

/**
 * Load offline document state (bookmarks, highlights, progress)
 */
export async function loadNativeDocumentState<T>(docId: string): Promise<T | null> {
  if (!isTauri()) {
    try {
      const saved = localStorage.getItem(`leaf.doc.state.${docId}`);
      return saved ? (JSON.parse(saved) as T) : null;
    } catch {
      return null;
    }
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw = await invoke<string | null>("get_document_state", { docId });
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("Failed to load native document state:", error);
    return null;
  }
}

/**
 * Start watching an open local document for external modifications
 */
export async function watchNativeDocumentFile(path: string): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("watch_document_file", { path });
    return true;
  } catch (error) {
    console.error("Failed to start watching document file:", error);
    return false;
  }
}

/**
 * Stop watching document file
 */
export async function unwatchNativeDocumentFile(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("unwatch_document_file");
    return true;
  } catch {
    return false;
  }
}

/**
 * Listen for external file modifications from the native file watcher
 */
export async function listenForNativeFileModified(
  onModified: (data: { path: string; timestamp: number }) => void
): Promise<(() => void) | null> {
  if (!isTauri()) return null;
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen<{ path: string; timestamp: number }>("leaf:file-modified", (event) => {
      onModified(event.payload);
    });
  } catch (error) {
    console.error("Failed to listen for native file modifications:", error);
    return null;
  }
}

/**
 * Check if the application was launched with a document file argument (e.g. CLI or double-click OS file association)
 */
export async function getInitialNativeFilePath(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string | null>("get_initial_file_path");
  } catch {
    return null;
  }
}

/**
 * Listen for native window drag-and-drop events from the host operating system
 */
export async function listenForNativeFileDrop(onFile: (file: File) => void): Promise<(() => void) | null> {
  if (!isTauri()) return null;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const unlisten = await getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === "drop" && event.payload.paths && event.payload.paths.length > 0) {
        const filePath = event.payload.paths[0];
        const file = await readNativeFileFromPath(filePath);
        if (file) {
          onFile(file);
        }
      }
    });
    return unlisten;
  } catch (error) {
    console.error("Failed to register native drag drop listener:", error);
    return null;
  }
}

export interface NativeMenuHandlers {
  onOpen?: () => void;
  onPrint?: () => void;
  onClose?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onRotate?: () => void;
  onAbout?: () => void;
  onShortcuts?: () => void;
}

/**
 * Listen for native OS menu items triggered via top menu bar or native accelerators
 */
export async function listenForNativeMenuEvents(handlers: NativeMenuHandlers): Promise<(() => void) | null> {
  if (!isTauri()) return null;
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlisteners: Array<() => void> = [];

    if (handlers.onOpen) {
      unlisteners.push(await listen("leaf:menu-open", () => handlers.onOpen?.()));
    }
    if (handlers.onPrint) {
      unlisteners.push(await listen("leaf:menu-print", () => handlers.onPrint?.()));
    }
    if (handlers.onClose) {
      unlisteners.push(await listen("leaf:menu-close", () => handlers.onClose?.()));
    }
    if (handlers.onZoomIn) {
      unlisteners.push(await listen("leaf:menu-zoom-in", () => handlers.onZoomIn?.()));
    }
    if (handlers.onZoomOut) {
      unlisteners.push(await listen("leaf:menu-zoom-out", () => handlers.onZoomOut?.()));
    }
    if (handlers.onZoomReset) {
      unlisteners.push(await listen("leaf:menu-zoom-reset", () => handlers.onZoomReset?.()));
    }
    if (handlers.onRotate) {
      unlisteners.push(await listen("leaf:menu-rotate", () => handlers.onRotate?.()));
    }
    if (handlers.onAbout) {
      unlisteners.push(await listen("leaf:menu-about", () => handlers.onAbout?.()));
    }
    if (handlers.onShortcuts) {
      unlisteners.push(await listen("leaf:menu-shortcuts", () => handlers.onShortcuts?.()));
    }

    return () => {
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  } catch (error) {
    console.error("Failed to register native menu listeners:", error);
    return null;
  }
}

/**
 * Minimize native window
 */
export async function minimizeNativeWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  } catch (error) {
    console.error("Failed to minimize window:", error);
  }
}

/**
 * Toggle maximize / restore native window
 */
export async function toggleMaximizeNativeWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
  } catch (error) {
    console.error("Failed to toggle maximize window:", error);
  }
}

/**
 * Close native window
 */
export async function closeNativeWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } catch (error) {
    console.error("Failed to close window:", error);
  }
}

/**
 * Check if the window is currently maximized
 */
export async function isNativeWindowMaximized(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return await getCurrentWindow().isMaximized();
  } catch {
    return false;
  }
}
