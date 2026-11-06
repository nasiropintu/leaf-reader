# TODO

## Open and render local documents — Open local files without an account or upload workflow. Initial supported formats are PDF (.pdf), Word (.docx), plain text (.txt), Markdown (.md/.markdown), common images (.png, .jpg/.jpeg, .webp, .gif), Excel/CSV (.xlsx, .xls, .csv), PowerPoint (.pptx), EPUB (.epub), rich text/OpenDocument (.rtf, .odt, .ods), and web documents (.html, .htm).

- [x] Handle files entirely in the browser; do not add sign-in, cloud upload, or a backend document store.
- [x] Provide an explicit open-file action, allow replacing the current document, and show its name and supported-format feedback.
- [x] Render the readable content for each listed format, while explaining that presentation and OpenDocument rendering may not reproduce all original layout details.
- [x] Handle unsupported or unreadable files with a clear, recoverable message.

## Reader workspace and navigation — Provide clear rendering with page-by-page and continuous reading modes, previous/next navigation, direct page entry, and visible current-page and total-page status.

- [x] Present page-by-page and continuous reading modes for paginated documents.
- [x] Provide previous/next controls and direct page entry, with visible current/total status.
- [x] Adapt the reader layout to desktop, tablet, and mobile screens.

## Essential reading tools — Provide zooming, fit-to-width, fit-to-page, rotation, in-document text search with highlighted matches and next/previous result controls when supported, and locally persisted reader preferences.

- [x] Provide zoom, fit-to-width, fit-to-page, and rotation controls where applicable.
- [x] Search supported document text, highlight matches, and navigate to next/previous result.
- [x] Persist reader preferences on the device.

## Print — Provide browser-based printing with a straightforward print action and print-friendly document output.

- [x] Expose a print action in the reading workspace.
- [x] Produce print-friendly output without application chrome.

## Installable offline PWA — Provide a responsive, installable Progressive Web App with manifest, service worker, app shell, and GitHub-ready project structure; provide offline access to the installed app shell and locally opened documents for the current session where browser capabilities permit.

- [x] Include a valid app manifest, application icons, and service worker.
- [x] Cache the app shell for offline launch after a successful visit.
- [x] Keep loaded local documents readable for the current session while offline where browser capabilities permit.
- [x] Keep the project structure and scripts suitable for static GitHub Pages-style release and later native-app transition.

## Recents and accessibility — Provide recent-document shortcuts and locally persisted reader preferences; provide accessible keyboard controls, focus states, and semantic labels.

- [x] Store recent-document metadata and preferences locally; do not persist raw document bytes.
- [x] Clicking a recent item lets the user reselect the local file when the browser no longer exposes its bytes.
- [x] Provide keyboard-operable controls, visible focus states, and semantic labels.
