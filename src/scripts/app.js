const btn = document.querySelector(".js-toggle-button");
const eyes = document.querySelector(".js-status-eyes");
const favicon = document.querySelector(".js-favicon");
const statusEl = document.querySelector(".js-status-message");
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
const pipOverlay = document.querySelector(".js-pip-overlay");
const pipCloseBtn = document.querySelector(".js-pip-close");
const pipStopBtn = document.querySelector(".js-pip-stop");
const pipAlert = document.querySelector(".js-pip-alert");
const pipReopenBtn = document.querySelector(".js-pip-reopen");
let pipStream = null;
let pipSettled = false;

const HISTORY_KEY = "__@despierto-store.history__";
const THEME_KEY = "__@despierto.theme__";

const I18N = window.__I18N || {};
const DATE_LOCALE = window.__DATE_LOCALE || "es";

function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    vars && vars[k] != null ? vars[k] : "",
  );
}

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
    currentTheme() === "dark" ? I18N.themeToLight : I18N.themeToDark;
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

const EYES_OPEN =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
  "<g fill='none' stroke='#16a34a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>" +
  "<path d='M1 16 Q8 8 15 16 Q8 24 1 16 Z'/><path d='M17 16 Q24 8 31 16 Q24 24 17 16 Z'/></g>" +
  "<circle cx='8' cy='16' r='3.4' fill='#16a34a'/><circle cx='24' cy='16' r='3.4' fill='#16a34a'/></svg>";

const EYES_CLOSED =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
  "<g fill='none' stroke='#8b8b8f' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>" +
  "<path d='M1 14 Q8 22 15 14'/><path d='M17 14 Q24 22 31 14'/></g></svg>";

function updateFavicon(active) {
  const svg = active ? EYES_OPEN : EYES_CLOSED;
  favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
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
  const hu = I18N.hUnit;
  const mu = I18N.minUnit;
  if (h && m) return `${h}${hu} ${m}${mu}`;
  if (h) return `${h}${hu}`;
  return `${m}${mu}`;
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
    durationSelectedEl.textContent = fill(I18N.turnsOffIn, {
      hm: formatHM(selectedMinutes),
    });
  });
});

customDurationInput.addEventListener("input", () => {
  const parsed = parseDuration(customDurationInput.value);
  if (parsed) {
    selectedMinutes = parsed;
    setActiveDurationBtn("custom");
    durationSelectedEl.textContent = fill(I18N.turnsOffIn, {
      hm: formatHM(parsed),
    });
  } else {
    durationSelectedEl.textContent = customDurationInput.value
      ? I18N.invalidFormat
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
  const date = new Date(entry.start).toLocaleString(DATE_LOCALE, {
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

  const label = isTimer ? I18N.modeTimer : I18N.modeStopwatch;
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
  if (confirm(I18N.confirmClear)) {
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
        remainingMs > 0
          ? fill(I18N.offIn, { time: formatDuration(remainingMs) })
          : "";
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
  eyes.classList.toggle("is-on", active);
  updateFavicon(active);
  btn.textContent = active ? I18N.deactivate : I18N.activate;
  btn.setAttribute("aria-pressed", String(active));
  statusEl.textContent = active ? msg || "" : I18N.idle;
  setDurationPickerEnabled(!active);
  setTabsEnabled(!active);
  pipOpenBtn.disabled = !active;
  pipOpenBtn.title = active ? I18N.pipTitleActive : I18N.pipTitleIdle;
  setMediaSession(active);
  if (!active) stopPipVideo();
  syncPipUi();
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
  ctx.fillText(isTimer ? I18N.canvasTimer : I18N.canvasStopwatch, width / 2, 100);

  ctx.font = "700 62px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = cssVar("--fg", "#f5f5f7");
  ctx.fillText(startTime ? formatDuration(Date.now() - startTime) : "00:00:00", width / 2, 172);

  if (isTimer) {
    const remainingMs = autoStopAt - Date.now();
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillStyle = cssVar("--accent-auto", "#d97706");
    ctx.fillText(
      remainingMs > 0
        ? fill(I18N.pipMeta, {
            time: formatDuration(remainingMs),
            hm: formatHM(selectedMinutes),
          })
        : I18N.ending,
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
  pipSettled = false;

  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {})
  };

  if (!pipStream) return;

  pipVideo.pause();
  pipStream.getTracks().forEach((track) => track.stop());
  pipVideo.srcObject = null;
  pipStream = null;
}

// Chrome only allows requestPictureInPicture() while a user gesture is being
// handled, unless something is already in PiP. There is no gesture left by the
// time the tab hides, so the window has to be opened from the activate click
// and kept open for the whole session.
async function openPip(source) {
  if (!pipSupported || !userActive || document.pictureInPictureElement) return;

  await startPipVideo();

  try {
    await pipVideo.requestPictureInPicture();
    track("pip_open", { mode: activeTab, source: source || "auto" });
  } catch (err) {
    statusEl.textContent = I18N.pipFailed;
  }

  pipSettled = true;
  syncPipUi();
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

  openPip("button");
}

// The PiP window already shows the timer, so the card behind it is redundant:
// cover it while PiP is up, and warn when the only background cover is gone.
function syncPipUi() {
  const inPip = Boolean(document.pictureInPictureElement);
  pipOpenBtn.setAttribute("aria-pressed", String(inPip));
  pipOverlay.hidden = !(userActive && inPip);
  pipAlert.hidden = !(userActive && pipSettled && pipSupported && !inPip);
  document.body.classList.toggle("has-alert", !pipAlert.hidden);
  syncAlertHeight();
}

// The banner wraps to two or three lines on narrow screens, so whatever sits
// below it has to be pushed down by its real height, not a guessed one.
function syncAlertHeight() {
  const height = pipAlert.hidden ? 0 : pipAlert.offsetHeight;
  document.body.style.setProperty("--alert-h", `${height}px`);
}

new ResizeObserver(syncAlertHeight).observe(pipAlert);

pipOpenBtn.addEventListener("click", togglePip);
pipCloseBtn.addEventListener("click", closePip);
pipStopBtn.addEventListener("click", () => stopSession("manual"));
pipReopenBtn.addEventListener("click", () => openPip("alert"));

pipVideo.addEventListener("enterpictureinpicture", syncPipUi);
pipVideo.addEventListener("leavepictureinpicture", syncPipUi);

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

statusEl.textContent = I18N.idle;
pipOpenBtn.hidden = !pipSupported;

async function acquireFormalLock() {
  if (!("wakeLock" in navigator) || wakeLock) return;

  try {
    wakeLock = await navigator.wakeLock.request("screen");

    // Only clear the reference; the background status is owned by the
    // visibilitychange handler, which runs on the same hide event.
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
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
  setUI(true, I18N.awakeActive);
  await acquireFormalLock();
  await startPipVideo();
}

btn.addEventListener("click", () => {
  if (userActive) {
    stopSession("manual");
    return;
  }

  startSession();
  // Must run inside the click: this is the only user gesture we will get, and
  // without it the PiP window can never be opened later.
  openPip("activate");
});

document.addEventListener("visibilitychange", async () => {
  if (!userActive) return;

  if (document.visibilityState === "visible") {
    await acquireFormalLock();
    statusEl.textContent = I18N.awakeActive;
    return;
  }

  statusEl.textContent = document.pictureInPictureElement
    ? I18N.bgWithPip
    : I18N.bgNoPip;
});

if (!("wakeLock" in navigator)) {
  statusEl.textContent = I18N.wakeLockUnsupported;
}
