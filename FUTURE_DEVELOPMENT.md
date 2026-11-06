# Leaf — Future Development & Native Transition Roadmap

**Author & Architect:** NasirPintu  
**Repository:** [nasiropintu/leaf-reader](https://github.com/nasiropintu/leaf-reader)  
**Status:** Living Architectural Roadmap

---

## 📑 Table of Contents

1. [Web Reader Enhancement Proposals (PWA Phase 2)](#1-web-reader-enhancement-proposals-pwa-phase-2)
2. [Native Development Plan (Leaf Desktop & Mobile)](#2-native-development-plan-leaf-desktop--mobile)
   - [2.1 Architecture Selection](#21-architecture-selection)
   - [2.2 Phase 1: Tauri v2 Core Integration](#22-phase-1-tauri-v2-core-integration)
   - [2.3 Phase 2: OS-Level Integrations & File Associations](#23-phase-2-os-level-integrations--file-associations)
   - [2.4 Phase 3: High-Performance File Streaming & Offline Engine](#24-phase-3-high-performance-file-streaming--offline-engine)
   - [2.5 Phase 4: Mobile Platform Expansion (Android & iOS)](#25-phase-4-mobile-platform-expansion-android--ios)
   - [2.6 Phase 5: CI/CD Packaging & Distribution](#26-phase-5-cicd-packaging--distribution)
3. [Implementation Milestones & Execution Checklist](#3-implementation-milestones--execution-checklist)

---

## 1. Web Reader Enhancement Proposals (PWA Phase 2)

These proposals preserve Leaf's **100% private, browser-only, zero-backend** architecture while elevating the reading experience:

### 1.1 Interactive Table of Contents (Outline Sidebar)
- **PDF Outlines:** Ingest PDF bookmarks via `pdfDocument.getOutline()` and render a collapsible hierarchical tree drawer.
- **EPUB Navigation:** Parse `toc.ncx` / `nav.xhtml` to let readers jump directly to chapters and sub-sections.
- **Markdown & HTML:** Auto-generate an in-memory outline from `h1`–`h6` heading tags with smooth scrolling anchors.

### 1.2 Read Aloud (Browser-Native Text-to-Speech)
- **Native Web Speech API:** Leverage `window.speechSynthesis` for zero-network, 100% private text-to-speech.
- **Player Controls:** Play, pause, skip sentence/paragraph, rate controller (0.5x–2.0x), pitch, and local voice selector.
- **Karaoke Word Highlighting:** Highlight the sentence or phrase currently being spoken.

### 1.3 Local Annotations, Bookmarks & Sticky Notes
- **Client-Side Storage:** Store highlights, user notes, and page bookmarks in IndexedDB / LocalStorage keyed by document hash or file name/size signature.
- **Annotation Tools:** Color-coded highlighter (Yellow, Green, Cyan, Coral) for text-layer selections.
- **Export Notes:** Export document summaries, highlights, and annotations as Markdown (`.md`) or JSON.

### 1.4 Two-Page Spread (Book / Magazine View)
- **Dual-Page Reading:** Display facing pages side-by-side on wide desktop viewports and tablet landscape orientations.
- **Cover Page Offset:** Support single first page (cover) followed by paired spreads.

### 1.5 Advanced Typography & Reading Comfort
- **Font Selection:** Customizable typography for text formats (EPUB, Markdown, DOCX, TXT) including Editorial Serif, Modern Sans, Monospace, and OpenDyslexic (dyslexia-friendly).
- **Line & Spacing Controls:** Adjustable line height, letter spacing, text alignment, and margin padding.

### 1.6 Multi-Document Tabbed Workspace
- **Session Tabs:** Keep multiple documents active concurrently in a top tab bar without reloading.
- **Quick Switcher:** Keyboard shortcut (`Ctrl+Tab` / `Cmd+Tab`) to navigate between open reference documents.

---

## 2. Native Development Plan (Leaf Desktop & Mobile)

### 2.1 Architecture Selection

To transition Leaf into a cross-platform native application, two primary architectures were evaluated:

| Metric | Tauri v2 *(Recommended)* | Electron |
| :--- | :--- | :--- |
| **Binary Size** | **~10 – 15 MB** | ~120 – 180 MB |
| **Memory Footprint (Idle)** | **~30 – 50 MB RAM** | ~200 – 350 MB RAM |
| **Web Engine** | Native OS Webview (WebView2 / WebKit) | Bundled Chromium |
| **Backend Core** | Rust (ultra-fast, secure, memory-safe) | Node.js |
| **Mobile Support** | **Built-in (Android & iOS in v2)** | Desktop only (requires Capacitor/Cordova) |
| **Startup Time** | **< 300 ms** | 1.5 – 3.0 s |

> **Decision:** **Tauri v2** is selected as the primary native framework. It allows Leaf to reuse 100% of the existing React + Vite + Tailwind frontend while gaining native OS speeds, tiny standalone installers, and mobile target support with Rust security.

---

### 2.2 Phase 1: Tauri v2 Core Integration (Completed)

- [x] **Scaffold Tauri v2:** Initialized `src-tauri` inside the Leaf workspace with Cargo configuration, plugins, and app capabilities.
- [x] **Dual-Target Vite Config:** Configured `vite.config.ts` and `package.json` with scripts (`tauri`, `tauri:dev`, `tauri:build`, `build:static`) serving both web PWA and Tauri desktop/mobile builds.
- [x] **IPC Bridge:** Established typed native bridge (`client/src/lib/native.ts`) with graceful web fallback, supporting native OS file dialogs and window controls.
- [x] **Custom Native Window Frame:** Implemented `client/src/components/NativeTitlebar.tsx` with native window dragging (`data-tauri-drag-region`), minimize, maximize/restore, and close buttons integrated seamlessly with Leaf's theme.

---

### 2.3 Phase 2: OS-Level Integrations & File Associations

- [ ] **OS File Associations:** Register Leaf with native OS desktop file handlers so double-clicking or right-clicking **"Open With → Leaf"** opens documents directly:
  - `.pdf` (Adobe PDF)
  - `.docx` (Microsoft Word)
  - `.xlsx`, `.xls`, `.csv` (Spreadsheets)
  - `.pptx` (PowerPoint)
  - `.epub` (Electronic Books)
  - `.md`, `.markdown`, `.txt` (Text & Markdown)
- [ ] **Native CLI Arguments:** Parse command-line paths (e.g., `leaf document.pdf`) passed on application startup.
- [ ] **Native Drag & Drop:** Support dragging files directly from Windows File Explorer, macOS Finder, or Linux Nautilus onto any part of Leaf.
- [ ] **Native Menus & Shortcuts:**
  - Standard OS Application Menu (`File`, `Edit`, `View`, `Window`, `Help`).
  - Global native keyboard shortcuts (`Ctrl+O` / `Cmd+O`, `Ctrl+P` / `Cmd+P`, `Ctrl+F` / `Cmd+F`).
- [ ] **Recent Files Integration:** Sync Leaf's recents with Windows "Jump Lists" and macOS "Recent Documents" in the dock.

---

### 2.4 Phase 3: High-Performance File Streaming & Offline Engine

- [ ] **Direct Native File Streaming:** Read multi-gigabyte files directly from the disk using Rust file streams without browser memory constraints.
- [ ] **Local SQLite / RocksDB Persistence:** Use a zero-config native SQLite database (via `sqlx` or `rusqlite`) for persistent bookmarks, reading progress, and fast full-text search indexing.
- [ ] **File Watcher:** Listen to native OS file modification events (`notify` crate in Rust) to automatically refresh open documents when edited by external tools (e.g., a Markdown file updated in an IDE).
- [ ] **Native Printing Dialog:** Trigger native OS print pipelines for high-resolution vector output.

---

### 2.5 Phase 4: Mobile Platform Expansion (Android & iOS)

Leverage Tauri v2 Mobile capabilities (or Capacitor bridge):

- [ ] **Mobile Touch & Gestures:**
  - Horizontal swipe for next/previous page turns with natural momentum physics.
  - Double-tap and pinch-to-zoom support for PDF, image, and text views.
- [ ] **Mobile System Share Target:**
  - Register Leaf as a document viewer in Android `Intent` filters (`ACTION_VIEW`, `ACTION_SEND`) and iOS `UIDocumentInteractionController`.
  - Open attachments directly from Gmail, WhatsApp, Slack, or local Files app into Leaf.
- [ ] **Edge-to-Edge Safe Area Insets:** Adapt layout to notch, dynamic island, and Android navigation bars.
- [ ] **Low-Power Mode & Battery Efficiency:** Suspend background rendering when the app is placed in the background or screen is locked.

---

### 2.6 Phase 5: CI/CD Packaging & Distribution

Configure automated GitHub Actions workflows to build, sign, and publish native installers:

| Platform | Target Package Formats | Distribution Channels |
| :--- | :--- | :--- |
| **Windows** | `.msi`, `.exe` (Inno Setup / NSIS), `.msix` | GitHub Releases, Microsoft Store, Winget (`winget install leaf`) |
| **macOS** | `.dmg` (Universal Apple Silicon + Intel), `.app` | GitHub Releases, Homebrew Cask, Mac App Store |
| **Linux** | `.AppImage`, `.deb`, `.rpm`, `flatpak` | GitHub Releases, Flathub, Snapcraft |
| **Android** | `.apk`, `.aab` | GitHub Releases, Google Play Store, F-Droid |
| **iOS** | `.ipa` | Apple TestFlight, Apple App Store |

- [ ] **Code Signing & Notarization:**
  - Windows Authenticode certificate signing.
  - Apple Developer ID signing & `notarytool` automated notarization.
- [ ] **Auto-Updater:** Tauri native auto-updater with cryptographic signature validation for seamless delta updates.

---

## 3. Implementation Milestones & Execution Checklist

```mermaid
flowchart LR
    A["Web PWA (Stable v1.0)"] --> B["Phase 1: Tauri v2 Desktop Scaffold"]
    B --> C["Phase 2: OS File Associations & Native Menus"]
    C --> D["Phase 3: High-Performance Rust File Streaming"]
    D --> E["Phase 4: Mobile Target (Android / iOS)"]
    E --> F["Phase 5: Automated CI/CD & Store Release"]
```

### Sprint 1: Native Desktop Scaffold (Tauri v2)
- Set up Rust toolchain and Tauri v2 dependencies.
- Build native window shell running the Leaf frontend.
- Implement native file picker (`rfd` or Tauri dialog API).

### Sprint 2: Deep OS Integration
- Implement file association handling for `.pdf`, `.docx`, `.epub`, etc.
- Build native top menu bar and system shortcut accelerators.
- Support native drag-and-drop from the operating system.

### Sprint 3: Advanced Reader Enhancements
- Port Table of Contents (Outline) and Read Aloud (TTS) into the unified UI.
- Implement persistent SQLite bookmarks and annotations.

### Sprint 4: Packaging & Release Pipeline
- Set up GitHub Actions multi-runner matrix (Ubuntu, macOS, Windows).
- Generate signed installers and automated GitHub Releases.
