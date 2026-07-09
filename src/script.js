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
const modalList = document.querySelector(".js-history-modal-list");
const modalEmpty = document.querySelector(".js-history-modal-empty");
const modalClearBtn = document.querySelector(".js-history-clear-modal");

const historyLists = [historyList, modalList];
const historyEmpties = [historyEmpty, modalEmpty];
const clearButtons = [clearHistoryBtn, modalClearBtn];

const pipSupported = "documentPictureInPicture" in window;
const pipOpenBtn = document.querySelector(".js-pip-open");
const pipWidget = document.querySelector(".js-pip-widget");
const pipLabel = document.querySelector(".js-pip-label");
const pipTime = document.querySelector(".js-pip-time");
const pipMeta = document.querySelector(".js-pip-meta");
const pipStop = document.querySelector(".js-pip-stop");
let pipWindow = null;

const HISTORY_KEY = "__@despierto-store.history__";
const THEME_KEY = "__@despierto.theme__";

function currentTheme() {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function syncThemeToggleLabel() {
  themeToggle.setAttribute(
    "aria-label",
    currentTheme() === "dark"
      ? "Cambiar a modo claro"
      : "Cambiar a modo oscuro",
  );
}

themeToggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (err) {}
  syncThemeToggleLabel();
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
let audioCtx = null;
let oscillator = null;
let gainNode = null;

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

historyOpenBtn.addEventListener("click", () => historyDialog.showModal());
historyCloseBtn.addEventListener("click", () => historyDialog.close());
historyDialog.addEventListener("click", (e) => {
  const r = historyDialog.getBoundingClientRect();
  const outside =
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom;
  if (outside) historyDialog.close();
});

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

function startSilentAudio() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  oscillator = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.0001;
  oscillator.frequency.value = 20;
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  audioCtx.resume();
}

function stopSilentAudio() {
  if (!audioCtx) return;

  oscillator.stop();
  oscillator.disconnect();
  gainNode.disconnect();
  audioCtx.close();
  audioCtx = null;
  oscillator = null;
  gainNode = null;
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
  pipOpenBtn.hidden = !(pipSupported && active);
  setMediaSession(active);
  if (!active) closePip();
}

function pipRenderStatic() {
  const isTimer = activeTab === "timer" && Boolean(autoStopAt);
  pipLabel.textContent = isTimer ? "Temporizador" : "Cronómetro";
  pipMeta.hidden = !isTimer;
}

function pipUpdate() {
  if (!pipWindow || !startTime) return;
  pipTime.textContent = formatDuration(Date.now() - startTime);
  if (activeTab === "timer" && autoStopAt) {
    const remainingMs = autoStopAt - Date.now();
    pipMeta.textContent =
      remainingMs > 0
        ? `Se apaga en ${formatDuration(remainingMs)} · dura ${formatHM(selectedMinutes)}`
        : "Terminando…";
  }
}

function pipCopyStyles(win) {
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const clone = win.document.createElement("link");
    clone.rel = "stylesheet";
    clone.href = link.href;
    win.document.head.appendChild(clone);
  });
  document.querySelectorAll("style").forEach((style) => {
    win.document.head.appendChild(style.cloneNode(true));
  });

  const base = win.document.createElement("style");
  base.textContent =
    "body{margin:0;height:100vh;display:grid;place-items:center;" +
    "background:var(--bg);color:var(--fg);" +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}';
  win.document.head.appendChild(base);

  const theme = document.documentElement.getAttribute("data-theme");
  if (theme) win.document.documentElement.setAttribute("data-theme", theme);
}

async function openPip() {
  if (!pipSupported || !userActive || pipWindow) return;
  try {
    pipWindow = await documentPictureInPicture.requestWindow({
      width: 300,
      height: 190,
    });
  } catch (err) {
    return;
  }
  pipCopyStyles(pipWindow);
  pipWidget.hidden = false;
  pipWindow.document.body.append(pipWidget);
  pipRenderStatic();
  pipUpdate();
  pipOpenBtn.setAttribute("aria-pressed", "true");
  pipWindow.addEventListener("pagehide", pipCleanup);
}

function pipCleanup() {
  if (pipWidget) {
    pipWidget.hidden = true;
    document.body.append(pipWidget);
  }
  pipWindow = null;
  pipOpenBtn.setAttribute("aria-pressed", "false");
}

function closePip() {
  if (pipWindow) pipWindow.close();
}

function togglePip() {
  if (pipWindow) closePip();
  else openPip();
}

pipOpenBtn.addEventListener("click", togglePip);
pipStop.addEventListener("click", () => stopSession("manual"));

if (pipSupported && "mediaSession" in navigator) {
  try {
    navigator.mediaSession.setActionHandler("enterpictureinpicture", () =>
      openPip(),
    );
  } catch (err) {}
}

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

  stopSilentAudio();
  stopTimer();
  setUI(false, "");
}

async function startSession() {
  userActive = true;
  startSilentAudio();

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
}

btn.addEventListener("click", () => {
  if (userActive) {
    stopSession("manual");
  } else {
    startSession();
  }
});

document.addEventListener("visibilitychange", async () => {
  if (!userActive) return;

  if (document.visibilityState === "visible") {
    await acquireFormalLock();
    status.textContent = "Pantalla despierta activa";
  } else {
    status.textContent = "Activo en segundo plano (audio)";
  }
});

if (!("wakeLock" in navigator)) {
  status.textContent = "Wake Lock no soportado — usando solo modo audio";
}
