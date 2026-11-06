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

/**
 * Open native OS file picker and return a standard browser File object.
 * Returns null if the user cancelled or if not in Tauri.
 */
export async function openNativeFile(): Promise<File | null> {
  if (!isTauri()) return null;

  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readFile } = await import("@tauri-apps/plugin-fs");

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

    const filePath = selected;
    const fileName = filePath.replace(/\\/g, "/").split("/").pop() ?? "document";
    const bytes = await readFile(filePath);

    // Derive mime type from file extension
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
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
    };

    const mimeType = mimeMap[ext] ?? "application/octet-stream";
    return new File([bytes], fileName, { type: mimeType });
  } catch (error) {
    console.error("Failed to open native file via Tauri:", error);
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
