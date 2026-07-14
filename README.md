# Despierto

Evita que tu computadora bloquee la pantalla o entre en reposo mientras la pestaña está abierta. Sitio estático hecho con **[Astro](https://astro.build)**, en español e inglés. La lógica de cliente es JavaScript vanilla sin dependencias de runtime; Astro solo se usa para el build y el i18n.

## Propósito

Muchas computadoras bloquean la pantalla a los ~15 min de inactividad. Las salidas habituales son incómodas:

- **Instalar una app** de terceros (mouse jiggler, caffeine y similares) solo para eso.
- **Cambiar la configuración de energía** del sistema, y después olvidarte de dejarla como estaba.
- **Buscar un video en YouTube** de un contador de 3 horas y dejarlo corriendo. Funciona, porque un `<video>` reproduciéndose hace que el navegador pida que la pantalla no duerma. Pero depende de que ese video siga existiendo, se te va a cero si cambiás de pestaña, y te comés el ancho de banda.

Despierto hace lo mismo que ese video, pero deliberadamente y sin depender de nadie: sin instalar nada, sin tocar la configuración del equipo, y cubriendo también el caso de irte a otra pestaña.

> **Nota**: circula la idea de que mutear el video rompe el efecto. Medido con `pmset -g assertions`, es falso: un `<video>` muteado toma exactamente la misma assertion (`Video Wake Lock`) que uno con audio. Lo que sí rompe el efecto es **ocultar la pestaña**.

## Cómo funciona (dos mecanismos)

| | Wake Lock API | Video en Picture-in-Picture |
|---|---|---|
| Qué es | API oficial del navegador (`navigator.wakeLock`) | Un `<video>` (canvas) reproduciéndose en PiP |
| Tab visible | ✅ | ✅ |
| Tab oculto / otra app encima | ❌ (el spec lo libera) | ✅ (único que sobrevive) |
| Assertion de macOS | `NoDisplaySleepAssertion "Blink Wake Lock"` | `NoDisplaySleepAssertion "Video Wake Lock"` |

- **Wake Lock API**: método correcto y eficiente, pero el spec lo libera al ocultar el tab. Solo cubre primer plano.
- **Video en PiP**: Chromium sostiene una assertion de *display sleep* mientras hay un `<video>` reproduciéndose y visible, o en Picture-in-Picture. Como la ventana de PiP es independiente del tab, la assertion sobrevive aunque cambies de pestaña o de app. Es el mismo mecanismo por el que Google Meet mantiene la pantalla viva.

**La ventana flotante se abre con el click de "Activar" y queda abierta toda la sesión.** No es una decisión estética: Chrome solo permite `requestPictureInPicture()` mientras se está procesando un gesto del usuario, salvo que ya haya algo en PiP. Para cuando el tab se oculta no queda ningún gesto, así que abrirla ahí falla con `NotAllowedError`.

Si la cerrás a mano y te vas a otra pestaña, no queda nada sosteniendo la pantalla (la app te lo avisa en el estado). Para reabrirla, el botón de PiP — ese click sí es un gesto.

> El único modo de que la ventana aparezca sola *solo cuando te vas* es el auto-PiP del navegador, que Chrome reserva para PWAs instaladas.

### Por qué no usamos audio

Un tono inaudible (`OscillatorNode` con ganancia `0.0001`) parece una solución elegante, pero medido con `pmset -g assertions` no hace nada:

- A ganancia `0.0001` Chrome ni siquiera considera el tab audible: **no toma ninguna assertion**.
- Subiéndole el volumen sí toma una, pero es `NoIdleSleepAssertion`: evita que el **sistema** se suspenda, no que la **pantalla** se bloquee. Son cosas distintas en macOS (por eso la pantalla se apaga aunque estés escuchando música).

## Funcionalidades

- **Cronómetro**: cuenta abierta hasta que desactivás a mano.
- **Temporizador**: apagado automático a los 15/30/45 min o duración manual.
  - Notación shorthand en horas:
    - `4.5` (1 decimal) = fracción de hora → 4h 30min
    - `1.30` / `.15` (2 decimales) = minutos literales → 1h 30min / 15min
- **Historial** de sesiones (localStorage): duración con milisegundos, numeración, y etiqueta de modo (cronómetro / temporizador). Con botón para borrar.
- **Tema claro/oscuro** con toggle persistente (sin flash al cargar) y detección del sistema.
- **Ventana flotante** (Picture-in-Picture): mini-widget always-on-top con el estado de la sesión. Se abre al activar y es lo que mantiene la pantalla despierta en segundo plano (Chromium).
- **Guía de uso** en un `<dialog>` nativo, desde el icono de información.
- **Favicon dinámico** (gris apagado / verde activo) y punto con animación tipo radar.
- Accesible (roles ARIA, `aria-live`, navegación por teclado) y con metadata SEO + JSON-LD.

## Limitación conocida

Con el tab oculto, el Wake Lock no aplica (límite del spec) y la única cobertura es la ventana flotante de PiP. Si la cerrás y te vas a otra pestaña, la pantalla se bloquea.

PiP de video es una API de Chromium; en Firefox y Safari no hay equivalente accesible desde JS, así que ahí Despierto solo cubre el tab visible. Cerrar la tapa o suspender el sistema siempre gana: ningún JS lo evita.

Para algo garantizado a nivel sistema, la alternativa es `caffeinate -d` (macOS) en terminal.

### Cómo verificarlo

macOS expone qué apps están evitando el sleep. Con Despierto activo:

```bash
pmset -g assertions | grep -i "Google Chrome"
```

Si aparece un `NoDisplaySleepAssertion`, la pantalla no se va a bloquear. Si no aparece ninguno, sí.

## Requisitos

- Navegador con **Screen Wake Lock API** y JavaScript.
- **HTTPS** (o `localhost`): la Wake Lock API solo corre en contexto seguro.
- Para el modo segundo plano, un navegador con **Picture-in-Picture de video** (Chromium: Chrome, Edge, Brave, Arc).

## Idiomas

La app está en español (`/`) e inglés (`/en/`), como páginas estáticas separadas — cada una con su propio HTML, metadata, JSON-LD y `hreflang`, para que Google indexe ambas. El texto vive en diccionarios (`src/i18n/es.ts`, `en.ts`); el markup usa un solo juego de componentes `.astro` parametrizados. Los strings que necesita el JavaScript de cliente se inyectan en `window.__I18N` por idioma.

Agregar un idioma: crear `src/i18n/<lang>.ts`, sumarlo a `src/libs/i18n/ui.ts` y crear `src/pages/<lang>/index.astro`.

## Analítica

Google Analytics 4 se carga **solo si el build corre con `ENV=production`** (definido en `netlify.toml`). En local (`npm run build` o `npm run dev`) la variable no está y el script de GA ni se genera en el HTML: `window.gtag` no existe y `track()` queda en no-op. El gate se evalúa en build (`import.meta.env.ENV` en `Layout.astro`).

Eventos: `session_start` y `session_stop` (con `mode` y duración), `pip_open` (con `source`) y `theme_change` (con el tema destino). Los parámetros necesitan registrarse como *custom dimensions* en GA para verlos en los reportes.

## Desarrollo

Proyecto **Astro** (build estático). Instalá y levantá el dev server:

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # genera dist/ (GA off sin ENV=production)
npm run preview   # sirve el build de dist/
```

## Estructura

```
src/
  pages/
    index.astro         ruta /      (español)
    en/index.astro      ruta /en/   (inglés)
  layouts/Layout.astro  <head>: metadata, SEO, JSON-LD, anti-FOUC, GA, __I18N
  components/*.astro     Card, TopControls, GuideDialog, HistoryFeed, …
  i18n/
    es.ts, en.ts         diccionarios (UI + SEO + strings de cliente)
    ui.ts                helper de idioma
  scripts/app.js         lógica de cliente (wake lock, PiP, timer, historial, tema)
  styles/global.css      estilos + temas (data-theme)
public/                  icon.svg, og-image.svg  (servidos en la raíz)
astro.config.mjs         config i18n (es default en /, en en /en)
netlify.toml             deploy (build + publish dist, ENV, redirects, headers)
```

## Convenciones de código

- **BEM** para clases de estilo (`bloque__elemento--modificador`).
- Prefijo **`js-`** para hooks que selecciona el JavaScript (nunca se les pone estilo).
- Prefijo **`is-`** para estados de runtime (`is-active`, `is-on`).

## Autor

[Jesús Hernández](https://jesuhrz.com)
