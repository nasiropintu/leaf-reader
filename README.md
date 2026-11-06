# Leaf — Local-First Document Reader PWA

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy to GitHub Pages](https://github.com/actions/workflows/pages.yml/badge.svg)](.github/workflows/pages.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10+-orange.svg)](https://pnpm.io)

Leaf is a fast, installable, local-first document reader Progressive Web App (PWA). All files are opened entirely inside your browser sandbox and are **never uploaded** to any server. No account or sign-in is required.

---

## Key Highlights

- **100% Private & Local-First**: Documents never leave your device. Raw file data is not persisted to disk or cloud.
- **Installable PWA**: Works offline once installed via service worker app shell caching.
- **Broad Format Support**: PDF, Word, Excel, PowerPoint, EPUB, Markdown, images, and more.
- **Reading Comfort**: Page-by-page and continuous reading modes, night/paper themes, zoom/fit controls, and rotation.
- **In-Document Search**: Instant text search with match counts and hit navigation.
- **Zero Configuration Deployment**: Ready to deploy directly to GitHub Pages via included GitHub Actions workflow.

---

## Supported Formats

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

## Quick Start

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

The compiled, static PWA will be output to `dist/public`. This directory is ready to be hosted on any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, etc.).

---

## Deployment to GitHub Pages

Leaf is pre-configured with a GitHub Actions workflow in `.github/workflows/pages.yml`.

To deploy:
1. Push this repository to GitHub on branch `main`.
2. Go to **Settings > Pages** in your GitHub repository.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. Every push to `main` will automatically build and publish Leaf to your GitHub Pages URL.

---

## Docker Deployment (Optional Server Mode)

Leaf also includes a production-ready `Dockerfile` and optional Express application server:

```sh
# Build the Docker image
docker build -t leaf-reader .

# Run the container
docker run -d -p 3000:3000 leaf-reader
```

Access Leaf at [http://localhost:3000](http://localhost:3000).

---

## Reader Tools & Shortcuts

- **Reading Modes**: Switch between single page and continuous scroll modes for paginated formats.
- **Zoom & Alignment**: Zoom in/out, fit to page width, fit to viewport, and 90° rotation.
- **Search**: `Ctrl` / `Cmd` + `F` opens the search bar with live match counter and jump navigation.
- **Themes**: Paper (warm cream background) and Night (subdued dark theme).
- **Navigation**: Next/Previous page buttons, keyboard arrow navigation, and direct page input.
- **Printing**: Clean print view that automatically hides reader chrome and toolbars.
- **Recents**: Quick-access recent documents list stored in device `localStorage`.

---

## Project Structure

```text
├── client/
│   ├── index.html                  # HTML entry point
│   ├── public/                     # PWA manifest, service worker, icons
│   └── src/
│       ├── components/
│       │   ├── PdfReader.tsx       # PDF.js canvas and continuous rendering engine
│       │   └── ui/                 # Accessible Radix UI components
│       ├── lib/
│       │   └── documents.ts        # Format detection, extraction, and parsing
│       ├── pages/
│       │   └── Home.tsx            # Reader workspace and local preferences
│       ├── App.tsx                 # Routing and root providers
│       └── main.tsx                # Client boot & service worker registration
├── server/                         # Optional Node.js/Express server & API routes
├── drizzle/                        # Optional database schema migrations
├── .github/workflows/pages.yml     # Automated GitHub Pages CI/CD workflow
├── Dockerfile                      # Container build definition
└── vite.config.ts                  # Vite build and PWA configuration
```

---

## Scripts Reference

| Command | Description |
| :--- | :--- |
| `pnpm dev:static` | Starts the Vite development server on port 3000 |
| `pnpm build:static`| Builds static PWA bundle into `dist/public` |
| `pnpm dev` | Starts full-stack development server with Vite middleware |
| `pnpm build` | Builds both frontend bundle and Node server |
| `pnpm start` | Runs the compiled server from `dist/index.js` |
| `pnpm check` | Runs TypeScript type checking (`tsc --noEmit`) |
| `pnpm test` | Runs test suite via Vitest |
| `pnpm format` | Formats all files with Prettier |

---

## License

This project is licensed under the [MIT License](LICENSE).
