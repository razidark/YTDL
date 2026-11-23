# YTDL — Premium YouTube Downloader

![YTDL](public/icon.png)

**YTDL** is a premium YouTube Downloader desktop application built with Electron and Express. It uses `yt-dlp` to download YouTube videos and audio in the highest quality, wrapped in a stunning cyberpunk/glassmorphism UI.

---

## ✨ Features

- **Video & Audio Download** — Download YouTube videos and audio in multiple formats and resolutions
- **High Quality** — Support for 4K, 1080p, 720p video and high-bitrate MP3 audio (up to 320kbps)
- **Smart Naming** — Automatically includes artist/channel information in filenames
- **Format Selection** — Choose from available formats with file sizes displayed
- **Download History** — Persistent history with favorites, rename, and delete functionality (stored in localStorage)
- **Clipboard Paste** — One-click paste from clipboard with visual feedback
- **Auto Binary Download** — Automatically downloads yt-dlp and ffmpeg if not found
- **Health Monitoring** — Real-time server health checks with status bar
- **Electron Support** — Frameless window with custom title bar and window controls
- **Secure** — URL validation against SSRF, filename sanitization, CSP headers, file size limits
- **Cyberpunk UI** — Glassmorphism design with animated blobs, neon gradients, and smooth animations
- **Keyboard Shortcuts** — Power-user shortcuts for common operations

---

## 🖥️ Screenshots

| Component | Description |
|-----------|-------------|
| URL Input | Paste or type a YouTube URL, click Fetch or press Enter |
| Loading Skeleton | Animated shimmer placeholder while fetching video info |
| Video Card | Thumbnail, title, channel, views, duration |
| Format Tabs | Video / Audio mode toggle with format quality selector |
| Download | Single-click download with progress indicator |
| History | Expandable download history with favorites, rename, delete |
| Status Bar | Real-time yt-dlp version and server status |
| Title Bar | Custom Electron frameless title bar with minimize/maximize/close |

---

## 📦 Installation

### Prerequisites

| Requirement | Version |
|-------------|---------|
| [Node.js](https://nodejs.org/) | 18+ |
| [pnpm](https://pnpm.io/) | 8+ (recommended) |
| [Git](https://git-scm.com/) | Any recent version |

### Development Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd YTDL

# 2. Install dependencies
pnpm install

# 3. Build TypeScript
pnpm run build

# 4. Start the server (standalone mode)
pnpm start

# 5. Or run Electron (desktop mode)
pnpm run electron:dev
```

### Building for Production

```bash
# 1. Build TypeScript
pnpm run build

# 2. Build standalone Electron portable executable
pnpm run electron:build

# 3. Or build directory for manual distribution
pnpm run electron:build:dir
```

The portable executable will be built to `dist/YTDL-Portable.exe`.

---

## 🚀 Usage

### Quick Start

1. **Launch** YTDL (standalone: `pnpm start`, or desktop: `pnpm run electron:dev`)
2. **Paste** a YouTube URL in the input field (or use the paste button)
3. **Fetch** — Press Enter or click the arrow button to load video information
4. **Select** — Choose between **Video** or **Audio** tab, then pick your desired quality
5. **Download** — Click the Download button to save the file

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Fetch video info |
| `Ctrl+V` / `Cmd+V` | Paste from clipboard |
| `Ctrl+S` / `Cmd+S` | Minimize window (Electron) |
| `Ctrl+W` / `Cmd+W` | Close window (Electron) |
| `Ctrl+Shift+V` / `Cmd+Shift+V` | Toggle download history |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/info` | Fetch video metadata and available formats |
| GET | `/api/download` | Download video or audio file |
| GET | `/api/health` | Server health and yt-dlp status |

### GET /api/info

Fetch video information from a YouTube URL.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | Full YouTube video URL |

**Response:** JSON object with video metadata and available formats.

Full examples in [API.md](API.md).

### GET /api/download

Download a video or audio file.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | — | YouTube video URL |
| `formatId` | string | best | Specific format ID from `/api/info` |
| `mode` | string | `video` | `video` or `audio` |
| `kbps` | number | `320` | Audio bitrate (max 320) |

**Response:** Binary file stream.

### GET /api/health

```bash
curl http://localhost:3000/api/health
```

Returns server status, yt-dlp version, memory usage, uptime, and more.

---

## 🏗️ Architecture

```
YTDL/
├── bin/                  # Binary storage (yt-dlp, ffmpeg)
├── dist/                 # Compiled TypeScript output
├── public/               # Static frontend files
│   ├── index.html        # Main HTML (SPA)
│   ├── styles.css        # Cyberpunk/Glassmorphism CSS
│   ├── app.js            # Frontend application logic
│   └── icon.png          # Application icon
├── src/                  # TypeScript source
│   ├── server.ts         # Express server with API endpoints
│   ├── main.ts           # Electron main process
│   ├── preload.ts        # Electron preload (contextBridge)
│   ├── security.ts       # Security utilities
│   ├── config.ts         # Zod-validated configuration
│   ├── errors.ts         # Custom error classes
│   └── __tests__/        # Jest test files
├── package.json
├── tsconfig.json
├── eslint.config.js
└── jest.config.js
```

For complete architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📋 Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start server with watch mode (`node --watch`) |
| `pnpm start` | Start Express server |
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm run electron:dev` | Run Electron in development mode |
| `pnpm run electron:build` | Build portable Windows executable |
| `pnpm run test` | Run Jest tests |
| `pnpm run test:watch` | Run Jest in watch mode |
| `pnpm run test:cov` | Run tests with coverage report |
| `pnpm run lint` | Run ESLint |
| `pnpm run typecheck` | TypeScript type checking |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `LOG_LEVEL` | `info` | Logging verbosity (debug, info, warn, error) |
| `MAX_FILE_SIZE` | `100` | Maximum download size in MB |
| `TEMP_DIR` | `./temp` | Temporary download directory |
| `NODE_ENV` | `development` | Environment mode |
| `YTDL_BIN_DIR` | `./bin` | Binary directory path |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in ms |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `DOWNLOAD_TIMEOUT_MS` | `300000` | Download timeout (5 min) |

---

## 🔒 Security

YTDL implements defense-in-depth security:

- **SSRF Protection** — URL validation blocks private/local IP ranges
- **Path Traversal Prevention** — Filenames are sanitized against `../` attacks
- **Content Security Policy** — Helmet middleware with strict CSP headers
- **File Size Limits** — Configurable max download file size
- **Secure Temp Files** — Cryptographically random temporary filenames
- **Rate Limiting** — Configurable rate limiting per IP
- **Input Validation** — Zod schema validation for all configuration
- **Error Handling** — Graceful error recovery without information leakage

---

## 📄 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file — overview and quick start |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Detailed architecture and design decisions |
| [API.md](API.md) | Complete API reference with examples |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Development guide and best practices |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and solutions |
| [.env.example](.env.example) | Environment variable reference |

---

## 🧪 Testing

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:cov
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Make your changes
4. Run tests (`pnpm run test`)
5. Run linting (`pnpm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing`)
8. Open a Pull Request

---

## 📝 License

ISC License. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — Command-line video downloader
- [Electron](https://electronjs.org) — Desktop application framework
- [Express.js](https://expressjs.com) — Web framework
- [Winston](https://github.com/winstonjs/winston) — Logging framework
- [Helmet](https://github.com/helmetjs/helmet) — Security middleware
- [Zod](https://zod.dev) — Schema validation
- [Inter Font](https://fonts.google.com/specimen/Inter) — Typeface