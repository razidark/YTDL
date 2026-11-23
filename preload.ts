// =========================================================================
// YTDL — Electron Preload Script (TypeScript)
// =========================================================================
// Exposes safe APIs to the renderer via contextBridge.
// The renderer stays sandboxed — no direct Node.js access.

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  // Window controls
  minimize: (): void => ipcRenderer.invoke("window:minimize"),
  maximize: (): void => ipcRenderer.invoke("window:maximize"),
  close: (): void => ipcRenderer.invoke("window:close"),
  isMaximized: (): boolean => ipcRenderer.invoke("window:isMaximized"),
});
