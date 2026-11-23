# YTDL — API Reference

## Base URL

```
http://localhost:3000
```

All API endpoints are prefixed with `/api`.

---

## Authentication

YTDL does not require authentication. It runs as a local server bound to `localhost` by default.

---

## Rate Limiting

Rate limiting is configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `60000` | Window duration in milliseconds (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Maximum requests per window per IP |

When rate-limited, the API returns `429 Too Many Requests`.

---

## Endpoints

### 1. Health Check

```
GET /api/health
```

Returns the server status and yt-dlp version.

**cURL Example:**
```bash
curl http://localhost:3000/api/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "ytDlpVersion": "2024.12.18",
  "port": "3000",
  "uptime": "12000ms",
  "timestamp": "2024-12-18T10:00:00.000Z",
  "memory": {
    "rss": 134217728,
    "heapTotal": 67108864,
    "heapUsed": 33554432,
    "external": 1048576
  },
  "pid": 12345,
  "platform": "win32",
  "nodeVersion": "v20.11.0",
  "memoryUsageMB": {
    "rss": 128,
    "heapTotal": 64,
    "heapUsed": 32,
    "external": 1
  }
}
```

**Response (200 OK — degraded):**
```json
{
  "status": "degraded",
  "error": "yt-dlp not found. Install it or place the binary in ./bin/",
  "port": "3000",
  "uptime": "12000ms",
  "timestamp": "2024-12-18T10:00:00.000Z"
}
```

---

### 2. Fetch Video Info

```
GET /api/info?url=<encoded-youtube-url>
```

Fetches metadata and all available formats for a YouTube video.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | Full YouTube video URL (must be https) |

**cURL Example:**
```bash
curl "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**Response (200 OK):**
```json
{
  "id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
  "artist": "Rick Astley",
  "track": "Never Gonna Give You Up",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "duration": 212,
  "durationString": "3:32",
  "channel": "Rick Astley",
  "channelUrl": "https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw",
  "viewCount": 1500000000,
  "uploadDate": "20091025",
  "description": "The official video for \"Never Gonna Give You Up\" by Rick Astley...",
  "formats": [
    {
      "formatId": "137",
      "ext": "mp4",
      "resolution": "1920x1080",
      "fps": 30,
      "vcodec": "avc1.640028",
      "acodec": "none",
      "filesize": 52428800,
      "tbr": 2500,
      "abr": 0,
      "label": "1080p",
      "hasVideo": true,
      "hasAudio": false
    },
    {
      "formatId": "18",
      "ext": "mp4",
      "resolution": "640x360",
      "fps": 30,
      "vcodec": "avc1.42001E",
      "acodec": "mp4a.40.2",
      "filesize": 10485760,
      "tbr": 500,
      "abr": 96,
      "label": "360p",
      "hasVideo": true,
      "hasAudio": true
    },
    {
      "formatId": "140",
      "ext": "m4a",
      "resolution": "audio only",
      "fps": null,
      "vcodec": null,
      "acodec": "mp4a.40.2",
      "filesize": 3145728,
      "tbr": 150,
      "abr": 128,
      "label": "m4a",
      "hasVideo": false,
      "hasAudio": true
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | YouTube video ID |
| `title` | string | Video title |
| `artist` | string | Derived from artist → creator → uploader → channel |
| `track` | string | Track name if available |
| `thumbnail` | string | URL to the highest resolution thumbnail |
| `duration` | number | Duration in seconds |
| `durationString` | string | Human-readable duration (e.g. "3:32") |
| `channel` | string | Channel or uploader name |
| `channelUrl` | string | Link to channel |
| `viewCount` | number | Approximate view count |
| `uploadDate` | string | Upload date in YYYYMMDD format |
| `description` | string | First 300 characters of description |
| `formats` | array | Available download formats (sorted by quality) |

**Format Object:**

| Field | Type | Description |
|-------|------|-------------|
| `formatId` | string | yt-dlp format code (e.g. "137", "18", "140") |
| `ext` | string | File extension (mp4, m4a, webm, etc.) |
| `resolution` | string | Video resolution or "audio only" |
| `fps` | number/null | Frame rate |
| `vcodec` | string/null | Video codec |
| `acodec` | string/null | Audio codec |
| `filesize` | number | File size in bytes (0 if unknown) |
| `tbr` | number | Total bitrate in kbps |
| `abr` | number | Audio bitrate in kbps |
| `label` | string | Human-readable format label |
| `hasVideo` | boolean | Whether format contains video |
| `hasAudio` | boolean | Whether format contains audio |

**Sort Order:** Combined formats (video+audio) first, then video-only, then audio-only. Within each group, sorted by bitrate descending.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `400` | Missing or invalid URL |
| `500` | yt-dlp error (network, invalid video, etc.) |

```json
// 400 Bad Request
{ "error": "Missing url parameter" }
// or
{ "error": "Invalid YouTube URL" }

// 500 Internal Server Error
{ "error": "yt-dlp exited with code 1: ERROR: [youtube] ..." }
```

---

### 3. Download Video/Audio

```
GET /api/download?url=<encoded-youtube-url>&mode=<video|audio>&formatId=<id>&kbps=<bitrate>
```

Downloads a video or audio file. Returns the file as a binary stream.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | — | YouTube video URL |
| `mode` | string | `video` | `video` or `audio` |
| `formatId` | string | auto | Specific format ID from `/api/info` |
| `kbps` | number | `320` | Audio bitrate (clamped to 320 max) |

**Behavior by Parameters:**

| `mode` | `formatId` | Behavior |
|--------|-----------|----------|
| `video` | not set | Downloads best video (mp4) + best audio (m4a), merged |
| `video` | set | Downloads specific format + best audio merged |
| `audio` | not set | Downloads best audio, converted to MP3 |
| `audio` | set | Downloads specific format as-is |

**cURL Examples:**

```bash
# Download best video as mp4
curl -o "video.mp4" "http://localhost:3000/api/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Download audio as MP3 at 320kbps
curl -o "audio.mp3" "http://localhost:3000/api/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&mode=audio&kbps=320"

# Download specific format (e.g., 1080p video)
curl -o "1080p.mp4" "http://localhost:3000/api/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&formatId=137"
```

**Response Headers:**

| Header | Value |
|--------|-------|
| `Content-Disposition` | `attachment; filename="Artist - Title.mp4"; filename*=UTF-8''...` |
| `Content-Type` | `application/octet-stream` |

**Filenames:**

The server uses yt-dlp's smart naming template:
```
%(artist,uploader,channel|Unknown)s - %(title)s.%(ext)s
```

If no artist/channel is found, the "Unknown - " prefix is stripped automatically.

For audio downloads without a specific formatId, the extension is forced to `.mp3`.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `400` | Missing or invalid URL |
| `500` | yt-dlp error, file not found, spawn error |

```json
// 400 Bad Request
{ "error": "Missing url parameter" }

// 500 — yt-dlp error
{ "error": "yt-dlp exited with code 1: ERROR ..." }

// 500 — file not found
{ "error": "Downloaded file not found on server" }

// 500 — spawn failed
{ "error": "Failed to start yt-dlp" }
```

---

## Error Handling

All errors follow a consistent JSON format:

```json
{
  "error": "Human-readable error message"
}
```

HTTP status codes:

| Code | Meaning |
|------|---------|
| `400` | Validation error (missing/invalid parameters) |
| `429` | Rate limit exceeded |
| `500` | Server error (yt-dlp failure, file system error) |
| `502` | External service error (GitHub download failure) |
| `503` | Binary not found (yt-dlp/ffmpeg unavailable) |

---

## Using with JavaScript (Frontend)

### Fetching Video Info

```javascript
async function getVideoInfo(url) {
  const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return await response.json();
}

// Usage
const info = await getVideoInfo("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
console.log(info.title);  // "Rick Astley - Never Gonna Give You Up"
console.log(info.formats[0].label);  // "1080p"
```

### Downloading a File

```javascript
async function downloadVideo(url, mode, formatId) {
  const params = new URLSearchParams({ url, mode });
  if (formatId) params.set("formatId", formatId);

  const response = await fetch(`/api/download?${params.toString()}`);
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || `HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const cd = response.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename\*=UTF-8''(.+?)(?:;|$)/)
    || cd.match(/filename="(.+?)"/);
  const filename = match ? decodeURIComponent(match[1]) : "download.mp4";

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
```

### Checking Health

```javascript
async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}
```

---

## Using with Python

```python
import requests
import json

BASE_URL = "http://localhost:3000"

# Fetch video info
info = requests.get(f"{BASE_URL}/api/info", params={
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}).json()
print(f"Title: {info['title']}")

# Download best audio
response = requests.get(f"{BASE_URL}/api/download", params={
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "mode": "audio",
    "kbps": 320
}, stream=True)

with open("audio.mp3", "wb") as f:
    for chunk in response.iter_content(chunk_size=8192):
        f.write(chunk)
```

---

## Using with cURL

```bash
# Health check
curl -s http://localhost:3000/api/health | python -m json.tool

# Info
curl -s "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" | python -m json.tool

# Download
curl -o "video.mp4" "http://localhost:3000/api/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&mode=video"