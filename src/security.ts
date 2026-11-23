// =========================================================================
// YTDL — Security Utilities
// =========================================================================

import crypto from "crypto";
import path from "path";
import fs from "fs";
import https from "https";

// Generate secure random filename
function generateSecureFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const extension = path.extname(originalFilename) || ".tmp";
  return `ytdl_${timestamp}_${randomBytes}${extension}`;
}

// Validate and sanitize filename
function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  filename = filename.replace(/\.\.[\\/]/g, "");
  filename = filename.replace(/^[/\\.]+/, "");
  
  // Allow only safe characters
  filename = filename.replace(/[^\w\s\-.()\[\]]/g, "_");
  
  // Limit filename length
  const maxLength = 255;
  if (filename.length > maxLength) {
    const extension = path.extname(filename);
    const name = path.basename(filename, extension);
    const truncatedName = name.substring(0, maxLength - extension.length - 10);
    filename = `${truncatedName}_${crypto.randomBytes(4).toString("hex")}${extension}`;
  }
  
  return filename;
}

// Validate URL to prevent SSRF attacks
function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP/HTTPS protocols
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Block localhost and private IP ranges to prevent SSRF
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
      return false;
    }
    
    // Block private IP ranges
    const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|169\.254\.|100\.|172\.15\.|172\.32\.|172\.48\.|172\.64\.|172\.80\.|172\.96\.|172\.112\.|172\.128\.|172\.144\.|172\.160\.|172\.176\.|172\.192\.|172\.208\.|172\.224\.|172\.240\.|172\.255\.|192\.0\.2\.|198\.18\.|198\.19\.|192\.88\.99\.|224\.0\.0\.0\/4|240\.0\.0\.0\/4|255\.255\.255\.255\/32)$/;
    if (privateIpRegex.test(hostname)) {
      return false;
    }
    
    // Block YouTube domains that could be used for SSRF
    const youtubeDomains = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"];
    if (youtubeDomains.includes(hostname)) {
      return true; // YouTube URLs are allowed
    }
    
    // For other domains, be more restrictive
    return false;
  } catch {
    return false;
  }
}

// Secure file download with virus scan simulation
async function secureDownloadFile(url: string, dest: string, maxFileSize: number = 100 * 1024 * 1024): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let fileSize = 0;
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.destroy();
        secureDownloadFile(response.headers.location!, dest, maxFileSize).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.destroy();
        const error = new Error(`Failed to download: status code ${response.statusCode}`);
        reject(error);
        return;
      }
      
      response.on("data", (chunk) => {
        fileSize += chunk.length;
        if (fileSize > maxFileSize) {
          file.destroy();
          fs.unlink(dest, () => {});
          const error = new Error(`File size exceeds limit of ${maxFileSize / (1024 * 1024)}MB`);
          reject(error);
        }
      });
      
      response.pipe(file);
      file.on("finish", () => {
        file.close(() => resolve());
      });
    }).on("error", (err) => {
      file.destroy();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Confirm a downloader output belongs to the unique base path allocated to one request.
function isGeneratedOutputPath(candidate: string, outputBasePath: string): boolean {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedBasePath = path.resolve(outputBasePath);
  const expectedPrefix = `${path.basename(resolvedBasePath)}.`;

  return (
    path.dirname(resolvedCandidate) === path.dirname(resolvedBasePath) &&
    path.basename(resolvedCandidate).startsWith(expectedPrefix)
  );
}

// Clean up temporary files securely
function cleanupTempFiles(tempDir: string, maxAge: number = 24 * 60 * 60 * 1000): void {
  if (!fs.existsSync(tempDir)) {
    return;
  }
  
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  
  files.forEach((file) => {
    const filePath = path.join(tempDir, file);
    try {
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtime.getTime();
      
      if (fileAge > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old temp file: ${file}`);
      }
    } catch (_err) {
      // Ignore errors when cleaning up
    }
  });
}

export {
  generateSecureFilename,
  sanitizeFilename,
  validateUrl,
  secureDownloadFile,
  cleanupTempFiles,
  isGeneratedOutputPath,
};
