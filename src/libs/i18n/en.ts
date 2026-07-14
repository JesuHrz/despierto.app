import type { Dict } from "./es";

export const en: Dict = {
  htmlLang: "en",
  ogLocale: "en_US",
  dateLocale: "en",

  meta: {
    title: "Despierto — Keep your computer screen awake",
    description:
      "Keeps your computer from locking the screen or going to sleep while you read, watch a video or follow along. With a stopwatch and an auto-off timer. Free and nothing to install.",
    keywords:
      "prevent screen lock, keep screen awake, stop screen sleep, keep display on, keep computer awake, caffeine screen",
    ogTitle: "Despierto — Keep your computer screen awake",
    ogDescription:
      "Keeps your computer from locking the screen or going to sleep. With a stopwatch and an auto-off timer. Free and nothing to install.",
    twitterTitle: "Despierto — Keep your screen awake",
    twitterDescription:
      "Keep your computer from locking the screen. Stopwatch and auto-off timer. Free and nothing to install.",
    jsonldDescription:
      "Keeps your computer from locking the screen or going to sleep, with a stopwatch and an auto-off timer.",
    jsonldOs: "Any device with a modern browser",
    jsonldBrowser: "Requires JavaScript",
  },

  controls: {
    pipOpen: "Open floating window",
    theme: "Change theme",
    guide: "How it works",
    langLabel: "Language",
  },

  card: {
    subtitle: "Stops your screen from locking",
    tabStopwatch: "Stopwatch",
    tabTimer: "Timer",
    tablistLabel: "Activation mode",
  },

  duration: {
    legend: "Duration",
    presetsLabel: "Preset durations",
    divider: "or manual",
    customLabel: "Duration in hours",
    placeholder: "e.g. 1.30, 4.5, .15",
    hint: 'Hours format: <b>1.30</b> = 1h30m &nbsp;|&nbsp; <b>4.5</b> = 4h30m &nbsp;|&nbsp; <b>.15</b> = 15min',
    selectedDefault: "Turns off on its own in 30min",
  },

  history: {
    feedLabel: "Activation history",
    open: "View history",
    clear: "Clear history",
    empty: "No activity yet",
    modalTitle: "History",
    close: "Close",
  },

  guide: {
    title: "How Despierto works",
    lead: "Your computer locks the screen when you don't touch it for a while. Despierto asks the browser to keep it awake while the session is active. It installs nothing and changes no system settings: the moment you turn it off, everything goes back to normal.",
    modesTitle: "The two modes",
    stopwatchTerm: "Stopwatch",
    stopwatchDesc: "Counts up and never turns off on its own. You turn it off when you're done.",
    timerTerm: "Timer",
    timerDesc: "Pick 15, 30 or 45 minutes, or type a duration by hand. It turns off on its own when it hits zero.",
    durationTitle: "Typing a duration",
    durationTerm: "It counts in hours",
    durationDesc:
      '<span class="guide__code">4.5</span> with one decimal is half an hour: 4h 30min. With two decimals they are literal minutes: <span class="guide__code">1.30</span> is 1h 30min and <span class="guide__code">.15</span> is 15 minutes.',
    buttonsTitle: "The buttons up top",
    pipTerm: "Floating window",
    pipDesc: "Opens or closes a mini clock that stays on top of every window. It's enabled while a session is active.",
    themeTerm: "Light / dark theme",
    themeDesc: "Starts following your system theme. If you change it, it's remembered.",
    whyTitle: "Why the floating window appears",
    inTabTerm: "While you're on the tab",
    inTabDesc: "The browser keeps the screen awake on its own and nothing else is needed.",
    awayTerm: "When you switch to another tab or desktop",
    awayDesc:
      "The browser drops that permission for security, and the only thing still holding the screen awake is the floating window. That's why it opens when you activate and stays open: the browser won't let us open it later, once you're no longer looking.",
    note: 'If you <b>close the floating window</b> and switch to another tab, the screen may lock. Reopen it with the floating window button. Closing the lid or putting the machine to sleep always wins: no website can prevent that.',
  },

  overlay: {
    title: "Running in the floating window",
    text: "You can switch tabs or desktops: the screen won't lock.",
    back: "Back to this tab",
    stop: "Turn off",
  },

  alert: {
    text: "Without the floating window, the screen may lock if you switch to another tab.",
    reopen: "Open it again",
  },

  footer: {
    madeWith: "Made with",
    by: "by",
  },

  client: {
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
    activate: "Activate",
    deactivate: "Turn off",
    idle: "No activity",
    awakeActive: "Screen kept awake",
    bgWithPip: "Active in the background (floating window)",
    bgNoPip: "No floating window: the screen may lock",
    pipFailed: "Couldn't open the floating window",
    pipTitleActive: "Floating window",
    pipTitleIdle: "Needs an active session",
    wakeLockUnsupported: "This browser can't keep the screen awake",
    turnsOffIn: "Turns off on its own in {hm}",
    invalidFormat: "Invalid format",
    offIn: "Turns off in {time}",
    pipMeta: "Off in {time} · lasts {hm}",
    ending: "Finishing…",
    confirmClear: "Clear the entire history?",
    modeStopwatch: "stopwatch",
    modeTimer: "timer",
    canvasStopwatch: "STOPWATCH",
    canvasTimer: "TIMER",
    hUnit: "h",
    minUnit: "min",
  },
};
