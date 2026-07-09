const btn = document.querySelector(".js-toggle-button");
const dot = document.querySelector(".js-status-dot");
const dotWrap = document.querySelector(".js-status-dot-wrap");
const favicon = document.querySelector(".js-favicon");
const status = document.querySelector(".js-status-message");
const timerEl = document.querySelector(".js-timer");
const remainingEl = document.querySelector(".js-remaining");
const tabStopwatch = document.querySelector(".js-tab-stopwatch");
const tabTimer = document.querySelector(".js-tab-timer");
const panelTimer = document.querySelector(".js-panel-timer");
const durationBtns = Array.from(document.querySelectorAll(".js-duration-btn"));
const customDurationInput = document.querySelector(".js-duration-custom-input");
const durationSelectedEl = document.querySelector(".js-duration-selected");
const historyList = document.querySelector(".js-history-list");
const historyEmpty = document.querySelector(".js-history-empty");
const clearHistoryBtn = document.querySelector(".js-history-clear");
const themeToggle = document.querySelector(".js-theme-toggle");

const historyOpenBtn = document.querySelector(".js-history-open");
const historyDialog = document.querySelector(".js-history-dialog");
const historyCloseBtn = document.querySelector(".js-history-close");
const guideOpenBtn = document.querySelector(".js-guide-open");
const guideDialog = document.querySelector(".js-guide-dialog");
const guideCloseBtn = document.querySelector(".js-guide-close");
const modalList = document.querySelector(".js-history-modal-list");
const modalEmpty = document.querySelector(".js-history-modal-empty");
const modalClearBtn = document.querySelector(".js-history-clear-modal");

const historyLists = [historyList, modalList];
const historyEmpties = [historyEmpty, modalEmpty];
const clearButtons = [clearHistoryBtn, modalClearBtn];

const pipSupported = document.pictureInPictureEnabled === true;
const pipOpenBtn = document.querySelector(".js-pip-open");
const pipCanvas = document.querySelector(".js-pip-canvas");
const pipVideo = document.querySelector(".js-pip-video");
let pipStream = null;
let pipAutoOpened = false;

const HISTORY_KEY = "__@despierto-store.history__";
const THEME_KEY = "__@despierto.theme__";

function track(name, params) {
  if (typeof window.gtag === "function") window.gtag("event", name, params);
}

function currentTheme() {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function syncThemeToggleLabel() {
  const label =
    currentTheme() === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;
}

themeToggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (err) {}
  syncThemeToggleLabel();
  track("theme_change", { theme: next });
});

syncThemeToggleLabel();

function updateFavicon(active) {
  const color = active ? "%2316a34a" : "%238b8b8f";
  const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='13' fill='${color}'/%3E%3C/svg%3E`;
  favicon.href = svg;
}

let wakeLock = null;
let startTime = null;
let timerInterval = null;

let userActive = false;
let activeTab = "stopwatch";
let selectedMinutes = 30;
let autoStopAt = null;
let autoStopTimeout = null;

function formatDuration(ms, withMs = false) {
  const totalMs = Math.max(0, ms);
  const h = String(Math.floor(totalMs / 3600000)).padStart(2, "0");
  const m = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, "0");
  if (!withMs) return `${h}:${m}:${s}`;
  const msPart = String(Math.floor(totalMs % 1000)).padStart(3, "0");
  return `${h}:${m}:${s}.${msPart}`;
}

function formatHM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

function parseDuration(input) {
  const match = input.trim().match(/^(\d+)?(?:\.(\d+))?$/);

  if (!match || (!match[1] && !match[2])) return null;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const fracStr = match[2] || "";

  let minutesFromFrac = 0;

  if (fracStr.length === 1) {
    minutesFromFrac = Math.round((parseInt(fracStr, 10) / 10) * 60);
  } else if (fracStr.length >= 2) {
    minutesFromFrac = Math.min(59, parseInt(fracStr.slice(0, 2), 10));
  }

  const total = hours * 60 + minutesFromFrac;

  return total > 0 ? total : null;
}

function setActiveDurationBtn(minutes) {
  durationBtns.forEach((b) => {
    const isActive =
      minutes !== "custom" && Number(b.dataset.minutes) === minutes;
    b.classList.toggle("is-active", isActive);
    b.setAttribute("aria-pressed", String(isActive));
  });
}

durationBtns.forEach((b) => {
  b.addEventListener("click", () => {
    const minutes = Number(b.dataset.minutes);
    selectedMinutes = minutes;
    customDurationInput.value = "";
    setActiveDurationBtn(minutes);
    durationSelectedEl.textContent = `Se apagará solo en ${formatHM(selectedMinutes)}`;
  });
});

customDurationInput.addEventListener("input", () => {
  const parsed = parseDuration(customDurationInput.value);
  if (parsed) {
    selectedMinutes = parsed;
    setActiveDurationBtn("custom");
    durationSelectedEl.textContent = `Se apagará solo en ${formatHM(parsed)}`;
  } else {
    durationSelectedEl.textContent = customDurationInput.value
      ? "Formato inválido"
      : "";
  }
});

function setDurationPickerEnabled(enabled) {
  panelTimer.classList.toggle("is-disabled", !enabled);
  durationBtns.forEach((b) => (b.disabled = !enabled));
  customDurationInput.disabled = !enabled;
}

function setActiveTab(tab) {
  activeTab = tab;
  const stopwatchOn = tab === "stopwatch";
  tabStopwatch.classList.toggle("is-active", stopwatchOn);
  tabStopwatch.setAttribute("aria-selected", String(stopwatchOn));
  tabStopwatch.tabIndex = stopwatchOn ? 0 : -1;
  tabTimer.classList.toggle("is-active", !stopwatchOn);
  tabTimer.setAttribute("aria-selected", String(!stopwatchOn));
  tabTimer.tabIndex = stopwatchOn ? -1 : 0;
  panelTimer.hidden = stopwatchOn;
  remainingEl.textContent = "";
}

function focusTab(tab) {
  setActiveTab(tab);
  (tab === "stopwatch" ? tabStopwatch : tabTimer).focus();
}

tabStopwatch.addEventListener("click", () => setActiveTab("stopwatch"));
tabTimer.addEventListener("click", () => setActiveTab("timer"));

[tabStopwatch, tabTimer].forEach((tabEl) => {
  tabEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      focusTab(activeTab === "stopwatch" ? "timer" : "stopwatch");
    }
  });
});

function setTabsEnabled(enabled) {
  tabStopwatch.disabled = !enabled;
  tabTimer.disabled = !enabled;
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
  } catch (err) {}
}

function buildHistoryItemHTML(entry, seq) {
  const date = new Date(entry.start).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dur = formatDuration(entry.end - entry.start, true);

  const mode = entry.mode || (entry.reason === "auto" ? "timer" : "stopwatch");
  const isTimer = mode === "timer";

  const itemClass = isTimer
    ? "history-feed__item history-feed__item--timer"
    : "history-feed__item";

  const label = isTimer ? "temporizador" : "cronómetro";
  const modeTag = `<span class="history-feed__reason">${label}</span>`;

  return `
    <li class="${itemClass}">
      <div class="history-feed__row">
        <span class="history-feed__seq">#${seq}</span>
        <span class="history-feed__date">${date}</span>
      </div>
      <div class="history-feed__duration">${dur}</div>
      ${modeTag}
    </li>
  `.trim();
}

function updateHistoryVisibility(count) {
  historyEmpties.forEach((el) => {
    el.style.display = count ? "none" : "block";
  });
  clearButtons.forEach((btn) => {
    btn.hidden = !count;
  });
  historyOpenBtn.hidden = !count;
}

function renderHistory() {
  const list = loadHistory();
  const html = list
    .map((entry, i) => buildHistoryItemHTML(entry, list.length - i))
    .join("");
  historyLists.forEach((el) => {
    el.innerHTML = html;
  });
  updateHistoryVisibility(list.length);
}

function clearHistory() {
  if (confirm("¿Borrar todo el historial?")) {
    saveHistory([]);
    renderHistory();
  }
}

clearButtons.forEach((btn) => btn.addEventListener("click", clearHistory));

function closeOnBackdropClick(dialog) {
  dialog.addEventListener("click", (e) => {
    const r = dialog.getBoundingClientRect();
    const outside =
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom;
    if (outside) dialog.close();
  });
}

historyOpenBtn.addEventListener("click", () => historyDialog.showModal());
historyCloseBtn.addEventListener("click", () => historyDialog.close());
closeOnBackdropClick(historyDialog);

guideOpenBtn.addEventListener("click", () => guideDialog.showModal());
guideCloseBtn.addEventListener("click", () => guideDialog.close());
closeOnBackdropClick(guideDialog);

function addHistoryEntry(reason) {
  if (!startTime) return;

  const entry = { start: startTime, end: Date.now(), reason, mode: activeTab };
  const list = loadHistory();
  list.unshift(entry);
  saveHistory(list);
  const itemHTML = buildHistoryItemHTML(entry, list.length);
  historyLists.forEach((el) => el.insertAdjacentHTML("afterbegin", itemHTML));
  updateHistoryVisibility(list.length);
}

function startTimer() {
  startTime = Date.now();
  timerEl.classList.add("is-on");
  timerEl.textContent = "00:00:00";

  timerInterval = setInterval(() => {
    timerEl.textContent = formatDuration(Date.now() - startTime);
    if (autoStopAt) {
      const remainingMs = autoStopAt - Date.now();
      remainingEl.textContent =
        remainingMs > 0 ? `Se apaga en ${formatDuration(remainingMs)}` : "";
    }
    pipUpdate();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  startTime = null;
  timerEl.classList.remove("is-on");
  remainingEl.textContent = "";
}

function setUI(active, msg) {
  dot.classList.toggle("is-on", active);
  dotWrap.classList.toggle("is-on", active);
  updateFavicon(active);
  btn.textContent = active ? "Desactivar" : "Activar";
  btn.setAttribute("aria-pressed", String(active));
  status.textContent = active ? msg || "" : "Sin actividad";
  setDurationPickerEnabled(!active);
  setTabsEnabled(!active);
  pipOpenBtn.disabled = !active;
  pipOpenBtn.title = active
    ? "Ventana flotante"
    : "Necesita una sesión activa";
  setMediaSession(active);
  if (!active) stopPipVideo();
}

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function pipDraw() {
  const ctx = pipCanvas.getContext("2d");
  const { width, height } = pipCanvas;
  const isTimer = activeTab === "timer" && Boolean(autoStopAt);

  ctx.fillStyle = cssVar("--bg", "#121212");
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.fillStyle = cssVar("--accent-on", "#16a34a");
  ctx.beginPath();
  ctx.arc(width / 2, 46, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "600 20px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = cssVar("--accent-off", "#8b8b8f");
  ctx.fillText(isTimer ? "TEMPORIZADOR" : "CRONÓMETRO", width / 2, 100);

  ctx.font = "700 62px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = cssVar("--fg", "#f5f5f7");
  ctx.fillText(startTime ? formatDuration(Date.now() - startTime) : "00:00:00", width / 2, 172);

  if (isTimer) {
    const remainingMs = autoStopAt - Date.now();
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillStyle = cssVar("--accent-auto", "#d97706");
    ctx.fillText(
      remainingMs > 0
        ? `Se apaga en ${formatDuration(remainingMs)} · dura ${formatHM(selectedMinutes)}`
        : "Terminando…",
      width / 2,
      222,
    );
  }
}

function pipUpdate() {
  if (userActive) pipDraw();
}

// The canvas stream is what makes Chromium hold a display wake lock: a playing
// <video> keeps the screen awake while the page is visible, and keeps it awake
// even when the tab is hidden as long as the video sits in Picture-in-Picture.
async function startPipVideo() {
  if (pipStream) return;

  pipDraw();
  pipStream = pipCanvas.captureStream(4);
  pipVideo.srcObject = pipStream;

  try {
    await pipVideo.play();
  } catch (err) {}
}

function stopPipVideo() {
  pipAutoOpened = false;

  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {})
  };

  if (!pipStream) return;

  pipVideo.pause();
  pipStream.getTracks().forEach((track) => track.stop());
  pipVideo.srcObject = null;
  pipStream = null;
}

async function openPip(source) {
  if (!pipSupported || !userActive || document.pictureInPictureElement) return;

  await startPipVideo();

  try {
    await pipVideo.requestPictureInPicture();
    track("pip_open", { mode: activeTab, source: source || "auto" });
  } catch (err) {}
}

function closePip() {
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {});
  }
}

function togglePip() {
  if (document.pictureInPictureElement) {
    closePip();
    return;
  }

  // Opened by hand: keep it around when the tab comes back into view.
  pipAutoOpened = false;
  openPip("button");
}

pipOpenBtn.addEventListener("click", togglePip);

pipVideo.addEventListener("enterpictureinpicture", () =>
  pipOpenBtn.setAttribute("aria-pressed", "true"),
);

pipVideo.addEventListener("leavepictureinpicture", () =>
  pipOpenBtn.setAttribute("aria-pressed", "false"),
);

function setMediaSession(active) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = active ? "playing" : "none";
    if (active) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Despierto",
      });
    }
  } catch (err) {}
}

updateFavicon(false);
renderHistory();

status.textContent = "Sin actividad";
pipOpenBtn.hidden = !pipSupported;

async function acquireFormalLock() {
  if (!("wakeLock" in navigator) || wakeLock) return;

  try {
    wakeLock = await navigator.wakeLock.request("screen");

    wakeLock.addEventListener("release", () => {
      wakeLock = null;
      if (userActive && document.visibilityState === "hidden") {
        status.textContent = "Activo en segundo plano (audio)";
      }
    });
  } catch (err) {}
}

function stopSession(reason) {
  userActive = false;

  if (reason === "manual") {
    track("session_stop", {
      mode: activeTab,
      elapsed_seconds: startTime ? Math.round((Date.now() - startTime) / 1000) : 0,
    });
  }

  if (autoStopTimeout) {
    clearTimeout(autoStopTimeout);
    autoStopTimeout = null;
  }

  autoStopAt = null;
  addHistoryEntry(reason);

  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }

  stopTimer();
  setUI(false, "");
}

async function startSession() {
  userActive = true;

  track("session_start", {
    mode: activeTab,
    duration_minutes: activeTab === "timer" ? selectedMinutes || 0 : 0,
  });

  if (!timerInterval) startTimer();

  if (activeTab === "timer" && selectedMinutes) {
    autoStopAt = Date.now() + selectedMinutes * 60000;
    autoStopTimeout = setTimeout(
      () => stopSession("auto"),
      selectedMinutes * 60000,
    );
  }
  setUI(true, "Pantalla despierta activa");
  await acquireFormalLock();
  await startPipVideo();
}

btn.addEventListener("click", () => {
  if (userActive) {
    stopSession("manual");
    return;
  }

  startSession();
});

// While the tab is visible the wake lock alone keeps the screen awake, so the
// floating window would only be in the way. The moment the tab is hidden that
// lock is gone and only a video in PiP still holds a display assertion.
document.addEventListener("visibilitychange", async () => {
  if (!userActive) return;

  if (document.visibilityState === "visible") {
    await acquireFormalLock();
    if (pipAutoOpened) closePip();
    status.textContent = "Pantalla despierta activa";
    return;
  }

  if (!document.pictureInPictureElement) {
    pipAutoOpened = true;
    await openPip("auto-hidden");
  }

  status.textContent = document.pictureInPictureElement
    ? "Activo en segundo plano (ventana flotante)"
    : "En segundo plano sin ventana flotante";
});

if (!("wakeLock" in navigator)) {
  status.textContent = "Wake Lock no soportado en este navegador";
}
