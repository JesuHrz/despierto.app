# Despierto

Evita que tu computadora bloquee la pantalla o entre en reposo mientras la pestaña está abierta. App web de **un solo archivo por tipo** (HTML/CSS/JS), sin build ni dependencias, vanilla.

## Propósito

Muchas computadoras bloquean la pantalla a los ~15 min de inactividad. El viejo truco de dejar un video de YouTube en mute falla: al mutear, el navegador quita el estado "audible" del tab y libera el power-assertion que evitaba el sleep.

Despierto lo resuelve de forma nativa y confiable, combinando dos mecanismos complementarios.

## Cómo funciona (dos mecanismos)

| | Wake Lock API | Tono inaudible (Web Audio) |
|---|---|---|
| Qué es | API oficial del navegador (`navigator.wakeLock`) | Hack: genera un tono real casi silencioso |
| Tab visible | ✅ | ✅ |
| Tab oculto / otra app encima | ❌ (el spec lo libera) | ✅ (único que sobrevive) |
| Eficiencia | Alta, integrado al OS | Usa el subsistema de audio |

- **Wake Lock API**: método correcto y eficiente. El spec lo libera al ocultar el tab, así que solo cubre primer plano.
- **Tono inaudible**: un `OscillatorNode` a 20 Hz con ganancia mínima (`0.0001`, inaudible pero > 0) mantiene el tab marcado como "audible", y el navegador sostiene su propio power-assertion **incluso en segundo plano**. Mutear o poner ganancia 0 rompe el efecto.

Foreground manda Wake Lock (audio de respaldo); background carga solo el audio.

## Funcionalidades

- **Cronómetro**: cuenta abierta hasta que desactivás a mano.
- **Temporizador**: apagado automático a los 15/30/45 min o duración manual.
  - Notación shorthand en horas:
    - `4.5` (1 decimal) = fracción de hora → 4h 30min
    - `1.30` / `.15` (2 decimales) = minutos literales → 1h 30min / 15min
- **Historial** de sesiones (localStorage): duración con milisegundos, numeración, y etiqueta de modo (cronómetro / temporizador). Con botón para borrar.
- **Tema claro/oscuro** con toggle persistente (sin flash al cargar) y detección del sistema.
- **Favicon dinámico** (gris apagado / verde activo) y punto con animación tipo radar.
- Accesible (roles ARIA, `aria-live`, navegación por teclado) y con metadata SEO + JSON-LD.

## Limitación conocida

Mientras el tab está oculto/minimizado, el Wake Lock real no aplica (límite del spec); el tono inaudible cubre ese caso pero es un comportamiento no documentado del navegador. Para 100% garantizado en background, la alternativa a nivel sistema es `caffeinate -d` (macOS) en terminal. Cerrar la tapa o suspender el sistema siempre gana: ningún JS lo evita.

## Requisitos

- Navegador con **Screen Wake Lock API** y JavaScript.
- **HTTPS** (o `localhost`): la Wake Lock API solo corre en contexto seguro.

## Desarrollo

No hay build. Serví la carpeta con un server estático del ecosistema JS:

```bash
# live-server: recarga automática al guardar (recomendado para desarrollo)
npx live-server

# alternativa estática simple, sin recarga
npx serve .
```

`npx` los ejecuta sin instalar nada en el proyecto (mantiene el zero-deps). Abrí la URL que imprime (típico `http://localhost:8080`).

Sin Node a mano, cualquier server estático sirve, ej. `python3 -m http.server 8000`.

## Estructura

```
index.html            markup + metadata (SEO, Open Graph, JSON-LD)
styles.css            estilos + temas (data-theme)
script.js             lógica (wake lock, audio, timer, historial, tema)
icon.svg              ícono PWA
og-image.svg          imagen para compartir en redes
manifest.webmanifest  PWA
```

## Convenciones de código

- **BEM** para clases de estilo (`bloque__elemento--modificador`).
- Prefijo **`js-`** para hooks que selecciona el JavaScript (nunca se les pone estilo).
- Prefijo **`is-`** para estados de runtime (`is-active`, `is-on`).

## Autor

[Jesús Hernández](https://jesuhrz.com)
