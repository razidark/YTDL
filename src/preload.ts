// =========================================================================
// YTDL — Electron Preload Script (TypeScript)
// =========================================================================
// Exposes safe APIs to the renderer via contextBridge.
// The renderer stays sandboxed — no direct Node.js access.

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  // Window controls
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
});
