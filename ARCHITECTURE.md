# YTDL — Architecture Document

## Overview

YTDL follows a **two-tier architecture**: a backend Express.js HTTP server and a frontend single-page application (SPA). The server handles all heavy lifting (yt-dlp invocations, file processing, security, logging) while the frontend provides a reactive UI. An optional Electron shell wraps the web app into a native desktop application.

```
┌──────────────────────────────────────────────────────┐
│                    Electron Shell                     │
│  ┌────────────────────────────────────────────────┐  │
│  │              Express Server (:3000)              │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────────┐  │  │
│  │  │ Security │ │ Logging  │ │  yt-dlp /      │  │  │
│  │  │ Module   │ │ Winston  │ │  ffmpeg Runner │  │  │
│  │  └─────────┘ └──────────┘ └────────────────┘  │  │
│  │                   │                            │  │
│  │         ┌─────────┴─────────┐                  │  │
│  │         │   REST API        │                  │  │
│  │         │ /api/info         │                  │  │
│  │         │ /api/download     │                  │  │
│  │         │ /api/health       │                  │  │
│  │         └─────────┬─────────┘                  │  │
│  └───────────────────┼────────────────────────────┘  │
│                      │ HTTP                           │
│  ┌───────────────────┼────────────────────────────┐  │
│  │     BrowserView / WebContents                  │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │        Frontend SPA (Vanilla JS)          │  │  │
│  │  │  index.html → styles.css → app.js        │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Entry Points

| File | Mode | Description |
|------|------|-------------|
| `src/server.ts` | Standalone | Starts Express server directly (`pnpm start`) |
| `src/main.ts` | Electron | Starts Express server, then opens Electron window (`pnpm run electron:dev`) |
| `server.js` | Legacy | Original JavaScript server (no longer primary) |
| `main.js` | Legacy | Original Electron main (no longer primary) |

### Module Dependency Graph

```
server.ts
  ├── security.ts     (URL validation, filename sanitization)
  ├── config.ts       (Zod-validated environment config)
  ├── errors.ts       (Custom error classes)
  └── winston          (Logging)

main.ts (Electron)
  ├── server.ts        (Embedded Express server)
  └── preload.ts       (contextBridge API exposure)

preload.ts
  └── electron          (IPC via contextBridge)
```

### Core Module: `src/server.ts`

The Express server is the heart of YTDL. It provides three REST endpoints and manages the yt-dlp binary lifecycle.

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `getYtDlpPath()` | Resolves yt-dlp binary path (bin/ folder or PATH) |
| `downloadFile()` | Downloads files over HTTPS with redirect following |
| `ensureYtDlp()` | Verifies yt-dlp availability, auto-downloads if missing |
| `ensureFfmpeg()` | Same for ffmpeg (used for audio conversion) |
| `runYtDlp()` | Spawns yt-dlp process, collects stdout/stderr |
| `startServer()` | Initializes Express, starts listening on configurable port |

### Core Module: `src/security.ts`

| Function | Purpose |
|----------|---------|
| `validateUrl()` | SSRF prevention — only allows YouTube domains, blocks private IPs |
| `sanitizeFilename()` | Removes path traversal sequences, restricts to safe characters |
| `generateSecureFilename()` | Creates cryptographically random temp filenames |
| `secureDownloadFile()` | Downloads with configurable file size limits |
| `cleanupTempFiles()` | Periodic cleanup of stale temp files |

### Core Module: `src/config.ts`

Uses **Zod** for runtime configuration validation with TypeScript inference:

```typescript
const configSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  maxFileSize: z.number().int().min(1).max(1024).default(100), // MB
  tempDir: z.string().default("./temp"),
  logLevel: z.enum(["error","warn","info","http","verbose","debug","silly"]).default("info"),
  nodeEnv: z.enum(["development","production","test"]).default("development"),
  rateLimitWindowMs: z.number().int().min(1000).default(60000),
  rateLimitMaxRequests: z.number().int().min(1).default(100),
  downloadTimeoutMs: z.number().int().min(5000).default(300000),
  ytDlpAutoUpdate: z.boolean().default(true),
  ffmpegAutoDownload: z.boolean().default(true),
});
```

### Core Module: `src/errors.ts`

Hierarchy of custom error classes for consistent API error responses:

```
AppError (base)
├── ValidationError (400)
├── NotFoundError (404)
├── ExternalServiceError (502)
├── RateLimitError (429)
├── DownloadError (500)
└── BinaryNotFoundError (503)
```

---

## Frontend Architecture

### File Structure

```
public/
├── index.html     # Main SPA shell
├── styles.css     # All styling (1083 lines)
├── app.js         # Application logic (~400 lines)
└── icon.png       # App icon
```

### State Management (`app.js`)

The frontend uses a simple singleton state object:

```javascript
const state = {
  videoInfo: null,       // Current video metadata from /api/info
  formats: [],           // Available download formats
  selectedFormatId: null,// User-selected format ID
  downloadMode: "video", // "video" or "audio"
  isDownloading: false,  // Download in progress flag
  isElectron: ...,       // Detected Electron environment
  history: [],           // Download history array
};
```

### UI Components

| Component | HTML ID | Purpose |
|-----------|---------|---------|
| Title Bar | `#title-bar` | Electron frameless window controls |
| URL Input | `#url-input` | YouTube URL entry |
| Paste Button | `#paste-btn` | Clipboard paste trigger |
| Fetch Button | `#fetch-btn` | Trigger /api/info request |
| Loading Skeleton | `#loading-section` | Animated shimmer placeholder |
| Video Card | `#video-section` | Thumbnail + metadata display |
| Format Tabs | `#tab-video`, `#tab-audio` | Video/Audio mode toggle |
| Format Select | `#format-select` | Quality dropdown |
| Download Button | `#download-btn` | Start download |
| History | `#history-section` | Download history panel |
| Status Bar | `#status-bar` | Server health indicator |
| Toast Container | `#toast-container` | Notification toasts |

### Data Flow

```
User pastes URL → fetchVideoInfo() → GET /api/info?url=...
                                      ↓
                              Parse JSON response
                                      ↓
                          renderVideoInfo() + populateFormats()
                                      ↓
User selects format + clicks Download → startDownload()
                                      ↓
                              GET /api/download?url=...
                                      ↓
                              Receive blob → trigger download
                                      ↓
                              addHistory() → save to localStorage
```

---

## Electron Integration

### Process Architecture

```
Main Process (main.ts)
  ├── Creates Express server
  ├── Creates BrowserWindow
  └── Handles IPC (window controls)

Preload Script (preload.ts)
  └── contextBridge.exposeInMainWorld("electronAPI", {
        minimize, maximize, close, isMaximized
      })

Renderer (public/index.html + app.js)
  └── Detects electronAPI → shows title bar → calls IPC
```

### Frameless Window

- `frame: false` in BrowserWindow options
- Custom title bar with drag region (`-webkit-app-region: drag`)
- Buttons with `-webkit-app-region: no-drag`
- IPC handlers for minimize, maximize, close

### Binary Packaging

For production builds (`electron:build`):
- `yt-dlp.exe` bundled via `extraResources`
- `ffmpeg.exe` bundled via `extraResources`
- Resolved at runtime via `process.resourcesPath`

---

## Security Architecture

### Defense in Depth

| Layer | Protection |
|-------|-----------|
| CSP | Blocks XSS via script-src restriction |
| URL Validation | Only YouTube domains; blocks SSRF to private networks |
| Rate Limiting | configurable per-IP rate limits |
| Filename Sanitization | Prevents path traversal via `../` removal |
| Temp Files | crypto.randomBytes for unique names |
| File Size | Configurable max (default 100MB) |
| Process Isolation | Electron sandbox + contextIsolation |

### URL Validation Flow

```
User input → URL constructor parse
  → Check protocol (http/https only)
  → Check hostname NOT localhost/127.0.0.1/[::1]
  → Check hostname NOT private IP ranges
  → Check hostname IS youtube.com/youtu.be (or subdomains)
  → If not YouTube → reject with "Invalid URL"
  → If YouTube → proceed
```

---

## Performance Considerations

- **Streaming Downloads**: Files are streamed directly to the client without being fully buffered in memory
- **Temp File Cleanup**: Hourly cleanup of files older than 24 hours
- **Process Management**: yt-dlp processes are killed on client disconnect
- **Memory Monitoring**: Periodic heap/RSS tracking via Winston

---

## Technology Choices

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Express.js** | HTTP server | Lightweight, well-tested, vast ecosystem |
| **TypeScript** | Language | Type safety, better IDE support, maintainability |
| **pnpm** | Package manager | Faster, disk-efficient, strict dependency resolution |
| **Winston** | Logging | Structured JSON logs, multiple transports, log levels |
| **Helmet** | Security | Battle-tested CSP and HTTP headers |
| **Zod** | Validation | Runtime + TypeScript type inference, composable schemas |
| **Vanilla JS** | Frontend | No build step, lightweight, no framework overhead |
| **Electron** | Desktop | Cross-platform, web technologies for desktop apps |
| **yt-dlp** | Downloading | Actively maintained fork of youtube-dl, best-in-class |

---

## Project Milestones

1. ✅ **Initial Setup** — Express server, yt-dlp integration, basic UI
2. ✅ **TypeScript Migration** — Full type safety, tsconfig.json
3. ✅ **Security Hardening** — URL validation, CSP, filename sanitization
4. ✅ **Testing** — Jest, supertest, test infrastructure
5. ✅ **Electron Integration** — Frameless window, IPC, packaging
6. ✅ **Frontend SPA** — Full app.js with history, toasts, keyboard shortcuts
7. ✅ **Documentation** — README, ARCHITECTURE, API, DEVELOPMENT, TROUBLESHOOTING