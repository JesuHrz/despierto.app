export const es = {
  htmlLang: "es",
  ogLocale: "es_ES",
  dateLocale: "es",

  meta: {
    title: "Despierto — Mantén la pantalla de tu computadora despierta",
    description:
      "Evita que tu computadora bloquee la pantalla o entre en reposo mientras leés, ves un video o seguís algo. Con cronómetro y temporizador de apagado automático. Gratis y sin instalar nada.",
    keywords:
      "evitar bloqueo de pantalla, mantener pantalla encendida, no dormir pantalla, mantener computadora activa, keep screen awake, cafeína pantalla",
    ogTitle: "Despierto — Mantén la pantalla de tu computadora despierta",
    ogDescription:
      "Evita que tu computadora bloquee la pantalla o entre en reposo. Con cronómetro y temporizador de apagado automático. Gratis y sin instalar nada.",
    twitterTitle: "Despierto — Mantén la pantalla despierta",
    twitterDescription:
      "Evita que tu computadora bloquee la pantalla. Cronómetro y temporizador de apagado automático. Gratis y sin instalar nada.",
    jsonldDescription:
      "Evita que tu computadora bloquee la pantalla o entre en reposo, con cronómetro y temporizador de apagado automático.",
    jsonldOs: "Cualquiera con un navegador moderno",
    jsonldBrowser: "Requiere JavaScript",
  },

  controls: {
    pipOpen: "Abrir ventana flotante",
    theme: "Cambiar tema",
    guide: "Cómo funciona",
    langLabel: "Idioma",
  },

  card: {
    subtitle: "Evita que la pantalla se bloquee",
    tabStopwatch: "Cronómetro",
    tabTimer: "Temporizador",
    tablistLabel: "Modo de activación",
  },

  duration: {
    legend: "Duración",
    presetsLabel: "Duraciones predefinidas",
    divider: "o manual",
    customLabel: "Duración en horas",
    placeholder: "ej: 1.30, 4.5, .15",
    hint: 'Formato horas: <b>1.30</b> = 1h30m &nbsp;|&nbsp; <b>4.5</b> = 4h30m &nbsp;|&nbsp; <b>.15</b> = 15min',
    selectedDefault: "Se apagará solo en 30min",
  },

  history: {
    feedLabel: "Historial de activaciones",
    open: "Ver historial",
    clear: "Borrar historial",
    empty: "Sin actividad aún",
    modalTitle: "Historial",
    close: "Cerrar",
  },

  guide: {
    title: "Cómo funciona Despierto",
    lead: "Tu computadora bloquea la pantalla cuando no la tocás por un rato. Despierto le pide al navegador que no la deje dormir, mientras la sesión esté activa. No instala nada ni cambia la configuración de tu equipo: apenas desactivás, todo vuelve a la normalidad.",
    modesTitle: "Los dos modos",
    stopwatchTerm: "Cronómetro",
    stopwatchDesc: "Cuenta hacia arriba y no se apaga solo. Lo desactivás vos cuando terminás.",
    timerTerm: "Temporizador",
    timerDesc: "Elegís 15, 30 o 45 minutos, o escribís una duración a mano. Al llegar a cero se apaga solo.",
    durationTitle: "Escribir una duración",
    durationTerm: "Se cuenta en horas",
    durationDesc:
      '<span class="guide__code">4.5</span> con un decimal es media hora: 4h 30min. Con dos decimales son minutos literales: <span class="guide__code">1.30</span> es 1h 30min y <span class="guide__code">.15</span> son 15 minutos.',
    buttonsTitle: "Los botones de arriba",
    pipTerm: "Ventana flotante",
    pipDesc: "Abre o cierra un mini reloj que queda encima de todas las ventanas. Se habilita cuando hay una sesión activa.",
    themeTerm: "Tema claro / oscuro",
    themeDesc: "Arranca siguiendo el tema de tu sistema. Si lo cambiás, se recuerda.",
    whyTitle: "Por qué aparece la ventana flotante",
    inTabTerm: "Mientras estás en la pestaña",
    inTabDesc: "El navegador mantiene la pantalla despierta por su cuenta y no hace falta nada más.",
    awayTerm: "Cuando te vas a otra pestaña o escritorio",
    awayDesc:
      "El navegador suelta ese permiso por seguridad, y la única que sigue sosteniendo la pantalla es la ventana flotante. Por eso se abre al activar y se queda: el navegador no nos deja abrirla más tarde, cuando ya no estás mirando.",
    note: 'Si <b>cerrás la ventana flotante</b> y te vas a otra pestaña, la pantalla puede bloquearse. Volvé a abrirla con el botón de ventana flotante. Cerrar la tapa o suspender el equipo a mano siempre gana: eso ninguna web lo evita.',
  },

  overlay: {
    title: "Corriendo en la ventana flotante",
    text: "Podés cambiar de pestaña o de escritorio: la pantalla no se va a bloquear.",
    back: "Volver a esta pestaña",
    stop: "Desactivar",
  },

  alert: {
    text: "Sin la ventana flotante, la pantalla puede bloquearse si te vas a otra pestaña.",
    reopen: "Abrirla de nuevo",
  },

  footer: {
    madeWith: "Hecho con",
    by: "por",
  },

  // Strings used by app.js at runtime (injected as window.__I18N).
  client: {
    themeToLight: "Cambiar a modo claro",
    themeToDark: "Cambiar a modo oscuro",
    activate: "Activar",
    deactivate: "Desactivar",
    idle: "Sin actividad",
    awakeActive: "Pantalla despierta activa",
    bgWithPip: "Activo en segundo plano (ventana flotante)",
    bgNoPip: "Sin ventana flotante: la pantalla puede bloquearse",
    pipFailed: "No se pudo abrir la ventana flotante",
    pipTitleActive: "Ventana flotante",
    pipTitleIdle: "Necesita una sesión activa",
    wakeLockUnsupported: "Este navegador no puede mantener la pantalla activa",
    turnsOffIn: "Se apagará solo en {hm}",
    invalidFormat: "Formato inválido",
    offIn: "Se apaga en {time}",
    pipMeta: "Se apaga en {time} · dura {hm}",
    ending: "Terminando…",
    confirmClear: "¿Borrar todo el historial?",
    modeStopwatch: "cronómetro",
    modeTimer: "temporizador",
    canvasStopwatch: "CRONÓMETRO",
    canvasTimer: "TEMPORIZADOR",
    hUnit: "h",
    minUnit: "min",
  },
};

export type Dict = typeof es;
