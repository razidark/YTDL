// =========================================================================
// YTDL — Express Server with TypeScript
// =========================================================================

import express, { Request, Response, NextFunction } from "express";
import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import https from "https";
import helmet from "helmet";
import compression from "compression";
import winston from "winston";
import {
  generateSecureFilename,
  sanitizeFilename,
  validateUrl,
  isGeneratedOutputPath,
  cleanupTempFiles
} from "./security";

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "ytdl-server" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Ensure logs directory exists
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

// ---------------------------------------------------------------------------
// Binary directory resolution (supports Electron packaged + standalone)
// ---------------------------------------------------------------------------
const binDir = process.env.YTDL_BIN_DIR || path.join(__dirname, "..", "bin");

// Add bin/ folder to PATH so yt-dlp can locate ffmpeg automatically
if (!process.env.PATH?.includes(binDir)) {
  process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH}`;
}

const app: express.Application = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003;

// Environment configuration
const config = {
  port: parseInt(process.env.PORT || "3003", 10),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "100", 10) * 1024 * 1024, // 100MB default
  tempDir: process.env.TEMP_DIR || path.join(__dirname, "..", "temp"),
  logLevel: process.env.LOG_LEVEL || "info",
  nodeEnv: process.env.NODE_ENV || "development",
};

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
    },
  },
}));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

// Cleanup temp files on startup and periodically
if (!fs.existsSync(config.tempDir)) {
  fs.mkdirSync(config.tempDir, { recursive: true });
}
cleanupTempFiles(config.tempDir);
setInterval(() => cleanupTempFiles(config.tempDir), 60 * 60 * 1000); // Every hour

// ---------------------------------------------------------------------------
// yt-dlp binary resolution & auto-downloader
// ---------------------------------------------------------------------------
function getYtDlpPath(): string {
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const localBin = path.join(binDir, binaryName);
  if (fs.existsSync(localBin)) return localBin;
  return "yt-dlp";
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.destroy();
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.destroy();
        const error = new Error(`Failed to download: status code ${response.statusCode}`);
        logger.error(`Download failed: ${error.message} - URL: ${url}`);
        reject(error);
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close(() => resolve());
      });
    }).on("error", (err) => {
      file.destroy();
      fs.unlink(dest, () => { });
      logger.error(`Download error: ${err.message} - URL: ${url}`);
      reject(err);
    });
  });
}

async function ensureYtDlp(): Promise<void> {
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const localBinPath = path.join(binDir, binaryName);

  try {
    await runYtDlp(["--version"]);
    logger.info("yt-dlp is ready (available in PATH or bin/).");
    return;
  } catch (_err) {
    logger.warn("yt-dlp not found in PATH or local bin. Attempting auto-download...");
  }

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binaryName}`;
  logger.info(`Downloading yt-dlp from: ${downloadUrl}`);
  try {
    await downloadFile(downloadUrl, localBinPath);
    if (process.platform !== "win32") {
      fs.chmodSync(localBinPath, "755");
    }
    logger.info("yt-dlp downloaded successfully!");
  } catch (err) {
    logger.error(`Error downloading yt-dlp automatically: ${(err as Error).message}`);
    logger.error("Please download it manually from https://github.com/yt-dlp/yt-dlp and place it in the bin/ folder.");
  }
}

// Process management
function setupProcessManagement(): void {
  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });

  // Handle signals
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down gracefully");
    process.exit(0);
  });

  // Monitor memory usage
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };
    logger.debug("Memory usage:", memUsageMB);
  }, 60000); // Every minute
}

async function ensureFfmpeg(): Promise<void> {
  const binaryName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const localBinPath = path.join(binDir, binaryName);

  try {
    execSync(`${process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"} -version`, { stdio: "ignore" });
    logger.info("ffmpeg is ready (available in PATH or bin/).");
    return;
  } catch (_err) {
    logger.warn("ffmpeg not found in PATH or local bin. Attempting auto-download...");
  }

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  let downloadUrl = "";
  if (process.platform === "win32") {
    downloadUrl = "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip";
  } else if (process.platform === "darwin") {
    downloadUrl = "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-osx-64.zip";
  } else {
    downloadUrl = "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-linux-64.zip";
  }

  const zipPath = path.join(binDir, "ffmpeg.zip");
  logger.info(`Downloading ffmpeg from: ${downloadUrl}`);
  try {
    await downloadFile(downloadUrl, zipPath);
    logger.info("Waiting for file stream lock release...");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    logger.info("Extracting ffmpeg...");
    if (process.platform === "win32") {
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${binDir}' -Force"`);
    } else {
      execSync(`unzip -o "${zipPath}" -d "${binDir}"`);
      fs.chmodSync(localBinPath, "755");
    }
    logger.info("ffmpeg downloaded and extracted successfully!");
  } catch (err) {
    logger.error(`Error downloading/extracting ffmpeg automatically: ${(err as Error).message}`);
  } finally {
    if (fs.existsSync(zipPath)) {
      try {
        fs.unlinkSync(zipPath);
      } catch (_e) {
        // ignore unlink error
      }
    }
  }
}

function validateUrlParam(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { isValid: false, error: "Missing url parameter" };
  }

  if (!validateUrl(url)) {
    return { isValid: false, error: "Invalid YouTube URL" };
  }

  return { isValid: true };
}

// Helper: run yt-dlp and collect JSON output
function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    const binary = getYtDlpPath();
    const proc = spawn(binary, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    proc.stdout.on("data", (d) => chunks.push(d));
    proc.stderr.on("data", (d) => errChunks.push(d));
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(errChunks).toString();
        const error = new Error(`yt-dlp exited with code ${code}: ${stderr}`);
        logger.error(`yt-dlp error: ${error.message}`);
        return reject(error);
      }
      resolve(Buffer.concat(chunks).toString());
    });
  });
}

// ---------------------------------------------------------------------------
// API: Fetch video info
// ---------------------------------------------------------------------------
app.get("/api/info", async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const validation = validateUrlParam(req.query.url as string);
  if (!validation.isValid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const url = req.query.url as string;

  try {
    const raw = await runYtDlp([
      "--dump-json",
      "--no-warnings",
      "--no-playlist",
      url,
    ]);
    const info = JSON.parse(raw);

    // Build a clean response
    const formats = (info.formats || [])
      .filter((f) => f.filesize || f.filesize_approx)
      .map((f) => ({
        formatId: f.format_id,
        ext: f.ext,
        resolution: f.resolution || "audio only",
        fps: f.fps || null,
        vcodec: f.vcodec !== "none" ? f.vcodec : null,
        acodec: f.acodec !== "none" ? f.acodec : null,
        filesize: f.filesize || f.filesize_approx || 0,
        tbr: f.tbr || 0,
        abr: f.abr || 0,
        label: f.format || "",
        hasVideo: f.vcodec !== "none",
        hasAudio: f.acodec !== "none",
      }));

    // Sort: combined > video-only > audio-only, then by tbr descending
    formats.sort((a, b) => {
      const aScore = (a.hasVideo ? 2 : 0) + (a.hasAudio ? 1 : 0);
      const bScore = (b.hasVideo ? 2 : 0) + (b.hasAudio ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return b.tbr - a.tbr;
    });

    // Derive artist from metadata fields
    const artist = info.artist || info.creator || info.uploader || info.channel || "";
    const track = info.track || info.alt_title || "";

    res.json({
      id: info.id,
      title: info.title,
      artist,
      track,
      thumbnail: info.thumbnail,
      duration: info.duration,
      durationString: info.duration_string,
      channel: info.channel || info.uploader,
      channelUrl: info.channel_url || info.uploader_url,
      viewCount: info.view_count,
      uploadDate: info.upload_date,
      description: (info.description || "").slice(0, 300),
      formats,
    });
  } catch (err) {
    const error = err as Error;
    logger.error(`Error fetching info for URL ${url}: ${error.message}`, { error: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// API: Real-time download progress tracking (Server-Sent Events)
// ---------------------------------------------------------------------------
const progressConnections = new Map<string, Response>();

app.get("/api/progress/:downloadId", (req: Request, res: Response): void => {
  const downloadId = req.params.downloadId;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ status: "connected" })}\n\n`);

  progressConnections.set(downloadId, res);

  req.on("close", () => {
    progressConnections.delete(downloadId);
  });
});

// ---------------------------------------------------------------------------
// API: Download a video/audio
// ---------------------------------------------------------------------------
app.get("/api/download", async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const validation = validateUrlParam(req.query.url as string);
  if (!validation.isValid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const { url, formatId, mode, kbps, downloadId, subtitles, rawAudio } = req.query;
  const downloadIdStr = downloadId as string;

  // Validate mode parameter
  const validModes = ["video", "audio"];
  const downloadMode = validModes.includes(mode as string) ? (mode as string) : "video";

  try {
    // Clamp bitrate: MP3 LAME supports max 320kbps; treat 512 as 320
    let bitrateNum = kbps ? parseInt(kbps as string, 10) : 320;
    if (bitrateNum > 320) bitrateNum = 320;
    const audioBitrate = `${bitrateNum}K`;

    // Filename template: use video title only (no channel prefix)
    const nameTemplate = "%(title)s.%(ext)s";

    // Get filename first
    const titleRaw = await runYtDlp([
      "--print",
      "filename",
      "-o",
      nameTemplate,
      "--no-warnings",
      "--no-playlist",
      ...(formatId
        ? ["-f", `${String(formatId)}+bestaudio[ext=m4a]/${String(formatId)}+bestaudio/${String(formatId)}`]
        : downloadMode === "audio"
          ? (rawAudio === "true"
            ? ["-f", "bestaudio"]
            : ["-f", "bestaudio", "-x", "--audio-format", "mp3", "--audio-quality", audioBitrate])
          : ["-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best"]),
      String(url),
    ]);

    let filename = titleRaw.trim();
    // Strip "Unknown - " prefix if artist wasn't found
    filename = filename.replace(/^Unknown\s*-\s*/, "");
    // If mode is audio and no formatId, force .mp3 extension (unless downloading raw audio)
    if (downloadMode === "audio" && !formatId && rawAudio !== "true") {
      filename = filename.replace(/\.[^.]+$/, ".mp3");
    }

    // Sanitize filename for Content-Disposition
    const safeName = sanitizeFilename(filename);

    const tempDir = config.tempDir;
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilename = generateSecureFilename(filename);
    const tempFilePath = path.join(tempDir, tempFilename);
    let downloadedFilePath: string | undefined;

    const args = [
      "--no-warnings",
      "--no-playlist",
      "--embed-metadata",
      "--embed-thumbnail",
      "--convert-thumbnails",
      "jpg",
      "--parse-metadata",
      ":(?P<artist>)",
      "--parse-metadata",
      ":(?P<uploader>)",
      "--newline",
      "-o",
      `${tempFilePath}.%(ext)s`,
      "--print",
      "after_move:filepath",
    ];

    if (formatId) {
      // Always merge best audio so video downloads are never silent
      args.push("-f", `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/${formatId}`);
    } else if (downloadMode === "audio") {
      if (rawAudio === "true") {
        args.push("-f", "bestaudio");
      } else {
        args.push("-f", "bestaudio", "-x", "--audio-format", "mp3", "--audio-quality", audioBitrate);
      }
    } else {
      args.push(
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best"
      );
    }

    if (subtitles === "true") {
      args.push("--write-subs", "--sub-langs", "all", "--embed-subs");
    }

    args.push(String(url));

    const binary = getYtDlpPath();
    const proc = spawn(binary, args, {
      windowsHide: true,
    });

    let stdoutBuffer = "";
    proc.stdout.on("data", (d) => {
      stdoutBuffer += d.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (isGeneratedOutputPath(trimmed, tempFilePath)) {
          downloadedFilePath = path.resolve(trimmed);
          continue;
        }

        // Parse progress e.g. "[download]  12.5% of ~10.00MiB at  3.54MiB/s ETA 00:05"
        const progressMatch = trimmed.match(/\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)/);
        if (progressMatch && downloadIdStr) {
          const percent = parseFloat(progressMatch[1]);
          const size = progressMatch[2];
          const speed = progressMatch[3];
          const eta = progressMatch[4];
          
          const conn = progressConnections.get(downloadIdStr);
          if (conn) {
            conn.write(`data: ${JSON.stringify({ status: "downloading", percent, size, speed, eta })}\n\n`);
          }
        } else if (downloadIdStr) {
          // Detect post-processing stages
          let statusMessage = "";
          if (trimmed.includes("[ExtractAudio]")) {
            statusMessage = "Converting to MP3...";
          } else if (trimmed.includes("[ffmpeg]")) {
            statusMessage = "Transcoding media via ffmpeg...";
          } else if (trimmed.includes("[Merger]")) {
            statusMessage = "Merging video and audio streams...";
          } else if (trimmed.includes("[Metadata]")) {
            statusMessage = "Embedding track metadata...";
          } else if (trimmed.includes("[ThumbnailsConvertor]")) {
            statusMessage = "Embedding video thumbnail...";
          }

          if (statusMessage) {
            const conn = progressConnections.get(downloadIdStr);
            if (conn) {
              conn.write(`data: ${JSON.stringify({ status: "processing", message: statusMessage })}\n\n`);
            }
          }
        }
      }
    });

    proc.stderr.on("data", (d) => {
      const msg = d.toString();
      if (msg.includes("ERROR")) {
        logger.error(`yt-dlp stderr: ${msg}`);
      }
    });

    proc.on("error", (err) => {
      logger.error(`Spawn error: ${err.message}`);
      if (downloadIdStr) {
        const conn = progressConnections.get(downloadIdStr);
        if (conn) {
          conn.write(`data: ${JSON.stringify({ status: "error", error: "Failed to start downloader" })}\n\n`);
          conn.end();
          progressConnections.delete(downloadIdStr);
        }
      }
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to start yt-dlp" });
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        logger.error(`yt-dlp exited with code ${code}`);
        if (downloadIdStr) {
          const conn = progressConnections.get(downloadIdStr);
          if (conn) {
            conn.write(`data: ${JSON.stringify({ status: "error", error: `yt-dlp exited with code ${code}` })}\n\n`);
            conn.end();
            progressConnections.delete(downloadIdStr);
          }
        }
        if (!res.headersSent) {
          res.status(500).json({ error: `yt-dlp exited with code ${code}` });
        }
        return;
      }

      if (downloadIdStr) {
        const conn = progressConnections.get(downloadIdStr);
        if (conn) {
          conn.write(`data: ${JSON.stringify({ status: "complete", percent: 100 })}\n\n`);
          conn.end();
          progressConnections.delete(downloadIdStr);
        }
      }

      if (!downloadedFilePath || !fs.existsSync(downloadedFilePath)) {
        if (!res.headersSent) {
          res.status(500).json({ error: "Downloaded file not found on server" });
        }
        return;
      }

      const fullPath = downloadedFilePath;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      res.setHeader("Content-Type", "application/octet-stream");

      const readStream = fs.createReadStream(fullPath);
      readStream.pipe(res);

      readStream.on("close", () => {
        try {
          fs.unlinkSync(fullPath);
          logger.info(`Cleaned up temp file: ${fullPath}`);
        } catch (err) {
          logger.error(`Failed to delete temp file: ${(err as Error).message}`);
        }
      });
    });

    // If the client disconnects, kill the process
    req.on("close", () => {
      proc.kill("SIGTERM");
      logger.info("Client disconnected, terminated yt-dlp process");
      if (downloadIdStr) {
        const conn = progressConnections.get(downloadIdStr);
        if (conn) {
          conn.write(`data: ${JSON.stringify({ status: "aborted" })}\n\n`);
          conn.end();
          progressConnections.delete(downloadIdStr);
        }
      }
    });
  } catch (err) {
    const error = err as Error;
    logger.error(`Download error for URL ${url}: ${error.message}`, { error: error.stack });
    if (downloadIdStr) {
      const conn = progressConnections.get(downloadIdStr);
      if (conn) {
        conn.write(`data: ${JSON.stringify({ status: "error", error: error.message })}\n\n`);
        conn.end();
        progressConnections.delete(downloadIdStr);
      }
    }
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// ---------------------------------------------------------------------------
// API: Health check
// ---------------------------------------------------------------------------
app.get("/api/health", async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const version = await runYtDlp(["--version"]);
    const uptime = Date.now() - startTime;
    const memory = process.memoryUsage();
    res.json({
      status: "ok",
      ytDlpVersion: version.trim(),
      port: PORT,
      uptime: `${uptime}ms`,
      timestamp: new Date().toISOString(),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsageMB: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
      },
    });
  } catch (_err) {
    const uptime = Date.now() - startTime;
    res.json({
      status: "degraded",
      error: "yt-dlp not found. Install it or place the binary in ./bin/",
      port: PORT,
      uptime: `${uptime}ms`,
      timestamp: new Date().toISOString(),
    });
  }
});

// ---------------------------------------------------------------------------
// Fallback: serve index.html for SPA
// ---------------------------------------------------------------------------
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// ---------------------------------------------------------------------------
// Start server (exportable for Electron, auto-starts for standalone)
// ---------------------------------------------------------------------------
function startServer(customPort?: number): Promise<number> {
  const port = customPort || PORT;
  return new Promise((resolve) => {
    Promise.all([ensureYtDlp(), ensureFfmpeg()]).then(() => {
      const server = app.listen(port, "127.0.0.1", () => {
        const addr = server.address();
        const actualPort = (typeof addr === "object" && addr?.port) || Number(port);
        logger.info(`\n  ⚡ YTDL Server running at http://localhost:${actualPort}\n`);
        resolve(actualPort);
      });

      // Handle server errors
      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          logger.error(`Port ${port} is already in use`);
        } else {
          logger.error(`Server error: ${err.message}`);
        }
        process.exit(1);
      });
    });
  });
}

// Export for Electron
module.exports = { startServer, app };
export { app, startServer };

// Auto-start when run directly (not imported by Electron)
if (require.main === module) {
  setupProcessManagement();
  startServer();
}
