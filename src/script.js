const btn = document.querySelector('.js-toggle-button');
const dot = document.querySelector('.js-status-dot');
const dotWrap = document.querySelector('.js-status-dot-wrap');
const favicon = document.querySelector('.js-favicon');
const status = document.querySelector('.js-status-message');
const timerEl = document.querySelector('.js-timer');
const remainingEl = document.querySelector('.js-remaining');
const tabStopwatch = document.querySelector('.js-tab-stopwatch');
const tabTimer = document.querySelector('.js-tab-timer');
const panelTimer = document.querySelector('.js-panel-timer');
const durationBtns = Array.from(document.querySelectorAll('.js-duration-btn'));
const customDurationInput = document.querySelector('.js-duration-custom-input');
const durationSelectedEl = document.querySelector('.js-duration-selected');
const historyList = document.querySelector('.js-history-list');
const historyEmpty = document.querySelector('.js-history-empty');
const clearHistoryBtn = document.querySelector('.js-history-clear');
const themeToggle = document.querySelector('.js-theme-toggle');

// Historial en modal (para mobile): mismas entradas, segundo contenedor.
const historyOpenBtn = document.querySelector('.js-history-open');
const historyDialog = document.querySelector('.js-history-dialog');
const historyCloseBtn = document.querySelector('.js-history-close');
const modalList = document.querySelector('.js-history-modal-list');
const modalEmpty = document.querySelector('.js-history-modal-empty');
const modalClearBtn = document.querySelector('.js-history-clear-modal');

// El overlay lateral (desktop) y el modal (mobile) muestran las mismas entradas.
const historyLists = [historyList, modalList];
const historyEmpties = [historyEmpty, modalEmpty];
const clearButtons = [clearHistoryBtn, modalClearBtn];

const HISTORY_KEY = '__@despierto-store.history__';
const THEME_KEY = '__@despierto.theme__';

// Tema efectivo actual: el forzado por data-theme, o el del sistema si no hay override.
function currentTheme() {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function syncThemeToggleLabel() {
  themeToggle.setAttribute(
    'aria-label',
    currentTheme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
  );
}

// El toggle escribe data-theme en <html> (el CSS reacciona) y persiste la elección.
// El ícono sol/luna lo controla el CSS según el tema efectivo, no hace falta tocarlo aquí.
themeToggle.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (err) {
    // modo privado / storage bloqueado: el tema no persiste, pero igual se aplica en esta sesión
  }
  syncThemeToggleLabel();
});

syncThemeToggleLabel();

// Favicon dinámico: dibuja un círculo SVG (verde si activo, gris si no) como data-URI
// y lo asigna al <link rel="icon">. Los %XX son caracteres escapados para URL (%23 = #).
function updateFavicon(active) {
  const color = active ? '%2316a34a' : '%238b8b8f';
  const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='13' fill='${color}'/%3E%3C/svg%3E`;
  favicon.href = svg;
}

// Despierto mantiene la pantalla encendida con DOS mecanismos complementarios:
//   1. Wake Lock API (navigator.wakeLock): método oficial. Eficiente e integrado
//      al OS, pero el spec lo LIBERA solo cuando el tab se oculta.
//   2. Tono inaudible (Web Audio): hack que explota el flag "tab audible" de
//      Chromium para sostener la pantalla incluso con el tab en segundo plano,
//      que es justo donde Wake Lock deja de aplicar.
// Foreground: manda Wake Lock (audio de respaldo). Background: solo el audio aguanta.

let wakeLock = null;         // sentinel del Wake Lock activo (o null si no lo tenemos)
let startTime = null;        // timestamp de inicio de la sesión (para el cronómetro)
let timerInterval = null;    // id del setInterval que refresca el cronómetro
let audioCtx = null;         // AudioContext del tono inaudible (mecanismo 2)
let oscillator = null;       // nodo oscilador que genera el tono
let gainNode = null;         // control de volumen: lo dejamos casi en cero
// userActive = INTENCIÓN del usuario (pidió estar despierto), separada del estado
// real del sentinel. El navegador libera wakeLock al ocultar el tab, pero userActive
// sigue en true: así el dot/favicon/contador no se apagan y re-adquirimos el lock al volver.
let userActive = false;
let activeTab = 'stopwatch'; // pestaña activa: 'stopwatch' (libre) o 'timer' (con auto-apagado)
let selectedMinutes = 30;    // duración elegida para el temporizador (modo 'timer')
let autoStopAt = null;       // timestamp en que el temporizador debe apagar solo
let autoStopTimeout = null;  // id del setTimeout que dispara el auto-apagado

function formatDuration(ms, withMs = false) {
  const totalMs = Math.max(0, ms);
  const h = String(Math.floor(totalMs / 3600000)).padStart(2, '0');
  const m = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, '0');
  if (!withMs) return `${h}:${m}:${s}`;
  const msPart = String(Math.floor(totalMs % 1000)).padStart(3, '0');
  return `${h}:${m}:${s}.${msPart}`;
}

function formatHM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

// Convierte la notación shorthand del input a minutos totales (o null si es inválido).
// La regla depende de CUÁNTOS decimales tenga:
//   1 decimal  -> fracción de hora:  "4.5" = 4h + 0.5h = 270min ; ".5" = 30min
//   2 decimales-> minutos literales: "1.30" = 1h30m = 90min ; ".15" = 15min
//   entero     -> horas:             "2" = 120min
function parseDuration(input) {
  // Captura parte entera (grupo 1 = horas) y decimal (grupo 2), ambas opcionales.
  const match = input.trim().match(/^(\d+)?(?:\.(\d+))?$/);

  // Sin match, o match vacío (ni entero ni decimal, ej. "." o "") -> inválido.
  if (!match || (!match[1] && !match[2])) return null;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const fracStr = match[2] || '';

  let minutesFromFrac = 0;

  if (fracStr.length === 1) {
    // 1 decimal = décimas de hora -> pasar a minutos (0.5h -> 30min)
    minutesFromFrac = Math.round((parseInt(fracStr, 10) / 10) * 60);
  } else if (fracStr.length >= 2) {
    // 2+ decimales = minutos literales del reloj; tope 59 para no pasarnos de la hora
    minutesFromFrac = Math.min(59, parseInt(fracStr.slice(0, 2), 10));
  }

  const total = hours * 60 + minutesFromFrac;

  return total > 0 ? total : null;
}

function setActiveDurationBtn(minutes) {
  durationBtns.forEach(b => {
    const isActive = minutes !== 'custom' && Number(b.dataset.minutes) === minutes;
    b.classList.toggle('is-active', isActive);
    b.setAttribute('aria-pressed', String(isActive));
  });
}

durationBtns.forEach(b => {
  b.addEventListener('click', () => {
    const minutes = Number(b.dataset.minutes);
    selectedMinutes = minutes;
    customDurationInput.value = '';
    setActiveDurationBtn(minutes);
    durationSelectedEl.textContent = `Se apagará solo en ${formatHM(selectedMinutes)}`;
  });
});

customDurationInput.addEventListener('input', () => {
  const parsed = parseDuration(customDurationInput.value);
  if (parsed) {
    selectedMinutes = parsed;
    setActiveDurationBtn('custom');
    durationSelectedEl.textContent = `Se apagará solo en ${formatHM(parsed)}`;
  } else {
    durationSelectedEl.textContent = customDurationInput.value ? 'Formato inválido' : '';
  }
});

function setDurationPickerEnabled(enabled) {
  panelTimer.classList.toggle('is-disabled', !enabled);
  durationBtns.forEach(b => b.disabled = !enabled);
  customDurationInput.disabled = !enabled;
}

function setActiveTab(tab) {
  activeTab = tab;
  const stopwatchOn = tab === 'stopwatch';
  tabStopwatch.classList.toggle('is-active', stopwatchOn);
  tabStopwatch.setAttribute('aria-selected', String(stopwatchOn));
  tabStopwatch.tabIndex = stopwatchOn ? 0 : -1;
  tabTimer.classList.toggle('is-active', !stopwatchOn);
  tabTimer.setAttribute('aria-selected', String(!stopwatchOn));
  tabTimer.tabIndex = stopwatchOn ? -1 : 0;
  panelTimer.hidden = stopwatchOn;
  remainingEl.textContent = '';
}

function focusTab(tab) {
  setActiveTab(tab);
  (tab === 'stopwatch' ? tabStopwatch : tabTimer).focus();
}

tabStopwatch.addEventListener('click', () => setActiveTab('stopwatch'));
tabTimer.addEventListener('click', () => setActiveTab('timer'));

[tabStopwatch, tabTimer].forEach(tabEl => {
  tabEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      focusTab(activeTab === 'stopwatch' ? 'timer' : 'stopwatch');
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
  } catch (err) {
    // localStorage lleno o bloqueado (modo privado): el historial no persiste, pero no rompemos la app
  }
}

function buildHistoryItemHTML(entry, seq) {
  const date = new Date(entry.start).toLocaleString('es', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
  const dur = formatDuration(entry.end - entry.start, true);

  // mode = modo de la sesión ('stopwatch' | 'timer'). Entradas viejas no lo tienen:
  // fallback -> si fue auto-apagado era timer, si no cronómetro.
  const mode = entry.mode || (entry.reason === 'auto' ? 'timer' : 'stopwatch');
  const isTimer = mode === 'timer';

  const itemClass = isTimer
    ? 'history-feed__item history-feed__item--timer'
    : 'history-feed__item';

  const label = isTimer ? 'temporizador' : 'cronómetro';
  const modeTag = `<span class="history-feed__reason">${label}</span>`;

  // Template string multilínea: se lee como el HTML real que genera.
  // .trim() evita nodos de texto sueltos entre <li> al insertar/concatenar.
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
  historyEmpties.forEach(el => { el.style.display = count ? 'none' : 'block'; });
  clearButtons.forEach(btn => { btn.hidden = !count; });
}

function renderHistory() {
  const list = loadHistory();
  const html = list.map((entry, i) => buildHistoryItemHTML(entry, list.length - i)).join('');
  historyLists.forEach(el => { el.innerHTML = html; });
  updateHistoryVisibility(list.length);
}

function clearHistory() {
  if (confirm('¿Borrar todo el historial?')) {
    saveHistory([]);
    renderHistory();
  }
}

clearButtons.forEach(btn => btn.addEventListener('click', clearHistory));

// Modal nativo del historial (trigger visible en mobile; en desktop está el overlay).
historyOpenBtn.addEventListener('click', () => historyDialog.showModal());
historyCloseBtn.addEventListener('click', () => historyDialog.close());
historyDialog.addEventListener('click', e => {
  // click fuera de la caja del dialog (sobre el ::backdrop) -> cerrar
  const r = historyDialog.getBoundingClientRect();
  const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if (outside) historyDialog.close();
});

function addHistoryEntry(reason) {
  if (!startTime) return;
  // activeTab no cambia durante la sesión (las tabs se deshabilitan), así que refleja el modo usado.
  const entry = { start: startTime, end: Date.now(), reason, mode: activeTab };
  const list = loadHistory();
  list.unshift(entry);
  saveHistory(list);
  const itemHTML = buildHistoryItemHTML(entry, list.length);
  historyLists.forEach(el => el.insertAdjacentHTML('afterbegin', itemHTML));
  updateHistoryVisibility(list.length);
}

function startTimer() {
  startTime = Date.now();
  timerEl.classList.add('is-on');
  timerEl.textContent = '00:00:00';

  timerInterval = setInterval(() => {
    timerEl.textContent = formatDuration(Date.now() - startTime);
    if (autoStopAt) {
      const remainingMs = autoStopAt - Date.now();
      remainingEl.textContent = remainingMs > 0 ? `Se apaga en ${formatDuration(remainingMs)}` : '';
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  startTime = null;
  timerEl.classList.remove('is-on');
  remainingEl.textContent = '';
}

// MECANISMO 2: tono inaudible. Genera audio real (no un archivo, sino un oscilador
// en vivo) para que Chromium marque el tab como "audible" y sostenga su power-assertion
// interna que evita el sleep. Ese blocker NO depende de visibilityState, así que
// sobrevive al cambio de tab / segundo plano, justo donde el Wake Lock se libera.
// Ojo: mutear o gain=0 quita el flag "audible" -> por eso el volumen es mínimo pero NO cero.
function startSilentAudio() {
  if (audioCtx) return; // ya sonando, no duplicar

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  oscillator = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.0001;   // casi silencio: inaudible al oído, pero > 0 (sigue "audible")
  oscillator.frequency.value = 20; // 20Hz, límite grave del oído humano (doble seguro de inaudibilidad)
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  audioCtx.resume(); // el AudioContext arranca 'suspended' por autoplay policy; el click del toggle lo permite
}

// Corta el tono y libera todo el grafo de audio (importante: close() suelta el hardware).
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
  dot.classList.toggle('is-on', active);
  dotWrap.classList.toggle('is-on', active);
  updateFavicon(active);
  btn.textContent = active ? 'Desactivar' : 'Activar';
  btn.setAttribute('aria-pressed', String(active));
  status.textContent = msg || '';
  setDurationPickerEnabled(!active);
  setTabsEnabled(!active);
}

updateFavicon(false);
renderHistory();

// MECANISMO 1: pide el Wake Lock formal. Guarda si el browser no lo soporta o si ya
// lo tenemos. Puede fallar (permiso, batería baja, tab no visible) y NO pasa nada:
// el tono inaudible ya cubre el caso, por eso el catch es silencioso.
async function acquireFormalLock() {
  if (!('wakeLock' in navigator) || wakeLock) return;

  try {
    wakeLock = await navigator.wakeLock.request('screen');
    // El navegador dispara 'release' solo (no lo pedimos nosotros) al ocultar el tab.
    // Limpiamos el sentinel; el audio sigue sosteniendo la pantalla en segundo plano.
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
      if (userActive && document.visibilityState === 'hidden') {
        status.textContent = 'Activo en segundo plano (audio)';
      }
    });
  } catch (err) {
    // ignorado — el tono inaudible mantiene la pantalla despierta igual
  }
}

// Termina la sesión y apaga AMBOS mecanismos. `reason` ('manual' | 'auto') queda
// registrado en el historial. Se llama al desactivar a mano o al vencer el temporizador.
function stopSession(reason) {
  userActive = false;

  if (autoStopTimeout) {
    clearTimeout(autoStopTimeout);
    autoStopTimeout = null;
  }

  autoStopAt = null;
  addHistoryEntry(reason); // guarda la sesión ANTES de limpiar startTime (stopTimer lo borra)

  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }

  stopSilentAudio();
  stopTimer();
  setUI(false, '');
}

// Arranca la sesión. Enciende primero el audio (mecanismo 2, siempre funciona) y luego
// pide el Wake Lock (mecanismo 1). En modo 'timer' programa el auto-apagado.
async function startSession() {
  userActive = true;
  startSilentAudio();

  if (!timerInterval) startTimer();

  if (activeTab === 'timer' && selectedMinutes) {
    autoStopAt = Date.now() + selectedMinutes * 60000;
    autoStopTimeout = setTimeout(() => stopSession('auto'), selectedMinutes * 60000);
  }
  setUI(true, 'Pantalla despierta activa');
  await acquireFormalLock();
}

btn.addEventListener('click', () => {
  if (userActive) {
    stopSession('manual');
  } else {
    startSession();
  }
});

// El browser libera el Wake Lock al ocultar el tab. Al volver a mostrarlo lo re-adquirimos
// (si el usuario nunca desactivó). Nada se resetea: el audio nunca se detuvo mientras tanto.
document.addEventListener('visibilitychange', async () => {
  if (!userActive) return;

  if (document.visibilityState === 'visible') {
    await acquireFormalLock();
    status.textContent = 'Pantalla despierta activa';
  } else {
    status.textContent = 'Activo en segundo plano (audio)';
  }
});

if (!('wakeLock' in navigator)) {
  status.textContent = 'Wake Lock no soportado — usando solo modo audio';
}
