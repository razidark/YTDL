# YTDL — Troubleshooting Guide

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Server Issues](#server-issues)
3. [Download Issues](#download-issues)
4. [yt-dlp / ffmpeg Issues](#yt-dlp--ffmpeg-issues)
5. [Electron Issues](#electron-issues)
6. [Frontend Issues](#frontend-issues)
7. [Network & Security Issues](#network--security-issues)
8. [Performance Issues](#performance-issues)
9. [Error Reference](#error-reference)
10. [Getting Help](#getting-help)

---

## Installation Issues

### `pnpm install` Fails

**Symptoms:**
- `ERR_PNPM_NO_MATCHING_VERSION`
- Network timeouts during download
- Permission errors

**Solutions:**

```bash
# Clear pnpm store and retry
pnpm store prune
pnpm install

# Use npm as fallback
npm install

# Check Node.js version (requires 18+)
node --version

# Check pnpm version (requires 8+)
pnpm --version
```

### TypeScript Build Fails

**Symptoms:**
- `tsc` exits with error code 2
- Type errors in source files

**Solutions:**

```bash
# Run type check to see all errors
pnpm run typecheck

# Check that all dependencies are installed
pnpm install

# Try clean build
pnpm run build

# If there are legacy JS files interfering, ensure tsconfig excludes them:
# "exclude": ["node_modules", "dist", "public", "src/__tests__"]
```

---

## Server Issues

### Port Already in Use

**Error:**
```
Port 3000 is already in use
```

**Solutions:**

```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
set PORT=3001 && pnpm start
```

### Server Starts but Immediate Exit

**Symptoms:**
- Terminal shows server banner then exits
- No error message visible

**Solutions:**

```bash
# Check logs
type logs\error.log
type logs\combined.log

# Run with more verbose logging
set LOG_LEVEL=debug && pnpm start

# Check if yt-dlp download is failing (requires internet)
# If offline, manually download yt-dlp.exe to bin/ folder
```

### Server Starts but No Response

**Symptoms:**
- `http://localhost:3000` loads forever
- Browser shows connection refused

**Solutions:**

```bash
# Check if server is listening
netstat -ano | findstr :3000

# Check firewall settings
# Windows: Windows Security → Firewall → Allow app

# Try accessing API directly
curl http://localhost:3000/api/health

# Check for Windows Defender blocking
# Add exception for node.exe in Windows Defender
```

---

## Download Issues

### "Invalid YouTube URL"

**Symptoms:**
- API returns 400 with "Invalid YouTube URL"
- Fetch button shows error toast

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| URL is not a YouTube URL | Use a valid YouTube URL (e.g., `https://www.youtube.com/watch?v=...`) |
| URL uses HTTP instead of HTTPS | Change http:// to https:// |
| URL has extra whitespace | Trim the input |
| Short URL without www | Both `youtu.be/...` and `www.youtube.com/...` are supported |
| Playlist URL | YTDL uses `--no-playlist`, provide a single video URL |
| Age-restricted video | yt-dlp may fail; requires cookies (see below) |

**Testing URL formats:**
```bash
# These should all work:
curl "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
curl "http://localhost:3000/api/info?url=https://youtu.be/dQw4w9WgXcQ"
curl "http://localhost:3000/api/info?url=https://m.youtube.com/watch?v=dQw4w9WgXcQ"
```

### Download Fails Midway

**Symptoms:**
- Download starts but connection drops
- File is partially downloaded and corrupt

**Solutions:**

```bash
# Check internet connection stability
# Check available disk space
fsutil volume diskfree C:

# Reduce quality (smaller file = less chance of timeout)
# Try audio-only mode (smaller files)
# Check MAX_FILE_SIZE setting (default 100MB)
```

### Downloaded File is Corrupt

**Symptoms:**
- Video won't play
- Audio has artifacts or is cut off

**Solutions:**

```bash
# Ensure ffmpeg is available (needed for merging)
pnpm start  # Auto-downloads ffmpeg on startup

# Try downloading without merge (raw format)
# Use a formatId that has both video and audio combined (e.g., formatId "18" for 360p)

# Check file with ffprobe
ffprobe downloaded-file.mp4
```

### "Downloaded file not found on server"

**Symptoms:**
- API returns 500 with "Downloaded file not found on server"

**Solutions:**

```bash
# Check temp directory
dir temp /s

# Ensure temp directory is writable
# Clear temp directory and restart
rmdir /s /q temp
mkdir temp

# Check disk space
fsutil volume diskfree C:
```

---

## yt-dlp / ffmpeg Issues

### yt-dlp Not Found

**Symptoms:**
- Status bar shows "yt-dlp not found" (red dot)
- Health check returns status "degraded"

**Solutions:**

```bash
# Auto-download (requires internet)
# Simply restart the server

# Manual download (if no internet on target machine)
# 1. Download from: https://github.com/yt-dlp/yt-dlp/releases/latest
# 2. Place yt-dlp.exe in YTDL/bin/
# 3. Restart server
```

### yt-dlp Auto-Download Fails

**Symptoms:**
- Console shows "Error downloading yt-dlp automatically"
- No binary in bin/ folder

**Solutions:**

```bash
# Check internet connectivity
ping github.com

# Check GitHub API rate limiting
# GitHub allows 60 requests/hour without authentication

# Manual download:
# Go to https://github.com/yt-dlp/yt-dlp/releases
# Download yt-dlp.exe for Windows
# Place it in YTDL/bin/

# Or use PowerShell:
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "bin\yt-dlp.exe"
```

### yt-dlp Update Failed

**Error:**
```
WARNING: You have yt-dlp version x; the latest version is y
```

**Solutions:**

```bash
# Delete the old binary and restart (server will auto-download)
del bin\yt-dlp.exe
pnpm start

# Or manually update from:
# https://github.com/yt-dlp/yt-dlp/releases
```

### ffmpeg Extraction Fails

**Symptoms:**
- Console shows "Error downloading/extracting ffmpeg automatically"
- Audio downloads fail or produce corrupted files

**Solutions:**

```bash
# Manual ffmpeg install:
# 1. Download from: https://ffmpeg.org/download.html
# 2. Extract ffmpeg.exe to YTDL/bin/
# 3. Restart server

# Or download ffmpeg via PowerShell:
Invoke-WebRequest -Uri "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip" -OutFile "bin\ffmpeg.zip"
Expand-Archive -Path "bin\ffmpeg.zip" -DestinationPath "bin\" -Force
del bin\ffmpeg.zip
```

### Age-Restricted Videos

**Symptom:**
```
ERROR: [youtube] <video_id>: This video is age-restricted and only available on YouTube.
```

**Solution:**
YouTube requires authentication for age-restricted content. This requires providing cookies:

1. Install a browser extension to export cookies (e.g., "Get cookies.txt" for Chrome)
2. Export cookies for youtube.com as `cookies.txt`
3. Place the file in the YTDL directory
4. The server currently doesn't support cookies natively; you would need to modify `runYtDlp()` to include `--cookies cookies.txt`

---

## Electron Issues

### Electron Window Shows White Screen

**Symptoms:**
- Electron opens but shows blank/white window
- DevTools shows no network requests

**Solutions:**

```bash
# Check that Express server started first
# Look for "YTDL Server running at http://localhost:..."

# Check for port conflicts
# The Express server must be running before Electron loads

# Restart from scratch
pnpm run build && pnpm run electron:dev

# Check Electron logs
# Press Ctrl+Shift+I to open DevTools
# Check Console tab for errors
```

### Electron Window Doesn't Open

**Symptoms:**
- Terminal shows server started
- No Electron window appears

**Solutions:**

```bash
# Check if Electron is installed
pnpm ls electron

# Reinstall electron
pnpm add -D electron@latest

# Try running electron directly
npx electron .
```

### Custom Title Bar Not Showing

**Symptoms:**
- Electron window has native OS title bar instead of custom one
- Or no title bar at all

**Solutions:**

```bash
# Check that preload script is loaded
# Check Electron console for "electronAPI is not defined"

# Ensure typescript is built
pnpm run build

# Check that preload path is correct in main.ts:
# preload: path.join(__dirname, "preload.js"),
```

### Electron Build Fails

**Error:**
```
electron-builder: error during build
```

**Solutions:**

```bash
# Clean and retry
pnpm run build
pnpm run electron:build:dir  # Try directory build first

# Check that bin/ has yt-dlp.exe and ffmpeg.exe
# These are required by extraResources in package.json

# Increase memory limit
set NODE_OPTIONS=--max-old-space-size=4096 && pnpm run electron:build

# For "code signing" errors, skip signing:
set CSC_IDENTITY_AUTO_DISCOVERY=false && pnpm run electron:build
```

---

## Frontend Issues

### "Server unreachable" Status

**Symptoms:**
- Status bar shows red dot with "Server unreachable"
- Fetch button does nothing

**Solutions:**

```bash
# Check if server is running
curl http://localhost:3000/api/health

# Restart server
pnpm start

# Check for port conflicts
netstat -ano | findstr :3000
```

### Video Info Never Loads

**Symptoms:**
- Loading skeleton stays forever
- Console shows network errors

**Solutions:**

```bash
# Open browser DevTools (F12)
# Check Network tab for failed requests
# Check Console tab for errors

# Try fetching directly via API
curl "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Check if yt-dlp is installed and working
# Restart server for auto-download
```

### Download History Not Persisting

**Symptoms:**
- History is empty after page refresh
- Favorites are lost

**Solutions:**

```bash
# Check if localStorage is enabled in browser
# Open DevTools → Application → Local Storage
# Look for key "ytdl_history"

# Clear and retry:
localStorage.removeItem("ytdl_history")

# Check if browser is in private/incognito mode
# localStorage is not persistent in private mode

# Maximum 50 entries in history
```

### Styles Look Broken

**Symptoms:**
- Layout is misaligned
- Colors are wrong
- Animations not working

**Solutions:**

```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R

# Check CSS file is loaded
# DevTools → Network → Filter by "styles.css"

# Ensure you're not using an outdated browser
# YTDL requires a modern browser with CSS backdrop-filter support
```

### Toast Notifications Not Showing

**Symptoms:**
- No popup notifications for success/error

**Solutions:**

```bash
# Check toast container exists
# DevTools → Elements → Search for "toast-container"

# Check for JavaScript errors
# DevTools → Console
```

---

## Network & Security Issues

### YouTube Blocking Requests

**Symptoms:**
- yt-dlp returns HTTP 429 (Too Many Requests)
- "Sign in to confirm you're not a bot" error

**Solutions:**

```bash
# YouTube may rate-limit aggressive requests
# Wait a few minutes between retries

# Use cookies (export from browser):
# Modify server.ts to add --cookies cookies.txt to yt-dlp args

# Use a different network/VPN
```

### Corporate Firewall Blocking

**Symptoms:**
- yt-dlp auto-download fails
- GitHub downloads fail
- YouTube access blocked

**Solutions:**

```bash
# If GitHub is blocked:
#   - Manually download binaries and place in bin/
#   - Use a mirror or proxy

# If YouTube is blocked:
#   - Use a VPN
#   - Use a proxy server
#   - YTDL can't bypass corporate firewall restrictions

# Configure proxy for yt-dlp:
# Set HTTP_PROXY and HTTPS_PROXY environment variables
set HTTP_PROXY=http://proxy.company.com:8080
set HTTPS_PROXY=http://proxy.company.com:8080
pnpm start
```

### Firewall Blocking Server

**Symptoms:**
- Cannot access http://localhost:3000
- Windows Defender Firewall notification

**Solutions:**

```bash
# Add firewall rule for Node.js
netsh advfirewall firewall add rule name="Node.js" dir=in action=allow program="%PROGRAMFILES%\nodejs\node.exe" enable=yes

# Or temporarily disable firewall for testing
# Control Panel → Windows Defender Firewall → Turn off
```

---

## Performance Issues

### Downloads Are Slow

**Solutions:**

```bash
# Check internet speed
# YouTube download speed depends on:
#   - Your internet bandwidth
#   - YouTube's server load
#   - Video popularity (more popular = faster)

# Try lower quality (smaller file)
# Try audio-only mode
# Avoid concurrent downloads
```

### High Memory Usage

**Symptoms:**
- Server using >500MB RAM
- System becomes sluggish

**Solutions:**

```bash
# Reduce max file size
set MAX_FILE_SIZE=50 && pnpm start

# Check for accumulated temp files
dir temp /s
# Clean temp directory
rmdir /s /q temp

# Restart server periodically
# Monitor memory in health endpoint:
curl http://localhost:3000/api/health
```

### Server Using Too Much CPU

**Symptoms:**
- High CPU usage in Task Manager
- System fans running loud

**Solutions:**

```bash
# yt-dlp is CPU-intensive during video processing
# This is expected during downloads

# For idle CPU usage:
# Check if health check interval is too frequent (default 60s)
# Check for runaway yt-dlp processes
tasklist | findstr yt-dlp
taskkill /IM yt-dlp.exe /F
```

---

## Error Reference

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|-------------|
| 200 | Success | Request completed normally |
| 400 | Bad Request | Missing or invalid URL parameter |
| 404 | Not Found | Invalid API endpoint |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | yt-dlp failure, file system error |
| 502 | Bad Gateway | External service failure (GitHub) |
| 503 | Service Unavailable | Binary not found |

### yt-dlp Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 0 | Success | — |
| 1 | General error | Check video URL, internet, or yt-dlp update |
| 2 | Network error | Check internet connectivity |
| 3 | Authentication error | Age-restricted or private video |
| 4 | Post-processing error | ffmpeg missing or corrupted |

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE` | Port already in use | Change PORT or kill existing process |
| `ENOENT` | File not found | Check paths, ensure binaries exist |
| `EPERM` | Permission denied | Run as administrator |
| `ECONNRESET` | Connection reset | Network issue, retry |
| `ETIMEDOUT` | Connection timeout | Slow network, increase timeout |
| `ENOSPC` | No disk space | Free up disk space |
| `ERR_INVALID_URL` | Bad URL format | Check URL syntax |

### Electron Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot find module 'electron'` | Electron not installed | `pnpm add -D electron` |
| `Failed to start yt-dlp` | Binary not found | Auto-download or manual install |
| `ERR_ABORTED` | Request cancelled | Client disconnected, page refreshed |
| `contextBridge` errors | Preload script issue | Rebuild TypeScript |

---

## Getting Help

### Log Files

Check these files for detailed error information:

```bash
# Application logs (all levels)
type logs\combined.log

# Error-level logs only
type logs\error.log

# View in real-time (if using PowerShell)
Get-Content logs\combined.log -Tail 50 -Wait
```

### Diagnostic Commands

Run these commands and include the output when reporting issues:

```bash
# System info
node --version && pnpm --version && systeminfo | findstr /C:"OS"

# Check server status
curl http://localhost:3000/api/health

# Check port
netstat -ano | findstr :3000

# Check files
dir bin\ && dir temp\ && dir dist\

# Check dependencies
pnpm ls --depth=0
```

### Reporting Issues

When reporting an issue on GitHub, please include:

1. **Description**: What happened vs. what you expected
2. **Steps to reproduce**: Exact steps to trigger the issue
3. **Environment**:
   - OS version (e.g., Windows 11 Pro 23H2)
   - Node.js version (`node --version`)
   - pnpm version (`pnpm --version`)
   - YTDL version (from package.json)
4. **Logs**: Relevant output from `logs/error.log`
5. **Screenshots**: If applicable (UI issues)
6. **Video URL**: The YouTube URL that caused the issue (if applicable)

### Quick Diagnostic Script

Save this as `diagnose.cmd` and run it:

```batch
@echo off
echo === YTDL Diagnostic ===
echo.
echo Node.js: 
node --version
echo pnpm: 
pnpm --version
echo.
echo Port 3000:
netstat -ano | findstr :3000
echo.
echo Binaries:
dir bin\
echo.
echo Server health:
curl -s http://localhost:3000/api/health
echo.
echo === End ===
pause
```

---

## FAQ

**Q: Can I download entire playlists?**
A: YTDL uses `--no-playlist` by default. To enable playlists, remove `"--no-playlist"` from yt-dlp args in `src/server.ts`.

**Q: Can I download YouTube Shorts?**
A: Yes, YouTube Shorts URLs work the same as regular videos.

**Q: Does this work with YouTube Music?**
A: YouTube Music URLs are not in the allowed domains list. Modify `validateUrl()` in `src/security.ts` to add `music.youtube.com`.

**Q: Can I use this without an internet connection?**
A: No, YTDL requires internet access to fetch video metadata and download from YouTube.

**Q: Is this legal?**
A: Downloading YouTube videos may violate YouTube's Terms of Service. Only download content you have the right to download.

**Q: Can I download subtitles/captions?**
A: Not currently. yt-dlp supports `--write-subs` and `--write-auto-subs` but these are not exposed in YTDL's UI.