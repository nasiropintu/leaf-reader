# Leaf — Local-First Document Reader PWA

[![Live Demo](https://img.shields.io/badge/Live%20Demo-nasiropintu.github.io%2Fleaf--reader-teal.svg)](https://nasiropintu.github.io/leaf-reader/)
[![Crafted with Love by NasirPintu](https://img.shields.io/badge/Crafted%20with%20%E2%9D%A4%EF%B8%8F%20by-NasirPintu-crimson.svg)](https://github.com/nasiropintu)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy to GitHub Pages](https://github.com/nasiropintu/leaf-reader/actions/workflows/pages.yml/badge.svg)](https://github.com/nasiropintu/leaf-reader/actions/workflows/pages.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10+-orange.svg)](https://pnpm.io)

**Leaf** is a 100% free, private-by-design, local-first document reader Progressive Web App (PWA) conceived and architected by **NasirPintu**. All documents are parsed and rendered directly inside your browser sandbox and are **never uploaded** to any server. No accounts, paywalls, or subscriptions.

🔗 **Live Application:** [https://nasiropintu.github.io/leaf-reader/](https://nasiropintu.github.io/leaf-reader/)

---

## 🌟 Key Highlights

- **100% Private & Local-First**: Documents never leave your device. Raw file data is not persisted to disk or cloud.
- **Installable Offline PWA**: Works completely offline once installed via service worker app shell caching.
- **Broad Format Support**: PDF, Word, Excel, PowerPoint, EPUB, Markdown, plain text, images, and OpenDocument.
- **Reading Comfort**: Page-by-page and continuous reading modes, night/paper themes, zoom/fit controls, and 90° rotation.
- **In-Document Search**: Instant full-text search with match counters and hit navigation.
- **Zero-Configuration Deployment**: Runs as a static PWA ready for GitHub Pages or containerized via Docker.

---

## 📁 Supported Formats

| Category | Formats | In-Browser Engine / Strategy |
| :--- | :--- | :--- |
| **PDF** | `.pdf` | PDF.js canvas rendering with text layer search |
| **Word** | `.docx` | Mammoth parser converted to clean, readable text |
| **Spreadsheets** | `.xlsx`, `.xls`, `.csv` | SheetJS / XLSX rendered into interactive tabular sheets |
| **Presentations** | `.pptx` | JSZip XML parsing rendered as structured slide cards |
| **E-Books** | `.epub` | JSZip chapter extraction in sequential reading order |
| **Text & Markup** | `.txt`, `.md`, `.markdown`, `.html`, `.htm`, `.rtf`, `.odt`, `.ods` | Native text and DOM parsing with markdown formatting |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` | Responsive viewport rendering with zoom and rotation |

> **Note**: Leaf prioritizes distraction-free readable content over pixel-perfect document reproduction. Complex desktop publishing layouts, slide animations, or embedded multimedia may be simplified for readability.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [pnpm 10+](https://pnpm.io/) (`corepack enable && corepack prepare pnpm@10.18.0 --activate`)

### Development (Static PWA)

To run the client-side document reader locally:

```sh
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Start Vite dev server
pnpm dev:static
```

Open [http://localhost:3000](http://localhost:3000) in your browser and drag-and-drop any supported document.

### Building for Production (Static PWA)

```sh
pnpm build:static
```

The compiled, static PWA will be output to `dist/public`. This includes automated `404.html` SPA routing for seamless hosting on GitHub Pages, Netlify, Vercel, or Cloudflare Pages.

---

## 🌐 Deployment to GitHub Pages

Leaf is pre-configured with a GitHub Actions workflow in `.github/workflows/pages.yml`.

To deploy:
1. Push this repository to GitHub on branch `main`.
2. Go to **Settings > Pages** in your GitHub repository.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. Every push to `main` will automatically build and publish Leaf to your GitHub Pages URL (`https://<username>.github.io/<repo>/`).

---

## 🐳 Docker Deployment (Optional Server Mode)

Leaf also includes a production-ready `Dockerfile` and optional Express application server:

```sh
# Build the Docker image
docker build -t leaf-reader .

# Run the container
docker run -d -p 3000:3000 leaf-reader
```

Access Leaf at [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Reader Tools & Shortcuts

- **Reading Modes**: Switch between single page and continuous scroll modes for paginated formats.
- **Zoom & Alignment**: Zoom in/out, fit to page width, fit to viewport, and 90° rotation.
- **Search**: `Ctrl` / `Cmd` + `F` opens the search bar with live match counter and jump navigation.
- **Themes**: Paper (warm cream background) and Night (subdued dark theme).
- **Navigation**: Next/Previous page buttons, keyboard arrow navigation, and direct page input.
- **Printing**: Clean print view that automatically hides reader chrome and toolbars.
- **Recents**: Quick-access recent documents list stored in device `localStorage`.

---

## 📂 Project Structure

```text
├── client/
│   ├── index.html                  # HTML entry point with metadata & branding
│   ├── public/                     # PWA manifest, service worker, icons, nasirpintu.jpg
│   └── src/
│       ├── components/
│       │   ├── AboutModal.tsx      # Creator attribution & AI collaboration credits modal
│       │   ├── PdfReader.tsx       # PDF.js canvas and continuous rendering engine
│       │   └── ui/                 # Accessible Radix UI components
│       ├── lib/
│       │   └── documents.ts        # Format detection, extraction, and parsing
│       ├── pages/
│       │   └── Home.tsx            # Reader workspace and local preferences
│       ├── App.tsx                 # Base-safe routing & root providers
│       └── main.tsx                # Client boot & service worker registration
├── server/                         # Optional Node.js/Express server & API routes
├── drizzle/                        # Optional database schema migrations
├── .github/workflows/pages.yml     # Automated GitHub Pages CI/CD workflow
├── Dockerfile                      # Container build definition
└── vite.config.ts                  # Vite build, PWA & SPA fallback configuration
```

---

## 👤 Creator & Vision

**NasirPintu** (Mohammad Nasiruddin Pintu)  
*Creator, Product Architect & Open-Source Builder*

*Building 100% free, private-by-design, serverless digital tools that empower individuals without paywalls, subscriptions, tracking, or data surveillance.*

* **GitHub:** [@nasiropintu](https://github.com/nasiropintu)
* **X (Twitter):** [@nasiropintu](https://x.com/nasiropintu)
* **Instagram:** [@the_np2](https://www.instagram.com/the_np2/)
* **Facebook:** [mohammadnasiruddin.pintu](https://www.facebook.com/mohammadnasiruddin.pintu/)

---

## 🤖 Human + AI Collaboration Credits

Conceived, designed, and architected by **NasirPintu** in active engineering synergy with leading artificial intelligence assistants:

* **Gemini** *(Google DeepMind)* — Architecture, full-stack reasoning & agentic execution.
* **Manus** *(Manus AI)* — Autonomous workflow planning & synthesis.
* **ChatGPT** *(OpenAI)* — Logic synthesis & edge-case optimization.
* **DeepSeek** — Algorithmic engineering & deep code intelligence.
* **Claude** *(Anthropic)* — Systems reasoning & code clarity.
* **Vibe by Mistral** *(Mistral AI)* — Fast code generation & pragmatic implementation.

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).
