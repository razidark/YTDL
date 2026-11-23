// =========================================================================
// YTDL — Electron Main Process
// =========================================================================

import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { startServer } from "./server";

// Determine if we're running from a packaged build
const isPackaged = app.isPackaged;

// ---------------------------------------------------------------------------
// Set up environment for bundled binaries
// ---------------------------------------------------------------------------
function getBinDir(): string {
  if (isPackaged) {
    // In packaged app, extraResources are in process.resourcesPath/bin
    return path.join(process.resourcesPath, "bin");
  }
  // In dev, use local bin/ folder
  return path.join(__dirname, "..", "bin");
}

// Add bin directory to PATH so yt-dlp and ffmpeg are discoverable
const binDir = getBinDir();
process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH}`;

// Pass the bin dir to the server module
process.env.YTDL_BIN_DIR = binDir;
process.env.YTDL_IS_PACKAGED = isPackaged ? "1" : "0";

// ---------------------------------------------------------------------------
// Start the embedded Express server
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;
let serverPort = 3000;

async function createWindow(): Promise<void> {
  // Start Express server first
  const port = await startServer();
  serverPort = port;
  console.log(`Express server started on port ${port}`);

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 520,
    minHeight: 500,
    frame: false,             // Custom title bar
    titleBarStyle: "hidden",
    backgroundColor: "#050512",
    icon: path.join(__dirname, "..", "public", "icon.png"),
    show: false,              // Show when ready
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the app from Express
  mainWindow.loadURL(`http://localhost:${serverPort}`);

  // Show when ready to prevent white flash
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC handlers for window controls
// ---------------------------------------------------------------------------
ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle("window:close", () => {
  mainWindow?.close();
});

ipcMain.handle("window:isMaximized", () => {
  return mainWindow?.isMaximized() ?? false;
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
