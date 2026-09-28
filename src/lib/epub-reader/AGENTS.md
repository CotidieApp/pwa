# Guía de mantenimiento del lector EPUB

Este directorio reúne los contratos que sostienen el lector paginado. Antes de
cambiar su código, lee esta guía y después solo el módulo afectado y la prueba
correspondiente. El lector ya resuelve condiciones de carrera de `epub.js`,
persistencia entre PWA/APK y restauración semántica; un cambio aparentemente
pequeño puede romper alguno de esos contratos.

## Índice

1. [Alcance y mapa](#alcance-y-mapa)
2. [Contratos que deben conservarse](#contratos-que-deben-conservarse)
   - [Navegación y epub.js](#navegación-y-epubjs)
   - [Ubicación y persistencia](#ubicación-y-persistencia)
   - [Identidad del recurso](#identidad-del-recurso)
   - [Iframes, tipografía y anotaciones](#iframes-tipografía-y-anotaciones)
   - [Paginación visible](#paginación-visible)
3. [Procedimiento seguro de edición](#procedimiento-seguro-de-edición)
4. [Validación mínima](#validación-mínima)
5. [Límites conocidos](#límites-conocidos)

## Alcance y mapa

Esta guía pertenece a `src/lib/epub-reader/`, pero también aplica a los puntos
de integración siguientes:

| Zona | Responsabilidad |
| --- | --- |
| `controller.ts` | Serializa navegación, restauración y reflow de `epub.js`. |
| `layout.ts` | Espera recursos del iframe y captura el CFI central semántico. |
| `progress.ts` | Espejo local, cola durable y migración del progreso EPUB. |
| `pagination.ts` | Contador relativo `N/T` del EPUB completo. |
| `helpers.ts` | CFIs, estilos del iframe, anotaciones y compatibilidad histórica. |
| `types.ts` y `constants.ts` | Contratos compartidos y valores de lectura. |
| `../../components/EpubReader.tsx` | Montaje de la rendition, ciclo de vida, UI y paneles. |
| `../../components/NuevoTestamentoReader.tsx` | Fuente e identidad del Nuevo Testamento. |
| `../../components/PersonalEpubLibrary.tsx` | Fuente e identidad de EPUB personales. |
| `../reading-store.ts`, `../personal-epubs.ts`, `../offline-epub.ts` | Almacenamiento durable, biblioteca personal y copia PWA offline. |
| `../../../tests/reading-persistence.cjs` | Regresiones de persistencia, navegación y reflow. |
| `../../../tests/READING-VALIDATION.md` | Matriz manual APK/PWA y límites certificados. |

No mezcles este flujo con Camino: Camino tiene su propio progreso y geometría.

## Contratos que deben conservarse

### Navegación y `epub.js`

- La versión objetivo es `epubjs 0.3.93`. Antes de actualizarla, revisa sus
  cambios de `Rendition`, `reportLocation`, `onResized`, `display`, layout y
  eventos, y ejecuta de nuevo toda la matriz de validación.
- Toda navegación (`display`, enlaces internos, siguiente, anterior,
  restauración y reflow) pasa por `EpubReadingController`. No invoques la
  rendition directamente desde un componente ni añadas una cola paralela.
- El controlador sustituye `rendition.onResized` y encauza `display` para que
  `epub.js` no escape de la cola. Conserva ese orden al inicializarlo.
- Dentro del mismo spine, `next` y `prev` son `fast-page`: no deben ejecutar
  `display`, esperar fuentes, formatear, expandir, recrear overlays ni mostrar
  una pantalla negra. El evento `relocated` puede llegar tarde; el listener se
  registra antes de pedir el movimiento.
- Al entrar en un spine nuevo se permite `new-spine`: espera CSS, fuentes e
  imágenes del iframe, aplica `layout.format` y `expand` una sola vez por
  documento nuevo y recoloca el CFI confirmado.
- `restore` y `reflow` usan el ancla central y un único reflow de los
  documentos activos. Los cambios de color no deben repaginar; familia,
  tamaño, viewport u orientación sí pueden requerirlo.
- Mantén el watchdog de operación: al vencer debe informar un fallo y no
  persistir geometría transitoria. El cierre debe esperar cola, confirmaciones
  y operaciones activas antes de destruir libro, rendition o iframe.

### Ubicación y persistencia

- La ubicación durable es el CFI semántico del centro visible. `startCfi`,
  `endCfi` y `href` son diagnósticos/fallback, no sustituyen el centro.
- Al restaurar, prefiere siempre el `anchorCfi` central incluso si `startCfi`
  pertenece a un spine anterior. El primer `display` no puede retroceder a una
  página vieja por usar un inicio heredado.
- No guardes columnas, píxeles, número de página física ni una ubicación
  obtenida mientras se reflowea. `snapToGrid` evita reflows espurios por
  variaciones mínimas del safe area.
- `progress.ts` mantiene el espejo histórico
  `cotidie_epub_location_${fileName.toLowerCase()}` y el store `progress` de
  IndexedDB `cotidie-reading`. Conserva ambos mientras existan instalaciones
  antiguas; la lectura también migra el store heredado
  `cotidie-db/settings-store`.
- Un registro actual incluye versión, recurso, fecha, revisión, `anchorCfi`,
  inicio, final, `href` y `anchorKind`. Las escrituras IDB comparan y confirman
  dentro de una transacción `readwrite`; no reemplaces esa cola por escrituras
  sin ordenar.
- Los checkpoints de `pagehide`, visibilidad, background nativo y cierre
  guardan el último estado confirmado sin consultar una rendition ya destruida.
  No conviertas esos listeners en escrituras de cada `relocated`.

### Identidad del recurso

El nombre visible nunca es la clave durable. Conserva estas identidades aunque
el usuario renombre un libro:

| Recurso | `fileName` durable | `displayName` | Fuente |
| --- | --- | --- | --- |
| Nuevo Testamento | `nuevo-testamento.epub` | `Nuevo Testamento` | APK empaquetado, URL o base64 PWA offline. |
| EPUB personal | `personal-${id}.epub` | `selected.name` | `ArrayBuffer` de la biblioteca. |

- `EpubReader` recibe explícitamente `fileName`, `displayName`, contexto y
  fuente. Respeta la precedencia `sourceBuffer`, después `sourceBase64` y por
  último `epubUrl`.
- Marcadores y subrayados comparten la identidad histórica del archivo. No
  derives sus claves del título visible ni del nombre de un archivo subido.
- La copia PWA del NT en `offline-epub.ts` es opcional y separada de su
  identidad. Mantén disponible la apertura cuando el origen remoto no existe.

### Iframes, tipografía y anotaciones

- Las fuentes y el CSS del lector se inyectan en cada documento EPUB. Espera
  primero CSS, después `document.fonts` y luego imágenes antes de aceptar un
  reflow o capturar una ubicación estable.
- Observa cada `Contents` con el controlador y limpia observadores de
  documentos desconectados. No asumas que solo hay un iframe activo.
- Las anotaciones se vuelven a aplicar a los documentos activos después de
  navegar o restaurar. Conserva las claves y los selectores SVG históricos.
- Los paneles de índice, búsqueda, marcadores, subrayados y selección viven en
  `../../components/epub-reader/`; coordínalos con el controlador en vez de
  manipular la rendition desde el panel.

### Paginación visible

- `N/T` es una estimación relativa al EPUB completo, calculada desde CFIs y
  dependiente de área efectiva, tipografía y tamaño. Nunca la persistas ni la
  uses para restaurar lectura.
- Puede mostrar `…/…` hasta que exista un mapa válido. Reconstrúyelo tras un
  reflow confirmado o al cambiar métricas; no durante una navegación rápida.
- El cambio de Literata a Lora, orientación o tamaño puede cambiar el total y
  debe conservar el mismo pasaje, no el mismo ordinal físico.

## Procedimiento seguro de edición

1. Identifica si el cambio toca navegación, reflow, almacenamiento, identidad,
   anotaciones, fuente del EPUB o UI; lee solo esos módulos y las pruebas del
   caso.
2. Conserva la cola del controlador y la separación entre captura de estado,
   persistencia local inmediata y commit IDB en segundo plano.
3. Si cambias una forma persistida, añade migración compatible y una regresión
   para datos locales heredados. No borres ni renombres claves existentes.
4. Si cambias fuente, layout, eventos de `epub.js`, progreso, identidades,
   paginación u origen offline, actualiza también
   `../../../tests/READING-VALIDATION.md` y ejecuta las pruebas pertinentes.
5. Registra las intervenciones sustantivas en `../../../AGENTS-history.md` con
   `Planificacion`, `Ejecucion`, `Validacion` y `Archivos Modificados`.

## Validación mínima

Para cambios de este lector, empieza por:

```powershell
npx tsc --noEmit
$testDeps = Join-Path $env:TEMP 'cotidie-reading-test-deps'
npm install --prefix $testDeps --no-save --no-package-lock --ignore-scripts fake-indexeddb
$preload = Join-Path $testDeps 'node_modules/fake-indexeddb/auto'
node --require $preload --test tests/reading-persistence.cjs
```

Ejecuta `npm run build` si el cambio alcanza montaje, empaquetado, PWA o tipos
compartidos. Para cambios de controller, iframe, navegación, reflow, fuentes,
persistencia o fuentes offline, complementa con los casos APK/PWA aplicables de
`../../../tests/READING-VALIDATION.md`: páginas rápidas, cruce de spine,
restauración entre spine, background/cierre, orientación, tipografía y NT
offline. Las pruebas de Node usan dobles de rendition e IndexedDB: no sustituyen
la comprobación real en dispositivo.

## Límites conocidos

- La configuración paginada usa `spread: none`; no se garantiza una página
  visual estable que contenga simultáneamente dos spine items.
- Workflows PWA ejecutados en `localhost` desregistran intencionalmente el
  service worker del proyecto. Eso no certifica una recarga dura offline del
  shell.
- Android/PWA pueden finalizar el proceso en segundo plano. El diseño garantiza
  el último checkpoint confirmado, no una página que aún no ha terminado de
  componerse.
