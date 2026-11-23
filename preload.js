// =========================================================================
// YTDL — Electron Preload Script
// =========================================================================
// Exposes safe APIs to the renderer via contextBridge.
// The renderer stays sandboxed — no direct Node.js access.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  // Window controls
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
});
