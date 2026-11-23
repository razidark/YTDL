// =========================================================================
// YTDL — Frontend Application (Vanilla JS)
// =========================================================================

(function () {
  "use strict";

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const state = {
    videoInfo: null,
    formats: [],
    selectedFormatId: null,
    downloadMode: "video",
    isDownloading: false,
    isElectron: typeof window.electronAPI !== "undefined",
    history: loadHistory(),
    lang: localStorage.getItem("ytdl_lang") || "en",
  };

  // -----------------------------------------------------------------------
  // DOM References
  // -----------------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    titleBar: $("#title-bar"),
    body: document.body,
    tbMinimize: $("#tb-minimize"),
    tbMaximize: $("#tb-maximize"),
    tbClose: $("#tb-close"),

    urlInput: $("#url-input"),
    pasteBtn: $("#paste-btn"),
    fetchBtn: $("#fetch-btn"),
    inputCard: $("#input-card"),

    loadingSection: $("#loading-section"),
    videoSection: $("#video-section"),

    videoThumb: $("#video-thumb"),
    videoDuration: $("#video-duration"),
    videoTitle: $("#video-title"),
    videoChannel: $("#video-channel"),
    videoViews: $("#video-views"),

    tabVideo: $("#tab-video"),
    tabAudio: $("#tab-audio"),
    formatSelect: $("#format-select"),
    downloadBtn: $("#download-btn"),
    downloadContent: document.querySelector(".download-btn-content"),
    downloadLoading: document.querySelector(".download-btn-loading"),

    historyToggle: $("#history-toggle"),
    historyList: $("#history-list"),
    historyItems: $("#history-items"),
    historyCount: $("#history-count"),
    clearAllBtn: $("#clear-all-btn"),

    statusDot: $("#status-dot"),
    statusText: $("#status-text"),
    toastContainer: $("#toast-container"),
    progressContainer: $("#progress-container"),
    progressStatus: $("#progress-status"),
    progressPercent: $("#progress-percent"),
    progressBar: $("#progress-bar"),
    progressSpeed: $("#progress-speed"),
    progressEta: $("#progress-eta"),

    soundToggleBtn: $("#sound-toggle-btn"),
    soundOnIcon: $("#sound-on-icon"),
    soundOffIcon: $("#sound-off-icon"),
    advancedToggleBtn: $("#advanced-toggle-btn"),
    advancedPanel: $("#advanced-panel"),
    bitrateGroup: $("#bitrate-group"),
    embedSubsSwitch: $("#embed-subs-switch"),
    rawAudioSwitch: $("#raw-audio-switch"),
    visualizerAudio: $("#visualizer-audio"),
    visualizerVideo: $("#visualizer-video"),
    playPreviewBtn: $("#play-preview-btn"),
    closePreviewBtn: $("#close-preview-btn"),
    playerContainer: $("#player-container"),
    langBtn: $("#lang-btn"),
    langDropdown: $("#lang-dropdown"),
  };

  // -----------------------------------------------------------------------
  // Electron Title Bar
  // -----------------------------------------------------------------------
  if (state.isElectron) {
    dom.titleBar.classList.add("visible");
    dom.body.classList.add("has-titlebar");
  }

  if (state.isElectron && dom.tbMinimize) {
    dom.tbMinimize.addEventListener("click", () => window.electronAPI.minimize());
    dom.tbMaximize.addEventListener("click", () => window.electronAPI.maximize());
    dom.tbClose.addEventListener("click", () => window.electronAPI.close());
  }

  // -----------------------------------------------------------------------
  // Toast System
  // -----------------------------------------------------------------------
  function showToast(message, type = "info", duration = 4000) {
    const icons = {
      success:
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error:
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info:
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span>${escapeHtml(message)}</span>
    `;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-exit");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // -----------------------------------------------------------------------
  // Translations Dictionary
  // -----------------------------------------------------------------------
  const translations = {
    en: {
      subtitle: "Download YouTube videos & audio in the highest quality",
      urlPlaceholder: "Paste a YouTube URL here...",
      pasteBtnTitle: "Paste from clipboard",
      fetchBtnTitle: "Fetch video info",
      advancedSettings: "Advanced Settings",
      audioBitrate: "Audio Bitrate",
      embedSubtitles: "Embed Subtitles",
      embedSubtitlesDesc: "Embed all available subtitles",
      rawAudio: "Raw Audio Format",
      rawAudioDesc: "Skip conversion (M4A/WebM)",
      videoTab: "Video",
      audioTab: "Audio",
      selectQuality: "Select quality...",
      noFormats: "No formats available",
      videoBest: "Best Quality (Auto-detect)",
      audioBest: "Best Quality MP3 (Auto-convert)",
      progressDownloading: "Downloading...",
      progressProcessing: "Processing...",
      progressConnecting: "Connecting to downloader...",
      progressSpeedDone: "Done",
      progressSpeedPost: "Post-processing...",
      progressEtaFinished: "Finished",
      progressEtaAlmost: "Almost done...",
      downloadBtn: "Download",
      downloadingBtn: "Downloading...",
      recentDownloads: "Recent Downloads",
      clearAll: "Clear All",
      statusChecking: "Checking yt-dlp...",
      statusReady: "Ready",
      statusError: "Error",
      statusOffline: "Offline",
      statusOnline: "Online",
      statusUnreachable: "Server unreachable",
      statusWaiting: "Waiting",
      statusFetching: "Fetching video info...",
      toastMissingUrl: "Please enter a YouTube URL",
      toastLoaded: "Video loaded successfully",
      toastError: "Error",
      toastHistoryCleared: "History cleared",
      toastClipboardError: "Unable to read clipboard",
      toastDownloaded: "Downloaded",
      noDownloads: "No downloads yet",
      disclaimer: "Disclaimer: This tool is provided for educational and archiving purposes only. Users are responsible for obtaining permission from the content owners before downloading. The developers assume no liability for unauthorized usage.",
    },
    pt: {
      subtitle: "Baixe vídeos e áudios do YouTube na melhor qualidade",
      urlPlaceholder: "Cole uma URL do YouTube aqui...",
      pasteBtnTitle: "Colar da área de transferência",
      fetchBtnTitle: "Buscar informações do vídeo",
      advancedSettings: "Configurações Avançadas",
      audioBitrate: "Bitrate de Áudio",
      embedSubtitles: "Embutir Legendas",
      embedSubtitlesDesc: "Embutir todas as legendas disponíveis",
      rawAudio: "Formato de Áudio Bruto",
      rawAudioDesc: "Ignorar conversão (M4A/WebM)",
      videoTab: "Vídeo",
      audioTab: "Áudio",
      selectQuality: "Selecione a qualidade...",
      noFormats: "Sem formatos disponíveis",
      videoBest: "Melhor Qualidade (Auto-detectar)",
      audioBest: "Melhor MP3 (Auto-converter)",
      progressDownloading: "Baixando...",
      progressProcessing: "Processando...",
      progressConnecting: "Conectando ao baixador...",
      progressSpeedDone: "Concluído",
      progressSpeedPost: "Pós-processamento...",
      progressEtaFinished: "Finalizado",
      progressEtaAlmost: "Quase pronto...",
      downloadBtn: "Baixar",
      downloadingBtn: "Baixando...",
      recentDownloads: "Downloads Recentes",
      clearAll: "Limpar Tudo",
      statusChecking: "Verificando yt-dlp...",
      statusReady: "Pronto",
      statusError: "Erro",
      statusOffline: "Offline",
      statusOnline: "Online",
      statusUnreachable: "Servidor inalcançável",
      statusWaiting: "Aguardando",
      statusFetching: "Buscando informações do vídeo...",
      toastMissingUrl: "Por favor, insira uma URL do YouTube",
      toastLoaded: "Vídeo carregado com sucesso",
      toastError: "Erro",
      toastHistoryCleared: "Histórico limpo",
      toastClipboardError: "Não foi possível ler a área de transferência",
      toastDownloaded: "Baixado",
      noDownloads: "Nenhum download ainda",
      disclaimer: "Aviso: Esta ferramenta é fornecida apenas para fins educacionais e de arquivamento. Os usuários são responsáveis por obter permissão dos proprietários do conteúdo antes de baixar. Os desenvolvedores não assumem qualquer responsabilidade pelo uso não autorizado.",
    },
    es: {
      subtitle: "Descarga videos y audio de YouTube en la mejor calidad",
      urlPlaceholder: "Pega una URL de YouTube aquí...",
      pasteBtnTitle: "Pegar del portapapeles",
      fetchBtnTitle: "Obtener información del video",
      advancedSettings: "Configuración Avanzada",
      audioBitrate: "Bitrate de Audio",
      embedSubtitles: "Incrustar Subtítulos",
      embedSubtitlesDesc: "Incrustar todos los subtítulos disponibles",
      rawAudio: "Formato de Audio Sin Procesar",
      rawAudioDesc: "Omitir conversión (M4A/WebM)",
      videoTab: "Video",
      audioTab: "Audio",
      selectQuality: "Seleccione la calidad...",
      noFormats: "No hay formatos disponibles",
      videoBest: "Mejor Calidad (Auto-detectar)",
      audioBest: "Mejor MP3 (Auto-convertir)",
      progressDownloading: "Descargando...",
      progressProcessing: "Procesando...",
      progressConnecting: "Conectando al descargador...",
      progressSpeedDone: "Listo",
      progressSpeedPost: "Posprocesamiento...",
      progressEtaFinished: "Terminado",
      progressEtaAlmost: "Casi listo...",
      downloadBtn: "Descargar",
      downloadingBtn: "Descargando...",
      recentDownloads: "Descargas Recientes",
      clearAll: "Limpiar Todo",
      statusChecking: "Verificando yt-dlp...",
      statusReady: "Listo",
      statusError: "Error",
      statusOffline: "Desconectado",
      statusOnline: "En línea",
      statusUnreachable: "Servidor inaccesible",
      statusWaiting: "Esperando",
      statusFetching: "Obteniendo información del video...",
      toastMissingUrl: "Por favor, ingresa una URL del YouTube",
      toastLoaded: "Video cargado con éxito",
      toastError: "Error",
      toastHistoryCleared: "Historial limpiado",
      toastClipboardError: "No se pudo leer el portapapeles",
      toastDownloaded: "Descargado",
      noDownloads: "No hay descargas aún",
      disclaimer: "Descargo de responsabilidad: Esta herramienta se proporciona únicamente con fines educativos y de archivo. Los usuarios son responsables de obtener el permiso de los propietarios del contenido antes de descargar. Los desarrolladores no asumen ninguna responsabilidad por el uso no autorizado.",
    }
  };

  function t(key) {
    const lang = state.lang;
    return translations[lang]?.[key] || translations["en"]?.[key] || "";
  }

  function updateLanguage() {
    $$("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      const text = t(key);
      if (text) {
        el.textContent = text;
      }
    });

    if (dom.urlInput) {
      dom.urlInput.placeholder = t("urlPlaceholder");
    }
    if (dom.pasteBtn) {
      dom.pasteBtn.title = t("pasteBtnTitle");
    }
    if (dom.fetchBtn) {
      dom.fetchBtn.title = t("fetchBtnTitle");
    }
    if (dom.langBtn) {
      dom.langBtn.textContent = state.lang.toUpperCase();
    }

    $$(".lang-option").forEach((opt) => {
      if (opt.dataset.lang === state.lang) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDuration(seconds) {
    if (!seconds) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function formatViews(count) {
    if (!count) return "";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
    return `${count} views`;
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // -----------------------------------------------------------------------
  // History (localStorage)
  // -----------------------------------------------------------------------
  function loadHistory() {
    try {
      const data = localStorage.getItem("ytdl_history");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem("ytdl_history", JSON.stringify(state.history));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  }

  function addHistory(title, url, mode, thumb) {
    state.history.unshift({
      id: generateId(),
      title: title || "Unknown",
      url,
      mode: mode || "video",
      thumbnail: thumb || "",
      date: new Date().toISOString(),
      favorite: false,
    });
    // Keep max 50 entries
    if (state.history.length > 50) state.history.pop();
    saveHistory();
    renderHistory();
  }

  function deleteHistory(id) {
    state.history = state.history.filter((h) => h.id !== id);
    saveHistory();
    renderHistory();
  }

  function toggleFavorite(id) {
    const item = state.history.find((h) => h.id === id);
    if (item) {
      item.favorite = !item.favorite;
      saveHistory();
      renderHistory();
    }
  }

  function renameHistory(id, newTitle) {
    const item = state.history.find((h) => h.id === id);
    if (item) {
      item.title = newTitle;
      saveHistory();
      renderHistory();
    }
  }

  function clearHistory() {
    state.history = [];
    saveHistory();
    renderHistory();
    showToast(t("toastHistoryCleared"), "info");
  }

  function renderHistory() {
    const items = dom.historyItems;
    const count = dom.historyCount;

    const sorted = [...state.history].sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    count.textContent = state.history.length;

    if (state.history.length === 0) {
      items.innerHTML = `<div class="history-item" style="opacity:0.5;justify-content:center;font-size:0.85rem;color:var(--text-muted);">${t("noDownloads")}</div>`;
      return;
    }

    items.innerHTML = sorted
      .map(
        (h) => `
      <div class="history-item" data-id="${escapeHtml(h.id)}">
        <img class="history-thumb" src="${escapeHtml(h.thumbnail || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 40'%3E%3Crect fill='%2308081c' width='72' height='40'/%3E%3C/svg%3E")}" alt="" loading="lazy" />
        <div class="history-info">
          <div class="history-title-wrapper">
            <span class="history-title" title="${escapeHtml(h.title)}">${escapeHtml(h.title)}</span>
          </div>
          <span class="history-date">${new Date(h.date).toLocaleString()} · ${h.mode}</span>
        </div>
        <div class="history-actions">
          <button class="history-action-btn fav-btn ${h.favorite ? "active" : ""}" title="Toggle favorite">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${h.favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button class="history-action-btn edit-btn" title="Rename">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="history-action-btn delete-btn" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`
      )
      .join("");

    // Attach event handlers for history items
    items.querySelectorAll(".history-item").forEach((el) => {
      const id = el.dataset.id;

      el.querySelector(".fav-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(id);
      });

      el.querySelector(".edit-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const wrapper = el.querySelector(".history-title-wrapper");
        const currentTitle = state.history.find((h) => h.id === id)?.title || "";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "history-edit-input";
        input.value = currentTitle;
        wrapper.innerHTML = "";
        wrapper.appendChild(input);
        input.focus();
        input.select();

        const save = () => {
          const newTitle = input.value.trim() || currentTitle;
          renameHistory(id, newTitle);
        };

        input.addEventListener("blur", save);
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") { input.blur(); }
          if (ev.key === "Escape") { wrapper.textContent = currentTitle; }
        });
      });

      el.querySelector(".delete-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteHistory(id);
      });

      el.querySelector(".history-title")?.addEventListener("click", () => {
        dom.urlInput.value = state.history.find((h) => h.id === id)?.url || "";
        dom.urlInput.focus();
        fetchVideoInfo();
      });
    });
  }

  // Toggle history panel
  dom.historyToggle.addEventListener("click", () => {
    dom.historyList.classList.toggle("hidden");
    dom.historyToggle.classList.toggle("expanded");
  });

  dom.clearAllBtn.addEventListener("click", clearHistory);

  // -----------------------------------------------------------------------
  // Status Bar
  // -----------------------------------------------------------------------
  function setStatus(text, type = "waiting") {
    dom.statusText.textContent = text;
    dom.statusDot.className = "status-dot " + type;
  }

  // -----------------------------------------------------------------------
  // Clipboard + URL Input
  // -----------------------------------------------------------------------
  dom.pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        dom.urlInput.value = text;
        dom.inputCard.classList.add("pulsed");
        setTimeout(() => dom.inputCard.classList.remove("pulsed"), 800);
        dom.urlInput.focus();
      }
    } catch {
      showToast("Unable to read clipboard", "error");
    }
  });

  // Keyboard: Ctrl+V / Cmd+V paste
  dom.urlInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      // Let default paste happen
      setTimeout(() => {
        dom.inputCard.classList.add("pulsed");
        setTimeout(() => dom.inputCard.classList.remove("pulsed"), 800);
      }, 50);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      fetchVideoInfo();
    }
  });

  dom.fetchBtn.addEventListener("click", fetchVideoInfo);

  // -----------------------------------------------------------------------
  // API Calls
  // -----------------------------------------------------------------------
  async function fetchVideoInfo() {
    const url = dom.urlInput.value.trim();
    if (!url) {
      sfx.play("error");
      showToast(t("toastMissingUrl"), "error");
      dom.urlInput.focus();
      return;
    }

    sfx.play("click");
    // Show loading
    dom.loadingSection.classList.remove("hidden");
    dom.videoSection.classList.add("hidden");
    dom.downloadBtn.disabled = true;
    setStatus(t("statusFetching"), "waiting");

    try {
      const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      state.videoInfo = data;
      state.formats = data.formats || [];
      renderVideoInfo(data);
      populateFormats();
      dom.loadingSection.classList.add("hidden");
      dom.videoSection.classList.remove("hidden");
      const readyStr = t("statusReady");
      setStatus(`${readyStr} — ${data.title}`, "online");
      sfx.play("success");
      showToast(t("toastLoaded"), "success");
    } catch (err) {
      dom.loadingSection.classList.add("hidden");
      setStatus(t("statusError"), "offline");
      sfx.play("error");
      showToast(`Error: ${err.message}`, "error");
    }
  }

  function stopPreview() {
    if (dom.playerContainer) {
      dom.playerContainer.innerHTML = "";
      dom.playerContainer.classList.add("hidden");
    }
    if (dom.closePreviewBtn) dom.closePreviewBtn.classList.add("hidden");
    if (dom.videoThumb) dom.videoThumb.classList.remove("hidden");
    if (dom.videoDuration) dom.videoDuration.classList.remove("hidden");
    if (dom.playPreviewBtn) dom.playPreviewBtn.classList.remove("hidden");
  }

  function renderVideoInfo(info) {
    stopPreview();
    dom.videoThumb.src = info.thumbnail || "";
    dom.videoThumb.alt = info.title || "";
    dom.videoDuration.textContent = formatDuration(info.duration);
    dom.videoTitle.textContent = info.title || "Unknown";
    dom.videoChannel.textContent = info.channel || "";
    dom.videoViews.textContent = formatViews(info.viewCount);
  }

  function populateFormats() {
    const select = dom.formatSelect;
    if (state.downloadMode === "video") {
      select.innerHTML = `<option value="">${t("videoBest")}</option>`;
    } else {
      select.innerHTML = `<option value="">${t("audioBest")}</option>`;
    }

    // Filter by current mode
    const filtered = state.formats.filter((f) => {
      if (state.downloadMode === "video") {
        return f.hasVideo;
      } else {
        return !f.hasVideo;
      }
    });

    // Deduplicate by resolution
    const seen = new Set();
    filtered.forEach((f) => {
      const label = f.label || f.resolution || `${f.ext} ${f.formatId}`;
      const key = f.formatId || label;
      if (seen.has(key)) return;
      seen.add(key);

      const sizeStr = f.filesize ? ` (${formatSize(f.filesize)})` : "";
      const opt = document.createElement("option");
      opt.value = f.formatId || "";
      opt.textContent = `${label}${sizeStr}`;
      select.appendChild(opt);
    });

    if (filtered.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = t("noFormats");
      opt.disabled = true;
      select.appendChild(opt);
    }

    // Enable download if we have formats
    dom.downloadBtn.disabled = filtered.length === 0;
  }

  // -----------------------------------------------------------------------
  // Format Tabs (Video / Audio)
  // -----------------------------------------------------------------------
  dom.tabVideo.addEventListener("click", () => {
    if (state.downloadMode === "video") return;
    state.downloadMode = "video";
    dom.tabVideo.classList.add("active");
    dom.tabAudio.classList.remove("active");
    dom.formatSelect.value = "";
    populateFormats();
  });

  dom.tabAudio.addEventListener("click", () => {
    if (state.downloadMode === "audio") return;
    state.downloadMode = "audio";
    dom.tabAudio.classList.add("active");
    dom.tabVideo.classList.remove("active");
    dom.formatSelect.value = "";
    populateFormats();
  });

  // -----------------------------------------------------------------------
  // Format Select
  // -----------------------------------------------------------------------
  dom.formatSelect.addEventListener("change", () => {
    state.selectedFormatId = dom.formatSelect.value;
    dom.downloadBtn.disabled = !dom.formatSelect.value && state.formats.length === 0;
  });

  // -----------------------------------------------------------------------
  // Download
  // -----------------------------------------------------------------------
  dom.downloadBtn.addEventListener("click", startDownload);

  async function startDownload() {
    const url = dom.urlInput.value.trim();
    if (!url || state.isDownloading) return;

    stopPreview();

    const formatId = dom.formatSelect.value;
    const mode = state.downloadMode;

    const downloadId = "dl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    state.isDownloading = true;
    dom.downloadBtn.disabled = true;
    dom.downloadContent.classList.add("hidden");
    dom.downloadLoading.classList.remove("hidden");
    setStatus(t("progressDownloading"), "waiting");
    sfx.play("click");

    // Reset and show progress UI
    dom.progressContainer.classList.remove("hidden");
    dom.progressBar.style.width = "0%";
    dom.progressPercent.textContent = "0%";
    dom.progressStatus.textContent = t("progressConnecting");
    dom.progressSpeed.textContent = "0 KB/s";
    dom.progressEta.textContent = "ETA: --:--";

    if (mode === "audio") {
      dom.visualizerAudio.classList.remove("hidden");
      dom.visualizerVideo.classList.add("hidden");
    } else {
      dom.visualizerVideo.classList.remove("hidden");
      dom.visualizerAudio.classList.add("hidden");
    }

    let eventSource = null;

    try {
      eventSource = new EventSource(`/api/progress/${downloadId}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === "downloading") {
            dom.progressStatus.textContent = t("progressDownloading");
            const percentVal = typeof data.percent === "number" ? data.percent : parseFloat(data.percent);
            dom.progressBar.style.width = `${percentVal}%`;
            dom.progressPercent.textContent = `${percentVal.toFixed(1)}%`;
            dom.progressSpeed.textContent = data.speed || "0 KB/s";
            dom.progressEta.textContent = `ETA: ${data.eta || "--:--"}`;
          } else if (data.status === "processing") {
            dom.progressStatus.textContent = data.message || t("progressProcessing");
            dom.progressBar.style.width = "100%";
            dom.progressPercent.textContent = "100%";
            dom.progressSpeed.textContent = t("progressSpeedPost");
            dom.progressEta.textContent = t("progressEtaAlmost");
          } else if (data.status === "complete") {
            dom.progressStatus.textContent = t("progressSpeedDone");
            dom.progressBar.style.width = "100%";
            dom.progressPercent.textContent = "100%";
            dom.progressSpeed.textContent = t("progressSpeedDone");
            dom.progressEta.textContent = t("progressEtaFinished");
            dom.visualizerAudio.classList.add("hidden");
            dom.visualizerVideo.classList.add("hidden");
          } else if (data.status === "error") {
            setStatus(t("statusError"), "offline");
            sfx.play("error");
            showToast(`Download error: ${data.error}`, "error");
            dom.visualizerAudio.classList.add("hidden");
            dom.visualizerVideo.classList.add("hidden");
          }
        } catch (_e) {
          // ignore parsing error
        }
      };

      const activeBitrate = dom.bitrateGroup.querySelector(".bitrate-pill.active")?.dataset?.kbps || "320";
      const embedSubs = dom.embedSubsSwitch.checked;
      const rawAudio = dom.rawAudioSwitch.checked;

      const params = new URLSearchParams({ 
         url, 
         mode, 
         downloadId,
         kbps: activeBitrate,
         subtitles: embedSubs ? "true" : "false",
         rawAudio: rawAudio ? "true" : "false"
      });
      if (formatId) params.set("formatId", formatId);

      const response = await fetch(`/api/download?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `HTTP ${response.status}`);
      }

      // Trigger browser download
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/) ||
        contentDisposition.match(/filename="(.+?)"/);
      let filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "download";
      // Ensure extension
      if (!filename.includes(".")) {
        filename += mode === "audio" ? ".mp3" : ".mp4";
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 10000);

      // Add to history
      addHistory(
        state.videoInfo?.title || filename,
        url,
        mode,
        state.videoInfo?.thumbnail || ""
      );

      setStatus(t("toastDownloaded"), "online");
      sfx.play("complete");
      showToast(`${t("toastDownloaded")}: ${filename}`, "success");
    } catch (err) {
      setStatus(t("statusError"), "offline");
      sfx.play("error");
      showToast(`Download error: ${err.message}`, "error");
      dom.visualizerAudio.classList.add("hidden");
      dom.visualizerVideo.classList.add("hidden");
    } finally {
      state.isDownloading = false;
      dom.downloadBtn.disabled = false;
      dom.downloadContent.classList.remove("hidden");
      dom.downloadLoading.classList.add("hidden");
      if (eventSource) {
        eventSource.close();
      }
      setTimeout(() => {
        dom.progressContainer.classList.add("hidden");
      }, 3000);
    }
  }

  // -----------------------------------------------------------------------
  // Health check on startup
  // -----------------------------------------------------------------------
  async function checkHealth() {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      if (data.status === "ok") {
        const readyStr = t("statusReady");
        setStatus(`yt-dlp ${data.ytDlpVersion || readyStr}`, "online");
      } else {
        setStatus("yt-dlp not found", "offline");
      }
    } catch {
      setStatus(t("statusUnreachable"), "offline");
    }
  }

  // -----------------------------------------------------------------------
  // Keyboard shortcuts
  // -----------------------------------------------------------------------
  document.addEventListener("keydown", (e) => {
    // Ctrl+S / Cmd+S → minimize
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (state.isElectron) window.electronAPI.minimize();
    }
    // Ctrl+W / Cmd+W → close
    if ((e.ctrlKey || e.metaKey) && e.key === "w") {
      e.preventDefault();
      if (state.isElectron) window.electronAPI.close();
    }
    // Ctrl+Shift+V / Cmd+Shift+V → toggle history
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "V") {
      e.preventDefault();
      dom.historyToggle.click();
    }
  });

  // -----------------------------------------------------------------------
  // Sound Synthesizer (Web Audio API)
  // -----------------------------------------------------------------------
  const soundState = {
    enabled: localStorage.getItem("ytdl_sound_enabled") !== "false",
  };

  const sfx = {
    ctx: null,
    
    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    },

    play(type) {
      if (!soundState.enabled) return;
      try {
        this.init();
        const ctx = this.ctx;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === "click") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
        } else if (type === "success") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.setValueAtTime(900, now + 0.08);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.setValueAtTime(0.08, now + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === "error") {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.linearRampToValueAtTime(100, now + 0.25);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === "complete") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(1000, now + 0.35);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        }
      } catch (e) {
        console.error("Failed to play sound:", e);
      }
    }
  };

  // -----------------------------------------------------------------------
  // 3D Tilt Hover Effect
  // -----------------------------------------------------------------------
  function applyTilt(el) {
    if (!el) return;

    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const xc = rect.width / 2;
      const yc = rect.height / 2;

      const angleX = -(y - yc) / (rect.height / 8);
      const angleY = (x - xc) / (rect.width / 8);

      el.style.transition = "none";
      el.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.01, 1.01, 1.01)`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.transition = "transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)";
      el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    });
  }

  // -----------------------------------------------------------------------
  // Background Particles Constellation
  // -----------------------------------------------------------------------
  const BGParticles = {
    canvas: null,
    ctx: null,
    particles: [],
    maxParticles: 80,
    connectionDist: 120,
    animationFrameId: null,

    init() {
      this.canvas = document.getElementById("bg-canvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.createParticles();
      this.animate();
    },

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.createParticles();
    },

    createParticles() {
      this.particles = [];
      const count = Math.min(this.maxParticles, Math.floor((this.canvas.width * this.canvas.height) / 15000));
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 1.5 + 1,
          color: Math.random() > 0.45 ? "rgba(0, 240, 255, 0.4)" : "rgba(255, 0, 127, 0.4)",
        });
      }
    },

    animate() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const particles = this.particles;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = w;
        else if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        else if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < this.connectionDist) {
            const alpha = (1 - dist / this.connectionDist) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.color.replace("0.4", alpha.toString());
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
  };

  // -----------------------------------------------------------------------
  // Click Spark Particles Burst
  // -----------------------------------------------------------------------
  function createSparks(x, y) {
    const colors = ["#00f0ff", "#ff007f", "#9d4edd", "#39ff14", "#ffb703"];
    const count = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "spark-particle";
      
      const size = Math.random() * 6 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.background = color;
      p.style.boxShadow = `0 0 ${size * 2}px ${color}`;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      document.body.appendChild(p);
      
      let opacity = 1;
      let px = x;
      let py = y;
      
      const updateParticle = () => {
        px += vx;
        py += vy;
        opacity -= 0.03;
        
        p.style.left = `${px}px`;
        p.style.top = `${py}px`;
        p.style.opacity = opacity;
        
        if (opacity > 0) {
          requestAnimationFrame(updateParticle);
        } else {
          p.remove();
        }
      };
      
      requestAnimationFrame(updateParticle);
    }
  }

  // -----------------------------------------------------------------------
  // HUD Bracket Injection
  // -----------------------------------------------------------------------
  function injectBrackets() {
    const glassCards = $$(".glass");
    glassCards.forEach((card) => {
      if (card.querySelector(".hud-bracket")) return;
      const positions = ["tl", "tr", "bl", "br"];
      positions.forEach((pos) => {
        const bracket = document.createElement("div");
        bracket.className = `hud-bracket hud-bracket-${pos}`;
        card.appendChild(bracket);
      });
    });
  }

  // -----------------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------------
  function init() {
    renderHistory();
    checkHealth();
    injectBrackets();
    BGParticles.init();
    updateLanguage();

    // Toggle Language Dropdown
    dom.langBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      sfx.play("click");
      dom.langDropdown.classList.toggle("hidden");
    });

    // Close language dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (dom.langDropdown && !dom.langDropdown.classList.contains("hidden") && !dom.langBtn.contains(e.target)) {
        dom.langDropdown.classList.add("hidden");
      }
    });

    // Language option selection
    $$(".lang-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        const selectedLang = opt.dataset.lang;
        state.lang = selectedLang;
        localStorage.setItem("ytdl_lang", selectedLang);
        updateLanguage();
        sfx.play("click");
        dom.langDropdown.classList.add("hidden");
      });
    });

    // Global click listener for spark particles
    document.addEventListener("click", (e) => {
      createSparks(e.clientX, e.clientY);
    });

    // Periodically re-check health
    setInterval(checkHealth, 60000);

    // Focus URL input
    dom.urlInput.focus();

    // Set sound toggle button icon state
    if (soundState.enabled) {
      dom.soundOnIcon.classList.remove("hidden");
      dom.soundOffIcon.classList.add("hidden");
    } else {
      dom.soundOnIcon.classList.add("hidden");
      dom.soundOffIcon.classList.remove("hidden");
    }

    // Toggle Sound FX Click
    dom.soundToggleBtn.addEventListener("click", () => {
      soundState.enabled = !soundState.enabled;
      localStorage.setItem("ytdl_sound_enabled", soundState.enabled ? "true" : "false");
      if (soundState.enabled) {
        dom.soundOnIcon.classList.remove("hidden");
        dom.soundOffIcon.classList.add("hidden");
        sfx.play("click");
      } else {
        dom.soundOnIcon.classList.add("hidden");
        dom.soundOffIcon.classList.remove("hidden");
      }
    });

    // Toggle Advanced Panel
    dom.advancedToggleBtn.addEventListener("click", () => {
      sfx.play("click");
      dom.advancedPanel.classList.toggle("collapsed");
      dom.advancedToggleBtn.classList.toggle("active");
    });

    // Bitrate Pills selection
    const pills = dom.bitrateGroup.querySelectorAll(".bitrate-pill");
    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        sfx.play("click");
        pills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
      });
    });

    // Embed Subs Switch Click
    dom.embedSubsSwitch.addEventListener("change", () => {
      sfx.play("click");
    });

    // Raw Audio Switch Click
    dom.rawAudioSwitch.addEventListener("change", () => {
      sfx.play("click");
    });

    // Play click sound on tabs
    dom.tabVideo.addEventListener("click", () => {
      sfx.play("click");
      stopPreview();
    });
    dom.tabAudio.addEventListener("click", () => {
      sfx.play("click");
      stopPreview();
    });

    // Play Preview Event
    dom.playPreviewBtn.addEventListener("click", () => {
      sfx.play("click");
      const videoId = state.videoInfo?.id;
      if (!videoId) {
        showToast("Invalid video ID", "error");
        return;
      }

      // Embed YouTube Player inside #player-container
      dom.playerContainer.innerHTML = `
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1" 
          allow="autoplay; encrypted-media" 
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen>
        </iframe>
      `;
      dom.playerContainer.classList.remove("hidden");
      dom.closePreviewBtn.classList.remove("hidden");
      dom.videoThumb.classList.add("hidden");
      dom.videoDuration.classList.add("hidden");
      dom.playPreviewBtn.classList.add("hidden");
    });

    // Close Preview Event
    dom.closePreviewBtn.addEventListener("click", () => {
      sfx.play("click");
      stopPreview();
    });

    // Apply 3D Tilt Effect to cards
    applyTilt(dom.inputCard);
    applyTilt($("#video-section .video-card"));
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();