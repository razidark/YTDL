// =========================================================================
// YTDL — Configuration Management
// =========================================================================

import path from "path";
import { z } from "zod";

const configSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3003),
  maxFileSize: z.number().int().min(1).max(1024).default(100), // MB
  tempDir: z.string().default("./temp"),
  logLevel: z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]).default("info"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  rateLimitWindowMs: z.number().int().min(1000).default(60000), // 1 minute
  rateLimitMaxRequests: z.number().int().min(1).default(100),
  downloadTimeoutMs: z.number().int().min(5000).default(300000), // 5 minutes
  ytDlpAutoUpdate: z.boolean().default(true),
  ffmpegAutoDownload: z.boolean().default(true),
});

type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const rawConfig = {
    port: parseInt(process.env.PORT || "3003", 10),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "100", 10),
    tempDir: process.env.TEMP_DIR || path.join(__dirname, "temp"),
    logLevel: process.env.LOG_LEVEL || "info",
    nodeEnv: process.env.NODE_ENV || "development",
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    downloadTimeoutMs: parseInt(process.env.DOWNLOAD_TIMEOUT_MS || "300000", 10),
    ytDlpAutoUpdate: process.env.YTDL_AUTO_UPDATE !== "false",
    ffmpegAutoDownload: process.env.FFMPEG_AUTO_DOWNLOAD !== "false",
  };

  return configSchema.parse(rawConfig);
}

export const config = loadConfig();
export type { Config };
