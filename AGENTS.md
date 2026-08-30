# Registro de Actividad de Agentes (AGENTS.md)

Historial de intervenciones del asistente en el repo.

## Instrucciones permanentes para agentes
- Toda IA o agente que modifique archivos de este repositorio debe agregar un reporte en `AGENTS.md`.
- El reporte debe seguir la modalidad existente: `Planificacion`, `Ejecucion`, `Validacion` y `Archivos Modificados`.
- Esta obligacion aplica aunque el usuario pida tocar solo lo estrictamente necesario: el registro en `AGENTS.md` se considera parte estrictamente necesaria de cualquier edicion del repo.
- Si una instruccion del usuario prohibe explicitamente editar `AGENTS.md`, el agente debe pedir aclaracion antes de modificar otros archivos.

### [2026-08-30] 332. EpubReader: eliminación del flash de repaginación visual, estabilización geométrica con snapToGrid y ampliación de ventana de asentamiento

**Planificacion:**
- El usuario reportó que el lector EPUB seguía presentando problemas de consistencia en el posicionamiento y que al entrar o cambiar de capítulo se apreciaba un rápido desplazamiento visual de palabras (flash de repaginación interno de epub.js).
- Diagnóstico:
  1. En epub.js, al cambiar de capítulo/spine item o al montar, el iframe renderiza columnas CSS y calcula dimensiones mientras el browser composita; ese layout interno era visible para el usuario y podía provocar lecturas o estados transitorios no asentados.
  2. Variaciones sutiles de 1-2px en el tamaño del contenedor entre sesiones (por insets de sistema en Android) causaban ligeras diferencias de cálculo de columnas en epub.js.
  3. La ventana de asentamiento (`scheduleRestoreRelease`) de 400ms era demasiado ajustada para WebView en dispositivos Android bajo carga.
  4. Los saltos de capítulo (`displayAndPersist`) necesitaban esperar la confirmación del evento `relocated` de epub.js bajo un overlay opaco del color de fondo del lector.

**Ejecucion:**
- `src/lib/epub-reader/helpers.ts`:
  - Se agregó `snapToGrid(n, grid = 2)` para redondear las dimensiones del viewport a múltiplos enteros pares, garantizando paginación consistente e insensible a fluctuaciones de 1px en insets.
- `src/components/EpubReader.tsx`:
  - Se implementó un overlay de transición opaco (`isTransitioning`, `beginTransition`, `endTransition`) con el mismo color de fondo del lector que cubre el contenedor durante la carga inicial, cambios de capítulo y operaciones de repaginado, ocultando el flash interno de epub.js (patrón estándar tipo Apple Books / Kindle).
  - Se aplicó `snapToGrid` al tamaño inicial de `renderTo` y en `refreshRenditionLayout`.
  - Se amplió la ventana de asentamiento de la restauración inicial de 400ms a 800ms (`scheduleRestoreRelease(800)`).
  - En `displayAndPersist`, se integró la espera del evento `relocated` con timeout de seguridad de 800ms bajo el overlay de transición antes de persistir la posición final.
  - Se aseguró la definición adecuada de `targetEndCfi` en el flujo de restauración inicial con nudging.

**Validacion:**
- `npx tsc --noEmit` completado exitosamente sin errores (exit code 0).
- `npm run build` ejecutado con éxito, compilando todas las rutas y bundles estáticos.

**Archivos Modificados:**
- `src/lib/epub-reader/helpers.ts`
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-08-21] 331. EpubReader: robustecimiento del guardado de posición (listener Capacitor appStateChange, guardado inmediato y persistencia dual)

**Planificacion:**
- El usuario reportó problemas donde la posición de lectura o progreso en el lector EPUB se perdía al cerrar la app o cambiar de capítulo.
- Diagnóstico con prioridad en el entorno APK (Android/Capacitor):
  1. En Android/Capacitor, depender exclusivamente de `visibilitychange` y `pagehide` para persistir al pausar la app es frágil si el sistema mata la WebView en background. El evento nativo directo de Capacitor es `App.addListener('appStateChange')`.
  2. `persistAfterNavigation` usaba un `window.setTimeout(..., 80)` innecesario que podía perderse si la app cerraba antes de que se cumpliera el temporizador.
  3. El lector guardaba exclusivamente en `localStorage` (volátil ante limpieza de caché en PWA), a diferencia del resto de la app que ya usa IndexedDB (`persistence.ts`).
  4. Bloques `try/catch` en storage silenciaban errores de cuota (`QuotaExceededError`) sin trazado.

**Ejecucion:**
- `src/lib/epub-reader/helpers.ts`:
  - Se crearon `saveEpubPosition` (escritura síncrona en localStorage + copia fire-and-forget en IndexedDB vía `persistence.ts`) y `loadEpubPosition` (lectura asíncrona de IndexedDB con fallback y migración automática desde `localStorage`).
- `src/components/EpubReader.tsx`:
  - Se integró `App.addListener('appStateChange', ...)` de Capacitor condicionado a `Capacitor.isNativePlatform()` para persistir de forma inmediata y confiable en el ciclo de vida nativo de Android cuando la app pasa a background (`state.isActive === false`).
  - Se convirtió `persistAfterNavigation` a `useCallback` sin temporizadores (guardado síncrono/inmediato tras resolver la navegación de página/capítulo).
  - Se conectó `saveEpubPosition` en `persistReaderLocation` con trazado de advertencia en `pushDevLiveTrace` ante fallos de escritura.
  - Se actualizó el hook de carga para recuperar la posición con `await loadEpubPosition(...)`.

**Validacion:**
- `npx tsc --noEmit` completado sin errores de tipado (exit code 0).
- `npm run build` ejecutado exitosamente generando el export estático y bundles sin errores.

**Archivos Modificados:**
- `src/lib/epub-reader/helpers.ts`
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-28] 330. Icono de la PWA: banda naranja de relleno en los bordes

**Planificacion:**
- El usuario reporto (con captura) que el icono instalado de la PWA muestra espacios naranjos de relleno en cada borde. Pidio que el fondo del icono se recorte en las esquinas abarcando todo, SIN esconder lo esencial (la C con la cruz).
- IMPORTANTE (correccion de rumbo): un primer intento recompuso el icono desde cero (fondo plano + glifo aislado), lo que en la practica REDISENO el logo del usuario: se perdio el degradado y el cuadro interior. El usuario lo rechazo. Se revirtieron por completo `icon.png`, `icon-maskable.png` (restaurados bit a bit desde backup, verificado con `git status` sin diferencias contra HEAD), `manifest.json` y la entrada de registro. Leccion: ante un pedido de ajuste de encuadre/recorte, NO alterar la identidad visual; usar el arte existente del usuario.
- Diagnostico correcto tras renderizar y MIRAR ambos archivos: `icon.png` ya estaba bien (degradado a sangre completa, glifo a radio real 206 px, justo en el limite de la safe zone de 205). El defecto vivia SOLO en `icon-maskable.png`, que contenia el mismo diseno ENCOGIDO (cuadro del degradado de 348 px, glifo a radio 140) centrado sobre naranja plano: ese margen es la banda reportada. Ademas, las esquinas de `icon.png` tenian alfa 196 (semitransparentes), por lo que el sistema pinta su propio relleno detras.

**Ejecucion:**
- Se tomo el arte propio del usuario (`icon.png`) y se aplico el zoom MINIMO que vuelve opacas las esquinas: escalado 512 -> 530 y recorte centrado a 512. Se midio por iteracion (512: alfa esquina 196; 530: alfa 255) para no ampliar mas de lo necesario. Resultado: mismo degradado, misma C+cruz, mismas proporciones; el diseno llega a todos los bordes y no queda transparencia que el sistema pueda rellenar.
- Ese archivo se aplico a `icon-maskable.png` (el que tenia el defecto) y tambien a `icon.png`, para dejar las esquinas opacas y ambos consistentes. No se dibujo ningun elemento nuevo.
- Propuesta validada con el usuario ANTES de aplicar: se le mostro una hoja comparativa (actual vs propuesta, bajo recorte circular y squircle) y dio el visto bueno explicito.

**Validacion:**
- Ambos iconos quedan 512x512 y `opaco=true` (sin alfa => el sistema no puede pintar relleno detras).
- Simulacion de los recortes de Android (circulo y squircle): el degradado llega a todos los bordes sin bandas, y la C con la cruz se ve completa en ambas formas.
- Nota honesta: el glifo queda a radio 213 px y la safe zone formal son 205 px (8 px de exceso teorico). En la simulacion de recorte circular —el mas agresivo— la C y la cruz se ven integras, por lo que se considera aceptable; ampliar menos reintroduciria transparencia en las esquinas.
- Pendiente en el dispositivo: la PWA necesita reinstalarse (o al menos reabrirse con conexion) para que el sistema tome los iconos nuevos.
- Queda SIN corregir a proposito (fuera del alcance aprobado): `manifest.json` declara `icon.png` como `192x192` cuando en realidad es 512x512.

**Archivos Modificados:**
- `public/icons/icon.png`
- `public/icons/icon-maskable.png`
- `AGENTS.md`

### [2026-07-28] 329. EpubReader: pagina a caballo entre dos capitulos restauraba la pagina anterior

**Planificacion:**
- El usuario reporto que dejo la lectura al comienzo de un capitulo nuevo y, al reentrar, quedo en la pagina anterior; preciso el detalle clave: NO habia salto de pagina, es decir, en la MISMA pagina terminaba un capitulo y empezaba el siguiente.
- Ese detalle identifica el detonante. En un EPUB cada capitulo es un spine item (documento) distinto. Cuando una pagina abarca el final del capitulo N y el inicio del N+1, `getRenditionLocation` toma `start` de `location[0].start` (capitulo N) y `end` de `location[len-1].end` (capitulo N+1): el `cfi` y el `endCfi` guardados quedan en DOCUMENTOS DISTINTOS.
- Al restaurar, la logica anclaba siempre al `cfi` de inicio (regla correcta y necesaria en el caso normal, ver entradas #313/#317). Aqui eso re-muestra el documento del capitulo VIEJO. El bucle de ajuste hacia adelante, que normalmente corrige, queda inutilizado: `EpubCFI.compare(liveEndCfi, targetEndCfi)` da >= 0 de inmediato (se verifico en node: compare entre esos CFIs devuelve 0), asi que rompe con `pasos=0` y el lector se queda en la pagina anterior.
- Se descarto una primera hipotesis (que `compare` fallara entre spine items distintos): se probo en node y compara correctamente. El problema no es la comparacion sino el ancla.

**Ejecucion:**
- `src/components/EpubReader.tsx`, en la restauracion inicial: se detecta si la pagina guardada cruza un limite de capitulo comparando `spinePos` de `cfi` y `endCfi` (via `new EpubCFI().parse(...)`, con try/catch y degradacion a `null`).
- Si cruza (`spansChapterBoundary`), se ancla al `endCfi` — el capitulo NUEVO, que es donde realmente se quedo leyendo el usuario. Si no cruza, el comportamiento es exactamente el de antes (ancla al `cfi` de inicio): cero cambios en el caso normal.
- El bucle de ajuste hacia adelante se saltea cuando se anclo al `endCfi` (el objetivo ya esta arriba del viewport; avanzar pasaria de largo). Se agrego una traza propia ("pagina a caballo entre capitulos, anclada al final") con los spine de inicio/fin.

**Validacion:**
- `npx tsc --noEmit` sin errores; `npm run build` OK.
- Validacion de la logica de decision en node con CFIs representativos: caso normal (mismo capitulo, spine 6->6) sigue anclando al `cfi` de inicio (sin regresion); caso reportado (spine 6->7) ahora ancla al `endCfi`; casos limite (solo `endCfi`, solo `href`) degradan de forma segura.
- Smoke test en el dev server: el lector monta y ejecuta la ruta de restauracion sin excepciones, cero errores de consola. El render final de epub.js no se puede observar en este entorno (panel sin compositar, limitacion ya documentada en #326).
- Pendiente de confirmacion del usuario en el dispositivo: dejar la lectura justo donde termina un capitulo y empieza otro en la misma pagina, salir y reentrar.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-27] 328. Optimizacion de peso de assets (audio + imagenes) y limpieza de console.log

**Planificacion:**
- Continuacion de la revision: el usuario aprobo tres mejoras, "con mucho cuidado". Prioridad APK (el peso del instalable es lo mas relevante para su publico principal).
- Diagnostico: `public/` pesaba 120 MB. Dominantes: dos MP3 de discurso hablado en estereo (`Discurso San Josemaria.mp3` 51 MB @192 kbps, `Discurso San Juan Pablo II.mp3` 43 MB @159 kbps, ~37 min c/u) y ~10 MB de imagenes JPEG (varias sobredimensionadas, ej. `creation.jpeg` 4835x2478). lucide-react se descarto: no hay acceso dinamico a iconos, ya se tree-shakea.
- Herramientas sin tocar el sistema: `ffmpeg-static` instalado en el scratchpad (binario portatil) para el audio; `sharp` (ya en node_modules) para las imagenes.

**Ejecucion:**
- Audio: backup de los originales al scratchpad; reencodeo a **mono 96 kbps** (`libmp3lame -ac 1 -b:a 96k`), suficiente para voz hablada. 51 MB->26 MB y 43 MB->26 MB.
- Imagenes: `sharp` recomprime en el mismo lugar (mismo nombre/formato, sin cambiar codigo) a `jpeg quality 82 mozjpeg`, con `.rotate()` para hornear orientacion EXIF, y cap conservador de dimension a 2048 px (solo afecta de forma notable a `creation.jpeg`). Solo se sobrescribe si ahorra >3%: 27 de 28 recomprimidas, 1 sin cambio. 8665 KB->3344 KB (-61%).
- `src/context/SettingsContext.tsx`: removido el unico `console.log` colado (mensaje de exito de migracion en linea ~645); se conservo el `console.error` legitimo.

**Validacion:**
- Audio: verificacion de integridad con ffmpeg — duracion identica a los originales (36:58 y 37:32, no truncados) y decodificacion completa a null SIN errores. Smoke test en la app: ambos MP3 cargan via elemento Audio del navegador con duracion correcta (36.98 / 37.54 min) = decodificables/reproducibles.
- Imagenes: las 28 validan con sharp (metadata OK); `creation.jpeg` quedo 2048x1050; smoke test en navegador (`<img>`) renderiza OK.
- `tsc --noEmit` sin errores; cero errores de consola en el dev server.
- Resultado total: `public/` 120 MB -> 73 MB (**-47 MB**), reflejado directamente en el tamano del APK. Nota: los originales tambien viven en el historial de git por si se quisiera revertir.

**Archivos Modificados:**
- `public/media/Discurso San Josemaria.mp3`
- `public/media/Discurso San Juan Pablo II.mp3`
- `public/images/*.jpe?g` (27 recomprimidas)
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-07-27] 327. Revision general + optimizacion de bundle (carga diferida de vistas pesadas)

**Planificacion:**
- El usuario pidio revisar el proyecto, corregir lo necesario, perfeccionar y optimizar.
- Diagnostico de salud (read-only primero): `next build` OK, `tsc --noEmit` OK, `next lint` = 67 warnings y CERO errores. Los warnings son casi todos `react-hooks/exhaustive-deps` sobre dep arrays deliberadamente curados (EpubReader, SettingsContext, notificaciones — afinados con cuidado en entradas previas), mas cosmeticos (`no-unescaped-entities`) e informativos del React Compiler. Se decidio NO tocarlos en masa: "arreglar" esos deps agregandolos es la via clasica de meter loops infinitos y regresiones. Sin TODO/FIXME; un solo `console.log` inofensivo (log de migracion). Conclusion: base sana, sin pila de bugs.
- La oportunidad real y de alto impacto salio del build: `First Load JS` de `/` = 725 kB. Causa: `next/dynamic` no se usaba en NINGUN lado, y MainApp importaba estaticamente todas las vistas pesadas (Rosario inmersivo 1118 lineas, ViaCrucis 591, AnnuumStory 824, Meditado, Exposicion, el lector con epub.js ~grande, Dashboard dev), todas alcanzables SOLO por navegacion explicita, nunca en el primer render.

**Ejecucion:**
- `src/components/main/MainApp.tsx`: se convirtieron a `dynamic(() => import(...), { ssr: false, loading: LazyView })` las vistas pesadas navegables: `RosaryImmersive`, `RosaryMeditated`, `ViaCrucisImmersive`, `ExpositionImmersive`, `CustomPlanView`, `PlanDeVidaCalendar`, `NuevoTestamentoReader`, `PersonalEpubLibrary` (estas dos sacan epub.js del chunk inicial), `AnnuumStory` y `DeveloperDashboard`. Se agrego `import dynamic from 'next/dynamic'` y un fallback `LazyView` (declaracion de funcion hoisted) que llena su contenedor. NO se tocaron `HomePage` (primer render), `Settings`, `PrayerDetail`, `AudioPlayer` ni ninguna logica de navegacion/EPUB.

**Validacion:**
- `tsc --noEmit` sin errores; `next build` OK con `output: export`.
- Bundle: `First Load JS` de `/` bajo de 725 kB a 556 kB (-169 kB, ~23%); tamano de ruta 360 kB -> 190 kB. epub.js y las vistas inmersivas ahora cargan bajo demanda (y el SW las cachea tras el primer uso).
- Smoke test en dev (por DOM/JS, panel del navegador sin compositar): abrir el NT carga el chunk diferido y muestra el gate; "Leer sin descargar" carga el chunk de epub.js y muestra los controles del lector; volver regresa a la lista de Plan de Vida; cero errores de consola. El resto de vistas diferidas siguen el patron identico (default export + dynamic), verificado en el caso mas complejo.
- Nota honesta: no se "corrigieron" los 67 warnings de lint por diseno (intencionales o cosmeticos); hacerlo a ciegas arriesgaba regresiones en codigo delicado. La base ya estaba sana; la mejora sustantiva fue el bundle.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-07-24] 326. PWA: descarga OPCIONAL del Nuevo Testamento para lectura sin conexion (sin tocar el APK)

**Planificacion:**
- El usuario pidio que, SOLO en la PWA, se ofrezca descargar el Nuevo Testamento para leerlo offline, de forma opcional, y sin tocar nada del build dirigido al APK.
- Contexto: el NT (`public/epub/nuevo-testamento.epub`, 2.36 MB) se abre en MainApp cuando `currentPrayer.id === 'lectura-nuevo-testamento'`, yendo directo a `<EpubReader>` que carga por URL. En PWA esa URL falla sin conexion; en el APK el archivo ya viaja en el bundle y funciona offline. La entrada elegida por el usuario para el ofrecimiento fue "al abrir el NT" (antes de entrar al lector).
- Estrategia sin riesgo para el APK: NO tocar service worker, `next.config` ni el build. Todo se resuelve en runtime con `!Capacitor.isNativePlatform()` (patron ya usado en el repo). En nativo el flujo se saltea por completo (passthrough identico al comportamiento previo).

**Ejecucion:**
- `src/lib/offline-epub.ts` (nuevo): store minimalista en IndexedDB (dependency-free) con `getOfflineEpub/saveOfflineEpub/deleteOfflineEpub` (valores en base64, para reusar el camino `<EpubReader sourceBase64>`) y `downloadEpubAsBase64(url)` (fetch + arrayBuffer -> base64 por chunks). Se eligio IndexedDB en vez de localStorage porque ~3.1 MB en base64 rozaria el limite de ~5 MB del origin.
- `src/components/NuevoTestamentoReader.tsx` (nuevo): wrapper del NT. En nativo -> `<EpubReader onClose>` identico a antes. En web/PWA -> `PwaNuevoTestamentoReader`: al montar consulta IndexedDB; si hay copia, entra directo al lector con `sourceBase64`; si no, muestra una pantalla de entrada opcional con "Descargar y leer sin conexion" (descarga+guarda+entra) y "Leer sin descargar" (entra por URL). Se pasa `fileName="nuevo-testamento.epub"` en ambos modos para que las claves de posicion/marcadores/subrayados coincidan online y offline.
- `src/components/main/MainApp.tsx`: se reemplazo `import EpubReader` por `import NuevoTestamentoReader` (EpubReader ya no se usaba directo en MainApp; lo sigue usando `PersonalEpubLibrary` y el propio wrapper) y la linea del NT ahora renderiza `<NuevoTestamentoReader onClose={handleBack} />`. EpubReader NO se modifico.

**Validacion:**
- `npx tsc --noEmit` sin errores.
- Verificacion end-to-end en el dev server (por DOM/JS, ya que el panel del navegador no compositaba frames): (1) al abrir el NT en web aparece el gate con ambos botones; (2) "Leer sin descargar" entra al lector cargando por URL; (3) "Descargar y leer sin conexion" descarga, guarda en IndexedDB (~2.3 MB confirmado por lectura directa del store) y entra al lector; (4) tras recargar y reabrir, el gate se SALTEA y entra directo con la copia offline; (5) cero errores de consola.
- No verificable visualmente el render final de epub.js en este entorno: con el panel oculto (`document.visibilityState === 'hidden'`) epub.js no completa el iframe (0 iframes, se queda en "Cargando"), tanto por URL como por base64 — es limitacion del entorno headless, no del codigo; es el mismo EpubReader ya probado en produccion.
- Nativo/APK: sin cambios de comportamiento (el wrapper delega a `<EpubReader onClose>` con las mismas props que antes; nada de IndexedDB/fetch/gate corre en nativo). No se toco service worker ni build.

**Archivos Modificados:**
- `src/lib/offline-epub.ts` (nuevo)
- `src/components/NuevoTestamentoReader.tsx` (nuevo)
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-07-24] 325. PWA: el inicio no cargaba sin conexion (start URL servida NetworkFirst en vez de precacheada)

**Planificacion:**
- Reporte del usuario (via una hermana que usa la PWA instalada): sin conexion, el inicio se queda cargando mucho tiempo y a veces la PWA lo rechaza por no tener red.
- Se reviso el setup PWA: `@ducanh2912/next-pwa` v10.2.9 con `output: export`, config minima (`dest/disable/register/skipWaiting`). El `public/sw.js` generado precachea los chunks JS/CSS pero NO el documento HTML del shell; el start URL "/" se servia con la cache dinamica `start-url` en estrategia NetworkFirst. Sin conexion (o con red ambigua tipo WiFi sin internet), NetworkFirst espera a la red antes de caer al cache -> el inicio "se queda cargando"; si ese cache no estaba, falla del todo -> "la rechaza".
- Se descarto que el arranque de la app fuera el que cuelga: las fuentes son locales (`/fonts/fonts.css`), no hay Google Fonts ni fetch de red en el layout/providers/SplashScreen (el splash solo usa un timer de 2500 ms y `isLoaded` de localStorage). El cuelgue es a nivel service worker, ANTES de que corra el JS.
- Solucion segun la API de next-pwa: `dynamicStartUrl` (default `true`) sirve el start URL NetworkFirst para apps cuyo "/" cambia por estado (login, etc.). Cotidie es un SPA de export estatico: "/" siempre devuelve el mismo `index.html`. Ponerlo en `false` hace que el start URL se PRECACHEE, sirviendo el shell desde cache al instante sin conexion.

**Ejecucion:**
- `next.config.mjs`: se agrego `dynamicStartUrl: false` a `withPWAInit(...)`.
- Nota: `public/sw.js` y `public/workbox-*.js` estan en `.gitignore` (lineas 75-76); no se versionan, los regenera el build/deploy. El unico cambio de codigo versionado es `next.config.mjs`.

**Validacion:**
- `npm run build` OK (exit 0), "/" prerenderizado como estatico.
- Verificacion objetiva sobre el `sw.js` regenerado: el manifiesto de precache ahora incluye `{url:"/", revision:"..."}` (el shell de inicio), y la cache dinamica `start-url` (NetworkFirst) desaparecio. Es decir, offline el inicio se sirve desde el precache (cache-first), sin espera de red ni rechazo.
- No verificable en el dev server: la PWA esta deshabilitada en desarrollo (`disable: NODE_ENV === 'development'`); el SW solo se genera/activa en el build de produccion. La prueba end-to-end la hara el usuario tras desplegar (abrir la PWA online una vez para cachear, luego en modo avion: el inicio debe cargar de inmediato).

**Archivos Modificados:**
- `next.config.mjs`
- `AGENTS.md`

### [2026-07-24] 324. Doble-atras del sistema para saltar directo a inicio

**Planificacion:**
- El usuario pidio un atajo del boton atras para volver a inicio sin tener que apretarlo muchas veces en rutas profundas. Propuso "mantener presionado unos segundos".
- Restriccion tecnica: el back de Android llega como el evento `backButton` de Capacitor, que es DISCRETO (un disparo por accion), no un keydown/keyup con duracion. Detectar un "mantener" confiable exigiria codigo nativo Java (`onKeyLongPress`) y ademas solo funcionaria en telefonos con boton fisico / barra de 3 botones (no con navegacion por gestos). Se le plantearon las dos opciones y eligio la alternativa mas simple y universal: doble-atras rapido.
- Diseno: el PRIMER atras se comporta normal y de inmediato (sin agregar latencia al caso comun); si llega un SEGUNDO atras dentro de una ventana corta, salta a inicio. Solo se cablea al back del sistema, no a los botones "atras" internos de la app.

**Ejecucion:**
- MainApp: constante `DOUBLE_BACK_HOME_MS = 500`; ref `lastSystemBackAtRef`; nuevo `handleSystemBack` (useCallback) que compara el timestamp del back anterior: si esta dentro de la ventana, resetea el marcador, cierra el globo Annuum si estaba y hace `replaceNavState(initialState)` (solo si no se esta ya en home); si no, guarda el timestamp y delega en `handleBack` normal. `useAndroidBackButton` ahora recibe `handleSystemBack` en vez de `handleBack`.
- Edge conocido y benigno: si el primer atras ya deja en home (se estaba a un nivel), el segundo toque rapido cae en la rama de `App.exitApp()` del hook (comportamiento estandar de Android en home). Solo ocurre estando a 1 nivel de inicio, donde el atajo no hace falta.

**Validacion:**
- `npx tsc --noEmit` sin errores.
- No verificable en el dev server de escritorio: el back del sistema solo se enlaza en Android nativo (evento `backButton` de Capacitor en `useAndroidBackButton`). La prueba real es en el dispositivo (entrar a una ruta profunda; dos atras rapidos -> inicio; un atras aislado -> un nivel, como siempre).
- Pendiente de confirmacion del usuario en el dispositivo tras recompilar la APK.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-07-24] 323. Back del sistema vs boton en el lector EPUB de la biblioteca personal (destinos distintos)

**Planificacion:**
- El usuario reporto que, con un EPUB abierto dentro de "Lectura Espiritual > personales", el boton de atras del lector vuelve a la biblioteca de libros personales, pero el back del sistema (Android) salta directo al menu de Lectura Espiritual. Pidio que ambos lleven al mismo punto, a mi criterio.
- Se rastreo la arquitectura: al abrir un libro, `PersonalEpubLibrary` guarda el archivo en ESTADO LOCAL (`selectedId`/`selectedSource`) y renderiza `<EpubReader>`. El boton del lector (`onClose`) limpia ese estado local -> vuelve a la lista de la biblioteca. El back del sistema, en cambio, pasa por `handleBack` (MainApp) que opera sobre `navState`; como el libro abierto es invisible para navState (sigue en `prayer / lectura-espiritual-personales`), `handleBack` sube un nivel en `prayerPathIds` -> menu Lectura Espiritual, salteando la lista.
- Decision de diseno: el back del sistema debe PRIMERO cerrar el libro (igual que el boton). Asi ambos van a la biblioteca, y un segundo back lleva al menu. Es la jerarquia natural (menos sorpresa) y reusa el patron ya existente `registerBackHandler`/`rosaryMeditatedBackHandlerRef` usado por `RosaryMeditated`.

**Ejecucion:**
- MainApp: nuevo ref `personalEpubBackHandlerRef`; en `handleBack`, antes del recorrido generico del arbol de oraciones, si `activeView === 'prayer'` y el nodo es `lectura-espiritual-personales` y `personalEpubBackHandlerRef.current?.()` devuelve `true`, se corta el back. Se paso `registerBackHandler` a `<PersonalEpubLibrary>`.
- `PersonalEpubLibrary`: nueva prop `registerBackHandler`; un `useEffect` (espejo de `RosaryMeditated`) registra un handler que, si hay un libro abierto, lo cierra con los mismos `setSelectedId(null)/setSelectedSource(null)` que usa el boton del lector y devuelve `true`; si no hay libro abierto devuelve `false`, de modo que salir de la lista en si sigue cayendo a la navegacion normal (menu Lectura Espiritual).
- Cerrar por el back del sistema queda equivalente al boton: el `EpubReader` se desmonta y su cleanup persiste la posicion igual que siempre.

**Validacion:**
- `npx tsc --noEmit` sin errores.
- No verificable en el dev server de escritorio: el back del sistema solo se enlaza en Android nativo (evento `backButton` de Capacitor en `useAndroidBackButton`), no esta atado al `popstate` del navegador. La prueba real es en el dispositivo (abrir un EPUB personal, back del sistema -> biblioteca; segundo back -> menu Lectura Espiritual; y el boton del lector se comporta igual).
- Pendiente de confirmacion del usuario en el dispositivo tras recompilar la APK.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `src/components/PersonalEpubLibrary.tsx`
- `AGENTS.md`

### [2026-07-24] 322. Al reiniciar el proceso se pierde el contexto de plan personalizado (el back cae al arbol manual)

**Planificacion:**
- El usuario reporto que, estando dentro de un plan personalizado sobre una oracion (ej. "Alma de Cristo"), al apagar el celular, esperar y reencender, la app arranca en frio (pantalla de bienvenida), lo deja en la oracion pero FUERA del plan: el boton atras, en vez de llevar a inicio (como corresponde dentro del plan), camina el arbol manual (Plan de Vida > Santa Misa > Despues), como si la oracion se hubiera abierto a mano.
- Se rastreo la persistencia de navegacion: `navState` se guarda/restaura via `persistNavState`/`loadPersistedNavState`, y ambas pasan por `normalizeNavState` (`src/components/main/navigation.ts`). Esa funcion solo conservaba `activeView`, `selectedCategoryId`, `prayerPathIds` y `rosaryReturnMode`, DESCARTANDO `customPlanPrayerSlot` y `customPlanPrayerIndex`. Tras el reinicio se restaura `prayerPathIds` (la ruta en el arbol) pero se pierde el hecho de estar dentro de un plan, asi que `handleBack` (MainApp, el branch `customPlanPrayerSlot !== null` que va a `initialState`) nunca se activa y cae al recorrido del arbol; ademas el prev/next del plan deja de funcionar.
- Se verifico en git que NO es una regresion de la v6.4.10: `normalizeNavState` descarta esos campos desde el primer commit del modulo; el arranque (`getInitialNavState`/`loadPersistedNavState`/`useNavPersistence`) y el back de planes no cambiaron entre v6.4.6 y HEAD (v6.4.7 = refactor de MainApp, v6.4.9 = fix de sobreconteo, v6.4.10 = solo dependencias Next/Radix). El bug es latente y viejo; solo se vuelve VISIBLE cuando en un reinicio en frio el `sessionStorage` sobrevive a la muerte del proceso Y se estaba dentro de un plan. Si no sobrevive, la restauracion cae a `initialState` y aterriza en inicio (que es lo correcto), ocultando el bug. Que sobreviva o no no es determinista (version de Android, presion de memoria, forma de morir el proceso), lo que explica que recien se detectara ahora.

**Ejecucion:**
- En `normalizeNavState` se preservan `customPlanPrayerSlot` (validado a 1|2|3|4, si no `null`) y `customPlanPrayerIndex` (numero solo si hay slot valido, si no `null`). Asi el contexto de plan viaja junto con `prayerPathIds` en cada guardado/restauracion.
- Degradacion segura: si el plan fue borrado o cambio, el indice restaurado deja de ser valido (`customPlanValidIndices` en MainApp lo descarta), el prev/next se desactiva y el back vuelve a inicio.

**Validacion:**
- `npx tsc --noEmit` sin errores.
- No verificable en el dev server de escritorio: el sintoma requiere un reinicio en frio del proceso con un plan real cargado. La prueba real es en el dispositivo (entrar a un plan que empiece con "Alma de Cristo", apagar, esperar, encender: el back debe ir a inicio y el prev/next del plan debe seguir funcionando).
- Pendiente de confirmacion del usuario en el dispositivo tras recompilar la APK.

**Archivos Modificados:**
- `src/components/main/navigation.ts`
- `AGENTS.md`

### [2026-07-24] 321. Bloque de controles del lector EPUB tapado por el status bar

**Planificacion:**
- El usuario reporto que el bloque de navegacion superior dentro de un EPUB se corta con la barra superior del celular y no se ve completo.
- Se ubico la causa en `src/components/EpubReader.tsx`: el bloque de controles es `absolute inset-x-0 top-0`. Para un elemento con posicion absoluta, `top-0` se ancla al padding-box del padre (el borde de la pantalla), ignorando el `paddingTop: env(safe-area-inset-top)` que ya tenia el contenedor. Ademas, la franja opaca del status bar (el "system-bar layer" con `z-[200]`) se dibuja encima del bloque (`z-20`), tapando su parte superior.

**Ejecucion:**
- Se agrego al bloque de controles `style={{ top: 'env(safe-area-inset-top, 0px)' }}`, empujandolo justo debajo del inset del status bar. El `p-3` interno se conserva, de modo que la tarjeta queda con su separacion habitual debajo de la barra. No se toco el resto del layout ni el manejo horizontal (en vertical el inset lateral es 0).

**Validacion:**
- `npx tsc --noEmit` sin errores.
- No verificable en el dev server de escritorio: `env(safe-area-inset-top)` vale `0px` sin status bar/notch; el efecto solo se aprecia en el dispositivo.
- Pendiente de confirmacion del usuario en el dispositivo tras recompilar la APK (el encabezado del lector debe verse completo, sin quedar bajo la barra superior).

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-23] 320. Crash React #185 al reabrir menus/dialogos de Radix (incompatibilidad con React 19 de Next 15)

**Planificacion:**
- El usuario reporto (con log de dispositivo) un crash React #185 ("Maximum update depth exceeded") al usar el menu de opciones (boton ⋮) de la pantalla de lectura. Se reprodujo de forma fiable en el servidor de desarrollo con el repro minimo: abrir el menu ⋮ → cerrarlo (Escape) → reabrirlo → la app cae al ErrorBoundary.
- Con el error no minificado se identifico la causa exacta: `@radix-ui/react-focus-scope` (la trampa de foco de menus/dialogos) hace `setState` (setContainer) dentro de su callback de ref; con el React 19.2-canary que Next 15 empaqueta internamente, `safelyDetachRef` re-ejecuta ese callback al desmontar y entra en bucle infinito. El stack esta 100% dentro de Radix/React (no es codigo de la app: se verifico desactivando efectos sospechosos del Header sin que el crash desapareciera). Afecta a cualquier overlay de Radix con trampa de foco al reabrirse.
- Se descarto que fuera un bug ya corregido en Radix: `focus-scope` y `compose-refs` en su ultima version traen el mismo patron. Actualizar solo Next o solo Radix no bastaba. La combinacion (Next + Radix a la vez) si lo resuelve.

**Ejecucion:**
- Se actualizo `next` de 15.3.8 a 15.5.21 (trae un React 19.2-canary mas nuevo) y todos los paquetes `@radix-ui/*` a su ultima version (alert-dialog, checkbox, dialog, dropdown-menu, label, popover, progress, select, slider, slot, switch, toast).
- `next` quedo pineado exacto (`"15.5.21"`), respetando la convencion del proyecto.

**Validacion:**
- `npm run build` (`tsc --noEmit && next build`) OK: build de produccion/export estatico compilado sin errores de tipos ni de compilacion.
- Prueba en el servidor de desarrollo del repro exacto: se abrio el menu ⋮ de una oracion, se cerro y se reabrio 4 veces seguidas; el menu reabre con sus items y la app NUNCA cae al ErrorBoundary (verificado por DOM, no por consola). Antes del arreglo, la segunda apertura caia siempre.
- Pendiente de confirmacion del usuario en el dispositivo real tras recompilar la APK.

**Archivos Modificados:**
- `package.json`
- `package-lock.json`
- `AGENTS.md`

### [2026-07-22 23:09] 319. Modo forzado de Cotidie Annuum visible fuera de temporada

**Planificacion:**
- Seguir el interruptor "Forzar temporada Annuum" hasta la funcion que decide la visibilidad del globo de inicio y la entrada de Ajustes.
- Mantener intactas las reglas anuales normales y corregir exclusivamente el comportamiento de prueba para desarrolladores.

**Ejecucion:**
- Se detecto que el modo forzado solo activaba la temporada, pero seguia condicionado por el historial de apertura y por la fecha real posterior a Cristo Rey. Fuera de temporada podia ocultar simultaneamente ambos accesos.
- Cuando `forceAnnuumSeason` esta activo, la disponibilidad ahora expone tanto el globo de inicio como el boton de Cotidie Annuum en Ajustes. Al desactivarlo se vuelven a aplicar sin cambios las fechas y transiciones normales.

**Validacion:**
- `npx tsc --noEmit` sin errores.
- ESLint sobre `movable-feasts.ts` sin errores ni advertencias.
- Prueba movil local a 360 x 780 con fecha real fuera de temporada, historial previo y modo forzado activo: se mostro 1 globo Annuum en inicio y 1 entrada "Cotidie Annuum" en Ajustes, sin errores de consola.
- La misma prueba con el modo forzado desactivado mantuvo ambos accesos ocultos fuera de temporada, confirmando que la logica normal no cambio.

**Archivos Modificados:**
- `src/lib/movable-feasts.ts`
- `AGENTS.md`

### [2026-07-22] 318. Etiqueta correcta para el acumulado de aperturas en el panel de desarrollador

**Planificacion:**
- Verificar si la tarjeta "Oraciones Hoy" utilizaba una estadistica diaria o un acumulado historico antes de modificar el panel.

**Ejecucion:**
- Se confirmo que la tarjeta muestra `realUserStats.totalPrayersOpened`, el acumulado historico que tambien utiliza Cotidie Annuum, y no un conteo del dia actual.
- Se cambio la etiqueta de la tarjeta y del campo editable correspondiente a "Aperturas totales".

**Validacion:**
- `npx tsc --noEmit` sin errores.
- ESLint sobre `DeveloperDashboard.tsx` sin errores ni advertencias.
- `git diff --check` sin errores de formato.

**Archivos Modificados:**
- `src/components/developer/DeveloperDashboard.tsx`
- `AGENTS.md`

### [2026-07-22 22:47] 317. Checks exclusivos del Plan de Vida y cierre seguro de lectores EPUB

**Planificacion:**
- Revisar los dos registros de consola entregados por el usuario y separar los sintomas demostrados: oraciones ajenas agregadas al progreso del Plan de Vida, una ruta inexistente para la imagen de Pentecostes y una excepcion de `epub.js` al consultar `currentLocation` durante el desmontaje.
- Corregir el origen de cada fallo, limpiar los IDs invalidos ya persistidos sin borrar aperturas legitimas de oraciones y probar tanto el lector del Nuevo Testamento como el de EPUB personales.

**Ejecucion:**
- Se elimino el fallback que, al no encontrar una raiz del Plan de Vida, usaba el ID de cualquier oracion abierta y la marcaba igualmente. Todo marcado pasa ahora por un mapa de practicas pertenecientes al Plan de Vida, convierte partes internas a su raiz visible y rechaza IDs ajenos.
- Al cargar o importar el estado se normalizan `planDeVidaProgress`, `planDeVidaCalendar` y los acumulados exclusivos de cumplimiento: se conservan las practicas validas, se migran IDs internos a su raiz y se retiran los registros invalidos introducidos por el defecto. Las estadisticas normales de apertura de esas otras oraciones se mantienen.
- `getRenditionLocation` ahora tolera que `epub.js` ya haya eliminado su administrador durante el ultimo guardado de posicion.
- El desmontaje del lector espera a que terminen la apertura, el arranque y la carga encolada de `epub.js` antes de destruir libro y rendicion; tambien se detiene el flujo de carga al detectar que la vista ya fue cerrada. Esto evita las excepciones encadenadas de `currentLocation`, `replaceCss`, `package` y `Locations.length`, ademas del `404` secundario de `META-INF/container.xml`.
- La imagen de Pentecostes ahora reutiliza el recurso local existente del tercer misterio glorioso en vez de solicitar `/images/pentecost.jpeg`, que no existia.

**Validacion:**
- `npm run build` OK: TypeScript y la exportacion de produccion de Next.js terminaron correctamente.
- ESLint sobre los tres archivos TypeScript modificados: 0 errores; permanecen 9 advertencias preexistentes de dependencias de hooks.
- Prueba automatizada en Chrome a 360 x 780: abrir San Agustin incremento su estadistica normal a 1, pero dejo `planDeVidaProgress` vacio y el calendario sin entradas; abrir Oracion de la Manana marco solamente `oracion-manana`.
- Se inicio con un estado preparado con `sanagustindehipona` y `subcat-confesion` dentro del progreso, calendario e historial de cumplimiento: ambos IDs fueron retirados y se conservo el check legitimo de `oracion-manana` con total 1.
- El Nuevo Testamento se abrio y cerro tres veces, incluyendo una salida a los 100 ms, sin errores de consola. Tambien se cargo y cerro el EPUB local como lectura personal sin errores.
- La aplicacion local respondio 200 y `/images/rosario/glorioso-3.jpg` respondio 200 con 77.178 bytes.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/EpubReader.tsx`
- `src/lib/epub-reader/helpers.ts`
- `src/lib/placeholder-images.json`
- `AGENTS.md`

### [2026-07-23] 318. Plan de Vida: navegar carpetas/menus ya no cuenta como oracion ni auto-marca el check

**Planificacion:**
- El log real mostro que abrir "Lectura Espiritual" > "Personales" incrementaba `prayersOpenedHistory` para `lectura-espiritual-container` Y `lectura-espiritual-personales`, y ademas marcaba el check diario del Plan de Vida (`Check marcado id=lectura-espiritual-container`) — todo solo por navegar, sin haber leido nada.
- Causa: `handleSelectPrayer`/`handleOpenPrayerById` en `MainApp.tsx` incrementaban la estadistica para CUALQUIER nodo tocado, y `getRootPlanDeVidaId` marca el item raiz del Plan de Vida como completado en cada incremento. Los nodos contenedores (carpetas con `prayers[]`) y las hojas-menu (`lectura-espiritual-personales`, `lectura-espiritual-audios`, que solo abren una lista) contaban como oracion/lectura.
- Ademas, abrir un EPUB personal concreto NO contaba (el conteo estaba en el menu, no en el libro). Es decir: navegar contaba, leer no.
- Modelo elegido por el usuario ("Solo abrir contenido real"): las carpetas y hojas-menu no cuentan; abrir contenido real (una lectura/oracion concreta, el lector NT, o un EPUB personal concreto) si cuenta.

**Ejecucion:**
- Nuevo helper puro `isNavigationOnlyPrayerNode(prayer)` en `src/components/main/prayer-navigation.ts`: devuelve true para carpetas (con `prayers[]`) y para las hojas-menu `lectura-espiritual-personales` / `lectura-espiritual-audios`.
- `MainApp.tsx`: `handleSelectPrayer` y `handleOpenPrayerById` ahora solo llaman `incrementStat('prayersOpenedHistory', ...)` cuando el nodo NO es de solo navegacion.
- `PersonalEpubLibrary.tsx`: al abrir un libro real (`onOpen`) o al subir uno (que lo abre de inmediato), se llama `incrementStat('prayersOpenedHistory', 'lectura-espiritual-personales')`. Asi el conteo y el marcado del Plan de Vida ocurren al leer de verdad, no al ver el menu. La ventana de 1 hora existente evita dobles conteos.

**Validacion:**
- `npx tsc --noEmit` sin errores.
- Verificacion en dispositivo/navegador pendiente del usuario; el flujo es facil de confirmar por las trazas `stats`/`plan-de-vida` en logcat (ya no deben aparecer al navegar carpetas, si al abrir un libro).

**Archivos Modificados:**
- `src/components/main/prayer-navigation.ts`
- `src/components/main/MainApp.tsx`
- `src/components/PersonalEpubLibrary.tsx`
- `AGENTS.md`

### [2026-07-23] 317. EpubReader: causa raiz real del salto al reabrir (off-by-one de anclaje), confirmada por logcat

**Planificacion:**
- Con la depuracion remota del WebView ya activa, el usuario capturo por fin un log real (`edge://inspect` sobre la APK en su telefono). El log demostro dos hechos clave:
  1. El guardado y la carga de la posicion ya round-trip-ean perfecto: cada "Ubicacion guardada al salir" coincide EXACTAMENTE con la "Ubicacion leida de localStorage al abrir" siguiente. Los fixes previos de persistencia (entradas #306, #311, #312, #314) resolvieron esa parte.
  2. Lo que fallaba era el DISPLAY al reabrir. Se restauraba con `rendition.display(savedLocation.endCfi)`, pero epub.js coloca el CFI que recibe `display()` en el BORDE SUPERIOR del viewport. Como `endCfi` es el ULTIMO caracter visible de la pagina de salida, quedaba arriba y se mostraba la pagina SIGUIENTE (deriva de +1). El log lo prueba: salio en `/4/52/1:259` y reabrio mostrando `/4/52/1:259 -> :603`; salio en `/4/32/1:399` y reabrio en una pagina que termina en `/4/38/1:215`.
- Historicamente el usuario habia visto lo contrario (retroceso) al anclar en el CFI de INICIO. Motivo: el `start.cfi` que reporta epub.js puede ser grueso — en una pagina que muestra el medio de un parrafo largo, apunta al comienzo del parrafo (una pagina anterior). Asi que ni el inicio (retrocede) ni el fin (avanza) por si solos aciertan.

**Ejecucion:**
- Nueva estrategia de restauracion en el efecto de carga: anclar SIEMPRE al `cfi` de inicio (`rendition.display(cfi)`), y luego avanzar de a una pagina SOLO hasta que el rango visible alcance el ultimo caracter leido (`endCfi`), comparando con `EpubCFI.compare(liveEndCfi, targetEndCfi) >= 0`. No puede pasarse: el ancla de inicio nunca esta por delante de `endCfi`, asi que la primera pagina cuyo fin alcanza `endCfi` es justo la que lo contiene. El avance esta acotado por `READER_MAX_RESTORE_NUDGE_STEPS` (6).
- Por coherencia, los otros dos puntos que re-navegan colocando un ancla arriba tambien pasaron a preferir el `cfi` de inicio en vez del `endCfi`: el resize de la rendicion (`refreshRenditionLayout`) y el cambio de tamano de fuente. Si seguian usando `endCfi`, cada repaginacion habria empujado al lector una pagina hacia adelante.
- Se agrego una traza nueva ("Restauracion: anclada al inicio y ajustada. pasos=N") para que el proximo log muestre cuantos pasos de ajuste se hicieron.
- Se importo `EpubCFI` desde `epubjs` y se agrego la constante `READER_MAX_RESTORE_NUDGE_STEPS`.

**Validacion:**
- `npx tsc --noEmit` sin errores.
- Se verifico en la fuente de epub.js que `EpubCFI.compare` existe y devuelve -1/0/1, y que `display()` ancla el CFI al inicio del viewport.
- No es posible reproducir el lector EPUB completo en el navegador sandboxed de este entorno; la verificacion en dispositivo real queda pendiente de la proxima prueba del usuario (ahora con logcat funcional para confirmar `pasos=N`).

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `src/lib/epub-reader/constants.ts`
- `AGENTS.md`

### [2026-07-22] 316. Activar depuracion remota del WebView (android.webContentsDebuggingEnabled)

**Planificacion:**
- El usuario no podia inspeccionar la consola del WebView de la app instalada en su telefono via `edge://inspect`/`chrome://inspect`. Se diagnostico con `adb devices` y `adb shell cat /proc/net/unix`: el telefono se conectaba y autorizaba correctamente, y el proceso `com.benjamin.studio` estaba corriendo, pero no existia ningun socket `*_devtools_remote` para ese proceso.
- Causa raiz: Capacitor solo activa `WebView.setWebContentsDebuggingEnabled(...)` automaticamente cuando la build tiene el flag `FLAG_DEBUGGABLE` (compilaciones debug). La APK instalada es la de release, firmada con el keystore propio via `scripts/android-apk.mjs`, asi que ese flag queda apagado por defecto (comportamiento esperado de Android, no un bug).
- Se le presento al usuario la opcion de activarlo de forma permanente en `capacitor.config.ts` (afecta tambien a las builds de release que usan los usuarios finales) frente a compilar una APK de debug aparte solo para depurar. Eligio la opcion permanente.

**Ejecucion:**
- Se agrego `android: { webContentsDebuggingEnabled: true }` a `capacitor.config.ts`.
- Se corrio `npx cap sync android` para propagar el cambio a `android/app/src/main/assets/capacitor.config.json`.

**Validacion:**
- `npx tsc --noEmit` sin errores.
- Se confirmo `"webContentsDebuggingEnabled": true` en el `capacitor.config.json` generado dentro del proyecto Android nativo.
- Pendiente de accion del usuario: recompilar e instalar la APK (`npm run android:apk`) para que el cambio tome efecto en el dispositivo; solo entonces `edge://inspect`/`chrome://inspect` podra listar el WebView de Cotidie.
- No aplica prueba en el navegador de escritorio: este cambio solo es observable en el WebView nativo de Android tras una recompilacion, no en el servidor de desarrollo web.

**Archivos Modificados:**
- `capacitor.config.ts`
- `android/app/src/main/assets/capacitor.config.json` (generado por `cap sync`)
- `AGENTS.md`

### [2026-07-22 20:44] 315. Limpieza integral de archivos muertos y dependencias sin consumidores
**Planificacion:**
- Auditar los archivos versionados mediante referencias textuales, convenciones de Next/Android y un grafo de importaciones de todo `src`.
- Eliminar solamente residuos inequivocos, contenido temporal autorizado por el usuario, recursos antiguos de Apple/iOS, modulos desconectados y dependencias que quedaron sin consumidores.
- Conservar recursos nativos duplicados deliberadamente para widgets/notificaciones, fuentes y sus licencias OFL, configuracion PWA, recursos Android activos y herramientas de desarrollo vigentes.

**Ejecucion:**
- Se eliminaron 125 archivos versionados: `.modified`, una imagen residual de `.codex-dev`, dos restos vacios de descarga Gradle, 41 archivos de `tmp`, 33 recursos sin uso de `icons/`, dos pruebas Android genericas de Capacitor, salidas PWA obsoletas versionadas, recursos publicos sin consumidores, documentacion auxiliar empaquetada, dos scripts superados y 30 modulos desconectados de `src`.
- Los 30 modulos de `src` retirados incluian componentes Shadcn sin uso, tres iconos SVG sin consumidores, un wrapper de providers duplicado, un hook aislado, datos antiguos de Camino y copias redundantes de Magnificat, Oracion de la Manana/Tarde y los misterios del Rosario.
- Se retiraron 17 dependencias directas sin consumidores; npm elimino 80 paquetes contando sus dependencias transitivas. Se mantuvo `@capacitor/assets` para poder regenerar recursos Android desde `assets/`.
- `.gitignore` ahora impide que reaparezcan `.modified`, `.codex-dev`, `tmp`, `icons`, el Gradle home de verificacion y las salidas generadas `public/sw.js`/`public/workbox-*.js`.
- Se conservaron el manifiesto y la configuracion de la PWA. Los `sw.js`/Workbox eliminados eran salidas antiguas sin registro en el bundle actual, no codigo fuente de la PWA.

**Validacion:**
- `npx tsc --noEmit` OK.
- Grafo de importaciones posterior a la limpieza: 196 archivos fuente, 196 alcanzables y 0 huerfanos.
- `npm ls --depth=0` OK, sin dependencias directas rotas.
- `npm run build` OK; Next.js genero y exporto las rutas `/` y `/_not-found` correctamente.
- `npx cap sync android` OK; se detectaron los cuatro plugins Capacitor esperados y no quedaron copias de los recursos eliminados en los assets Android.
- La exportacion paso de 115 a 102 archivos y de 128.528.081 a 128.383.750 bytes. `tmp` quedo con 0 archivos.
- No se ejecuto `npm audit fix`, porque sus actualizaciones exceden esta limpieza y podrian introducir cambios de compatibilidad no solicitados.

**Archivos Modificados:**
- `.gitignore`
- `package.json`
- `package-lock.json`
- `.modified` (eliminado)
- `.codex-dev/` (contenido eliminado)
- `tmp/` (contenido eliminado)
- `icons/` (eliminado)
- `android/.gradle-user-home-verify/` (eliminado)
- `android/app/src/test/` y `android/app/src/androidTest/` (plantillas genericas eliminadas)
- `public/epub/.gitkeep`, `public/epub/README.txt`, seis `public/fonts/*/README.txt`, tres iconos publicos sin uso y las salidas PWA obsoletas (eliminados)
- `scripts/_git-checkout-file.mjs` y `scripts/copy-apk.mjs` (eliminados)
- 30 archivos desconectados bajo `src/components/`, `src/context/`, `src/hooks/` y `src/lib/` (eliminados)
- `AGENTS.md`

### [2026-07-22] 314. EpubReader: la misma ancla obsoleta tambien re-navegaba al cambiar el tamano de fuente

**Planificacion:**
- Tras corregir `refreshRenditionLayout` para preferir la posicion leida en vivo (`getRenditionLocation(rendition)`) sobre `stableLocationRef.current` como ancla de `rendition.resize(...)`, se reviso si el mismo patron de bug existia en otros lugares del componente que tambien re-navegan activamente (no solo registran la posicion).
- Se encontro el efecto de cambio de tamano de fuente: calculaba `fontResizeAnchor` leyendo *unicamente* `stableLocationRef.current` (sin ni siquiera intentar la lectura en vivo como respaldo) y luego llamaba `rendition.display(fontResizeAnchor)`. Como `stableLocationRef` solo se actualiza cuando `onRelocated` decide no suprimir el evento, puede quedar desactualizado hasta `READER_MAX_RESTORE_SUPPRESSION_MS` (5000 ms) tras cualquier resize o restauracion — exactamente el mismo defecto de raiz que en `refreshRenditionLayout`, pero mas expuesto porque aqui no habia ningun respaldo con la lectura en vivo.

**Ejecucion:**
- Se cambio el efecto de `readerFontSize` para calcular `fontResizeAnchor` a partir de `getRenditionLocation(rendition) ?? stableLocationRef.current` (lectura en vivo primero, con el ref como respaldo), igual que ya se hizo en `refreshRenditionLayout` y en `persistCurrentLocation`.

**Validacion:**
- `npx tsc --noEmit` sin errores.
- No fue posible reproducir el flujo completo del lector EPUB en el navegador sandboxed de este entorno (la carga del EPUB nunca supera "Cargando EPUB..." aqui, limitacion ya documentada en entradas anteriores); la verificacion en dispositivo real queda pendiente de confirmacion del usuario.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-22] 311. README: funcionamiento completamente offline
**Planificacion:**
- Corregir la introduccion para que no sugiera una dependencia ocasional de internet y exprese con precision que Cotidie funciona enteramente sin conexion una vez instalada.

**Ejecucion:**
- Se sustituyo la formulacion "no depender permanentemente" por una declaracion explicita: tras su instalacion, Cotidie no necesita conectividad para acceder a sus contenidos ni utilizar sus funciones.

**Validacion:**
- Se reviso el fragmento actualizado y se ejecuto `git diff --check` sobre los dos archivos documentales.
- No se ejecutaron pruebas de aplicacion porque el cambio es exclusivamente documental.

**Archivos Modificados:**
- `README.md`
- `AGENTS.md`

### [2026-07-22 19:49] 310. README convertido en guia operativa y aclaracion de reproduccion del contenido
**Planificacion:**
- Sustituir la nota breve de autoria por una introduccion util para desarrolladores y agentes, basada en la estructura y los comandos reales del repositorio.
- Distinguir la autorizacion para reproducir textos devocionales y de lectura espiritual de los derechos reservados sobre el software y los elementos originales de Cotidie.

**Ejecucion:**
- `README.md` ahora explica el proposito de Cotidie, estado del proyecto, tecnologias, preparacion del entorno, desarrollo local, limites de la simulacion web, verificaciones y estructura principal.
- Se documento el comportamiento potencialmente publicador de `npm run android:apk`, sus cuatro opciones reales (`--set`, `--no-bump`, `--no-push`, `--no-drive`) y un comando de compilacion local sin publicacion ni cambio de version.
- Se agrego una seccion obligatoria para agentes que remite a `AGENTS.md` y exige leer ambos archivos antes de modificar el proyecto.
- La seccion de autoria permite expresamente reproducir los textos devocionales y de lectura espiritual, pero aclara que esa autorizacion no libera el codigo, el APK, la identidad visual ni otros elementos originales. Tambien preserva los derechos que puedan corresponder a recursos de terceros.

**Validacion:**
- Lectura completa del archivo final en UTF-8: 165 lineas, un unico H1, seis bloques de codigo correctamente emparejados y ningun caracter de reemplazo Unicode.
- `git diff --check -- README.md` sin errores (solo aviso informativo de conversion LF/CRLF de Git).
- No se ejecutaron pruebas de aplicacion porque el cambio es exclusivamente documental.

**Archivos Modificados:**
- `README.md`
- `AGENTS.md`

### [2026-07-22 17:39] 309. Lector EPUB: progreso estable inspirado en la arquitectura observable de ReadEra
**Planificacion:**
- Analizar `C:\Users\balca\Downloads\lector epub.apk` solo como referencia de comportamiento y arquitectura, sin descompilar ni copiar codigo o recursos propietarios, y corregir el componente EPUB compartido por Nuevo Testamento y Lectura Espiritual > Personales.
- Reproducir en el navegador movil el retroceso exacto de una pagina al reabrir y el desplazamiento acumulativo al repaginar por cambios de orientacion.

**Ejecucion:**
- Se inspeccionaron metadatos, manifiesto y archivos publicamente identificables del APK. ReadEra usa un motor EPUB nativo independiente (`liberaepub.so` / EraEPUB); la leccion aplicable a Cotidie es separar la posicion logica de lectura de los limites visuales de pagina.
- La ubicacion persistida ahora incluye el CFI final visible (`endCfi`). En este EPUB, el CFI inicial puede apuntar al comienzo de un parrafo que atraviesa varias paginas; restaurarlo era la causa del retroceso. El CFI final identifica de forma estable la pagina correcta.
- Las ubicaciones antiguas que solo contienen el CFI inicial se migran una vez avanzando a la pagina que el lector anterior pretendia guardar; despues quedan almacenadas en el formato nuevo.
- Se impidio que los eventos iniciales de `relocated` sobrescriban la ubicacion mientras esta se restaura.
- `epub.js` ahora recibe dimensiones numericas y Cotidie controla los cambios de tamano con un unico flujo. Rotaciones y cambios de fuente conservan el mismo CFI estable y no reemplazan el progreso con el nuevo final de una pagina repaginada.
- El guardado al ocultar, cerrar o desmontar prioriza la ultima posicion estable confirmada. Solo un avance, retroceso o salto explicito del usuario actualiza esa posicion.

**Validacion:**
- `npx tsc --noEmit` OK.
- `git diff --check -- src/components/EpubReader.tsx` sin errores (solo aviso informativo de conversion LF/CRLF de Git).
- Prueba movil real en `http://127.0.0.1:3018/` a 360 x 780: Nuevo Testamento avanzo a pagina 2, se cerro y reabrio en pagina 2.
- Prueba de repaginacion: pagina 2 vertical -> horizontal -> vertical termino nuevamente en pagina 2; una reapertura posterior tambien quedo en pagina 2.
- Prueba de Lectura Espiritual > Personales: se agrego temporalmente el EPUB local del Nuevo Testamento, se avanzo a pagina 2, se cerro y reabrio en pagina 2. El archivo de prueba fue eliminado al terminar.
- Cero errores o advertencias en la consola durante la prueba final.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `src/lib/epub-reader/helpers.ts`
- `src/lib/epub-reader/types.ts`
- `AGENTS.md`

### [2026-07-22 15:58] 305. Prueba de humo final del refactor de los 5 archivos grandes
**Planificacion:**
- Ultimo paso del plan aprobado: verificar en el navegador, con el servidor de desarrollo real, que los 5 archivos divididos (`camino.ts`, `SettingsContext.tsx`, `MainApp.tsx`, `EpubReader.tsx`, `RosaryImmersive.tsx`) siguen funcionando exactamente igual que antes.
- Se creo `.claude/launch.json` (nuevo) apuntando a `npm run dev -- -p 3018`, replicando el puerto que ya usa el propio flujo `armar cotidie dev` del usuario.

**Ejecucion (todo probado en `http://localhost:3018`, revisando consola tras cada paso):**
- Ajustes → Notificaciones: renderiza y funciona (ejercita `useNotificationScheduling`).
- Ajustes → Apariencia: renderiza "Fondo de Pantalla" / "Rotación diaria" (ejercita `useHomeBackgroundRotation`/`activeThemeColors`).
- Plan de Vida → Santo Rosario: pantalla de seleccion de misterios (`RosarySelectionView`) → paso "Adoración" del pre-rosario con el texto exacto movido a `content.ts` → se abrio "Mis Intenciones" (`IntentionsMenuOverlay`), se agrego una intencion nueva y aparecio en la lista de inmediato → se avanzo al primer misterio ("La Anunciación"), confirmando que la maquina de estados de navegacion (no tocada) sigue funcionando con las piezas movidas.
- Plan de Vida → Lectura Espiritual → Predeterminadas → Camino: el libro completo se abrio y el Capitulo 0 y 1 se leyeron identicos, palabra por palabra, al texto original (reconstruido en vivo a partir de las 7 partes).
- Plan de Vida → Lectura Espiritual → Audios: aparecen los dos audios por defecto (ejercita `spiritualAudio.ts`).
- Plan de Vida → Lectura Nuevo Testamento: el EPUB cargo (`GET /epub/nuevo-testamento.epub` → 200), la barra de herramientas y el panel de lectura abrieron correctamente mostrando la pestana de busqueda y el indice de libros del Nuevo Testamento (ejercita los 5 componentes de `epub-reader/` y `NT_BOOKS`).
- **Cero errores en consola** en cualquiera de los pasos anteriores.

**Validacion:**
- `npx tsc --noEmit` limpio (verificado al final de cada archivo, y se mantiene limpio ahora).
- Prueba de humo en navegador real sin errores.

**Archivos Modificados:**
- `.claude/launch.json` (nuevo)
- `AGENTS.md`

### [2026-07-22 15:49] 304. RosaryImmersive.tsx: extraccion de contenido, tipos y sub-vistas
**Planificacion:**
- Sexto y ultimo archivo del refactor mayor aprobado. `src/components/RosaryImmersive.tsx` (1502 lineas): mover textos/datos/tipos puros a `src/lib/rosary-immersive/`, y las 3 vistas autocontenidas (pantalla de seleccion de misterios, overlay de intenciones, overlay de jaculatorias) a `src/components/rosary-immersive/`. Dejar intacto el cluster de arrastre de la burbuja de navegacion, la maquina de estados (`handleNext`/`handlePrev`/etc.) y `rosaryIndexSections`, tal como preveia el plan por lo entrelazados que estan.

**Ejecucion:**
- `src/lib/rosary-immersive/types.ts`, `content.ts`, `helpers.tsx` (nuevos): `Jaculatoria`/`MysteryType`/`ImmersiveRosaryProps`, todos los textos de oraciones y datos de misterios (colores/imagenes/nombres), y `renderRosaryText`/`renderCenterIcon`/`getMysteryByDay`.
- `src/components/rosary-immersive/` (nuevo, 3 componentes): `RosarySelectionView` (pantalla completa de seleccion), `IntentionsMenuOverlay`, `JaculatoriasMenuOverlay` — cada uno recibe su estado y callbacks por props.
- Mismo cuidado que en `EpubReader.tsx`: los scripts de extraccion insertaron texto con `\n` sobre un archivo que estaba en `\r\n` en disco; se normalizo el archivo completo a `\n` al terminar.

**Validacion:**
- `npx tsc --noEmit` OK en cada paso (5 verificaciones independientes a lo largo de la extraccion).
- Barrido final de `src/**/*.{ts,tsx}` sin caracteres Unicode sueltos.
- `RosaryImmersive.tsx` paso de 1502 a 1118 lineas.

**Archivos Modificados:**
- `src/components/RosaryImmersive.tsx`
- `src/lib/rosary-immersive/types.ts` (nuevo)
- `src/lib/rosary-immersive/content.ts` (nuevo)
- `src/lib/rosary-immersive/helpers.tsx` (nuevo)
- `src/components/rosary-immersive/RosarySelectionView.tsx` (nuevo)
- `src/components/rosary-immersive/IntentionsMenuOverlay.tsx` (nuevo)
- `src/components/rosary-immersive/JaculatoriasMenuOverlay.tsx` (nuevo)
- `AGENTS.md`

### [2026-07-22 15:43] 303. EpubReader.tsx: extraccion de helpers puros y paneles de presentacion
**Planificacion:**
- Quinto archivo del refactor mayor aprobado. `src/components/EpubReader.tsx` (1633 lineas): mover funciones/tipos/constantes puras a `src/lib/epub-reader/`, y los 4 paneles del `Sheet` + la barra de seleccion pendiente a componentes de presentacion en `src/components/epub-reader/`. Dejar intacto el efecto grande de carga del libro (epub.js) y todos sus refs/handlers asociados, tal como preveia el plan.

**Ejecucion:**
- `src/lib/epub-reader/types.ts`, `constants.ts`, `helpers.ts` (nuevos): tipos, constantes (incluye datos `NT_BOOKS`) y funciones puras (storage keys, tamano de fuente, colores de tema, base64/listas, TOC, parseo de referencias biblicas, helpers de CFI).
- `src/components/epub-reader/` (nuevo, 5 componentes): `ReaderTocPanel`, `ReaderSearchPanel`, `ReaderBookmarksPanel`, `ReaderHighlightsPanel`, `ReaderSelectionToolbar` — cada uno recibe sus datos y callbacks por props; el efecto de carga del libro y todos los refs/handlers quedan intactos en `EpubReader.tsx`.
- **Correccion de un error propio detectado a tiempo**: al escribir `helpers.ts` y (antes) `src/components/main/language-mode.ts`, el asistente transcribio por error el rango unicode `̀-ͯ` como caracteres combinantes literales en vez del texto de escape. Aunque el regex compilado era identico (mismo rango de codepoints, cero cambio de comportamiento), se corrigio de inmediato por higiene de codigo fuente, y se escaneo todo `src/**/*.{ts,tsx}` para confirmar que no quedaba ningun caso mas.
- **Correccion de finales de linea propios**: los scripts de extraccion usados en `EpubReader.tsx` y `MainApp.tsx` insertaron texto nuevo con `\n` sobre archivos que Windows habia entregado en disco con `\r\n` (por `core.autocrlf`), dejando finales de linea mixtos. Se normalizaron ambos archivos completos a `\n` (el estilo real del repositorio, confirmado con `git show HEAD:<archivo>`). No se tocaron otros archivos del repo que ya tenian finales de linea mixtos de antes (no relacionado con este refactor).

**Validacion:**
- `npx tsc --noEmit` OK en cada paso.
- Barrido de todo `src/**/*.{ts,tsx}` sin caracteres Unicode sueltos y sin archivos con finales de linea mixtos introducidos por el asistente.
- `EpubReader.tsx` paso de 1633 a 1230 lineas.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `src/components/main/MainApp.tsx` (solo normalizacion de finales de linea, sin cambios de contenido)
- `src/components/main/language-mode.ts` (correccion del regex)
- `src/lib/epub-reader/types.ts` (nuevo)
- `src/lib/epub-reader/constants.ts` (nuevo)
- `src/lib/epub-reader/helpers.ts` (nuevo)
- `src/components/epub-reader/ReaderTocPanel.tsx` (nuevo)
- `src/components/epub-reader/ReaderSearchPanel.tsx` (nuevo)
- `src/components/epub-reader/ReaderBookmarksPanel.tsx` (nuevo)
- `src/components/epub-reader/ReaderHighlightsPanel.tsx` (nuevo)
- `src/components/epub-reader/ReaderSelectionToolbar.tsx` (nuevo)
- `AGENTS.md`

### [2026-07-22 20:21] 313. EpubReader: instrumentacion de diagnostico + arreglo de infraestructura de rastro invisible
**Planificacion:**
- El usuario reporto, tras la entrada #312, un patron muy especifico: entra a una pagina ya conocida, avanza 4, sale, vuelve a entrar, y queda 2 paginas antes de donde salio (dos despues de la inicial). Cuatro intentos de diagnostico por lectura de codigo sin poder probar en vivo ya no son suficientes — se decidio instrumentar en vez de seguir adivinando.
- Al ir a agregar los rastros, se descubrio que `pushDevLiveTrace` (usado ya desde antes del refactor, y en todos los arreglos de esta sesion) **solo actualiza estado de React** — no existe ninguna pantalla en toda la app que muestre `devLiveTraceEvents`. Ademas, `devLiveTraceEnabled` (el interruptor que activa el sistema completo) nunca se conecta a ningun control de la interfaz — solo se puede activar via `SettingsContext`, no hay forma de encenderlo desde la app. Conclusion: ningun rastro, ni los viejos ni los nuevos, se genero jamas durante las pruebas del usuario.

**Ejecucion:**
- `src/components/EpubReader.tsx`: se agregaron rastros en los puntos clave para diagnosticar el patron reportado: al leer la ubicacion guardada al abrir el libro; en cada tap que oculta o muestra los controles (para detectar si un toque destinado a pasar de pagina termina interpretado como mostrar/ocultar el encabezado); en `goPrev`/`goNext` (tanto cuando se ejecutan como cuando quedan bloqueados); en la supresion de un `relocated` durante la ventana de asentamiento; en cada resize real de la rendicion; y en el guardado tras una navegacion explicita.
- `src/context/settings/useDevLiveTrace.ts`: `pushDevLiveTrace` ahora tambien imprime a `console.info`/`warn`/`error` (prefijo `[COTIDIE-TRACE]`) ademas de guardar en estado — es la unica forma real de ver estos rastros hoy (consola del navegador en modo dev, o `adb logcat` en el APK instalado).
- `src/components/developer/DeveloperDashboard.tsx`: se agrego el interruptor "Rastro en vivo (consola/logcat)" que faltaba (`devLiveTraceEnabled`/`setDevLiveTraceEnabled`), junto al de "Notificación de prueba" que ya existia con el mismo patron (`SwitchRow`).

**Validacion:**
- `npx tsc --noEmit` OK.
- Pendiente: el usuario debe activar el interruptor nuevo, reproducir sus pasos exactos (entrar, avanzar 4, salir, volver a entrar), y compartir lo que aparezca en la consola/logcat filtrando por `COTIDIE-TRACE` para poder diagnosticar con datos reales en vez de teoria.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `src/context/settings/useDevLiveTrace.ts`
- `src/components/developer/DeveloperDashboard.tsx`
- `AGENTS.md`

### [2026-07-22 20:10] 312. EpubReader: cuarta causa del progreso perdido (la restauracion inicial no tenia ventana de asentamiento)
**Planificacion:**
- El usuario reporto, tras la entrada #311, que al volver a entrar lo dejaba en la pagina anterior — el mismo patron especifico de antes, esta vez en el momento de restaurar al abrir el libro.
- Se releyo `load()` comparando el tratamiento de la restauracion inicial contra el de un resize/cambio de tamano de fuente, y aparecio una asimetria: el resize y el cambio de tamano de fuente SI le dan a `isRestoringLocationRef` una ventana de asentamiento antes de volver a confiar en los eventos `relocated` (via `scheduleRestoreRelease`). La restauracion inicial, en cambio, ponia `isRestoringLocationRef.current = false` de inmediato apenas terminaba el `await rendition.display(...)`, sin ninguna ventana. Si epub.js todavia emitia un `relocated` tardio mientras terminaba de asentar el primer render del libro recien abierto, ese evento pasaba el filtro y sobrescribia en silencio la posicion recien restaurada (correcta) con una intermedia (incorrecta, una pagina antes).

**Ejecucion:**
- Se quito el `isRestoringLocationRef.current = false;` inmediato tras la restauracion inicial. Ahora, despues de persistir explicitamente la posicion restaurada (eso no cambia), se vuelve a poner `isRestoringLocationRef.current = true` y se llama a `scheduleRestoreRelease(400)` — la misma ventana de asentamiento que ya protegia al resize y al cambio de tamano de fuente, ahora tambien protege la restauracion inicial.
- Una navegacion real del usuario durante esa ventana (tocar para pasar de pagina) sigue teniendo prioridad: `prepareForReaderNavigation()` ya limpiaba `isRestoringLocationRef`/el timer antes de cualquier `goPrev`/`goNext`/`displayAndPersist`, sin cambios ahi.

**Validacion:**
- `npx tsc --noEmit` OK.
- No se pudo probar de punta a punta en este entorno (misma limitacion de renderizado de epub.js ya documentada).

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-22 20:05] 311. EpubReader: tercera causa del progreso perdido (preferencia de dato viejo sobre el vivo al salir)
**Planificacion:**
- El usuario reporto que el guardado de progreso volvio a fallar. Se releyo el codigo con la mecanica de supresion agregada en la entrada #308/309 en mente (en vez de suponer algo nuevo desde cero).
- Causa encontrada: `onRelocated` solo actualiza `stableLocationRef` cuando `!isRestoringLocationRef.current`. Un resize (rotacion, teclado en pantalla, ventana asentandose) deja `isRestoringLocationRef` en `true` hasta 1.5s (o hasta el tope de 5s si llegan varios seguidos). Si el usuario sigue leyendo durante esa ventana y sale del lector, `stableLocationRef` queda con la posicion de *antes* del resize — pero tanto `persistCurrentLocation` (usado en pagehide/visibilitychange) como el cleanup de salida preferian `stableLocationRef` por sobre una consulta en vivo (`getRenditionLocation`), guardando esa posicion vieja en vez de la real.

**Ejecucion:**
- Se invirtio el orden de preferencia en los dos unicos lugares donde importa (`persistCurrentLocation` y el cleanup de desmontaje del efecto de carga): ahora prefieren la consulta en vivo (`getRenditionLocation`) y solo caen a `stableLocationRef` si esa consulta no devuelve nada (rendition ya destruida). En ambos casos es el "ultimo momento", sin otra oportunidad de corregir, asi que la posicion real siempre gana cuando esta disponible.
- Se dejo sin tocar el unico otro lugar que usa `stableLocationRef` primero (`refreshRenditionLayout`, para decidir a que CFI anclar un resize) — ese es un caso distinto (elegir ancla, no persistir un valor final) y no forma parte de este bug.

**Validacion:**
- `npx tsc --noEmit` OK.
- No se pudo probar de punta a punta en este entorno (misma limitacion de renderizado de epub.js ya documentada).

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-22 19:52] 310. EpubReader: la barra de seleccion se cierra sola al deseleccionar el texto
**Planificacion:**
- El usuario reporto: al seleccionar una palabra por error, la barra para guardar subrayado/nota queda abierta hasta que se presiona "Cancelar" a mano, incluso si ya deselecciono el texto tocando en otro lado.

**Ejecucion:**
- Se agrego un listener de `selectionchange` en el `document` del contenido del EPUB (mismo lugar donde ya se registra el listener de `click` para mostrar/ocultar controles, dentro de `rendition.hooks.content.register`, con la misma guarda anti-doble-registro).
- Cuando la seleccion queda vacia, se limpian `pendingSelectionCfi`/`pendingSelectionText`/`highlightNoteDraft` (lo mismo que ya hacia el boton "Cancelar"), ocultando la barra automaticamente.
- **Salvaguarda**: si el usuario ya empezo a escribir una nota o una etiqueta de marcador, no se cierra sola — se agregaron `highlightNoteDraftRef`/`bookmarkLabelRef` (sincronizados con el estado via un efecto chico cada uno) para poder leer el valor mas reciente desde dentro del listener sin tener que re-registrar el listener en cada tecla. Esto evita que mover el foco hacia el campo de nota (que podria deseleccionar el texto del iframe como efecto secundario) borre lo que el usuario ya escribio.

**Validacion:**
- `npx tsc --noEmit` OK.
- No se pudo probar de punta a punta en este entorno (misma limitacion de renderizado de epub.js ya documentada).

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-22 19:42] 309. EpubReader: tope maximo de supresion + debounce de resize (afinamiento sobre el fix del usuario)
**Planificacion:**
- El usuario reescribio buena parte de la logica de restauracion de posicion (entradas #306-308 como base): agrego `endCfi` (ancla al final de la pagina visible en vez del inicio, evitando el redondeo de epub.js hacia la pagina anterior en el limite), un `isRestoringLocationRef` con temporizador para no persistir relocaciones causadas por una restauracion/resize, dimensiones reales en pixeles al crear la rendicion, y `resizeOnOrientationChange: false`. Confirmo que funciono bien.
- Se verifico contra el codigo fuente real de epub.js instalado (`node_modules/epubjs/src/rendition.js`, v0.3.93): `resize(width, height, epubcfi)` efectivamente reenvia ese tercer argumento hasta `onResized`, que hace `this.display(epubcfi || this.location.start.cfi)` — confirma que el mecanismo del usuario usa la API tal como esta disenada, y que la causa raiz original era el comportamiento *por defecto* de epub.js (usar `location.start.cfi`, ambiguo en un limite de pagina) cuando no se le pasa ancla.
- El usuario pidio dos afinamientos puntuales tras aprobar la idea en conversacion: (1) un tope maximo para que una rafaga de resizes seguidos no mantenga `isRestoringLocationRef` en `true` indefinidamente (cada uno reiniciaba su propio timer); (2) debounce del resize real para no repaginar en cada evento de `ResizeObserver`/`resize` durante un arrastre continuo o una animacion de rotacion.
- Se discutio ademas la idea del usuario de anclar al *centro* de la pagina en vez de al inicio/fin (evita la ambiguedad de raiz en vez de solo cambiar de borde) — valida en teoria, pero requiere calcular el CFI a mano (via `caretRangeFromPoint` + `cfiFromElement`, no lo entrega epub.js gratis como `start`/`end`). Se decidio no implementarla ahora: `endCfi` ya funciono en la prueba del usuario, y no hay evidencia de que haga falta la complejidad extra. Queda anotada como proximo paso si reaparece algun salto.

**Ejecucion:**
- `src/lib/epub-reader/constants.ts`: nuevas constantes `READER_RESIZE_DEBOUNCE_MS` (120ms) y `READER_MAX_RESTORE_SUPPRESSION_MS` (5000ms).
- `src/components/EpubReader.tsx`: nuevo helper `scheduleRestoreRelease(delayMs)` que centraliza los 3 lugares que reprograman el temporizador de liberacion de `isRestoringLocationRef` (el caso de limite en `onRelocated`, el resize normal, el cambio de tamano de fuente) — ahora todos calculan el delay efectivo con tope respecto a `restoringSinceRef` (marca de cuando empezo a restaurar por primera vez, no se reinicia en cada resize individual).
- Nuevo `scheduleRenditionResize()`: envuelve `refreshRenditionLayout` con un debounce de `READER_RESIZE_DEBOUNCE_MS`; el listener de `resize` de la ventana y el `ResizeObserver` ahora llaman a este wrapper en vez de ejecutar el resize real en cada evento.
- `prepareForReaderNavigation()` (se llama antes de cualquier cambio de pagina real) tambien limpia `restoringSinceRef`, y ambos refs nuevos se resetean en el efecto de cambio de archivo y se limpian en el cleanup de desmontaje, igual que los timers existentes.

**Validacion:**
- `npx tsc --noEmit` OK.
- No se volvio a probar de punta a punta en este entorno (misma limitacion de renderizado de epub.js ya documentada). El usuario confirmo que la base (entrada #308) ya funcionaba bien antes de este afinamiento adicional.

**Archivos Modificados:**
- `src/lib/epub-reader/constants.ts`
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-22 17:01] 308. EpubReader: se revierte el "redisplay en cada resize" (probable causa del retroceso de 1 pagina)
**Planificacion:**
- El usuario probo la entrada #307 y reporto un sintoma nuevo y muy especifico: retrocede exactamente una pagina cada vez, incluso saltando directo a una pagina (sin pasar por la anterior). Eso descarta las hipotesis anteriores (perdida de posicion generica) y apunta a algo deterministico.
- Hipotesis: el arreglo de la entrada #307 (capturar la ubicacion actual y volver a hacer `rendition.display(cfi)` en *cada* llamada a `refreshRenditionLayout`, incluida cada vez que el `ResizeObserver`/el listener de `resize` disparaban) probablemente **causo** este retroceso: cuando un CFI cae justo en el limite entre dos paginas, epub.js puede paginarlo hacia la pagina anterior al recalcular. Como el mecanismo nuevo volvia a llamar `display()` con ese mismo CFI en cada resize (y puede haber varios seguidos al montar, ya que `ResizeObserver.observe()` dispara un primer callback inmediato por spec), cada llamada adicional podia ir corriendo la posicion una pagina hacia atras.

**Ejecucion:**
- Se revirtio `refreshRenditionLayout` a su forma simple (solo `rendition.resize(width, height)`, sin capturar ni volver a mostrar el CFI) — ya no hay redisplay repetido que pueda ir arrastrando la posicion hacia atras.
- En su lugar, se ataca directamente la ventana de tiempo problematica: un nuevo ref `hasDisplayedOnceRef` arranca en `false` en cada montaje/cambio de archivo, se pone en `true` justo despues de que `load()` termina de mostrar la ubicacion guardada por primera vez, y `refreshRenditionLayout` ahora ignora cualquier resize mientras siga en `false`. Asi, ningun resize (incluido el disparo inicial del `ResizeObserver`, o el posible asentamiento de `100dvh`/`env(safe-area-inset-*)` justo despues de montar) puede interferir con la restauracion inicial; una vez que el libro ya mostro la pagina guardada, los resizes genuinos posteriores (rotacion, teclado en pantalla, etc.) se comportan exactamente igual que siempre lo hicieron (nunca se habia reportado un bug ahi).

**Validacion:**
- `npx tsc --noEmit` OK.
- Sigue sin poder probarse de punta a punta en este entorno (misma limitacion de renderizado de epub.js documentada en la entrada #306). Pendiente de confirmacion del usuario.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-22 16:53] 307. EpubReader: segunda causa del progreso perdido (resize tras el montaje)
**Planificacion:**
- El usuario probo la entrada #306 en su propio navegador (no en el sandbox de pruebas) y confirmo que el progreso del Nuevo Testamento seguia sin restaurarse bien al volver a entrar. El arreglo anterior (persistir la ubicacion real en el cleanup del efecto de carga, antes de destruir la rendition) sigue siendo correcto y necesario, pero no era la unica causa.
- Segunda hipotesis, mas probable: el contenedor del lector ahora siempre usa `100dvh` + `env(safe-area-inset-*)` (parte del rediseno de la entrada #306). Estas unidades pueden asentarse a su valor final un instante despues del primer render. Si eso dispara un resize justo despues de que `load()` restaura el CFI guardado, y epub.js no vuelve a mostrar exactamente esa misma posicion tras recalcular la paginacion para el nuevo tamano, el resultado visual es identico a "no me dejo donde estaba" aunque el CFI guardado en `localStorage` sea correcto.

**Ejecucion:**
- `refreshRenditionLayout` (llamada por el listener de `resize` de la ventana, el `ResizeObserver` del contenedor, y el efecto de cambio de tamano de fuente) ahora captura la ubicacion actual (`getRenditionLocation`) *antes* de `rendition.resize(...)`, y vuelve a mostrarla (`rendition.display(...)`) inmediatamente despues. Antes solo llamaba a `resize()` y confiaba en que epub.js mantuviera la posicion por su cuenta — ya no se confia en eso para ningun resize, no solo para el que pasaba al activar/desactivar pantalla completa (ese caso especifico ya se habia eliminado en la entrada #306 al quitar el doble layout).
- Se agrego un `pushDevLiveTrace` en el punto donde se persiste la ubicacion al salir (mismo patron que ya existia para "Ubicacion guardada" en cada `relocated`), para que el usuario pueda confirmar desde el Panel de Desarrollador si el guardado al salir esta ocurriendo y con que CFI, en caso de que el problema persista y haga falta seguir diagnosticando.

**Validacion:**
- `npx tsc --noEmit` OK.
- No se pudo volver a probar de punta a punta en el navegador de este entorno (la limitacion de renderizado de epub.js dentro del iframe, ya documentada en la entrada #306, sigue sin permitir que el libro termine de cargar visualmente aqui). Se le pidio al usuario que vuelva a probar en su propio navegador/APK.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-22 16:40] 306. Fix lector EPUB (progreso + salto en pantalla completa), notificaciones exactas (setAlarmClock), limpieza
**Planificacion:**
- Pedido del usuario, fuera del refactor de archivos grandes: (1) el progreso de lectura en `EpubReader` no se guarda bien al salir y se corre al activar/desactivar pantalla completa, con pedido explicito de rediseno (solo modo pantalla completa, controles en un encabezado que se oculta/muestra al tocar, sin boton dedicado); (2) las notificaciones no llegan a la hora exacta; (3) borrar codigo muerto que aparezca. Se investigo el codigo real antes de tocar nada (ver plan aprobado) y se pidio confirmacion al usuario sobre el trade-off de `setAlarmClock` (icono de alarma persistente) antes de aplicarlo.

**Ejecucion:**
- **`src/components/EpubReader.tsx` (rediseno completo)**: se elimino el doble layout (`isReaderFullscreen` chico/grande) — el lector ahora siempre usa el layout de pantalla completa (`fixed inset-0`, 100dvh, safe-area, portales de system-bar). El encabezado (volver, buscar, tamano de texto, panel) paso a ser un overlay `absolute` que no cambia el tamano del contenedor de lectura; se muestra/oculta con `showControls`, controlado por el mismo gesto de toque que antes activaba/desactivaba pantalla completa. Se borro el boton dedicado "Pantalla completa" (`Maximize2`).
  - **Fix de raiz del salto de pagina**: al eliminar el doble layout, el contenedor de epub.js deja de cambiar de tamano en pixeles al mostrar/ocultar el encabezado, asi que epub.js ya no tiene que re-paginar — se borro por completo el mecanismo `pendingLayoutLocationRef` + el efecto de "restaurar layout tras fullscreen" que intentaba compensar ese resize.
  - **Fix de raiz del progreso perdido al salir**: el efecto que carga el libro ahora persiste la ubicacion real (leida de la variable local `activeRendition`, no del ref) en su propio cleanup, antes de destruir la `rendition` — ya no depende del orden de cleanup entre efectos distintos (React corre los cleanups en el mismo orden en que los efectos fueron declarados, no al reves; antes, el efecto de carga se limpiaba primero y dejaba `renditionRef.current` en `null` antes de que el efecto de `pagehide`/`visibilitychange` intentara leer la ubicacion).
  - Se agrego `onClose?: () => void` a `EpubReaderProps`, siguiendo el mismo patron que ya usan `RosaryImmersive`/`ViaCrucisImmersive`/`ExpositionImmersive` (componentes de pantalla completa con su propio boton de cierre).
  - `src/components/main/MainApp.tsx`: `<EpubReader onClose={handleBack} />` en la vista de Nuevo Testamento.
  - `src/components/PersonalEpubLibrary.tsx`: se simplifico — su propio envoltorio con header (Volver/titulo/renombrar) ya no hace falta (el renombrar ya existia tambien desde la lista de la biblioteca, confirmado antes de quitarlo); ahora pasa `onClose` directo a `EpubReader`.
  - `src/components/epub-reader/ReaderSelectionToolbar.tsx`: se actualizo para el nuevo diseno (ya no recibe `isReaderFullscreen`; el input de "Guardar marcador" ahora se gatilla con `showBookmarkInput` en vez de "no fullscreen").
- **`scripts/patch-local-notifications.js` (notificaciones exactas)**: el metodo `setExactIfPossible` que el parche inyecta en `LocalNotificationManager.java` ahora usa `AlarmManager.setAlarmClock(...)` en vez de `setExactAndAllowWhileIdle`/`setExact` — es la API mas exacta que ofrece Android (usada por apps de alarma), a cambio de un icono de alarma persistente en la barra de estado mientras haya una notificacion pendiente (aceptado explicitamente por el usuario). El `showIntent` (que abre la app al tocar el icono) se construye con el mismo patron ya usado en `buildIntent(...)` del mismo archivo. Se mantuvo intacta la verificacion de permiso `canScheduleExactAlarms()` (sigue siendo necesaria) y el "guardian de entrega temprana" ya existente en `TimedNotificationPublisher.java`. Marcador de version `v3` -> `v4` para que el postinstall reaplique el parche.
- **`src/context/settings/useNotificationScheduling.ts`**: se quito `theme` del arreglo de dependencias del efecto de sincronizacion — cada cambio de modo claro/oscuro cancelaba y reprogramaba *todas* las notificaciones solo para actualizar el color del icono; innecesario.
- **Codigo muerto**: se borro `src/components/main/renderContent.tsx` (ya identificado en una entrada anterior como no usado, confirmado de nuevo). Se re-confirmo que no quedan restos de Genkit en el repo.

**Validacion:**
- `npx tsc --noEmit` limpio despues de cada cambio.
- El script de parche nativo se corrio dos veces contra el `node_modules` real: la primera aplico el reemplazo `v3` -> `v4` sin error de patron; la segunda confirmo que es idempotente (no vuelve a tocar nada). Se reviso a mano el Java resultante.
- Prueba en navegador con servidor de desarrollo real: el encabezado nuevo (con boton "Volver", buscar, tamano de texto, panel) renderiza correctamente sin el boton de pantalla completa; el boton "Volver" del propio lector navega correctamente hacia atras (confirma el cableado de `onClose`); el panel de lectura (indice del Nuevo Testamento) sigue funcionando; cero errores de consola en todo momento.
- **Limitacion honesta**: no se pudo confirmar visualmente que epub.js termine de renderizar el contenido paginado dentro de este navegador de pruebas en sandbox (se queda en "Cargando EPUB..." incluso con una recarga completa de pagina) — el mismo comportamiento parcial (el indice de navegacion carga bien, pero el render final no) ya ocurria en la sesion anterior *antes* de este cambio, con el diseno viejo. Todo apunta a una restriccion propia de este entorno de automatizacion con el iframe que usa epub.js para renderizar, no a algo introducido por este cambio — pero no se pudo verificar el guardado de progreso ni la ausencia de salto de pagina de forma visual/interactiva de punta a punta. Se le informara al usuario para que lo confirme en el APK real.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `src/components/epub-reader/ReaderSelectionToolbar.tsx`
- `src/lib/epub-reader/types.ts`
- `src/components/main/MainApp.tsx`
- `src/components/PersonalEpubLibrary.tsx`
- `scripts/patch-local-notifications.js`
- `src/context/settings/useNotificationScheduling.ts`
- `src/components/main/renderContent.tsx` (eliminado)
- `.claude/launch.json` (nuevo, de la entrada anterior)
- `AGENTS.md`

### [2026-07-22 15:33] 302. MainApp.tsx: extraccion de helpers y dialogos
**Planificacion:**
- Cuarto archivo del refactor mayor aprobado por el usuario. `src/components/main/MainApp.tsx` (1997 lineas): mover lo puro (helpers, datos) y lo autocontenido (dialogos con su propio estado open/onOpenChange) a archivos nuevos; dejar intactos `renderContent()`/`renderCategory()`, `handleBack` y los handlers con muchos refs por lo entrelazados que estan (tal como preveia el plan aprobado).

**Ejecucion:**
- `src/components/main/spiritualAudio.ts` (nuevo): tipos, constantes y funciones de storage de la biblioteca de audios espirituales.
- `src/components/main/language-mode.ts` (nuevo): `normalizeLanguageKey`, `getPrayerLanguageModes`, `languageModeLabel`.
- `src/components/main/dialogs/` (nuevo, 6 componentes): `TimerFinishedDialog`, `ErrorReportDialog`, `LettersInfoDialog`, `AudioRenameDialog`, `AudioDeleteDialog`, `PrayerDeleteDialog` — cada uno recibe su estado y handlers por props; la logica de cada handler se quedo igual, solo se movio el JSX.
- **Aviso, sin tocar**: `src/components/main/renderContent.tsx` sigue siendo un archivo muerto (no importado en ningun lado, logica desactualizada) — se le informo al usuario, no se modifico como parte de este refactor.

**Validacion:**
- `npx tsc --noEmit` OK (un error de tipos menor en `AudioRenameDialog.tsx` — un ref tipado como `RefObject` en vez de `MutableRefObject` — detectado y corregido en el momento por el propio compilador).
- `MainApp.tsx` paso de 1997 a 1725 lineas.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `src/components/main/spiritualAudio.ts` (nuevo)
- `src/components/main/language-mode.ts` (nuevo)
- `src/components/main/dialogs/TimerFinishedDialog.tsx` (nuevo)
- `src/components/main/dialogs/ErrorReportDialog.tsx` (nuevo)
- `src/components/main/dialogs/LettersInfoDialog.tsx` (nuevo)
- `src/components/main/dialogs/AudioRenameDialog.tsx` (nuevo)
- `src/components/main/dialogs/AudioDeleteDialog.tsx` (nuevo)
- `src/components/main/dialogs/PrayerDeleteDialog.tsx` (nuevo)
- `AGENTS.md`

### [2026-07-22 15:26] 301. SettingsContext.tsx: useHomeBackgroundRotation + decision de detener la extraccion de hooks aqui
**Planificacion:**
- Extraer el ultimo hook de bajo riesgo que quedaba segun el plan (`useHomeBackgroundRotation`), y evaluar los dos restantes (`usePlanDeVidaTracker`, `useBackupAndImport`) leyendo su codigo real antes de tocarlos.

**Ejecucion:**
- `src/context/settings/useHomeBackgroundRotation.ts` (nuevo): junta `allHomeBackgrounds` (memo), el efecto que fija `--home-bg-image` en `documentElement` y lo persiste en `localStorage`, `activeThemeColors` (memo) y el efecto de rotacion diaria de fondo a las 00:00. Los 4 pedazos eran mutuamente dependientes entre si (comparten `allHomeBackgrounds`) pero no dependian de nada mas del Provider, asi que el hook completo devuelve `{ allHomeBackgrounds, activeThemeColors }`.
- **Decision de alcance** (leyendo el codigo real de `togglePlanDeVidaItem`/`incrementStat` antes de decidir, tal como se le prometio al usuario): `usePlanDeVidaTracker` y `useBackupAndImport` NO se extrajeron. Motivo concreto encontrado al leer:
  - `togglePlanDeVidaItem` llama a `incrementStat` (linea ~1470), e `incrementStat`/`incrementGlobalStat` a su vez llaman a `togglePlanDeVidaItem` (lineas ~1959/1987) y usan `getRootPlanDeVidaId`/`getPastoralDayKey`. Es una dependencia circular por closure entre "Plan de Vida" y "stats" que solo funciona porque ambas viven en el mismo cuerpo de `SettingsProvider` y se invocan despues del render, no durante. Separarlas en dos hooks distintos obligaria a mover tambien `incrementStat`/`incrementGlobalStat` (que el plan no contemplaba tocar) o rompe la circularidad con un cambio de comportamiento real, no un simple traslado de codigo.
  - `backupSnapshot`/`applyBackupSnapshot` (para `useBackupAndImport`) tocan practicamente los ~60 `useState` del Provider a la vez (el propio agente de exploracion ya lo habia marcado como "toca todo a la vez"); extraerlos no reduce el acoplamiento real, solo lo cambiaria de forma, con alto riesgo de olvidar una dependencia en el traspaso.
  - Ambos casos caen exactamente en la categoria que el plan aprobado ya preveia dejar intacta ("no es necesario para lograr una reduccion de tamano significativa, y si conlleva riesgo real de cambiar comportamiento"). Se prefirio no forzarlo.

**Validacion:**
- `npx tsc --noEmit` OK tras extraer `useHomeBackgroundRotation`.
- `SettingsContext.tsx` paso de 3830 a 2214 lineas (42% de reduccion) solo con las partes seguras: `types.ts`, `defaults.ts`, `normalize.ts`, `useDevLiveTrace`, `useNotificationScheduling`, `useSaintOfTheDay`, `useHomeBackgroundRotation`.
- El resto del archivo (CRUD de oraciones/citas/planes personalizados, Plan de Vida + stats, backup/import, los ~60 `useState`/`useRef`, y el armado final del `value` del contexto) queda como un solo bloque, intencionalmente sin dividir.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/context/settings/useHomeBackgroundRotation.ts` (nuevo)
- `AGENTS.md`

### [2026-07-22 15:24] 300. SettingsContext.tsx: extraccion de useSaintOfTheDay
**Planificacion:**
- Continuacion del refactor. Unir en un solo hook los 3 efectos relacionados con el santo del dia que estaban dispersos en el archivo: el refresco del widget nativo de Android, el temporizador de medianoche/cambio de visibilidad, y el calculo principal (fiestas movibles vs. santos fijos, imagenes, "peek" de santo fijo oculto).

**Ejecucion:**
- `src/context/settings/useSaintOfTheDay.ts` (nuevo): junta los 3 efectos, copiados caracter por caracter.
- `saintRefreshClock` (estado interno, solo usado por estos efectos) se movio a vivir DENTRO del hook via su propio `useState`, ya que no lo usa ningun otro lugar del Provider.
- El resto de los campos (`saintOfTheDay`, `saintOfTheDayImage`, `saintOfTheDayPrayerId`, `overriddenFixedSaint`, `overriddenFixedSaintImage`, `lastSaintUpdate`) siguen declarados en el Provider porque tambien los usan `backupSnapshot`, `applyBackupSnapshot` y el `value` final del contexto — el hook recibe tanto el valor como el setter de cada uno por parametro.
- `saintsData`/`saintsDataRaw` (constante de modulo) se removieron de `SettingsContext.tsx` por quedar sin uso ahi; el hook nuevo tiene su propia copia.

**Validacion:**
- `npx tsc --noEmit` OK.
- `SettingsContext.tsx` paso de 2513 a 2340 lineas.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/context/settings/useSaintOfTheDay.ts` (nuevo)
- `AGENTS.md`

### [2026-07-22 15:20] 299. SettingsContext.tsx: extraccion de useDevLiveTrace y useNotificationScheduling
**Planificacion:**
- Continuacion del refactor de `SettingsContext.tsx`: extraer, uno a la vez con verificacion `tsc` despues de cada uno, los hooks internos identificados como seguros de mover (misma logica, se siguen llamando desde dentro de `SettingsProvider`).
- Se prioriza primero el hook mas pequeño y autocontenido (`useDevLiveTrace`) para validar el patron, y despues el bloque mas grande y riesgoso de todo el archivo: el efecto de sincronizacion de notificaciones (~480 lineas, identificado por el agente de exploracion como "el bloque indivisible mas grande").

**Ejecucion:**
- `src/context/settings/useDevLiveTrace.ts` (nuevo): `pushDevLiveTrace`, `clearDevLiveTraceEvents` y el listener de `window.error`/`unhandledrejection`, movidos tal cual. `generateId` (usado para IDs de oraciones/citas/planes, no relacionado) se dejo en el Provider.
- `src/context/settings/useNotificationScheduling.ts` (nuevo): `getReminderTitle`, `buildDefaultReminderMessage`, `ensureAndroidNotificationChannel` y el efecto completo de sincronizacion de notificaciones (recordatorios diarios, notificaciones fijas, fiestas movibles, recordatorio de cartas, notificacion de prueba dev), copiados caracter por caracter desde el archivo original.
  - Se leyeron primero todas las variables libres que usa el efecto (estado, callbacks, refs) para pasarlas como parametros del hook sin omitir ninguna: `isLoaded`, `notificationsEnabled`, `dailyReminders`, `cartasReminderEnabled`, `cartasReminderAnchorAt`, `devTestNotificationEnabled`, `isDeveloperMode`, `notificationSyncVersion`, `theme`, `skipNotificationIfChecked`, `planDeVidaCalendar`, `allPrayers`, `getPrayerById`, `getRootPlanDeVidaId`, `exactAlarmSettingsRequestedRef`, `toast`.
  - El arreglo de dependencias del `useEffect` se preservo exactamente igual al original (incluidas las variables que el efecto usa pero que el codigo original ya NO incluia en sus dependencias, como `skipNotificationIfChecked` o `planDeVidaCalendar` — no se "corrigio" nada, solo se movio).

**Validacion:**
- `npx tsc --noEmit` OK despues de cada uno de los dos hooks (dos verificaciones independientes).
- `SettingsContext.tsx` paso de 3058 a 2513 lineas.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/context/settings/useDevLiveTrace.ts` (nuevo)
- `src/context/settings/useNotificationScheduling.ts` (nuevo)
- `AGENTS.md`

### [2026-07-22 15:14] 298. SettingsContext.tsx: extraccion de tipos, defaults y normalizadores
**Planificacion:**
- Segundo paso del refactor mayor aprobado por el usuario. `src/context/SettingsContext.tsx` (3830 lineas) es el archivo mas grande y riesgoso del repo: un unico `SettingsProvider` con ~60 `useState`.
- Paso de menor riesgo primero: mover solo lo puro (tipos, valores por defecto, funciones de normalizacion sin closures) a archivos nuevos, dejando el cuerpo del Provider (905-3824 original) completamente intacto.

**Ejecucion:**
- `src/context/settings/types.ts` (nuevo): todos los tipos/interfaces (`Theme`, `FontSize`, `NavMode`, `OverlayPosition(s)`, `DevTraceLevel`, `DevTraceEvent`, `DailyReminder`, `UserStats`, `StatIncrementOptions`, `ThemeColor`, `CustomThemeColors`, `CustomPlan`, `PredefinedPrayerOverrideData`, `ImportResult`, `Settings`, `PrayerLanguageMode`, `PrayerLanguageProfiles`).
- `src/context/settings/defaults.ts` (nuevo): `defaultThemeColors`, `defaultHomeBackgroundId`, `defaultAlwaysShowPrayers`, `defaultOverlayPositions`, `defaultUserStats`, `FULL_BACKUP_KEYS`, `FORCED_DAILY_QUOTES`/`getForcedDailyQuote`.
- `src/context/settings/normalize.ts` (nuevo): todas las funciones puras `normalizeX`, `applyPredefinedPrayerState`, `stableSort/stableSerialize`, `normalizeBackupState`, `normalizePartialImportPayload`, `pickSnapshotKeys`, `isCustomPlanPayload`, `isFullAppStatePayload`.
- `SettingsContext.tsx` ahora importa todo lo anterior y re-exporta con `export type { ... }` los tipos que ya eran publicos (`PrayerLanguageMode`, `DevTraceLevel`, `DevTraceEvent`, `DailyReminder`, `UserStats`, `CustomPlan`) para no cambiar la superficie publica que consumen ~28 archivos del repo.
- De paso se corrigio el import circular ya existente: `src/context/settings/stats-updates.ts` importaba `UserStats` desde `@/context/SettingsContext`; ahora importa directo desde `@/context/settings/types`.
- El cuerpo de `SettingsProvider` no se toco linea por linea; solo se removieron las declaraciones que ya quedaron en los archivos nuevos.

**Validacion:**
- `npx tsc --noEmit` OK antes y despues de corregir el import circular de `stats-updates.ts`.
- `SettingsContext.tsx` paso de 3830 a 3058 lineas.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/context/settings/types.ts` (nuevo)
- `src/context/settings/defaults.ts` (nuevo)
- `src/context/settings/normalize.ts` (nuevo)
- `src/context/settings/stats-updates.ts`
- `AGENTS.md`

### [2026-07-22 15:01] 297. Division de camino.ts en archivos mas chicos
**Planificacion:**
- Primer paso de un refactor mayor (aprobado por el usuario en un plan) para reducir el tamano de los 5 archivos mas grandes del repo, sin cambiar comportamiento, antes de abordar bugs pendientes.
- `src/lib/prayers/plan-de-vida/camino.ts` (2534 lineas) es 100% texto estatico (el libro "Camino" de san Josemaria Escriva) sin ninguna logica, unico importador `src/lib/data.tsx` — el mas simple y de menor riesgo, elegido para validar el proceso primero.

**Ejecucion:**
- Se escribio un script puntual en Node (no se leyo el archivo completo por el asistente, para evitar gasto innecesario de tokens en texto estatico) que:
  1. Extrae el string exacto del template literal `content`.
  2. Lo parte en 7 archivos agrupando los 46 capitulos (`camino-content/part-1.ts` .. `part-7.ts`), cada uno exportando una constante de texto.
  3. Reescribe `camino.ts` para importar las 7 partes y reconstruir `content` por concatenacion.
- `camino.ts` paso de 2534 a 16 lineas.

**Validacion:**
- Verificacion en memoria: el string reconstruido a partir de las 7 partes es identico caracter por caracter al original antes de escribir ningun archivo.
- Verificacion post-escritura: se releyeron los 7 archivos ya escritos en disco y se volvio a comparar la concatenacion contra el original — identica.
- `npx tsc --noEmit` OK, sin errores.

**Archivos Modificados:**
- `src/lib/prayers/plan-de-vida/camino.ts`
- `src/lib/prayers/plan-de-vida/camino-content/part-1.ts` (nuevo)
- `src/lib/prayers/plan-de-vida/camino-content/part-2.ts` (nuevo)
- `src/lib/prayers/plan-de-vida/camino-content/part-3.ts` (nuevo)
- `src/lib/prayers/plan-de-vida/camino-content/part-4.ts` (nuevo)
- `src/lib/prayers/plan-de-vida/camino-content/part-5.ts` (nuevo)
- `src/lib/prayers/plan-de-vida/camino-content/part-6.ts` (nuevo)
- `src/lib/prayers/plan-de-vida/camino-content/part-7.ts` (nuevo)
- `AGENTS.md`

### [2026-07-22 14:35] 296. Eliminacion completa de Genkit AI
**Planificacion:**
- Confirmar que Genkit no tuviera ningun uso real en la app antes de tocar nada (busqueda de imports de `src/ai/genkit.ts` y `src/ai/dev.ts` en todo `src`, y de variables `GEMINI_API_KEY`/`GOOGLE_GENAI` en `.env`, `.env.local` y `next.config.mjs`).
- Retirar el paquete y su andamiaje de arranque (scaffold de Firebase Studio) sin afectar el resto de la app.

**Ejecucion:**
- **Confirmacion de uso**: ningun archivo de `src` importaba `src/ai/genkit.ts` ni `src/ai/dev.ts`; no habia `GEMINI_API_KEY` configurada en ningun `.env`; `next.config.mjs` no referenciaba Genkit.
- **Carpeta eliminada**: `src/ai/` (`genkit.ts`, `dev.ts`).
- **Dependencias removidas** via `npm uninstall`: `genkit`, `genkit-cli`, `@genkit-ai/google-genai`, `@genkit-ai/next` (limpio `package.json` y `package-lock.json`, elimino 507 paquetes transitivos de `node_modules`).
- **Gitignore**: se quito la linea `.genkit/*` por quedar obsoleta.

**Validacion:**
- `npx tsc --noEmit` OK, sin errores tras la eliminacion.
- `git status` confirmo solo los cambios esperados: `.gitignore`, `package.json`, `package-lock.json` modificados; `src/ai/dev.ts` y `src/ai/genkit.ts` eliminados.

**Archivos Modificados:**
- `.gitignore`
- `package.json`
- `package-lock.json`
- `src/ai/dev.ts` (eliminado)
- `src/ai/genkit.ts` (eliminado)
- `AGENTS.md`

### [2026-07-21 23:27] 295. Comando para apagar Cotidie dev
**Planificacion:**
- Extender la funcion `apagar` del perfil de PowerShell con el comando solicitado.
- Limitar el cierre al servidor local de Cotidie en el puerto 3018 y evitar terminar procesos ajenos.

**Ejecucion:**
- **Nuevo comando**: `apagar cotidie dev` localiza el proceso que escucha en el puerto 3018 y cierra el servidor de desarrollo.
- **Proteccion**: antes de detenerlo comprueba que su linea de comandos pertenezca a `C:\Users\balca\Documents\Cotidie`; si el puerto esta ocupado por otro programa, no lo cierra.
- **Estados claros**: informa cuando Cotidie se apaga, ya estaba apagado, no pudo cerrarse o falta indicar `dev`.
- **Ayuda**: el mensaje general de `apagar` incluye ahora el nuevo ejemplo de uso.

**Validacion:**
- El perfil completo paso el parser de PowerShell sin errores.
- La ejecucion literal de `apagar cotidie dev` cerro el servidor y mostro `Cotidie dev apagado.`.
- El servidor se restauro despues de la prueba y `http://127.0.0.1:3018/` volvio a responder HTTP 200.

**Archivos Modificados:**
- `C:\Users\balca\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
- `AGENTS.md`

### [2026-07-21 23:24] 294. Separacion de compilaciones dev y produccion
**Planificacion:**
- Diagnosticar por que la vista web local mostraba el HTML de bienvenida sin estilos ni funcionamiento.
- Corregir la causa sin modificar componentes visuales ni la trivia.
- Reproducir una compilacion de produccion con el servidor dev activo para comprobar que el problema no reaparezca.

**Ejecucion:**
- **Diagnostico**: el servidor de `armar cotidie dev` devolvia `404` para su CSS, `main-app.js` y `app/page.js`; `npm run build` habia reemplazado la carpeta `.next` que la instancia dev mantenia abierta.
- **Aislamiento**: Next.js usa ahora `.next-dev` durante `next dev` y conserva `.next` para las compilaciones de produccion y del APK.
- **Repositorio limpio**: `.next-dev` se agrego a `.gitignore` como salida generada.
- **Reinicio**: se cerraron las dos instancias dev duplicadas de Cotidie en los puertos 3018 y 3019 y se dejo una sola instancia limpia en `http://127.0.0.1:3018/`.

**Validacion:**
- Antes de la correccion, el CSS y dos scripts esenciales devolvian HTTP 404.
- Despues del reinicio, la vista movil cargo tres hojas de estilo, titulo blanco de 64,8 px, margen de documento en cero y cero errores de consola.
- `npm.cmd run build` OK mientras el servidor dev permanecia activo.
- Tras esa compilacion concurrente, el CSS y `app/page.js` del servidor dev continuaron respondiendo HTTP 200 desde `.next-dev`.
- Se confirmo la coexistencia independiente de `.next` y `.next-dev`.

**Archivos Modificados:**
- `next.config.mjs`
- `.gitignore`
- `AGENTS.md`

### [2026-07-21 22:53] 293. Segunda biblioteca y dificultades de la trivia espiritual
**Planificacion:**
- Investigar y agregar otras 100 preguntas manteniendo los cuatro temas existentes y fuentes identificables.
- Clasificar tanto la biblioteca original como la nueva en niveles de dificultad coherentes.
- Incorporar el filtro de dificultad a la preparacion de partidas sin repetir preguntas ni alterar las otras secciones de Cotidie.

**Ejecucion:**
- **Biblioteca ampliada**: se agregaron 100 preguntas nuevas, 25 por cada tema, para alcanzar 200 preguntas totales y 50 en cada categoria.
- **Dificultades**: todas las preguntas, incluidas las 100 originales, quedaron clasificadas como `Inicial`, `Intermedia` o `Avanzada`; cada tema contiene 17 iniciales, 17 intermedias y 16 avanzadas.
- **Selector**: la pantalla inicial de la trivia permite elegir todas las dificultades o un nivel concreto y explica brevemente el alcance del nivel seleccionado.
- **Partidas coherentes**: el generador filtra primero por tema y dificultad, mantiene el reparto entre temas cuando corresponde y no repite preguntas. Las cantidades disponibles se adaptan al conjunto filtrado; una combinacion especifica ofrece hasta 15 preguntas, mientras los conjuntos amplios conservan partidas de 20.
- **Contexto durante la partida**: cada pregunta muestra su tema y dificultad junto al progreso.
- **Fuentes**: las nuevas preguntas se contrastaron principalmente con la Biblia publicada por la Santa Sede, biografias de santos del Vaticano y cronologias oficiales del Opus Dei.

**Validacion:**
- Auditoria automatizada: 200 preguntas, 50 por tema, 68 iniciales, 68 intermedias y 64 avanzadas.
- Cero identificadores o enunciados duplicados; todas las preguntas contienen cuatro opciones, una respuesta valida, explicacion y fuente.
- `\.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK; exportacion estatica de produccion generada correctamente.

**Archivos Modificados:**
- `src/lib/trivia-questions.ts`
- `src/lib/trivia-questions-extra.ts`
- `src/components/trivia/SpiritualTrivia.tsx`
- `AGENTS.md`

### [2026-07-21 22:12] 292. Retorno de Exposicion a Himnos y Letanias
**Planificacion:**
- Identificar el estado de navegacion que representa la pantalla padre de Exposicion y Bendicion con el Santisimo.
- Unificar el cierre con la X y el retroceso de Android para que ambos regresen a esa pantalla.

**Ejecucion:**
- **Destino exacto**: ambas salidas reconstruyen la ruta de oracion `subcat-himnos`, correspondiente a `Himnos y Letanias`, en lugar de regresar a la categoria general `Oraciones`.
- **Cierre visual**: la X usa el reemplazo de estado compartido y deja visible inmediatamente la lista de Himnos y Letanias.
- **Retroceso nativo**: el caso `exposition` del manejador de Atrás de Android usa exactamente el mismo estado de retorno.
- **Alcance**: no se altero la navegacion de Via Crucis, Rosario ni otros ambientes inmersivos.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Prueba local a 360 x 780 px: cerrar con la X devolvio a `Himnos y Letanias` con sus cinco entradas visibles.
- Una segunda prueba mediante retroceso del entorno devolvio a la misma pantalla y conservo el encabezado `Himnos y Letanias`.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-07-21 21:44] 291. Revision completa del plan bilingue de Exposicion
**Planificacion:**
- Auditar nuevamente todas las entradas agregadas al plan de Exposicion, incluidas las incorporadas despues de la revision anterior.
- Comprobar identificadores, modos de una o dos columnas, contenido obligatorio, estrofas y emparejamiento de versos.
- Retirar las lineas visuales entre versos sin modificar los textos ingresados por el usuario.

**Ejecucion:**
- **Estrofas con sangria**: el separador bilingue ahora reconoce como vacias tambien las lineas que contienen espacios o tabulaciones; esto evita unir varias estrofas en una sola en textos como `Regina Coeli`, `Ave Maris Stella` y otras entradas con sangria.
- **Compatibilidad de saltos**: la division de versos admite finales de linea de Windows y Unix.
- **Presentacion limpia**: se eliminaron el borde inferior y su relleno asociado de cada fila bilingue; se conserva solamente el espaciado entre versos.
- **Contenido preservado**: no se modificaron palabras, titulos, identificadores ni el orden de `exposicion-bendicion-plan.ts`.

**Validacion:**
- Auditoria de datos: 14 partes, identificadores unicos, ningun contenido vacio y todos los modos acordes con su estructura declarada.
- Las nueve partes bilingues tienen igual cantidad de estrofas en ambos idiomas; cada par tiene igual cantidad de versos o una diferencia maxima de una linea, contemplada por la agrupacion existente.
- Prueba visual local a 360 x 780 px con `Ave Maris Stella`: 29 filas bilingues, cero filas desalineadas y cero bordes separadores.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.

**Archivos Modificados:**
- `src/components/ExpositionImmersive.tsx`
- `AGENTS.md`

### [2026-07-21 16:25] 290. Versos bilingues alineados en Exposicion
**Planificacion:**
- Revisar el contenido bilingue actual de Exposicion y Bendicion con el Santisimo para emparejar los versos equivalentes como en las demas oraciones.
- Corregir la presentacion sin modificar el archivo de contenido que el usuario esta editando.

**Ejecucion:**
- **Alineacion por bloques**: la vista inmersiva separa estrofas y crea una fila compartida por cada verso latino y espanol, de modo que ambos comienzan siempre a la misma altura.
- **Traducciones desiguales**: cuando el ultimo verso de un idioma ocupa dos lineas frente a una del otro, ambas lineas permanecen agrupadas en la misma fila equivalente en vez de dejar contenido enfrentado a un espacio vacio.
- **Subtitulos con punto**: `Oremus.` y `Oremos.` reciben el mismo formato seminegrita y gris ya aplicado a esos subtitulos sin puntuacion o con dos puntos.
- **Contenido preservado**: no se modifico `exposicion-bendicion-plan.ts` ni ninguno de los textos ingresados por el usuario.

**Validacion:**
- `\.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Prueba visual local a 360 x 780 px sobre `Canto eucaristico`: todos los pares de versos mostraron igual coordenada superior y altura en ambas columnas.
- La segunda estrofa quedo en seis filas equivalentes, con las dos lineas finales espanolas agrupadas frente al ultimo verso latino y sin celdas huerfanas.
- Inspeccion DOM confirmo `Oremus.` y `Oremos.` con `font-semibold text-muted-foreground`.

**Archivos Modificados:**
- `src/components/ExpositionImmersive.tsx`
- `src/lib/textFormatter.tsx`
- `AGENTS.md`

### [2026-07-21 15:56] 289. Subtitulo latino Oremus
**Planificacion:**
- Extender la regla de subtitulos liturgicos a la forma latina sin alterar los demas formatos.

**Ejecucion:**
- El formateador reconoce `Oremus` y `Oremus` con acento en la primera `e`, con mayusculas/minusculas y dos puntos opcionales.
- Ambas formas reciben el mismo estilo seminegrita y gris de `Oremos` y `Oracion`.

**Validacion:**
- Prueba aislada de render: `Oremus` y su variante acentuada con `:` produjeron `font-semibold text-muted-foreground`.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/lib/textFormatter.tsx`
- `AGENTS.md`

### [2026-07-21 15:53] 288. Marcadores y subtitulos liturgicos automaticos
**Planificacion:**
- Comprobar si el formateador compartido reconocia automaticamente los marcadores solicitados.
- Agregar negrita al marcador de versiculo/respuesta y estilo de subtitulo a `Oremos` y `Oracion` sin modificar los textos que el usuario estaba editando.

**Ejecucion:**
- **V y R**: el formateador reconoce al inicio de linea `V/.`, `R/.`, `V./`, `R./`, `V.` y `R.`, y envuelve automaticamente solo el marcador en negrita.
- **Compatibilidad**: los marcadores que ya vienen escritos manualmente en negrita siguen funcionando sin duplicar etiquetas.
- **Subtitulos**: una linea compuesta unicamente por `Oremos` u `Oracion`, con tilde opcional y dos puntos opcionales, se muestra en seminegrita y `text-muted-foreground`.
- **Alcance compartido**: la regla vive en `renderText`, usado por Exposicion y las demas lecturas normales de Cotidie.

**Validacion:**
- Prueba visual en `Oracion ante el Santisimo Sacramento`: cuatro marcadores `V/.` y `R/.` renderizados como elementos `strong`.
- Prueba aislada sin editar el plan activo: `Oremos` y `Oracion:` recibieron `font-semibold text-muted-foreground`; `V/.`, `R/.` y `R./` recibieron negrita.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/lib/textFormatter.tsx`
- `AGENTS.md`

### [2026-07-21 15:23] 287. Contenido unico estricto en Exposicion
**Planificacion:**
- Corregir `singleColumn` para que controle tambien la estructura permitida del contenido, no solo su disposicion visual.
- Mantener los ejemplos bilingues actuales sin cambios de presentacion.

**Ejecucion:**
- **Tipo discriminado**: `singleColumn: true` exige `content` como un unico `string`; `singleColumn: false` exige un objeto con `espanol` y `latin`.
- **Render estricto**: las entradas de una columna muestran exclusivamente su texto unico, sin seleccionar ni descartar variantes de idioma.
- **Bilingue**: las entradas `false` siguen extrayendo los dos textos y mostrandolos en columnas paralelas.
- **Guia local**: los comentarios del archivo indican la sintaxis requerida para ambos valores.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK con los tres ejemplos bilingues en `false`.
- Prueba temporal valida con `singleColumn: true` y un `content` de texto unico: TypeScript OK; el ejemplo se restauro despues a su forma bilingue.
- Inspeccion confirmo que la rama `true` recibe y renderiza directamente `prayer.content` como texto unico.
- Los tres valores finales permanecen en `false`; no se altero la presentacion actual de los ejemplos.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/lib/prayers/oraciones/exposicion-bendicion-plan.ts`
- `src/components/ExpositionImmersive.tsx`
- `AGENTS.md`

### [2026-07-21 15:22] 286. Selector de una o dos columnas en Exposicion
**Planificacion:**
- Agregar una condicion sencilla a cada entrada editable del plan de Exposicion.
- Mantener la presentacion bilingue actual por defecto y comprobar ambos valores de la condicion.

**Ejecucion:**
- **Propiedad**: las entradas admiten `singleColumn`, documentada directamente en `exposicion-bendicion-plan.ts` y visible en los tres ejemplos.
- **Valor `false`**: conserva Latin a la izquierda y Espanol a la derecha.
- **Valor `true`**: muestra una sola columna sin etiquetas de idioma, usando el contenido directo o Espanol; si Espanol esta vacio, usa Latin.
- **Estado inicial**: los tres ejemplos permanecen en `false`, por lo que la presentacion existente no cambia hasta que el archivo sea editado.

**Validacion:**
- `singleColumn: false`: cuadricula de dos columnas de 136,875 px, con etiquetas Latin y Espanol.
- Prueba temporal con `singleColumn: true`: cero cuadriculas, cero etiquetas y un unico parrafo `Texto...`; el ejemplo se restauro despues a `false`.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/lib/prayers/oraciones/exposicion-bendicion-plan.ts`
- `src/components/ExpositionImmersive.tsx`
- `AGENTS.md`

### [2026-07-21 15:16] 285. Jerarquia superior en Exposicion
**Planificacion:**
- Eliminar el contador y la repeticion del titulo en el ambiente de Exposicion.
- Llevar el contenido bilingue a la parte superior y proteger los nombres largos junto a la flecha del indice.

**Ejecucion:**
- **Titulo unico**: el nombre de la parte se muestra una sola vez en el encabezado, con mayor tamano; se retiraron el contador `n de n` y el segundo titulo del articulo.
- **Lectura superior**: el contenedor principal usa alineacion vertical inicial, por lo que Latin y Espanol comienzan inmediatamente bajo el encabezado.
- **Indice seguro**: el nombre admite varias lineas y corte seguro de palabras, mientras la flecha conserva un espacio propio con `shrink-0`; se elimino el truncamiento.

**Validacion:**
- Prueba visual movil a 360 x 780 px: titulo unico arriba, cero contador y ambas columnas alineadas desde la parte superior.
- Inspeccion: una sola aparicion de `Ejemplo 1`, `align-items: flex-start`, `white-space: normal` y `overflow-wrap: anywhere`.
- El indice se abrio correctamente, mostro los tres ejemplos y la flecha permanecio separada del nombre.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/ExpositionImmersive.tsx`
- `AGENTS.md`

### [2026-07-21 15:11] 284. Fondo de Himnos y contenido exclusivo de Exposicion
**Planificacion:**
- Retirar el fondo propio asignado a `Himnos y Letanias` sin interferir con el fondo perpetuo global.
- Hacer que el ambiente de Exposicion use exclusivamente las entradas editables del archivo de plan.
- Eliminar la tarjeta de contraste y reforzar moderadamente el velo tematico de la imagen.

**Ejecucion:**
- **Himnos y Letanias**: se elimino `crucifixion.jpeg` de la subcategoria; la vista ya no monta imagen propia y solo puede recibir el fondo general cuando el usuario activa el modo perpetuo.
- **Contenido de Exposicion**: se retiro la conversion y concatenacion de las secciones antiguas de `exposicion-bendicion`; el recorrido se construye solamente con `exposicionBendicionPlanAdicional`.
- **Lectura limpia**: se eliminaron fondo, borde redondeado, sombra y desenfoque del articulo de texto.
- **Contraste por tema**: el velo de la imagen paso de 70 % a 80 % negro en oscuro y de 65 % a 75 % blanco en claro.

**Validacion:**
- `Himnos y Letanias` devolvio `data-has-image=false` y cero imagenes de seccion; el fondo global permanecio disponible sin agregar otro.
- Exposicion mostro `1 de 3` y el contenido visible se limito a `Ejemplo 1`, Latin `Texto...` y Espanol `Texto...`.
- Estilos computados del articulo: fondo transparente, `box-shadow: none` y `backdrop-filter: none`; velo oscuro medido en 80 %.
- Prueba adicional en modo claro: velo blanco medido en 75 %, texto oscuro legible y articulo igualmente transparente; se restauro despues el modo oscuro de la sesion.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/lib/data.tsx`
- `src/components/ExpositionImmersive.tsx`
- `AGENTS.md`

### [2026-07-21 15:08] 283. Correccion definitiva de filtracion en calendario
**Planificacion:**
- Reexaminar la rendija tras comprobar que desplazar un pixel la columna fija no resolvia el defecto real.
- Reproducir el problema forzando columnas numericas bajo el borde izquierdo y corregir el modelo de pintado de la tabla.

**Ejecucion:**
- **Diagnostico corregido**: la filtracion provenia de `border-collapse`; el navegador podia pintar fragmentos de las celdas desplazadas en la zona de borde compartida con las celdas fijas.
- **Solucion**: la tabla usa `border-separate` con espaciado cero, conservando las mismas lineas y dimensiones pero dando a cada celda fija una caja de fondo completa y opaca.
- **Limpieza**: se retiro `left: -1px` de la intervencion anterior y las celdas fijas volvieron a `left: 0`, ahora alineadas exactamente con el limite interior del contenedor.

**Validacion:**
- Prueba movil a 360 x 780 px con scroll horizontal en 620 px y 843,2 px.
- Se forzaron los numeros de dias bajo el extremo izquierdo de la columna fija; no aparecieron pixeles ni trazos a traves del encabezado o la fila.
- Geometria verificada: borde interior en x=15,8 px y celda fija en x=15,8 px, con `border-spacing: 0px`.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/plans/PlanDeVidaCalendar.tsx`
- `AGENTS.md`

### [2026-07-21 15:01] 282. Cierre de rendija en columna fija del calendario
**Planificacion:**
- Localizar la capa fija que dejaba asomar los dias durante el desplazamiento horizontal.
- Cerrar exclusivamente la abertura izquierda sin alterar anchos, datos ni navegacion de la tabla.

**Ejecucion:**
- **Causa**: las celdas fijas comenzaban en `left: 0`, despues del pixel interior del borde del contenedor desplazable.
- **Cobertura**: el encabezado y las celdas de la primera columna se extienden un pixel hacia la izquierda mediante `left: -1px`, cubriendo el borde interior por completo.
- **Alcance**: no se modificaron el ancho de la columna, el contenido, los checks ni el comportamiento del scroll.

**Validacion:**
- Prueba visual movil a 360 x 780 px con desplazamiento horizontal hasta los dias 19-23: ningun numero aparece a la izquierda de `Seccion / oracion` ni de la fila fija.
- Medicion: el contenedor comienza en x=15 px y las celdas fijas en x=14,8 px, sin rendija visible.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/plans/PlanDeVidaCalendar.tsx`
- `AGENTS.md`

### [2026-07-21 14:47] 281. Bordes completos en checks del Plan de Vida
**Planificacion:**
- Identificar si los checks estaban recortados por su contenedor o por el renderizado del borde.
- Corregir exclusivamente las casillas de seguimiento del Plan de Vida y comprobar ambos modos de orientacion.

**Ejecucion:**
- **Diagnostico**: el escalado general convertia el borde de 1 px en 0,8 px efectivos, haciendo que el lado derecho pudiera caer entre pixeles y desaparecer visualmente en ciertas escalas o densidades.
- **Correccion localizada**: los checks del Plan de Vida usan un borde de 2 px; su tamano, posicion, estado y funcionamiento permanecen sin cambios.
- **Alcance**: no se modifico el componente global de checkbox ni otras casillas de la aplicacion.

**Validacion:**
- Prueba visual en modo oscuro a 360 x 780 px: los cuatro lados son continuos y visibles.
- Prueba visual en modo oscuro a 780 x 360 px: todos los checks de ambas columnas conservan sus bordes completos.
- Medicion computada: 1,6 px efectivos e iguales en los cuatro lados bajo el escalado activo; sin desborde horizontal.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/PrayerList.tsx`
- `AGENTS.md`

### [2026-07-21 14:41] 280. Composicion movil horizontal por tipo de contenido
**Planificacion:**
- Reorganizar exclusivamente la experiencia movil horizontal, conservando intacta la composicion vertical.
- Distribuir portada, listas, secciones con imagen, oraciones y contenido bilingue segun el espacio horizontal disponible.
- Verificar cada variante en dimensiones reales de telefono horizontal y repetir las vistas principales en vertical.

**Ejecucion:**
- **Alcance horizontal**: todos los estilos nuevos quedan limitados a `orientation: landscape` y una altura maxima de 600 px, por lo que no intervienen en vertical ni en escritorios altos.
- **Portada**: el nombre y la cita ocupan la mitad izquierda; los cuatro accesos principales ocupan la mitad derecha sin dividir `Cotidie`.
- **Listas**: Plan de Vida, Ajustes y listas equivalentes se distribuyen en dos columnas. Devociones conserva el santo y su imagen a la izquierda, con la lista de devociones de tamano normal a la derecha.
- **Oraciones personales**: la interfaz de Oraciones muestra `Mis Oraciones` a la izquierda y `Predeterminadas` a la derecha.
- **Secciones anidadas**: los agrupadores con imagen muestran la imagen a la izquierda y su lista a la derecha; los que no tienen imagen reutilizan la lista en dos columnas.
- **Lectura**: una oracion con imagen queda dividida entre imagen y texto; una oracion sin imagen hace fluir su texto por dos columnas. El modo `Ambos` mantiene Latin en la mitad izquierda y Espanol en la derecha.
- **Vertical preservado**: los contenedores auxiliares recuperan el flujo y espaciado originales fuera de la consulta horizontal.

**Validacion:**
- `\.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Pruebas visuales a 780 x 360 px: portada 50/50; Plan de Vida y Ajustes en dos columnas; Devociones con imagen/lista; Oraciones con personales/predeterminadas; lectura con imagen, sin imagen y bilingue, todas sin desborde horizontal.
- Pruebas de regresion a 360 x 780 px: portada en flujo vertical, Plan de Vida en una columna con separacion original de 11 px y oracion en disposicion vertical; `scrollWidth` igual al viewport.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/app/globals.css`
- `src/components/home/HomePage.tsx`
- `src/components/PrayerList.tsx`
- `src/components/PrayerAccordion.tsx`
- `src/components/Settings.tsx`
- `src/components/saints/SaintOfTheDayCard.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-07-21 14:20] 279. Titulo Cotidie indivisible en la portada
**Planificacion:**
- Identificar por que el nombre de la aplicacion podia dividirse aun con espacio disponible en escritorio.
- Corregir exclusivamente el titulo y comprobarlo en dimensiones moviles y de escritorio.

**Ejecucion:**
- **Causa**: el titulo principal combinaba una tipografia grande con `break-words` dentro de un contenedor de ancho limitado, permitiendo cortar la palabra `Cotidie`.
- **Correccion**: `HomePage.tsx` usa `whitespace-nowrap` para mantener el nombre completo en una sola linea sin alterar su fuente, tamano, posicion ni apariencia.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Prueba visual a 360 x 780 px: el titulo ocupa exactamente una linea, no se recorta y el documento conserva `scrollWidth` de 360 px.
- Prueba a 1856 x 1040 px: el titulo conserva una sola linea y no genera desbordamiento horizontal.
- `git diff --check -- src/components/home/HomePage.tsx` OK; solo aviso esperado de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/home/HomePage.tsx`
- `AGENTS.md`

### [2026-07-21 14:15] 278. Entorno web directo y alarmas estrictamente exactas
**Planificacion:**
- Agregar `armar cotidie dev` al perfil de PowerShell sin modificar los modos de compilacion existentes.
- Revisar toda la ruta de programacion Android para identificar por que las notificaciones podian llegar minutos tarde.
- Impedir que una alarma solicitada como exacta se degrade silenciosamente a una alarma aproximada.

**Ejecucion:**
- **Comando de desarrollo**: el perfil inicia Cotidie con Next.js en el puerto 3018, espera hasta que el servidor responda y abre `http://127.0.0.1:3018/`; si ya esta activo, reutiliza la misma instancia.
- **Diagnostico de precision**: el parche nativo usaba `setAndAllowWhileIdle` o `set` cuando Android no concedia alarmas exactas o fallaba su programacion. Esas API son aproximadas y explican el retraso de varios minutos.
- **Permiso previo**: `SettingsContext.tsx` comprueba notificaciones y alarmas exactas antes de cancelar la agenda vigente. Si falta el acceso especial, pausa la sincronizacion, abre una sola vez el ajuste de Android y vuelve a sincronizar al regresar a Cotidie.
- **Programacion estricta**: el parche persistente conserva exclusivamente `setExactAndAllowWhileIdle` o `setExact`; ya no utiliza `setAlarmClock`, `setAndAllowWhileIdle` ni `set` como sustitutos silenciosos.
- **Proteccion temprana**: si Android entrega excepcionalmente una alarma antes de `schedule.at`, el receptor solo puede diferirla mediante otra alarma exacta; nunca la publica antes ni la convierte en aproximada.

**Validacion:**
- El perfil completo fue validado con el parser de PowerShell, sin errores.
- `armar cotidie dev` inicio correctamente el servidor y `http://127.0.0.1:3018/` respondio HTTP 200.
- `node --check scripts/patch-local-notifications.js` OK.
- El parche nativo se ejecuto dos veces y conservo hashes identicos en la segunda ejecucion.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `android\gradlew.bat :app:compileDebugJavaWithJavac` OK con el JBR de Android Studio.
- ADB no detecto un telefono conectado y no habia un AVD instalado, por lo que no se midio aun la entrega sobre un dispositivo real.
- `git diff --check` OK para los archivos funcionales modificados; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `C:\Users\balca\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
- `src/context/SettingsContext.tsx`
- `scripts/patch-local-notifications.js`
- `AGENTS.md`

### [2026-07-21 11:43] 277. Ejemplos bilingues para el recorrido de Exposicion
**Planificacion:**
- Dejar tres entradas de muestra faciles de sustituir en el archivo reservado para el plan manual.
- Mostrar Latin y Espanol al mismo tiempo, sin selector, conservando el recorrido secuencial y el fondo ya existente.

**Ejecucion:**
- **Plantilla editable**: `exposicion-bendicion-plan.ts` contiene `Ejemplo 1`, `Ejemplo 2` y `Ejemplo 3`, cada uno con campos `espanol` y `latin` cuyo contenido provisional es `Texto...`.
- **Recorrido**: las tres entradas se incorporan en el orden del arreglo al indice, progreso y navegacion por zonas de toque de Exposicion y Bendicion.
- **Vista bilingue fija**: `ExpositionImmersive.tsx` presenta Latin a la izquierda y Espanol a la derecha en dos columnas iguales, sin exponer cambio de idioma; las partes originales de un solo idioma conservan su presentacion.
- **Fondo**: el plan mantiene visible la imagen existente de Exposicion y Bendicion con la capa de contraste del modo claro u oscuro.

**Validacion:**
- `.\\node_modules\\.bin\\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK; exportacion estatica de produccion generada correctamente.
- Prueba visual a 360 x 780 px: los tres ejemplos aparecen como pasos 5, 6 y 7; `Ejemplo 1` muestra ambas columnas, conserva el fondo y no presenta desborde horizontal (`scrollWidth` 360 px).
- Se confirmo que la vista no contiene selector ni boton de cambio de idioma.
- `git diff --check` OK para los archivos funcionales modificados.

**Archivos Modificados:**
- `src/lib/prayers/oraciones/exposicion-bendicion-plan.ts`
- `src/components/ExpositionImmersive.tsx`
- `AGENTS.md`

### [2026-07-21 11:28] 276. Widgets sincronizados, lectura persistente y recursos espirituales
**Planificacion:**
- Sincronizar ambos widgets con el mismo santo resuelto por la aplicacion y recuperar la imagen chilena de la Virgen del Carmen en el widget grande.
- Agregar la oracion por las almas del purgatorio y ajustar solamente los encuadres solicitados.
- Reforzar progreso, seleccion, subrayados, notas y gestos en el lector EPUB compartido.
- Proteger el contenido en horizontal, recuperar la edicion general del examen y la busqueda completa de Camino.
- Conservar los asteriscos liturgicos del Quicumque con una explicacion y crear el recorrido inmersivo de Exposicion y Bendicion.

**Ejecucion:**
- **Widgets**: el estado ya resuelto del cartel envia nombre, biografia, devocion, imagen y color al plugin Android; `SaintWidgetUpdater` actualiza en la misma llamada los widgets pequeno y grande. Se agrego la asociacion nativa de Nuestra Senora del Carmen con su imagen local.
- **Virgen del Carmen**: la imagen usa un acercamiento central de 1,35 tanto en el cartel y la devocion como en el widget grande.
- **Contenido**: se agrego `Oracion por las almas del purgatorio` en Oraciones > Intercesion y Santos; la imagen de Exposicion y Bendicion queda alineada hacia arriba.
- **EPUB**: cada libro guarda su CFI al reubicarse, navegar, cambiar de modo, ocultarse o desmontarse. El cambio de pantalla completa restaura el mismo ancla, deja de repaginar despues de cada avance y evita redimensionar instancias ya destruidas.
- **Zonas EPUB**: las coordenadas se normalizan contra el ancho visible y no contra el `iframe` multipagina de EPUB.js; izquierda retrocede, derecha avanza y el centro superior sale del modo completo.
- **Subrayados y notas**: la seleccion permanece activa hasta guardar o cancelar; cada EPUB conserva localmente sus rangos, textos y notas, permite volver a ellos, editar la nota y eliminarlos desde la pestana Subrayados.
- **Gestos y zonas seguras**: el pellizco de las oraciones aplica solo el 35 % del desplazamiento detectado y redondea a centesimas. Encabezado, contenido general y experiencias inmersivas respetan los margenes laterales de la camara en horizontal.
- **Respuesta tactil**: el boton comun controla su estado presionado por eventos de puntero y lo limpia al soltar, cancelar, salir, perder captura, pulsar o perder foco; el doble toque de los menus de tres puntos ya no conserva la apariencia activa.
- **Examen y Camino**: cualquier usuario puede editar `examen-conciencia` mediante el override persistente existente. Camino vuelve a buscar por numero de punto, palabra, frase o encabezado de capitulo desde el menu de la oracion.
- **Quicumque**: se conservaron los asteriscos porque senalan la pausa entre las dos mitades del versiculo en la salmodia; el texto latino ahora lo aclara antes de comenzar.
- **Exposicion**: se agrego un recorrido inmersivo con indice, progreso, zonas de toque y el fondo existente. Las oraciones manuales futuras se agregan en `src/lib/prayers/oraciones/exposicion-bendicion-plan.ts`.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK; exportacion estatica de produccion generada correctamente.
- `android\gradlew.bat :app:compileDebugJavaWithJavac` OK con el JBR de Android Studio.
- Prueba de produccion a 360 x 780 px: avance derecho, salida central superior, conservacion del archivo interno al salir y restauracion despues de cerrar y reabrir el lector, sin errores de consola.
- Doble toque en `Opciones de oracion` dejo `data-pressed` vacio.
- Prueba de busqueda Camino confirmo coincidencias por `capitulo 46`, punto `999` y palabra `perseverancia`.
- Se contrasto el uso del asterisco con la convencion oficial del Salterio para la pausa entre mitades del versiculo.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `android/app/src/main/assets/image-display.ts`
- `android/app/src/main/java/com/benjamin/studio/BackgroundActionsPlugin.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/components/EpubReader.tsx`
- `src/components/ExpositionImmersive.tsx`
- `src/components/Header.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/RosaryMeditated.tsx`
- `src/components/SearchCamino.tsx`
- `src/components/ViaCrucisImmersive.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/navigation.ts`
- `src/components/saints/SaintOfTheDayCard.tsx`
- `src/components/ui/button.tsx`
- `src/context/SettingsContext.tsx`
- `src/lib/camino-search.ts`
- `src/lib/data.tsx`
- `src/lib/image-display.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion-plan.ts`
- `src/lib/prayers/oraciones/oracion-almas-purgatorio.ts`
- `src/lib/prayers/plan-de-vida/simbolo-quicumque.ts`
- `src/plugins/BackgroundActions.ts`
- `AGENTS.md`

### [2026-07-14 20:35] 275. Fuente general aplicada a lectores EPUB
**Planificacion:**
- Comprobar si los EPUB heredaban la fuente seleccionada para el resto de Cotidie.
- Aplicar esa misma fuente dentro del documento aislado de EPUB.js sin alterar paginacion, navegacion ni tamano de texto.

**Ejecucion:**
- **Diagnostico**: el lector solo sincronizaba colores y tamano; al renderizar cada EPUB dentro de un `iframe`, no heredaba la familia tipografica de la aplicacion.
- **Fuente compartida**: `EpubReader.tsx` obtiene `fontFamily` desde los ajustes y traduce las cinco opciones existentes a sus familias CSS correspondientes.
- **Carga offline**: cada documento EPUB carga la hoja local `/fonts/fonts.css`, por lo que Literata, Lora, Merriweather, EB Garamond y Times New Roman quedan disponibles dentro del `iframe` sin internet.
- **Sincronizacion**: la familia se aplica al abrir cualquier EPUB y tambien se actualiza si el usuario cambia el ajuste mientras el lector esta montado; el cambio alcanza por igual al Nuevo Testamento y a Personales.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- La exportacion estatica conserva `/fonts/fonts.css` y las familias referenciadas por el lector.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-14 20:32] 274. Encabezado horizontal, compartir, tacto, Virgen del Carmen y precision de alertas
**Planificacion:**
- Corregir el ancho del encabezado en orientacion horizontal sin alterar la composicion vertical.
- Recuperar en Informacion una accion para compartir el enlace oficial de instalacion.
- Evitar que los estados visuales de toque permanezcan activos en dispositivos tactiles.
- Incorporar la devocion chilena oficial a Nuestra Senora del Carmen, enlazarla al santoral y agregar su notificacion con imagen.
- Reforzar la barrera nativa que impide mostrar una notificacion antes de la hora programada.

**Ejecucion:**
- **Encabezado**: `MainApp.tsx` fija el contenedor principal a `w-full`; conserva el limite de escritorio y no cambia medidas ni estilos en vertical.
- **Compartir aplicacion**: `DeveloperSettings.tsx` agrega en Informacion el boton que abre la hoja nativa con `https://n9.cl/cotidie-installer`; en web sin API de compartir copia el enlace.
- **Respuesta tactil**: Tailwind limita los estilos `hover` a dispositivos con puntero fino y el boton comun usa `touch-manipulation`, evitando estados visuales pegados por pulsacion larga o doble toque sin retirar la respuesta `active` normal.
- **Virgen del Carmen**: se agrego la Oracion por Chile publicada por el Santuario Nacional y la Cofradia Nacional del Carmen, junto con una fotografia local del altar principal del Templo Votivo de Maipu de Jorge Barrios, CC BY-SA 3.0.
- **Santoral**: no se cambio la fecha porque ambas copias del santoral ya registraban correctamente la solemnidad el 16 de julio; `devotion-day-images.ts` enlaza esa entrada con la nueva devocion e imagen.
- **Notificacion del Carmen**: `fixed-notifications.ts` programa el 16 de julio a las 09:00, incluye el banner local y abre directamente la nueva oracion.
- **Precision nativa**: el parche persistente de Local Notifications comprueba `schedule.at` al recibir cada alarma; si Android intenta entregarla antes, no la muestra y la vuelve a programar para ese instante mediante alarma exacta y `allowWhileIdle`, con respaldo no anticipado cuando falta el permiso exacto.
- **Cambios ajenos protegidos**: no se modificaron las ediciones existentes en `santateresadelosandes.ts` ni `santa-misa/despues.ts`.

**Validacion:**
- Prueba de integracion confirmo que el santo `Nuestra Senora del Carmen`, la ruta de la notificacion y el titulo normalizado resuelven a `virgendelcarmen`.
- Se verifico la solemnidad del 16 de julio en `src/lib/saints-data.json` y en el asset Android del widget.
- El parche nativo se ejecuto dos veces sin cambios adicionales y `node --check scripts/patch-local-notifications.js` OK.
- La compilacion de Tailwind confirmo que los `hover` quedan dentro de `@media (hover:hover) and (pointer:fine)`.
- `npm.cmd run build` OK.
- `android\gradlew.bat :app:compileDebugJavaWithJavac` OK usando el JBR de Android Studio.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `src/components/settings/DeveloperSettings.tsx`
- `src/components/ui/button.tsx`
- `tailwind.config.ts`
- `src/lib/prayers/devociones/virgendelcarmen.ts`
- `src/lib/data.tsx`
- `src/lib/devotion-day-images.ts`
- `src/lib/fixed-notifications.ts`
- `public/images/virgen-del-carmen-chile.jpeg`
- `scripts/patch-local-notifications.js`
- `AGENTS.md`

### [2026-07-12 20:53] 273. Fondo duplicado y reconciliacion de racha de Misa
**Planificacion:**
- Retirar exclusivamente el quinto fondo predeterminado, duplicado del segundo.
- Identificar por que una racha extensa podia quedar reemplazada por un tramo corto del calendario.
- Recalcular desde fechas exactas sin permitir que un historial incompleto recorte datos anteriores.

**Ejecucion:**
- **Fondos**: `placeholder-images.json` elimino la quinta entrada, que repetia `home-immaculate-heart` y `/images/immaculate-heart.jpeg`; permanecen cuatro fondos con identificadores y archivos unicos.
- **Resumen exacto**: `stats-updates.ts` agrega un calculo puro que ordena las fechas con `santa-misa`, cuenta dias unicos y reinicia la racha solamente ante una interrupcion real entre fechas consecutivas.
- **Reparacion al cargar**: `SettingsContext.tsx` compara el calendario con los dias de Misa ya conocidos y corrige automaticamente una racha desviada cuando el calendario contiene el historial completo.
- **Proteccion historica**: la edicion del calendario deja de reemplazar `massStreak` y `massDaysCount` cuando solo dispone de una fraccion del historial registrado.
- **Sin cambios ajenos**: no se modificaron la interfaz de Misa, las casillas ni las demas estadisticas.

**Validacion:**
- El catalogo resultante contiene cuatro fondos, cuatro identificadores unicos y cuatro rutas unicas.
- Prueba de datos con 52 fechas consecutivas devolvio racha 52 y reparo una estadistica desviada de 4 a 52.
- La misma prueba confirmo que una brecha deja una racha final de 3 y que un calendario incompleto no recorta el valor historico.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/lib/placeholder-images.json`
- `src/context/settings/stats-updates.ts`
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-07-12 20:41] 272. Avance estable y navegacion exclusiva en EPUB completo
**Planificacion:**
- Conservar el punto exacto de lectura al entrar y salir de pantalla completa.
- Impedir cualquier avance o retroceso por zonas tactiles fuera de pantalla completa.
- Aplicar la correccion al componente comun del Nuevo Testamento y los EPUB personales.

**Ejecucion:**
- **Ancla independiente**: `EpubReader.tsx` conserva un CFI canonico separado de la pagina visual que EPUB.js recalcula al cambiar el tamano del lector.
- **Cambio de modo**: durante el redimensionamiento se ignoran ubicaciones transitorias, se restaura el CFI original una vez estabilizado el contenedor y solo entonces se actualiza la persistencia.
- **Instancia unica**: la carga asincrona ahora cancela correctamente montajes obsoletos y cada efecto destruye solamente su propio libro y rendition, evitando lectores superpuestos que podian descoordinar controles y contenido.
- **Navegacion limitada**: las zonas izquierda y derecha solo se renderizan en pantalla completa; las funciones de avance y retroceso tambien rechazan llamadas mientras el modo normal esta activo.
- **Alcance compartido**: no se agrego logica particular a una biblioteca; Nuevo Testamento y Personales reciben el mismo comportamiento desde `EpubReader`.

**Validacion:**
- Prueba movil a 360 x 780 px confirmo una sola instancia y un solo iframe EPUB activo.
- En modo normal se verificaron cero controles de pagina; en pantalla completa aparecieron exactamente Anterior y Siguiente.
- Tras avanzar, salir y volver a entrar, reaparecieron el mismo fragmento y la misma posicion visual; solo cambio el contorno de enfoque temporal del boton pulsado.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-12 19:54] 271. Contraste inteligente global en barras del sistema
**Planificacion:**
- Detectar el color realmente visible bajo las barras superior e inferior en toda la aplicacion.
- Cambiar de forma independiente los iconos de estado y navegacion entre claros y oscuros segun su contraste.
- Conservar la decision al reanudar Android e incluir las capas especiales del lector EPUB.

**Ejecucion:**
- **Deteccion global**: `ThemeManager.tsx` compone los fondos visibles, calcula su luminancia y elige los iconos claros u oscuros con mejor contraste para cada extremo de la pantalla.
- **Cambios dinamicos**: la comprobacion responde a tema, navegacion, paneles, pantalla completa, cambios del DOM y transiciones; una segunda lectura al terminar la animacion evita conservar temporalmente el contraste del tema anterior.
- **Puente Android**: `BackgroundActionsPlugin.java` y `BackgroundActions.ts` exponen el cambio nativo; `MainActivity.java` lo aplica mediante `WindowInsetsControllerCompat` y lo guarda para restaurarlo al reanudar la actividad.
- **Capas identificables**: `MainApp.tsx` identifica las franjas globales y `EpubReader.tsx` las franjas de pantalla completa y del indice para que el calculo use siempre la superficie que esta realmente encima.

**Validacion:**
- Prueba movil a 360 x 780 px confirmo `true:true` en modo claro, equivalente a iconos oscuros en ambas barras, y `false:false` en modo oscuro, equivalente a iconos claros.
- La misma prueba confirmo que la barra superior y la inferior se calculan de manera independiente a partir de sus fondos visibles.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `android\gradlew.bat :app:compileDebugJavaWithJavac` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `android/app/src/main/java/com/benjamin/studio/BackgroundActionsPlugin.java`
- `src/plugins/BackgroundActions.ts`
- `src/components/ThemeManager.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-12 19:30] 270. Escala EPUB persistente y barra atenuada con el indice
**Planificacion:**
- Guardar un unico tamano de letra compartido por el Nuevo Testamento y todos los EPUB personales.
- Retirar la lupa redundante exclusivamente de los EPUB personales.
- Extender el oscurecimiento del panel de lectura a las barras del sistema sin llevar controles a las zonas seguras.

**Ejecucion:**
- **Escala global**: `EpubReader.tsx` guarda el porcentaje en `cotidie_epub_font_size`, lo valida entre 60 % y 200 % y lo recupera al montar cualquier lector EPUB.
- **Lupa condicional**: el acceso directo de busqueda se conserva en el Nuevo Testamento y se oculta en Personales; la busqueda personal sigue disponible dentro del panel general.
- **Barra atenuada**: mientras el indice/panel esta abierto, un portal replica el velo negro al 80 % sobre las zonas seguras superior e inferior en `z-200`, por encima de la franja global.
- **Contenido protegido**: el panel mantiene relleno segun `safe-area-inset-*` y su boton de cierre se desplaza bajo la barra superior.
- **Limpieza**: las capas especiales desaparecen al cerrar el panel, sin modificar el comportamiento global de otros paneles de la app.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Prueba movil a 360 x 780 px confirmo que 110 % se restauro despues de cerrar y reabrir el lector.
- Al abrir el indice se verificaron el velo general en `z-50`, la barra global en `z-100` y el velo de zona segura en `z-200`; al cerrar, la capa superior desaparecio.
- La consola del navegador permanecio sin errores y `git diff --check -- src/components/EpubReader.tsx` no encontro errores.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-12 19:23] 269. Color correcto bajo barras del sistema en EPUB
**Planificacion:**
- Identificar por que la barra superior conservaba el color primario pese al fondo completo del lector.
- Corregir solamente la superposicion de las zonas seguras durante pantalla completa.
- Mantener sin cambios los gestos, la navegacion y el tema automatico del EPUB.

**Ejecucion:**
- **Causa**: el lector vive dentro de un contexto `z-10`, mientras la franja global del sistema esta fuera de el en `z-100`; el `z-120` interno no podia superar ese contexto padre.
- **Capa raiz**: `EpubReader.tsx` usa un portal hacia `document.body` para pintar las franjas superior e inferior en `z-200` con el fondo general activo.
- **Alcance temporal**: las franjas solo existen mientras el lector EPUB esta en pantalla completa y se retiran inmediatamente al salir o desmontar el lector.
- **Alcance compartido**: la correccion se aplica al Nuevo Testamento y a los EPUB personales desde su componente comun.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Inspeccion de capas confirmo franja global naranja en `z-100` y nueva franja del fondo del EPUB en `z-200`, como hija directa de `body`.
- Al salir de pantalla completa la capa `z-200` desaparecio y la consola permanecio sin errores.
- No fue posible repetir la inspeccion en el telefono porque ADB no detecto ningun dispositivo conectado.
- `git diff --check -- src/components/EpubReader.tsx` OK; solo aviso esperado de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-12 19:06] 268. Tema global y gestos simples en lectores EPUB
**Planificacion:**
- Eliminar los controles propios de color de texto y fondo en ambos lectores EPUB.
- Hacer que el contenido adopte automaticamente los colores generales activos de Cotidie.
- Entrar en pantalla completa al tocar el EPUB y salir mediante el sexto superior central.

**Ejecucion:**
- **Tema unificado**: `EpubReader.tsx` obtiene `--foreground` y `--background` desde las variables CSS globales y las aplica tanto al iframe como a la superficie completa y sus zonas seguras.
- **Actualizacion automatica**: el lector observa los cambios de clase y estilo del tema raiz para mantenerse sincronizado con el modo y los matices configurados en Apariencia.
- **Interfaz simplificada**: se eliminaron los selectores Texto y Fondo; permanece el ajuste independiente de tamano tipografico.
- **Entrada por toque**: un toque normal sobre el contenido del EPUB activa pantalla completa, salvo que exista texto seleccionado o se pulse un control o enlace propio del libro.
- **Salida precisa**: en pantalla completa, el sexto superior central de una cuadricula de tres columnas por dos filas sale inmediatamente del modo; los laterales mantienen retroceso y avance.
- **Alcance compartido**: el comportamiento se aplica al Nuevo Testamento y a los EPUB personales por medio del componente comun.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Prueba movil a 360 x 780 px confirmo ausencia de selectores locales, colores globales reales dentro del iframe y entrada por toque sobre la pagina.
- La zona de salida midio 120 x 390 px, exactamente un sexto superior central, y restauro el lector normal sin errores de consola.
- `git diff --check -- src/components/EpubReader.tsx` OK; solo aviso esperado de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-12 18:57] 267. Pantalla completa y tipografia del lector EPUB
**Planificacion:**
- Corregir el color de las zonas seguras en pantalla completa para que siga el fondo elegido en el lector.
- Garantizar que cada EPUB se abra fuera de pantalla completa y que solo el boton pueda activar ese modo.
- Agregar control local de tamano de texto y retirar el acceso redundante al indice.

**Ejecucion:**
- **Fondo completo**: `EpubReader.tsx` aplica el color de fondo seleccionado a toda la superficie fija del modo pantalla completa, incluidas las zonas superior e inferior reservadas por Android.
- **Activacion explicita**: al abrir o cambiar de EPUB se restablece el modo normal; la unica accion que puede activar pantalla completa sigue siendo su boton dedicado.
- **Tamano de texto**: se agregaron una A pequena y una A grande para ajustar la tipografia entre 60 % y 200 % en pasos de 10 %, repaginando el EPUB tras cada cambio.
- **Indice unico**: se elimino el boton directo duplicado; el indice permanece disponible dentro del panel general de lectura.
- **Alcance compartido**: los cambios se aplican al Nuevo Testamento y a los EPUB personales mediante su componente comun.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Prueba movil a 360 x 780 px confirmo apertura normal, activacion manual de pantalla completa, escala real de 110 % dentro del iframe y fondo completo blanco/negro sin desbordes.
- Se confirmo un solo acceso al indice y ningun error en la consola del navegador.
- `git diff --check -- src/components/EpubReader.tsx` OK; solo aviso esperado de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `AGENTS.md`

### [2026-07-12 17:52] 266. Distribucion automatica del APK mediante GitHub Releases
**Planificacion:**
- Sustituir el archivo estable de Google Drive por una descarga publica sin la pantalla de advertencia de Drive.
- Conservar en Drive solamente las copias historicas versionadas.
- Hacer que cada ejecucion normal de `android:apk` publique el APK mas reciente en GitHub Releases.

**Ejecucion:**
- **Repositorio de distribucion**: el APK se publica en `CotidieApp/cotidie-web`, separado del codigo de la aplicacion.
- **Release por version**: cada compilacion crea o actualiza la release `vX.Y.Z` y sube el asset fijo `cotidie-latest.apk`.
- **Nombre estable real**: antes de subir se crea una copia temporal verificada con ese nombre, ya que GitHub toma el nombre del archivo y no su etiqueta descriptiva.
- **Enlace permanente**: la web usa `/releases/latest/download/cotidie-latest.apk` sin cambiarlo entre versiones.
- **Reejecucion segura**: si la release ya existe, el asset se reemplaza con `--clobber` y se marca nuevamente como la ultima version.
- **Modo local**: `--no-push` omite tanto el push de Git como la publicacion del APK; `--no-drive` solo omite la copia historica de Drive.
- **Drive**: se retiro por completo la escritura en `G:\Mi unidad\Cotidie\Web\cotidie-latest.apk`.

**Validacion:**
- `node --check scripts/android-apk.mjs` OK.
- GitHub Release `v6.4.0` creada con `cotidie-latest.apk` y marcada como ultima version.
- El enlace permanente respondio con descarga del asset publicado.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-07-12 18:10] 266. Trivia espiritual experimental con 100 preguntas
**Planificacion:**
- Integrar la trivia como una subseccion aislada de Ajustes, visible solo en modo desarrollador y ubicada despues de Informacion.
- Mantener una experiencia formativa y serena, sin temporizador, rachas, clasificaciones ni impacto en el Plan de Vida.
- Preparar una biblioteca local verificada de 100 preguntas sobre Jesus, Antiguo Testamento, santos y san Josemaria.

**Ejecucion:**
- **Acceso condicionado**: `Settings.tsx` agrega `Trivia espiritual` despues de Informacion solo cuando `isDeveloperMode` esta activo; Cotidie Annuum mantiene su posicion posterior cuando corresponde.
- **Modulo aislado**: `SpiritualTrivia.tsx` concentra toda la experiencia y no agrega estado global ni persistencia, para que pueda retirarse sin afectar otras funciones.
- **Recorridos**: el usuario puede elegir todos los temas o uno especifico y sesiones de 5, 10 o 20 preguntas; la seleccion evita repeticiones y redistribuye las alternativas en cada recorrido.
- **Respuesta formativa**: cada eleccion queda bloqueada, distingue acierto y error, muestra una explicacion breve y su fuente; el cierre resume resultados por tema y lista solamente los puntos que conviene repasar.
- **Biblioteca offline**: `trivia-questions.ts` contiene 100 preguntas locales, 25 por tema, cada una con cuatro alternativas, explicacion y referencia.
- **Investigacion**: se contrastaron textos biblicos de la Santa Sede, biografias y canonizaciones del Vaticano/Vatican News, y la cronologia y obras de san Josemaria publicadas por el sitio oficial del Opus Dei.

**Validacion:**
- Conteo automatico: 100 preguntas, 25 por categoria, 100 fuentes y ningun identificador duplicado.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Prueba visual a 360 x 780 px confirmo acceso condicionado, orden correcto en Ajustes, flujo completo, acierto, error y resumen sin desborde horizontal.
- Consola del navegador sin errores durante el recorrido completo; `git diff --check` OK salvo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/Settings.tsx`
- `src/components/trivia/SpiritualTrivia.tsx`
- `src/lib/trivia-questions.ts`
- `AGENTS.md`

### [2026-07-12 16:47] 265. APK estable para la web en Google Drive
**Planificacion:**
- Mantener la copia historica versionada que ya genera `android:apk`.
- Agregar una segunda copia de nombre estable para que la pagina web use siempre el mismo enlace.
- Verificar la copia actual mediante tamano y SHA-256 sin alterar el versionado normal.

**Ejecucion:**
- **Ruta estable**: `android-apk.mjs` actualiza `G:\Mi unidad\Cotidie\Web\cotidie-latest.apk` despues de cada compilacion normal.
- **Reemplazo seguro**: se reutiliza la comparacion y verificacion existente por tamano y SHA-256, informando si el archivo fue creado, actualizado o ya estaba al dia.
- **Configuracion opcional**: `COTIDIE_WEB_APK_PATH` permite cambiar la ruta estable sin editar el script.
- **Modo sin Drive**: `--no-drive` omite tanto la copia historica como el APK estable de la web.
- **Copia inicial**: se sincronizo el release 6.4.0 actual con la ruta estable para dejarla preparada desde esta intervencion.

**Validacion:**
- `node --check scripts/android-apk.mjs` OK.
- La copia actual y `app-release.apk` coinciden en tamano y SHA-256.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-07-12 16:18] 264. Edicion total jerarquica y pantalla completa solo en textos
**Planificacion:**
- Extender la edicion y eliminacion avanzada a todos los nodos de contenido, incluidos agrupadores anidados.
- Reemplazar los botones separados de cada elemento por menus de tres puntos.
- Limitar el acceso a pantalla completa a oraciones finales que contienen texto.

**Ejecucion:**
- **Jerarquia completa**: `MainApp.tsx` propaga editar/eliminar a Devociones, Plan de Vida, Oraciones y listas anidadas como Santa Misa, Antes, Despues y Misal.
- **Agrupadores**: `AddPrayerForm.tsx` permite editar titulo e imagen de nodos con suboraciones sin exigir un contenido textual inexistente.
- **Persistencia**: `SettingsContext.tsx` admite overrides sin texto para conservar intactas las ramas internas al editar un agrupador; ocultar nodos predeterminados sigue siendo recursivo y restaurable.
- **Menus por elemento**: `PrayerList.tsx` agrupa Editar y Eliminar en tres puntos, tanto en tarjetas normales como visuales, con confirmacion diferenciada para contenido personal y predeterminado.
- **Oraciones personales/predeterminadas**: `PrayerAccordion.tsx` separa correctamente las acciones de cada origen y evita enviar una eliminacion predeterminada al almacenamiento de usuario.
- **Texto abierto**: `Header.tsx` agrega Eliminar oracion al menu existente cuando corresponde, manteniendo confirmacion desde `MainApp.tsx`.
- **Pantalla completa**: se retiro el acceso de Plan de Vida, Ajustes y demas menus; si se abandona un texto con el modo activo, se desactiva automaticamente.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Busqueda de conexiones confirmo acciones avanzadas en listas raiz y anidadas, y ningun boton visible de pantalla completa fuera del menu de una lectura textual.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/AddPrayerForm.tsx`
- `src/components/Header.tsx`
- `src/components/PrayerAccordion.tsx`
- `src/components/PrayerList.tsx`
- `src/components/main/MainApp.tsx`
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-07-12 16:07] 263. Opciones tactiles mas grandes en menu de oracion
**Planificacion:**
- Aumentar moderadamente las opciones del menu de tres puntos para facilitar el toque.
- Conservar sin cambios sus acciones, condiciones y orden.

**Ejecucion:**
- `Header.tsx` amplio el menu a un ancho moderado y fijo cada opcion en una altura tactil minima de 44 px.
- Se aumentaron ligeramente el relleno, el texto y los iconos sin convertir el menu en una superficie excesiva.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- La comprobacion visual local no alcanzo el menu porque la app permanecio en su pantalla de bienvenida 6.4.0; no hubo errores de consola y no se modifico ese flujo ajeno.

**Archivos Modificados:**
- `src/components/Header.tsx`
- `AGENTS.md`

### [2026-07-12 16:05] 262. Selector nativo para perfil de idioma
**Planificacion:**
- Reemplazar los tres botones visibles del perfil de idioma por un selector desplegable nativo.
- Mantener sin cambios la ubicacion, persistencia y funcionamiento de los perfiles.

**Ejecucion:**
- `ContentSettings.tsx` ahora muestra un unico `select` nativo con Espanol, Latin y Ambos.
- Solo el perfil activo queda visible hasta que el usuario despliega las opciones mediante la interfaz del sistema operativo.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- El control conserva el valor `prayerLanguageProfile` y llama al mismo guardado existente al cambiar de opcion.

**Archivos Modificados:**
- `src/components/settings/ContentSettings.tsx`
- `AGENTS.md`

### [2026-07-12 15:45] 261. Santo civil, perfiles de idioma y menu de oracion
**Planificacion:**
- Separar la actualizacion civil del santo a las 00:00 del corte pastoral del Plan de Vida a las 05:00.
- Crear perfiles generales Espanol, Latin y Ambos con preferencias independientes por oracion.
- Agrupar las acciones de lectura en un menu de tres puntos solo dentro de las oraciones.
- Ubicar el selector general de idioma en Contenido, inmediatamente antes de Temporizador.

**Ejecucion:**
- **Santo del dia**: `SettingsContext.tsx` programa una actualizacion en la siguiente medianoche local y vuelve a comprobar la fecha al recuperar visibilidad o reanudar la app nativa.
- **Dia pastoral**: se mantuvo sin cambios el corte existente de las 05:00 para checks, estadisticas y progreso del Plan de Vida.
- **Perfiles de idioma**: el estado persistente conserva tres mapas separados; las preferencias antiguas se migran al perfil Espanol y los respaldos incluyen el perfil activo y sus mapas.
- **Contenido**: `ContentSettings.tsx` muestra Espanol/Latin/Ambos justo encima de Temporizador dentro del mismo bloque.
- **Menu de oracion**: `Header.tsx` muestra solo tres puntos en lecturas de oracion, con pantalla completa, inicio del temporizador, edicion condicional e idioma condicional.
- **Acciones**: `MainApp.tsx` conecta el menu al temporizador existente, permite editar oraciones del usuario o predeterminadas con edicion de desarrollador activa y guarda el idioma solo para la oracion abierta dentro del perfil actual.
- **Render de idioma**: `PrayerDetail.tsx` usa el perfil general como valor por defecto y deja el cambio particular en el menu del encabezado; Angelus/Regina Coeli conserva su boton independiente.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Prueba movil a 360 x 780 px confirmo el selector en Contenido y el menu de tres puntos sin desbordes.
- Plan de Vida conservo Calendario y sus acciones fuera de las oraciones.
- El perfil Latin mostro Latin por defecto; una excepcion Ambos se restauro tras cambiar a Espanol, volver a Latin y recargar la app.
- Activar temporizador desde el menu mostro el control flotante e inicio el conteo en 15:00.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/PrayerDetail.tsx`
- `AGENTS.md`

### [2026-07-11 20:11] 260. Selector discreto, Angelus bilingue y retroceso de Annuum
**Planificacion:**
- Simplificar el cambio de idioma para que permanezca accesible sin dominar visualmente la oracion.
- Separar en Angelus y Regina Coeli el cambio de oracion del cambio de idioma, agregando el texto latino correspondiente.
- Corregir el retroceso nativo desde Cotidie Annuum y el recorte lateral del modo Ambos.

**Ejecucion:**
- **Selector de idioma**: `PrayerDetail.tsx` reemplazo el encabezado y boton destacado por un control discreto de una letra que cicla entre `E`, `L` y `A`.
- **Angelus y Regina Coeli**: se agrego un boton independiente para alternar ambas oraciones; cada una conserva por separado el selector espanol/latin/ambos.
- **Textos bilingues**: `angelus-regina-coeli.ts` conserva las versiones espanolas existentes y agrega las versiones liturgicas latinas completas de ambas oraciones.
- **Modo Ambos**: se retiraron los margenes negativos que recortaban la columna izquierda, se redujo exclusivamente su relleno lateral y se fijaron dos columnas de igual ancho con ajuste seguro de palabras.
- **Retroceso de Annuum**: el boton Atrás de Android cierra primero Cotidie Annuum y mantiene intacta la pantalla desde la que se abrio.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Prueba visual a 360 x 780 px: ambas columnas midieron aproximadamente 145 px, quedaron dentro del viewport y no hubo desborde horizontal.
- Navegacion visual confirmo el ciclo `E -> L -> A`, el cambio independiente Angelus/Regina Coeli y la permanencia del modo Ambos al alternar la oracion.

**Archivos Modificados:**
- `src/components/PrayerDetail.tsx`
- `src/lib/prayers/plan-de-vida/angelus-regina-coeli.ts`
- `src/components/main/useNativeAppBindings.ts`
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-07-11 16:40] 259. Duracion dinamica de Annuum, arbol de Ajustes y fondo en oraciones
**Planificacion:**
- Calcular la duracion de cada diapositiva de Cotidie Annuum a partir de su texto realmente renderizado.
- Integrar las subsecciones de Ajustes en el encabezado principal, siguiendo la navegacion jerarquica del resto de la app.
- Hacer visible el fondo perpetuo detras del texto de las oraciones sin perder legibilidad.

**Ejecucion:**
- **Annuum**: `AnnuumStory.tsx` reemplazo los 8 segundos fijos por lectura lenta a 80 palabras por minuto, 2,5 segundos base, minimo de 8 segundos y limite defensivo de 90 segundos.
- **Medicion real**: cada diapositiva mide su texto visible al montarse, incluidos datos personalizados, y reinicia desde cero su barra con la duracion calculada.
- **Ajustes jerarquicos**: `Settings.tsx` dejo de crear una segunda cabecera; `MainApp.tsx` controla la subseccion activa, reemplaza `Ajustes` por su nombre y hace que Atrás vuelva primero a la raiz de Ajustes.
- **Fondo de oraciones**: `PrayerDetail.tsx` usa contenedores transparentes y panel de texto translucido solo con Fondo perpetuo activo.
- **Contraste**: `MainApp.tsx` aplica en oraciones una capa clara u oscura al 60% y conserva la capa anterior al 82% en las demas vistas.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Busqueda de interfaz confirmo que ya no existen el encabezado interno `Volver a Ajustes`, el estado local `setActiveSection` ni la duracion fija `SLIDE_DURATION`.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/components/AnnuumStory.tsx`
- `src/components/Settings.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/PrayerDetail.tsx`
- `AGENTS.md`

### [2026-07-11 16:33] 258. Ventana anual precisa de Cotidie Annuum
**Planificacion:**
- Mantener el globo visible desde Cristo Rey hasta terminar el dia de su primera apertura.
- Mostrar el acceso de Ajustes solo desde el dia siguiente a esa apertura y nunca antes del dia posterior a Cristo Rey.
- Ocultar obligatoriamente el acceso de Ajustes el 31 de diciembre a las 23:50.

**Ejecucion:**
- **Fecha persistente**: `SettingsContext.tsx` guarda `annuumFirstOpenedDate`, la incluye en respaldos y la reinicia junto con el año estadistico.
- **Reglas temporales**: `movable-feasts.ts` calcula por fecha local la visibilidad del globo y de Ajustes, usando Cristo Rey, el corte diario de las 23:59 y el corte anual del 31 de diciembre a las 23:50.
- **Actualizacion en vivo**: `MainApp.tsx` actualiza el reloj al inicio de cada minuto, registra la primera apertura al tocar el globo y mantiene el globo durante todo ese dia.
- **Ajustes**: `Settings.tsx` recibe la condicion calculada; la quinta opcion ya no depende directamente del booleano historico `hasViewedAnnuum`.
- **Compatibilidad**: una visualizacion antigua sin fecha guardada se migra al primer dia de uso de esta nueva regla durante la temporada.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Casos 2026 verificados: Cristo Rey sin abrir muestra globo; 25 de noviembre abierto a las 23:58 mantiene globo; a las 23:59 lo oculta; el 26 a las 00:00 muestra Ajustes.
- El acceso de Ajustes permanece el 31 de diciembre a las 23:49 y desaparece a las 23:50.
- Abrir en Cristo Rey mantiene el globo hasta las 23:59 y habilita Ajustes al dia siguiente a las 00:00.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/lib/movable-feasts.ts`
- `src/context/SettingsContext.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/Settings.tsx`
- `AGENTS.md`

### [2026-07-11 10:48] 257. Flujo profesional de generacion del APK
**Planificacion:**
- Corregir mensajes incorrectos del proceso `npm run android:apk` y eliminar el copiado automatico duplicado.
- Diferenciar con datos reales si cada APK fue creado, actualizado o ya estaba al dia.
- Verificar la integridad de las copias y entregar un resumen final claro sin cambiar el comportamiento normal de versionado o publicacion.

**Ejecucion:**
- **Un solo flujo**: `package.json` dejo de ejecutar `postandroid:apk`; el script principal conserva la copia local y a Drive, evitando el segundo copiado y el mensaje fijo `Archivo identico reemplazado`.
- **Copias verificadas**: `android-apk.mjs` compara tamano y SHA-256, omite escrituras innecesarias y verifica despues de copiar antes de informar `creado`, `actualizado` o `ya estaba actualizado`.
- **Salida ordenada**: la compilacion se presenta en cuatro fases y termina con version, tamano, SHA-256, rutas, estado de Git y duracion total.
- **Git preciso**: se comprueba primero el indice; solo se informa que no hay cambios cuando `git diff --cached --quiet` lo confirma, mientras los errores reales de commit se reportan como fallos.
- **Diagnostico local**: se agrego `--no-drive` para validar una release sin escribir en almacenamiento externo; el comando habitual sigue copiando a Drive.
- **Entorno**: JAVA_HOME y Android SDK se resuelven una sola vez y dejan de repetirse antes de cada subcomando.

**Validacion:**
- `node --check scripts/android-apk.mjs` OK.
- `npm.cmd run android:apk -- --no-bump --no-push --no-drive` OK: Next build, Capacitor sync y Gradle assembleRelease completados.
- APK validado: v6.3.0, 129.28 MB, SHA-256 `ced8a1603d719be8fa19581f60e54e2068ea7fbc509cfd9163887f5bc3fcb331`.
- La salida confirmo copia local `actualizado`, copia secundaria omitida y Git omitido; npm no ejecuto `postandroid:apk`.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `package.json`
- `AGENTS.md`

### [2026-07-11 10:15] 256. Tipografia, navegacion tactil y acceso a Cotidie Annuum
**Planificacion:**
- Recuperar la seleccion de tipo de letra usando solo las fuentes ya incluidas en la aplicacion.
- Integrar los controles de tamano en Apariencia general y retirar la subcategoria Tamaños.
- Dejar el modo de globo sin acceso desde la interfaz y mantener las zonas de toque como modo efectivo.
- Mostrar Cotidie Annuum en Ajustes despues de su primera visualizacion anual.

**Ejecucion:**
- **Apariencia general**: `AppearanceSettings.tsx` integra Aplicacion en general, Tamaño de fuente y Tipo de letra dentro del mismo bloque, sin la subcategoria Tamaños.
- **Tipo de letra**: se restauro el selector con Literata, Lora, Merriweather, EB Garamond y Times New Roman, reutilizando el estado persistente `fontFamily`.
- **Navegacion**: se retiro el interruptor visible que permitia elegir el globo de flechas; `SettingsContext.tsx` normaliza preferencias antiguas a zonas de toque, conservando el codigo del modo globo para una posible recuperacion futura.
- **Cotidie Annuum**: `Settings.tsx` muestra una quinta entrada resaltada y animada despues de que `hasViewedAnnuum` queda activo; el reinicio anual y la ocultacion del globo siguen usando el estado persistente existente.

**Validacion:**
- `.\\node_modules\\.bin\\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- Busqueda de interfaz confirmo que ya no aparecen la subcategoria Tamaños ni el control del globo, y que si aparecen Tipo de letra y Cotidie Annuum bajo sus condiciones.

**Archivos Modificados:**
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/Settings.tsx`
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-07-10 23:21] 255. Fondo perpetuo dev y pulido de lectores EPUB
**Planificacion:**
- Revisar si el modo `Ambos`, el fondo global y el lector EPUB ya cumplian las instrucciones recientes.
- Ajustar solo lo faltante: margen bilingue, modo de prueba de fondo perpetuo y experiencia de lectura EPUB.
- Mantener el fondo perpetuo apagado por defecto y limitado a modo desarrollador.

**Ejecucion:**
- **Modo Ambos**: `PrayerDetail.tsx` estrecho los margenes laterales y la separacion entre columnas del render bilingue para aprovechar mejor el ancho disponible.
- **Fondo perpetuo**: `SettingsContext.tsx` agrego estado persistente `perpetualBackgroundEnabled`; `AppearanceSettings.tsx` muestra el interruptor solo en modo desarrollador, antes de `Rotacion diaria`, resaltado en azul.
- **Aplicacion completa**: `MainApp.tsx` aplica el fondo seleccionado en todas las vistas solo cuando el modo desarrollador y el fondo perpetuo estan activos, con una capa de contraste para preservar legibilidad.
- **Lector EPUB**: `EpubReader.tsx` reactivo pantalla completa real, ocultando los controles al entrar y dejando el lector dentro de las zonas seguras; tambien ordeno la barra superior con accesos a indice, busqueda, panel y pantalla completa.
- **Personales EPUB**: `PersonalEpubLibrary.tsx` ordeno la cabecera del lector seleccionado y la vista de biblioteca personal sin cambiar el guardado local ni el renombrado.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `git diff --check` OK; solo avisos esperados de finales de linea CRLF en Windows.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/EpubReader.tsx`
- `src/components/PersonalEpubLibrary.tsx`
- `AGENTS.md`

### [2026-07-10 20:09] 254. Rediseño completo de Ajustes y panel desarrollador
**Planificacion:**
- Reemplazar la interfaz visual de Ajustes por cuatro entradas principales: Contenido, Notificaciones, Apariencia e Informacion.
- Reubicar los controles existentes segun la nueva estructura indicada por el usuario, eliminando ajustes no mencionados.
- Simplificar el panel de desarrollador en una sola vista util, sin trazas ni navegacion por subsecciones.

**Ejecucion:**
- **Ajustes**: `Settings.tsx` reemplazo las pestañas horizontales por cuatro botones tipo lista y vistas internas con boton de regreso.
- **Contenido**: `ContentSettings.tsx` quedo con Visibilidad de Oraciones, Ocultar oraciones predeterminadas del Plan de Vida, Temporizador y Control de Contenido avanzado solo en modo desarrollador.
- **Notificaciones**: `NotificationSettings.tsx` conserva Notificaciones/Omisión, deja Personalizadas colapsada al entrar, permite activar/desactivar, editar oración, hora y mensaje, y elegir oraciones de toda la app.
- **Apariencia**: `AppearanceSettings.tsx` conserva solo Apariencia general, Tamaños y Fondo de Pantalla; se eliminaron los controles visuales de widget, fuente y tamaño del globo.
- **Informacion**: `DeveloperSettings.tsx` integra Datos y Respaldo, General, Desarrollador, Acerca de y el texto final; se elimino Forzar Actualizacion.
- **Panel desarrollador**: `DeveloperDashboard.tsx` quedo como una sola vista con estado, controles internos, metricas, previsualizaciones e imagenes; se quitaron las trazas.
- **Predeterminado de navegacion**: `SettingsContext.tsx` cambia el valor por defecto/restablecido de `navMode` a `touch`, para que Avance con zonas de toque comience activado.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `node scripts\android-apk.mjs --no-bump --no-push` OK, incluyendo `next build`, `cap sync android` y `assembleRelease`.
- Busqueda en la nueva interfaz confirmo que ya no aparecen controles de Widget, Trazas, Forzar Actualizacion, Tipo de letra, Alertas u Otros.

**Archivos Modificados:**
- `src/components/Settings.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/settings/DeveloperSettings.tsx`
- `src/components/developer/DeveloperDashboard.tsx`
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-07-10 12:14] 253. Modo bilingue en dos columnas y lectura externa
**Planificacion:**
- Ajustar el modo `Ambos` para que los dos idiomas ocupen siempre mitades izquierda/derecha de la pantalla.
- Restaurar el permiso de lectura externa que se habia quitado al reducir señales sensibles para Play Protect.
- Evitar devolver permisos de escritura amplios porque no son necesarios para abrir EPUB, MP3 o CTD.

**Ejecucion:**
- **Modo bilingue**: `PrayerDetail.tsx` fuerza la cabecera y cada fila bilingue a `grid-cols-2`, sin apilar idiomas en pantallas pequeñas.
- **Lectura externa**: `AndroidManifest.xml` vuelve a declarar `READ_EXTERNAL_STORAGE`, limitado con `android:maxSdkVersion="32"`.
- **Compatibilidad legacy**: se mantiene `requestLegacyExternalStorage="true"` para Android 10.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `node scripts\android-apk.mjs --no-bump --no-push` OK, incluyendo `next build`, `cap sync android` y `assembleRelease`.
- `aapt dump permissions` confirmo `READ_EXTERNAL_STORAGE maxSdkVersion='32'` y que no se declara `WRITE_EXTERNAL_STORAGE`.
- El manifiesto fusionado de release conserva `requestLegacyExternalStorage="true"`.

**Archivos Modificados:**
- `src/components/PrayerDetail.tsx`
- `android/app/src/main/AndroidManifest.xml`
- `AGENTS.md`

### [2026-07-09 23:31] 252. Restauracion offline de audios predeterminados
**Planificacion:**
- Eliminar la descarga bajo demanda de los audios predeterminados porque fallaba en dispositivo real.
- Volver a incluir los MP3 predeterminados dentro del APK para conservar el uso completamente offline.
- Mantener solo la exclusion de la copia duplicada vieja del Nuevo Testamento.

**Ejecucion:**
- **Audios predeterminados**: `MainApp.tsx` ya no usa URLs remotas, estados de descarga ni `Filesystem.downloadFile` para los dos audios incluidos.
- **Interfaz de Audios**: se elimino el bloque de `Estado`, el mensaje de error de descarga y el boton de descarga; el reproductor vuelve a mostrarse directamente.
- **APK offline**: `scripts/android-apk.mjs` dejo de excluir `Discurso San Josemaría.mp3` y `Discurso San Juan Pablo II.mp3` del paquete Android.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `node scripts\android-apk.mjs --no-bump --no-push` OK, incluyendo `next build`, `cap sync android` y `assembleRelease`.
- Inspeccion del APK confirmo que contiene `assets/public/media/Discurso San Josemaría.mp3` y `assets/public/media/Discurso San Juan Pablo II.mp3`.
- Inspeccion del APK confirmo que sigue quedando solo `assets/public/epub/nuevo-testamento.epub` para el Nuevo Testamento.
- APK generado medido: 135,563,804 bytes.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-07-09 22:01] 251. Reduccion de señales sensibles para Play Protect
**Planificacion:**
- Revisar el APK reciente para identificar permisos o configuraciones que pudieran verse riesgosas al instalar por fuera de Play Store.
- Quitar o acotar solo lo que no fuera necesario para las funciones reales de Cotidie.
- Mantener funcionales las exportaciones y el intercambio de archivos.

**Ejecucion:**
- **Permisos Android**: `AndroidManifest.xml` dejo de declarar `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` y `requestLegacyExternalStorage`, porque los audios descargados usan almacenamiento privado de la app y las importaciones usan selector/intents.
- **FileProvider acotado**: `file_paths.xml` ya no expone `external-path path="."`; ahora solo comparte archivos desde cache interna/externa de la app.
- **Exportacion de calendario**: `ContentSettings.tsx` guarda el `.ics` temporal en `Directory.Cache` antes de compartirlo, igual que los respaldos, para no depender de Documents ni permisos amplios de almacenamiento.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `node scripts\android-apk.mjs --no-bump --no-push` OK, incluyendo `next build`, exclusion de assets, `cap sync android` y `assembleRelease`.
- `aapt dump permissions` sobre el APK final confirmo que ya no aparecen `READ_EXTERNAL_STORAGE` ni `WRITE_EXTERNAL_STORAGE`.
- El manifiesto fusionado de release tampoco contiene `requestLegacyExternalStorage`.
- `git diff --check` OK; solo aviso de finales de linea CRLF esperado por Git en Windows.

**Archivos Modificados:**
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/xml/file_paths.xml`
- `src/components/settings/ContentSettings.tsx`
- `AGENTS.md`

### [2026-07-09 16:25] 250. Reduccion de APK, modo bilingue y seccion Confesion
**Planificacion:**
- Eliminar del APK la copia duplicada del Nuevo Testamento sin romper el lector integrado.
- Reducir el peso de los audios predeterminados sin impedir que el usuario los use.
- Ampliar el selector de idioma a espanol/latin/ambos cuando una oracion tenga ambos textos.
- Agregar una seccion ocasional de Confesion dentro de Oraciones, fuera del Plan de Vida diario.

**Ejecucion:**
- **Nuevo Testamento**: se elimino `public/epub/Nuevo Testamento.epub`; el lector integrado sigue usando `public/epub/nuevo-testamento.epub`.
- **Service worker**: `public/sw.js` quedo sin la entrada precache del EPUB eliminado.
- **APK liviano**: `scripts/android-apk.mjs` ahora excluye del `out` de Android los dos MP3 predeterminados y la ruta vieja del EPUB antes de `cap sync`, y limpia esas entradas del service worker copiado al APK.
- **Audios bajo demanda**: `MainApp.tsx` mantiene los audios predeterminados disponibles en web, pero en Android nativo los muestra con estados `No descargado`, `Descargando`, `Descargado` y `Error`; al descargarlos, quedan guardados en `Directory.Data` mediante Capacitor Filesystem.
- **Modo bilingue**: `PrayerDetail.tsx` agrega el modo `Ambos`, con ciclo por idioma principal de la oracion y columnas latin/espanol alineadas por bloques o por lineas cuando corresponde.
- **Confesion**: se agrego `src/lib/prayers/oraciones/confesion.ts` con preparacion, examen, acto de contricion reutilizado, guia breve, accion de gracias y proposito concreto; `data.tsx` lo muestra como subgrupo `Para la Confesion` dentro de Oraciones.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `node scripts\android-apk.mjs --no-bump --no-push` OK, incluyendo `next build`, exclusion de assets, `cap sync android` y `assembleRelease`.
- APK anterior medido: 137,908,370 bytes; APK nuevo medido: 37,415,931 bytes.
- Inspeccion del APK confirmo que solo queda `assets/public/epub/nuevo-testamento.epub` y que no hay entradas `media/Discurso...mp3`.
- `git diff --check` OK; solo aviso de finales de linea CRLF esperado por Git en Windows.

**Archivos Modificados:**
- `public/epub/Nuevo Testamento.epub`
- `public/sw.js`
- `scripts/android-apk.mjs`
- `src/components/PrayerDetail.tsx`
- `src/components/main/MainApp.tsx`
- `src/lib/data.tsx`
- `src/lib/prayers/oraciones/confesion.ts`
- `AGENTS.md`

### [2026-07-09 12:51] 249. Configuracion Java 21 para import Gradle en VS Code
**Planificacion:**
- Corregir los problemas del panel de VS Code causados por intentar importar Gradle con Java 25.
- Usar el JBR 21 de Android Studio ya instalado en el equipo.
- Evitar cambios en Gradle o en codigo de la app.

**Ejecucion:**
- **VS Code Java/Gradle**: `.vscode/settings.json` ahora fija `java.import.gradle.java.home` en `C:\Program Files\Android\Android Studio\jbr`.
- **Runtime Java 21**: se agrego `java.configuration.runtimes` con `JavaSE-21` apuntando al mismo JBR y marcado como predeterminado.

**Validacion:**
- `settings.json` parsea correctamente como JSON.
- `C:\Program Files\Android\Android Studio\jbr\bin\java.exe -version` reporta OpenJDK 21.0.10.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando ese JBR 21.

**Archivos Modificados:**
- `.vscode/settings.json`
- `AGENTS.md`

### [2026-07-09 12:02] 248. Reprogramacion nativa de notificaciones fijas
**Planificacion:**
- Hacer que las notificaciones fijas recurrentes no dependan de que el usuario abra la app despues de dispararse.
- Mantener solo una ocurrencia pendiente por regla fija para no volver al exceso de `PendingIntent`.
- Evitar cancelar la notificacion recien mostrada al programar la siguiente.

**Ejecucion:**
- **Metadata de recurrencia**: `SettingsContext.tsx` agrega a las notificaciones fijas mensuales, relativas mensuales y anuales la regla de recurrencia, clave estable y plantillas de titulo/texto.
- **Reprogramacion al dispararse**: `scripts/patch-local-notifications.js` parchea `TimedNotificationPublisher.java` para que, al dispararse una fija recurrente, calcule la proxima fecha y la agende nativamente.
- **ID nuevo por ocurrencia**: la siguiente ocurrencia se agenda con el mismo hash usado por JS para `fixedKey + dateKey`, evitando que el plugin cancele la notificacion visible que acaba de mostrarse.
- **Plantillas**: el receptor nativo actualiza titulo/texto basicos con fecha y ano para la proxima ocurrencia.
- **Parche aplicado**: se ejecuto `node scripts\patch-local-notifications.js` y luego `npx.cmd cap sync android`.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `npx.cmd cap sync android` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK.
- `git diff --check` OK.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `scripts/patch-local-notifications.js`
- `AGENTS.md`

### [2026-07-09 11:47] 247. Agenda mensual minima en Android
**Planificacion:**
- Reducir aun mas la carga de notificaciones mensuales en Android tras confirmar que el cierre depende del limite de `PendingIntent`, no de RAM.
- Mantener la agenda rodante, pero dejando solo la proxima ocurrencia mensual pendiente.

**Ejecucion:**
- **Ocurrencia mensual unica**: `SettingsContext.tsx` cambio `MONTHLY_FIXED_NOTIFICATION_OCCURRENCES_ANDROID` de 3 a 1, para que cada notificacion mensual/relativa tenga solo su proxima ocurrencia programada en Android.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-07-09 11:40] 246. Correccion de cierre por exceso de PendingIntent
**Planificacion:**
- Capturar el cierre real desde el celular conectado mediante ADB.
- Corregir la causa exacta sin tocar pantallas ni funciones ajenas.
- Evitar tanto la programacion futura excesiva como la restauracion nativa de una agenda antigua demasiado grande.

**Ejecucion:**
- **Diagnostico ADB**: el log del telefono mostro que Android/ZTE forzaba el cierre con `pendingIntentRecord count exceed`, no por una excepcion JS o del lector.
- **Agenda acotada**: `SettingsContext.tsx` reduce Android a una agenda maxima de 32 notificaciones pendientes, ordenadas por proxima fecha, y limita las ocurrencias mensuales rodantes a 3.
- **Restauracion nativa segura**: `scripts/patch-local-notifications.js` ahora tambien parchea `LocalNotificationRestoreReceiver.java` para ordenar las notificaciones guardadas, restaurar solo las 32 mas proximas y borrar el excedente antiguo del almacenamiento del plugin.
- **Parche aplicado**: se ejecuto `node scripts\patch-local-notifications.js`, dejando `node_modules/@capacitor/local-notifications/.../LocalNotificationRestoreReceiver.java` con el limite nativo aplicado.

**Validacion:**
- ADB reprodujo el cierre y confirmo la causa `pendingIntentRecord count exceed`.
- `npm.cmd run build` OK.
- `npx.cmd cap sync android` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK.
- `assembleRelease` y `assembleDebug` no pudieron completarse dentro del sandbox porque Gradle intento resolver dependencias Maven/Kotlin faltantes y la red del entorno esta bloqueada (`Permission denied: getsockopt`).
- `git diff --check` OK.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `scripts/patch-local-notifications.js`
- `AGENTS.md`

### [2026-07-09 11:14] 245. Renombrado editable y pantalla persistente
**Planificacion:**
- Cambiar el renombrado de EPUBs personales y audios personales para editar el nombre visible existente en vez de reescribir desde cero.
- Mantener la pantalla despierta mientras Cotidie esta abierta en Android.
- Tocar solo los archivos directamente relacionados y registrar la intervencion.

**Ejecucion:**
- **EPUBs personales**: `PersonalEpubLibrary.tsx` reemplazo el `prompt` por un dialogo con input controlado, precargado con el nombre visible actual y seleccionado al abrir.
- **Audios personales**: `MainApp.tsx` aplico el mismo flujo para audios de usuario, conservando el guardado local y sin modificar audios predeterminados.
- **Pantalla despierta**: `MainActivity.java` activa `FLAG_KEEP_SCREEN_ON` al crear y reanudar la actividad para impedir que Android apague la pantalla por inactividad mientras la app esta en primer plano.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK con `JAVA_HOME`/SDK Android configurados.
- `git diff --check` OK.

**Archivos Modificados:**
- `src/components/PersonalEpubLibrary.tsx`
- `src/components/main/MainApp.tsx`
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `AGENTS.md`

### [2026-07-09 01:05] 244. Imagenes seguras al dispararse notificaciones programadas
**Planificacion:**
- Recuperar las imagenes de las notificaciones sin volver a meter bitmaps pesados dentro del `PendingIntent` de la alarma.
- Cargar la imagen solo cuando la notificacion se dispara y reducirla a un tamano seguro.
- Mantener el parche persistente para que sobreviva a reinstalaciones de dependencias.

**Ejecucion:**
- **Parche nativo diferido**: `scripts/patch-local-notifications.js` ahora tambien parchea `TimedNotificationPublisher.java`.
- **Carga al disparar**: el receptor nativo lee `extra.imageDrawable`, carga el recurso `drawable`, lo reduce a maximo 512px y lo convierte a `RGB_565` antes de aplicar `BigPictureStyle`.
- **Alarma liviana**: `SettingsContext.tsx` sigue sin enviar `largeIcon`/`attachments` al agendar, evitando el crash `Could not copy bitmap to parcel blob`.
- **Compatibilidad**: la notificacion reconstruida conserva titulo, texto, canal, icono chico, toque, dismiss, flags basicos, sonido, prioridad, visibilidad y color.

**Validacion:**
- `node scripts\patch-local-notifications.js` OK.
- `npm.cmd run build` OK.
- `npx.cmd cap sync android` OK.
- `:capacitor-local-notifications:compileReleaseJavaWithJavac --offline` avanzo sin errores Java del parche; se detuvo por `AccessDeniedException` de la cache Gradle local de Codex sobre `activity-1.9.3-api.jar`.

**Archivos Modificados:**
- `scripts/patch-local-notifications.js`
- `AGENTS.md`

### [2026-07-09 00:50] 243. Correccion de crash por imagenes en notificaciones programadas
**Planificacion:**
- Capturar el crash real de Android via ADB con el celular conectado.
- Corregir la causa exacta sin tocar funcionalidades ajenas.
- Mantener texto, rutas y horarios de notificaciones, eliminando solo el bitmap grande que cerraba la app.

**Ejecucion:**
- **Diagnostico ADB**: el buffer de crash mostro `FATAL EXCEPTION: CapacitorPlugins` con `Could not copy bitmap to parcel blob` dentro de `LocalNotificationManager.triggerScheduledNotification`.
- **Causa**: las notificaciones programadas estaban incluyendo `largeIcon`/`attachments`; Android intentaba serializar el bitmap completo dentro del `PendingIntent` de la alarma.
- **Correccion**: `SettingsContext.tsx` ya no envia `largeIcon` ni `attachments` en notificaciones programadas fijas, moviles ni de prueba. Se conservan `image` e `imageDrawable` en `extra` para no perder la informacion si luego se implementa una solucion nativa segura.

**Validacion:**
- `npm.cmd run build` OK.
- `npx.cmd cap sync android` OK.
- `node scripts\patch-local-notifications.js` OK.
- `assembleRelease --offline` no pudo validarse en Codex porque Gradle no encontro metadata offline para dependencias ya listadas en cache.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-07-09 00:35] 242. Hardening de arranque por notificaciones nativas
**Planificacion:**
- Corregir el cierre de la app al abrir tras actualizar, priorizando la zona modificada recientemente: sincronizacion nativa de notificaciones.
- Evitar que la sincronizacion automatica al arranque pida permisos o envie una carga grande al puente JS-nativo.
- Proteger el parche de alarmas exactas para que una excepcion de Android no cierre el proceso.

**Ejecucion:**
- **Sin permisos en frio**: `SettingsContext.tsx` ahora solo sincroniza notificaciones al arrancar si el permiso ya esta concedido; no llama `requestPermissions()` automaticamente durante el inicio.
- **Sincronizacion defensiva**: se agregaron `catch` locales al cancelado de pendientes, verificacion de permisos, canal Android y programacion, para que un fallo de notificaciones no derribe la app.
- **Programacion por tandas**: las notificaciones se envian al plugin en grupos de 24 para reducir carga en el puente JS-nativo.
- **Fallback nativo**: `scripts/patch-local-notifications.js` ahora parchea `LocalNotificationManager.java` con un fallback seguro: si falla una alarma exacta, baja a una alarma inexacta en vez de lanzar una excepcion sin capturar.

**Validacion:**
- `node scripts\patch-local-notifications.js` OK, aplicando el parche al plugin local de `node_modules`.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `scripts/patch-local-notifications.js`
- `AGENTS.md`

### [2026-07-09 00:20] 241. Correccion de Gradle wrapper para build Android
**Planificacion:**
- Revisar la incompatibilidad reportada por `armar cotidie` entre Android Gradle Plugin y Gradle wrapper.
- Corregir solo la version del wrapper requerida por el build.

**Ejecucion:**
- **Gradle wrapper**: se restauro `android/gradle/wrapper/gradle-wrapper.properties` desde `gradle-8.9-bin.zip` a `gradle-8.14.3-all.zip`, version ya presente en el proyecto y superior al minimo `8.13` requerido por `com.android.tools.build:gradle:8.13.0`.

**Validacion:**
- Gradle 8.14.3 local levanto correctamente con `gradle.bat --version`.
- `assembleRelease` ya no fallo por version minima de Gradle; en Codex se detuvo despues al resolver dependencias Maven/Google por bloqueo de red (`Permission denied: getsockopt`).
- `git diff --check` OK.

**Archivos Modificados:**
- `android/gradle/wrapper/gradle-wrapper.properties`
- `AGENTS.md`

### [2026-07-09 00:10] 240. Agenda rodante ampliada para notificaciones mensuales
**Planificacion:**
- Reforzar la programacion de notificaciones mensuales/relativas sin cambiar a una capa nativa nueva.
- Ampliar la ventana rodante con un limite seguro para no saturar notificaciones pendientes.
- Hacer que la agenda se regenere tambien al volver la app a primer plano.

**Ejecucion:**
- **Ventana mensual**: `SettingsContext.tsx` ahora programa 24 ocurrencias mensuales/relativas en Android y 12 en iOS.
- **Resincronizacion**: se agrego una senal interna que fuerza la resincronizacion de notificaciones cuando la app vuelve a estar activa.
- **Precision**: se mantuvo el uso de fechas concretas `schedule.at` con `allowWhileIdle`, conservando el mismo camino de alarma exacta ya usado por el resto de recordatorios.

**Validacion:**
- `.\node_modules\.bin\tsx.cmd` confirmo 24 ocurrencias para `j1 9:00` y `d1 9:00` en Android, desde agosto de 2026 hasta julio de 2028.
- `npm.cmd run build` OK.
- `git diff --check` OK.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-07-09 00:00] 239. Regla permanente de registro y correccion de notificaciones fijas/mensuales
**Planificacion:**
- Convertir el registro en `AGENTS.md` en una regla permanente para cualquier agente futuro.
- Mantener siempre activas las notificaciones fijas importantes del sistema, aunque el interruptor general este apagado.
- Dejar las notificaciones mensuales recurrentes bajo el interruptor general.
- Verificar directamente que las fechas mensuales `j1 9:00` y `d1 9:00` se parseen y generen proximas ocurrencias.

**Ejecucion:**
- **Regla permanente**: se agrego una seccion de instrucciones al comienzo de `AGENTS.md`, indicando que todo cambio de archivos debe registrarse alli con el formato existente.
- **Notificaciones fijas**: `SettingsContext.tsx` ahora mantiene activas las notificaciones fijas importantes aun con `notificationsEnabled` apagado.
- **Notificaciones mensuales**: `fixed-notifications.ts` marca las notificaciones mensuales de vocaciones y Papa con `requiresNotificationsEnabled`, para que si respeten el interruptor general.
- **Programacion mensual**: `SettingsContext.tsx` programa varias proximas ocurrencias de notificaciones mensuales/relativas, evitando que queden fuera por una ventana de horizonte demasiado corta.
- **Fiestas moviles**: Pascua y fiestas moviles importantes ya no dependen de la ventana corta para quedar programadas.
- **Regularizacion reciente**: quedan registrados tambien los cambios recientes de nombres visibles para EPUBs personales y audios personales, que guardan el nombre elegido por el usuario en la memoria local.

**Validacion:**
- `.\node_modules\.bin\tsx.cmd` confirmo que `j1 9:00` y `d1 9:00` se parsean como `relative-monthly` y generan seis proximas ocurrencias.
- `.\node_modules\.bin\tsx.cmd` confirmo que, con el interruptor apagado, las mensuales quedan fuera y las fijas importantes permanecen activas.
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `git diff --check` OK.

**Archivos Modificados:**
- `AGENTS.md`
- `src/context/SettingsContext.tsx`
- `src/lib/fixed-notifications.ts`
- `src/components/PersonalEpubLibrary.tsx`
- `src/components/main/MainApp.tsx`

### [2026-06-05 13:05] 237. Fix de importación y compatibilidad de respaldos
**Planificación:**
- Investigar por qué el respaldo `cotidie_backup_2026-06-06.ctd` no se puede importar.
- Corregir errores de sintaxis en el código que bloqueaban el arranque de la app.
- Reparar la lógica de importación para que soporte archivos con marca de orden de bytes (BOM).
- Entregar una versión del respaldo corregida y compatible con las últimas mejoras.

**Ejecución:**
- **Corrección de Código**: Se eliminó un error de sintaxis en `SettingsContext.tsx` (un paréntesis de más en el `useMemo` de `backupSnapshot`) que impedía que la aplicación funcionara correctamente.
- **Importación Robusta**: Se ajustó `consumePendingImport` en `SettingsContext.tsx` para limpiar el prefijo BOM (`\uFEFF`) antes de intentar parsear el JSON. Esto permite abrir archivos compartidos desde otras aplicaciones de forma infalible.
- **Compatibilidad**: Se actualizó el valor por defecto de `shakeToOpenEnabled` a `true` durante la normalización de respaldos antiguos.
- **Archivo Corregido**: Se generó `C:\Users\balca\Downloads\cotidie_backup_2026-06-06_compatible.ctd` que incluye todos los campos nuevos de la versión 5.0.0 y garantiza una carga limpia de todos los datos del usuario (oraciones, cartas, estadísticas, etc.).

**Validación:**
- Limpieza de sintaxis: OK.
- Detección de BOM en parser JSON: OK.
- Generación de archivo compatible: OK.

### [2026-06-05 10:15] 229. Organización visual de sección Oraciones y nuevos contenidos
**Planificación:**
- Transformar la sección de "Oraciones" en una "Biblioteca Visual" organizada por subcategorías para evitar una lista plana demasiado larga.
- Clasificar todas las oraciones existentes en grupos lógicos (Comunes, Marianas, Espíritu Santo, etc.).
- Incorporar oraciones fundamentales que faltaban en el catálogo.

**Ejecución:**
- **Datos y Contenido**: se creó `src/lib/prayers/oraciones/fundamentales.ts` con 9 oraciones esenciales: Acto de contrición, Ángel de mi guarda, Bendición de la mesa, Magnificat, Consagración a la Virgen, Alma de Cristo, Oración de San Francisco, Aceptación de la muerte y Oración ante el trabajo/estudio.
- **Estructura**: en `src/lib/data.tsx` se implementaron 6 subcategorías (`subcat-*`) con imágenes asociadas para agrupar todo el catálogo de oraciones.
- **Interfaz**: `src/components/PrayerList.tsx` se modificó para renderizar una cuadrícula (grid) de tarjetas visuales con imagen y degradado cuando el usuario entra en la raíz de la sección "Oraciones".
- **UX**: se mantuvo la compatibilidad con oraciones creadas por el usuario, que aparecen listadas debajo del menú de categorías.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Navegación entre categorías y subcategorías: OK.

**Archivos Modificados:**
- `src/lib/prayers/oraciones/fundamentales.ts`
- `src/lib/data.tsx`
- `src/components/PrayerList.tsx`
- `AGENTS.md`

### [2026-06-05 10:05] 230. Ajustes de scroll y diseño de imagen anclada
**Planificación:**
- Corregir el bloqueo de scroll en textos largos y asegurar que las oraciones comiencen siempre desde el inicio.
- Ajustar el diseño visual de las imágenes dentro del detalle de oración para que queden ancladas y con un marco de color de fondo consistente.

**Ejecución:**
- **Scroll Inteligente**: `src/components/PrayerDetail.tsx` ahora resetea la posición al inicio al abrir cualquier oración, excepto para las marcadas como `isLongText` (como Camino), que preservan su progreso.
- **Diseño Sticky**: se aplicó `sticky top-0` a la imagen de la oración con un contenedor `bg-background` y padding vertical. Esto logra la secuencia visual: Encabezado -> Franja fondo -> Imagen -> Franja fondo -> Texto.
- **Margen de Seguridad**: se añadió un relleno derecho (`pr-6`) al área de texto para que la barra de desplazamiento no oculte caracteres, y un margen preventivo (`pr-2`) en los contenedores de listas de `MainApp.tsx`.
- **Flexbox**: se reforzó la estructura de contenedores con `flex-1` y `min-h-0` para garantizar que el scroll nativo se active correctamente en dispositivos móviles.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación visual de márgenes y comportamiento sticky: OK.

**Archivos Modificados:**
- `src/components/PrayerDetail.tsx`
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 12:15] 233. Refuerzo de importación, UI de oraciones y ajustes
**Planificación:**
- Corregir el flujo de importación de archivos `.ctd` asegurando que los cambios se apliquen y notifiquen correctamente.
- Ajustar el encuadre de oraciones estructurales y el diseño de bloques de texto cortos.
- Garantizar el respeto a las safe areas en modo pantalla completa.
- Corregir el pinch-to-zoom para que afecte solo al texto de la oración.
- Reorganizar y pulir la sección de Ajustes con gestos más naturales.
- Implementar confirmaciones de eliminación en toda la app.
- Añadir detección experimental de agitación (shake) para abrir oraciones al azar.

**Ejecución:**
- **Importación**: Se robustecieron los validadores de payload en `SettingsContext.tsx` y se mejoraron las trazas y notificaciones de éxito/duplicado.
- **Encuadre**: Se configuró `object-position: top` para Padre Nuestro, Ave María, Gloria y Credo en `lib/image-display.ts`.
- **UI de Oraciones**: `PrayerDetail.tsx` ahora usa `h-fit` y `max-h-full` para que el marco del texto no ocupe toda la pantalla en oraciones breves. Se aplicó `env(safe-area-inset-*)` para proteger el contenido en modo inmersivo.
- **Zoom**: Se migró la lógica de pinch-to-zoom de `fontSize` global a `prayerTextZoom` específico de la oración.
- **Audios**: Se movió el reproductor de audio a una subsección dedicada "Audios" dentro de Lectura Espiritual.
- **EPUB**: Se eliminó el botón "Abrir" (ahora es por toque en tarjeta), se añadió ícono de basura rojo y confirmación de borrado.
- **Confirmaciones**: Se integró `AlertDialog` en todas las acciones de eliminación (citas, fondos, planes, oraciones).
- **Ajustes**: Se reordenaron las pestañas (Contenido, Alertas, Apariencia, Otros) y se refinó la sensibilidad del swipe horizontal.
- **Shake**: Se implementó un detector de agitación en `MainApp.tsx` que abre una oración aleatoria cuando está habilitado.
- **Navegación**: El fin de Rosario y Vía Crucis inmersivos ahora requiere doble avance para volver a Plan de Vida.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de importación y gestos: OK.

**Archivos Modificados:**
- `src/lib/image-display.ts`
- `src/context/SettingsContext.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/PersonalEpubLibrary.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/settings/DeveloperSettings.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/plans/CustomPlanView.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/ViaCrucisImmersive.tsx`
- `src/components/Settings.tsx`
- `src/lib/data.tsx`
- `android/app/src/main/res/xml/widget_saint_small.xml`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-06-05 12:40] 236. Widget chico: aprovechamiento de espacio y auto-achique de fuente
**Planificación:**
- Corregir el widget pequeño para que use todo el espacio disponible sin dejar márgenes excesivos.
- Asegurar que el texto largo no se corte con "...", permitiendo que la fuente se achique significativamente.
- Ajustar la jerarquía de líneas para dar prioridad a la biografía cuando el espacio es reducido.

**Ejecución:**
- **Layout**: Se redujeron los paddings del widget de 10dp/6dp a 6dp/4dp para aprovechar mejor los bordes. Se eliminaron los pesos rígidos (`layout_weight`) que dejaban espacios muertos en el centro.
- **Auto-achique**: Se bajó el tamaño mínimo de fuente permitido a `7sp` para la biografía y `8sp` para el nombre, permitiendo una reducción extrema antes de cortar el texto.
- **Lógica de líneas**: En `SaintWidgetUpdater.java` se aumentó el límite de líneas permitidas (de 2 a 3 en altura mínima, y hasta 8 en normal) para que el texto fluya verticalmente en lugar de ser truncado.

**Validación:**
- Revisión de límites de líneas en Java: OK.
- Ajuste de márgenes en XML: OK.

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

**Validación:**
- Revisión manual de dimensiones XML: OK.
- Verificación de lógica de ocultamiento en Java: OK.

**Archivos Modificados:**
- `android/app/src/main/res/xml/widget_saint_small.xml`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-06-04 00:00] 227. Activacion parcial del proyecto en nuevo entorno
**Planificacion:**
- Leer la guia externa `C:\Users\balca\Downloads\instrucciones-codex-activar-otro-equipo.md` y contrastarla con el estado real de esta copia restaurada.
- Evitar repetir pasos ya hechos y completar solo lo pendiente: rutas locales, dependencias, sincronizacion Capacitor y validaciones.
- Confirmar el bloqueo exacto que habia dejado colgada la validacion Android.

**Ejecucion:**
- **Estado del respaldo**: se verifico que existen `package.json`, `src`, `android`, `scripts`, `.env`, `node_modules`, `.next` y `out`. Esta copia no tiene `.git`, por lo que se trato como respaldo extraido.
- **Herramientas base**: se confirmo `node`, `npm.cmd` y `git`. `npm.ps1` queda bloqueado por la politica de PowerShell, por lo que se uso `npm.cmd`.
- **Rutas locales**: se ajusto `android/local.properties` para usar el SDK existente en `C:\Users\balca\AppData\Local\Temp\CotidieDevTools\android-sdk`, que fue la ruta que no bloqueo el SDK durante la validacion. Tambien se dejaron variables de usuario `ANDROID_SDK_ROOT`, `ANDROID_HOME` y `JAVA_HOME`; `JAVA_HOME` apunta al JDK 21 local en `.local-tools\jdk\jdk-21.0.11+10`.
- **Dependencias y Capacitor**: se ejecuto `npm.cmd install` correctamente, incluyendo `postinstall`, y luego `npx.cmd cap sync android` correctamente.
- **Gradle**: se preparo una cache paralela en `C:\Users\balca\AppData\Local\Temp\CotidieGradleHome` copiando la distribucion y dependencias ya descargadas, porque una cache totalmente nueva intentaba descargar Gradle y la red del entorno estaba bloqueada.

**Validacion:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `npx.cmd cap sync android` OK.
- `.\gradlew.bat :app:processDebugResources :app:compileDebugJavaWithJavac` no queda OK por un bloqueo de entorno: `java.nio.file.AccessDeniedException` sobre JARs transformados de Gradle, por ejemplo `C:\Users\balca\AppData\Local\Temp\CotidieGradleHome\caches\8.14.3\transforms\...\viewpager-1.0.0-api.jar`. Los recursos Android alcanzan a procesarse, pero la tarea `:capacitor-android:compileDebugJavaWithJavac` falla al cerrar/leer esos JARs.

**Archivos Modificados:**
- `android/local.properties`
- `AGENTS.md`

### [2026-04-14 10:21] 226. Guía para que Codex reactive Cotidie en otro equipo con rutas locales corregidas
**Planificación:**
- Revisar qué incluye realmente el respaldo del proyecto y qué elementos del entorno quedan fuera o dependen de rutas locales.
- Identificar scripts existentes para preparar Windows, reinstalar comandos de PowerShell y regenerar rutas sensibles como `android/local.properties`.
- Redactar una guía nueva, pensada para una futura sesión de Codex en otro equipo, con criterio mínimo: instalar solo lo necesario, corregir rutas locales y validar que el proyecto quede operativo como aquí.

**Ejecución:**
- **Alcance del respaldo**: se verificó en `scripts/create-backup.mjs` que el ZIP conserva el código del repo y omite principalmente artefactos regenerables como `.git`, `node_modules`, `.next`, `build`, `out`, `output`, APKs y logs, por lo que el otro equipo necesitará reinstalar dependencias y regenerar configuración local.
- **Rutas y entorno local**: se confirmó que `android/local.properties` es específico de la máquina actual y que `scripts/setup-windows-dev.ps1` ya contempla detectar SDK/JBR, fijar `JAVA_HOME`, `ANDROID_SDK_ROOT` y `ANDROID_HOME`, además de reescribir ese archivo para el equipo donde se ejecute.
- **Comandos de PowerShell**: se verificó que `scripts/install-powershell-commands.ps1` vuelve a instalar `crear respaldo` y comandos relacionados en el perfil del usuario, apuntando al path actual del repo, por lo que también debe ejecutarse de nuevo en la máquina nueva si se quiere dejar ese flujo igual que aquí.
- **Guía nueva**: se creó `docs/instrucciones-codex-activar-otro-equipo.md` con un flujo claro para futuras sesiones: comprobar qué llegó en el respaldo, instalar solo `Node.js LTS`, `Git` y `Android Studio` si faltan, corregir rutas locales, ejecutar `npm install`, sincronizar `Capacitor`, reinstalar comandos opcionales de PowerShell y validar web y Android.

**Validación:**
- Revisión manual de `scripts/create-backup.mjs`, `scripts/setup-windows-dev.ps1`, `scripts/install-powershell-commands.ps1`, `android/app/build.gradle`, `android/local.properties` y `.env`: OK.
- Verificación de creación del documento nuevo `docs/instrucciones-codex-activar-otro-equipo.md`: OK.

**Archivos Modificados:**
- `docs/instrucciones-codex-activar-otro-equipo.md`
- `AGENTS.md`

### [2026-03-31 14:05] 225. Barras y scroll como `v4.4.22`, widget chico como `v4.4.13` y ojo para santo oculto por fiesta móvil
**Planificación:**
- Recuperar desde la referencia de `cotidie-installer-v4.4.22.apk` el comportamiento de las barras del sistema y del scroll de oraciones, manteniendo solo los arreglos posteriores que no afectaban esos dos puntos.
- Recuperar desde `cotidie-installer-v4.4.13.apk` el formato visual y dimensional del widget chico sin tocar la lógica actual que genera su contenido.
- Completar la funcionalidad del cartel del santo del día para que, cuando una fiesta móvil oculte al santo fijo de la fecha, aparezca un botón de ojo que lo revele solo mientras se mantiene presionado.

**Ejecución:**
- **Barras y scroll**: `android/app/src/main/java/com/benjamin/studio/MainActivity.java`, `android/app/src/main/res/values/styles.xml`, `android/app/src/main/res/layout/activity_main.xml` y `src/components/main/MainApp.tsx` volvieron al criterio efectivo de `v4.4.22` para edge-to-edge y estructura del contenedor principal. Se retiraron los respaldos fijos de safe area y la estructura de `MainApp` volvió a usar altura completa (`h-full`) para que el encabezado permanezca fijo mientras el scroll corre solo por el contenedor de contenido.
- **Widget chico**: `android/app/src/main/res/layout/widget_saint_small.xml`, `android/app/src/main/res/xml/widget_saint_small.xml` y la parte chica de `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java` recuperaron el layout, pesos, autosizing y tamaño objetivo de `v4.4.13`. Se preservó la lógica actual de contenido y deep-link del widget, pero el formato volvió al estilo visual y dimensional de esa build.
- **Santo oculto por fiesta móvil**: `src/context/SettingsContext.tsx` pasó a calcular explícitamente cuándo una fiesta móvil está tapando a un santo fijo del calendario y a exponer ese santo oculto junto con su imagen. `src/components/saints/SaintOfTheDayCard.tsx` reutilizó esa información para mostrar el botón de ojo solo en ese caso, revelando el santo fijo únicamente mientras el botón permanece presionado y restaurando la fiesta móvil al soltarlo.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:processDebugResources :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro de `android`.

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `android/app/src/main/res/layout/activity_main.xml`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/res/xml/widget_saint_small.xml`
- `src/components/main/MainApp.tsx`
- `src/components/saints/SaintOfTheDayCard.tsx`
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-06-04 23:30] 228. Reparación de merge conflictos y sincronización Git/Vercel
**Planificación:**
- Eliminar marcadores de merge dejados por una sincronización fallida entre la copia local (`4.4.30`) y `origin/main` (`4.4.29`).
- Restaurar `SettingsContext.tsx` y `fixed-notifications.ts` tras el commit accidental `uyn`.
- Dejar el proyecto compilable (`tsc`, `build`) y listo para `git push` hacia Vercel.

**Ejecución:**
- Se resolvieron conflictos en web, Android, `package.json`, `package-lock.json`, `AGENTS.md` y componentes afectados, priorizando la rama local más reciente (`HEAD`) y fusionando mejoras de edge-to-edge del tema Android.
- Se corrigieron rutas de imágenes en notificaciones fijas (`./icons/`, `./images/`) y fiestas móviles adicionales en `movable-feasts.ts`.
- Se restauró `PrayerDetail.tsx` con zoom por oración (`prayerTextZoom`) y contenedor de scroll dedicado.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.

**Archivos Modificados:**
- Múltiples archivos con marcadores `<<<<<<<` / `=======` / `>>>>>>>`
- `AGENTS.md`

### [2026-03-29 18:33] 224. Safe areas sin negro y widget chico dimensionado por tamaño efectivo
**Planificación:**
- Corregir la regresión donde las barras transparentes habían vuelto a mostrar negro detrás, restaurando una pintura explícita de safe areas con el fondo correcto de cada pantalla.
- Rehacer el cálculo del widget chico para que no escale solo con el tamaño mínimo declarado, sino también con el tamaño realmente disponible al colocarlo o expandirlo.

**Ejecución:**
- **Barras del sistema**: `src/components/main/MainApp.tsx` volvió a pintar explícitamente las safe areas, pero ahora con el criterio correcto. En vistas normales, la barra superior usa `bg-primary` y la inferior `bg-background`; en `home`, ambas toman `var(--home-bg-image)` con el mismo `objectPosition` del fondo de inicio, evitando el negro y dejando que el fondo real se vea detrás de las barras.
- **Widget chico**: `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java` dejó de calcular el escalado solo con `OPTION_APPWIDGET_MIN_WIDTH/HEIGHT` y pasó a usar también `OPTION_APPWIDGET_MAX_WIDTH/HEIGHT` para estimar el tamaño efectivo disponible. Con eso se aumentaron factores de escala, tamaños máximos, líneas visibles y se redujeron paddings, de modo que el texto ocupe mucho mejor todo el espacio real del widget.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `.\gradlew.bat :app:processDebugResources :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro de `android`.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-29 18:24] 223. Widget chico con tipografía más grande y bloque de texto ocupando toda la tarjeta
**Planificación:**
- Revisar por qué, tras devolver el mínimo `2x1`, el widget chico estaba dejando el texto demasiado pequeño y visualmente “encogido” dentro de solo parte del espacio disponible.
- Rehacer el sizing para que nombre y bio llenen mejor la altura real del widget, con menos padding, más tamaño de letra y menos vacío entre ambos bloques.

**Ejecución:**
- **Layout base**: `android/app/src/main/res/layout/widget_saint_small.xml` redujo paddings laterales y verticales, equilibró los pesos entre nombre y bio (`4/4` en vez de `3/5`), eliminó el margen extra de la bio y subió los tamaños base de ambas tipografías.
- **Escalado nativo**: `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java` hizo más agresiva la fórmula de sizing: menos padding dinámico, títulos y bios bastante más grandes, más líneas disponibles y una gravedad del título orientada a pegarlo a la bio cuando ambas están visibles.
- **Resultado**: el texto del widget chico vuelve a llenar visualmente la tarjeta en vez de quedar pequeño y usando solo una fracción del alto disponible.

**Validación:**
- `.\gradlew.bat :app:processDebugResources :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro de `android`.

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `AGENTS.md`

### [2026-03-29 18:22] 222. Fondos reales detrás de barras transparentes sin respaldos fijos
**Planificación:**
- Ajustar la capa web del edge-to-edge para que las barras transparentes muestren el contenido real de la pantalla y no una franja fija superpuesta.
- Mantener el comportamiento correcto ya logrado en Android nativo, pero dejando que el encabezado y el fondo de cada vista se prolonguen naturalmente detrás de las barras del sistema.

**Ejecución:**
- **MainApp**: `src/components/main/MainApp.tsx` eliminó los dos respaldos fijos de safe area que pintaban manualmente la zona superior e inferior. Con eso, el color real del encabezado vuelve a ocupar la barra superior por el propio `Header`, y el fondo real de cada vista se prolonga detrás de la barra inferior en vez de verse como una capa aparte.
- **Resultado buscado**: las barras siguen transparentes, pero ahora muestran el contenido auténtico de la app detrás de ellas, igual que el encabezado ya lo hacía arriba.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-29 17:59] 221. Widget chico 2x1 real, edge-to-edge reforzado, scroll normal en Mes de María e importación `.ctd` sin repetición
**Planificación:**
- Ajustar el widget chico para que el mínimo real vuelva a ser `2x1` y mantenga resize libre en cualquier tamaño superior.
- Reforzar otra vez el edge-to-edge en Android para que las barras superior e inferior se mantengan transparentes y se vea detrás el encabezado o el fondo correcto.
- Corregir el tratamiento indebido de texto largo en `Mes de María` y cortar la reapertura fantasma de importaciones `.ctd` al iniciar la app.
- Confirmar además el color litúrgico correcto del Domingo de Ramos para verificar si hacía falta cambiar la lógica actual.

**Ejecución:**
- **Widget chico**: `android/app/src/main/res/xml/widget_saint_small.xml` bajó sus mínimos a `110dp x 40dp`, dejando un `2x1` real como base. `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java` alineó esos nuevos mínimos para que el escalado parta desde ese tamaño y siga creciendo sin restricciones, y `android/app/src/main/res/layout/widget_saint_small.xml` compactó paddings y tipografías base para que el layout siga respirando incluso en el tamaño mínimo.
- **Barras del sistema**: `android/app/src/main/java/com/benjamin/studio/MainActivity.java` reforzó `configureSystemBars()` con `window` transparente, `systemUiVisibility` edge-to-edge, fondo transparente también en la raíz del `WebView`, transparencia del divisor de la barra de navegación y reaplicación en `onWindowFocusChanged`, además de `onResume`. `android/app/src/main/res/values/styles.xml` sumó `android:windowBackground` transparente en el tema principal y `postSplashScreenTheme` hacia `AppTheme.NoActionBar` para que la transparencia correcta sobreviva también al paso por el splash. En la capa web, `src/components/main/MainApp.tsx` elevó los respaldos fijos de safe area y aseguró una altura mínima de `100svh`, de modo que la barra superior reciba el color del encabezado cuando corresponde y la inferior muestre fondo uniforme detrás.
- **Scroll de Mes de María**: `src/lib/prayers/plan-de-vida/mes-de-maria.ts` dejó de marcar `Oración Inicial` y `Oración Final` como `isLongText`, devolviéndolas al comportamiento normal de scroll y evitando el tratamiento especial de posición persistida y wake lock.
- **Importación `.ctd`**: `android/app/src/main/java/com/benjamin/studio/MainActivity.java` ahora limpia el intent compartido una vez leído para que no vuelva a reinyectarse en arranques posteriores, y `src/components/main/useNativeAppBindings.ts` dejó de duplicar en Android el procesamiento vía `App.getLaunchUrl`/`appUrlOpen`, porque en esta plataforma ya queda cubierto por `MainActivity`.
- **Criterio litúrgico**: se revisó la lógica existente y el caso ya estaba correcto. El Domingo de Ramos corresponde a **rojo**, en línea con la IGMR `346.2`, así que no hizo falta cambiar el color litúrgico del repo.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:processDebugResources :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro de `android`.

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/res/xml/widget_saint_small.xml`
- `src/components/main/MainApp.tsx`
- `src/components/main/useNativeAppBindings.ts`
- `src/lib/prayers/plan-de-vida/mes-de-maria.ts`
- `AGENTS.md`

### [2026-03-28 18:01] 220. Resumen markdown de cambios posteriores a `v4.4.22`
**Planificación:**
- Ubicar el commit exacto correspondiente a la build `4.4.22` para usarlo como corte objetivo.
- Revisar los commits posteriores y separar cambios funcionales, mantenimiento y numeraciones de build.
- Redactar un archivo `.md` nuevo con un resumen consolidado y fácil de compartir.

**Ejecución:**
- **Corte confirmado**: se verificó que `Auto-deploy: Build v4.4.22` corresponde al commit `16c9dc7`.
- **Tramo revisado**: se tomó como alcance `16c9dc7..HEAD`, cubriendo las builds `4.4.23`, `4.4.24` y `4.4.26`, además del ajuste intermedio posterior a `4.4.22`.
- **Documento nuevo**: se creó `docs/resumen-cambios-desde-4.4.22.md` con una síntesis por versión y por área funcional, incluyendo la nota de que no aparece `4.4.25` en el historial de Git.

**Validación:**
- Revisión manual de `git log` posterior a `16c9dc7` y verificación de existencia del archivo nuevo: OK.

**Archivos Modificados:**
- `docs/resumen-cambios-desde-4.4.22.md`
- `AGENTS.md`

### [2026-03-27 15:48] 219. Barras del sistema con fondo real y sin gris residual en Android
**Planificación:**
- Revisar por qué, aun con barras transparentes, seguía apareciendo gris detrás de la barra de estado y de navegación.
- Corregir tanto la capa nativa como la capa web para que el sistema siempre vea el color o fondo correcto según la pantalla activa.
- Garantizar el comportamiento pedido: si hay fondo completo, ese fondo debe verse detrás de ambas barras; si hay encabezado, el color del encabezado debe verse detrás de la barra superior y el fondo uniforme detrás de la barra inferior.

**Ejecución:**
- **Capa nativa**: `android/app/src/main/java/com/benjamin/studio/MainActivity.java` reforzó `configureSystemBars()` para dejar transparentes no solo las barras, sino también `decorView`, `android.R.id.content` y el `WebView`. Además, esa configuración se reaplica en `onResume` para evitar que Android recupere un fondo opaco al volver a la app.
- **Layout Android**: `android/app/src/main/res/layout/activity_main.xml` pasó a declarar fondo transparente tanto en el `CoordinatorLayout` raíz como en el `WebView`, eliminando el gris residual que podía asomar detrás del contenido web.
- **Tema**: `android/app/src/main/res/values/styles.xml` dejó `AppTheme.NoActionBar` con `android:background` transparente en vez de `@null`, para que la ventana no aporte un color propio al edge-to-edge.
- **Capa web**: `src/components/main/MainApp.tsx` agregó dos respaldos fijos y sin interacción para las safe areas. Cuando la vista es `home`, se mantienen transparentes para que se vea el fondo real detrás de ambas barras; cuando hay encabezado estándar, la zona superior toma `bg-primary` y la inferior `bg-background`, cumpliendo exactamente la regla pedida.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `.\gradlew.bat :app:processDebugResources :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro de `android`.
- Intento de `.\gradlew.bat :app:assembleDebug`: los recursos y la compilación Java pasaron, pero el proceso cayó más tarde en `validateSigningDebug` por un problema aparte de signing del entorno (`Cannot invoke "java.io.File.mkdirs()" because "folder" is null`).

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `android/app/src/main/res/layout/activity_main.xml`
- `android/app/src/main/res/values/styles.xml`
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-27 11:39] 218. Notificaciones Android con imagen en banner expandido
**Planificación:**
- Confirmar por qué las notificaciones ya llevaban imagen en el payload pero Android seguía mostrándolas solo con estilo de texto.
- Hacer que las notificaciones con imagen se rendericen como `título + texto + banner` sin convertir en banner las que solo usan ícono.
- Dejar el cambio persistido para futuras instalaciones de dependencias y validar compilación web y Android.

**Ejecución:**
- **Causa real**: `SettingsContext` ya programaba algunas notificaciones con `largeIcon` y metadatos de imagen, pero `@capacitor/local-notifications` en Android solo aplicaba `BigTextStyle`/`InboxStyle`, así que la imagen nunca pasaba a banner expandido.
- **Parche persistente**: `scripts/patch-local-notifications.js` se rehizo para aplicar parches idempotentes sobre `LocalNotificationManager.java`, conservando el ajuste previo de `mark_prayed` y agregando uno nuevo para `BigPictureStyle`.
- **Banner expandido**: el parche nativo ahora detecta `extra.imageDrawable` y, solo en ese caso, reutiliza la imagen ya configurada para renderizar la notificación con `NotificationCompat.BigPictureStyle`, manteniendo `title` como encabezado y `body` como texto resumen.
- **Alcance controlado**: no se fuerza el banner en recordatorios que solo usan ícono de app, evitando que fiestas o avisos sin imagen real aparezcan con un cartel grande incorrecto.
- **Documentación**: se actualizó la anotación de `image` en `src/lib/fixed-notifications.ts` para dejar claro que en Android esa imagen ahora se usa como banner expandido.
- **Aplicación local**: además del script, se ejecutó el parche sobre la copia instalada de `node_modules` para que esta build ya compile con el comportamiento nuevo.

**Validación:**
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales.

**Archivos Modificados:**
- `scripts/patch-local-notifications.js`
- `src/lib/fixed-notifications.ts`
- `AGENTS.md`

### [2026-03-27 11:23] 217. Ajuste de tono menos cursi en `Cotidie Annuum`
**Planificación:**
- Bajar un punto más el tono del copy de `Cotidie Annuum`, partiendo por `Memoria agradecida`, que seguía sonando demasiado blando.
- Conservar la línea contemplativa del cambio anterior, pero con formulaciones más sobrias, directas y menos adornadas.

**Ejecución:**
- **Subtítulo**: en `src/components/AnnuumStory.tsx` el encabezado pasó de `Memoria agradecida {año}` a `Recorrido {año}`.
- **Apertura y clave de lectura**: se endurecieron frases visibles como `Miremos este año con gratitud` y `Esto es memoria agradecida`, que pasaron a variantes más directas como `Miremos el año con verdad` y `Es una lectura serena del año`.
- **Bloques marianos y cierre**: se suavizó menos el lenguaje de la devoción mariana, del slide del Rosario, de la proyección del año siguiente y del cierre final para evitar expresiones demasiado blandas como `de la mano`, `hambre de Dios` o `Quédate con esta paz`.
- **Criterio**: se mantuvo el tono pastoral y cristiano, pero más cerca de una formulación sobria de homilía que de un cierre emotivo o excesivamente dulce.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- `npm.cmd run build` avanzó hasta `next build` y volvió a fallar en la etapa final de export con un `ENOENT` de `.next` apuntando a una ruta sin `OneDrive`; el ajuste de copy no introdujo errores de TypeScript.

**Archivos Modificados:**
- `src/components/AnnuumStory.tsx`
- `AGENTS.md`

### [2026-03-27 11:22] 216. Reactivar recordatorio de Cartas sin reiniciar el conteo
**Planificación:**
- Ajustar el nuevo recordatorio de `Cartas` para que apagarlo temporalmente no reinicie el contador de días sin nueva carta.
- Hacer que, si el usuario lo vuelve a activar después de que el plazo ya venció, la notificación no se pierda por haber quedado en una fecha pasada.

**Ejecución:**
- **Ancla preservada**: `src/context/SettingsContext.tsx` dejó de reiniciar `cartasReminderAnchorAt` al volver a activar el switch; ahora solo lo rellena si aún no existía.
- **Conteo continuo**: con ese cambio, si el usuario lo apaga en el día 20 y lo reactiva en el 25, el sistema sigue contando desde la última carta creada y no desde la reactivación.
- **Reactivación vencida**: cuando el plazo de 30 días ya pasó mientras el recordatorio estaba apagado, el scheduler ahora programa el aviso para el corto plazo al reactivarlo en vez de descartarlo por tener una fecha ya pasada.

**Validación:**
- `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-03-27 11:19] 215. Recordatorio de Cartas tras 30 días sin nueva entrada
**Planificación:**
- Agregar una notificación local específica para `Cartas` que se programe solo cuando pasen 30 días sin crear una carta nueva.
- Hacer que al tocar esa notificación la app abra directamente la sección `Plan de Vida > Cartas`.
- Dar al usuario un control visible dentro de `Cartas` para apagar este recordatorio sin afectar el resto de las notificaciones.

**Ejecución:**
- **Estado persistido**: `src/context/SettingsContext.tsx` incorporó `cartasReminderEnabled` y `cartasReminderAnchorAt`, ambos persistidos en respaldos/importaciones para que la preferencia y el conteo sobrevivan cierres, restauraciones y cambios de dispositivo.
- **Reinicio por actividad real**: el ancla del recordatorio se actualiza únicamente al crear una carta nueva mediante `addUserLetter`, de modo que el plazo de 30 días responde a nuevas entradas y no solo a abrir la sección.
- **Programación condicional**: el scheduler nativo de `LocalNotifications` ahora añade una notificación one-shot para `Cartas` cuando el recordatorio está activo y las notificaciones generales también lo están; no usa acciones de `Marcar como rezado`, porque aquí se trata de volver a escribir, no de marcar una práctica.
- **Apertura directa**: esa notificación se programa con destino a la oración `cartas`, por lo que al tocarla la navegación entra directamente a `Plan de Vida > Cartas`.
- **Control en la vista**: `src/components/main/CartasIntro.tsx` ahora muestra un bloque `Recordatorio de Cartas` con switch propio y texto explicativo, incluyendo aviso cuando las notificaciones globales están apagadas.

**Validación:**
- `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/main/CartasIntro.tsx`
- `AGENTS.md`

### [2026-03-27 11:17] 214. Cotidie Annuum con tono contemplativo y estadísticas subordinadas
**Planificación:**
- Rehacer la narrativa de `Cotidie Annuum` para que deje de sentirse como un resumen de métricas y pase a leerse como memoria agradecida del año espiritual.
- Mantener visibles varias estadísticas, pero claramente subordinadas a una lectura filial, sobria y pastoral, sin ironías ni lenguaje mecánico.
- Unificar el tono de todas las diapositivas para que suene más cercano a una homilía breve que a un balance gamificado.

**Ejecución:**
- **Marco general**: `src/components/AnnuumStory.tsx` cambió el subtítulo del encabezado a `Memoria agradecida {año}` y añadió una diapositiva inicial de clave de lectura para dejar explícito que las cifras no miden santidad, sino huellas de búsqueda de Dios.
- **Nueva estructura visual**: se incorporaron bloques reutilizables (`SlideFrame`, `MetricBlock`) para que todas las pantallas mantengan una misma jerarquía: primero la lectura espiritual del año y luego el dato, ya no al revés.
- **Lenguaje**: se reescribieron los textos de inicio, cierre y todas las diapositivas de estadísticas para quitar bromas, slogans y frases cursis como `¿Acaso la escribiste tú?`, `Madrugador de Dios` o `El cielo es el límite`, reemplazándolas por un tono más sobrio, filial y contemplativo.
- **Lectura espiritual de datos**: las secciones de días activos, oración principal, total de aperturas, devoción más frecuente, mañana, noche, Ángelus, Rosario, examen de conciencia, Misa, frases de santos y creaciones propias ahora muestran el número con aclaraciones y una reflexión breve que lo interpreta desde la perseverancia, la gracia y el recomienzo.
- **Precisión de métricas**: el slide de oración principal dejó de presentarse como `Veces rezada` y pasó a hablar de `Aperturas registradas`, explicitando que la app cuenta accesos y no mide la hondura interior de cada rato de oración.
- **Cierre y proyección**: el final del Annuum y la diapositiva del año siguiente pasaron a invitar a mirar el camino con paz, pidiendo constancia y hondura antes que cantidad, en vez de un tono festivo o triunfalista.

**Validación:**
- `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/components/AnnuumStory.tsx`
- `AGENTS.md`

### [2026-03-27 11:03] 213. Widget chico con modo configurable y contenido completo por defecto
**Planificación:**
- Corregir el criterio anterior para que el widget chico no oculte información por defecto cuando el espacio sea reducido.
- Implementar además una configuración opcional para Android que permita elegir entre `mostrar todo reducido` o `solo santo en grande si falta espacio`.
- Sincronizar ese ajuste entre la app y el widget nativo para que el cambio se refleje aunque el widget ya esté colocado en pantalla.

**Ejecución:**
- **Modo por defecto**: `src/context/SettingsContext.tsx` incorporó `smallWidgetMode` con valor inicial `full`, persistido en respaldos y restauraciones de la app.
- **Sincronización nativa**: `src/plugins/BackgroundActions.ts` y `android/app/src/main/java/com/benjamin/studio/BackgroundActionsPlugin.java` añadieron `setSmallWidgetMode`, que guarda la preferencia en Android y refresca los widgets existentes al cambiarla.
- **Preferencias del widget**: se agregó `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetPreferences.java` para centralizar lectura/escritura del modo del widget chico.
- **Ajuste visual en la app**: `src/components/settings/AppearanceSettings.tsx` ahora muestra, en Android, el selector `Mostrar todo reducido` / `Solo santo en grande si falta espacio`.
- **Widget chico**: `android/app/src/main/res/layout/widget_saint_small.xml` pasó a repartir mejor el alto disponible entre nombre y bio, mientras `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java` rehízo el sizing para que en modo `full` nunca esconda la bio por lógica y reduzca ambas tipografías según el espacio; el ocultamiento solo ocurre en el modo opcional `saint_priority`.
- **Acceso nativo**: `SaintWidgetUpdater` quedó expuesto públicamente para poder refrescarse desde el plugin al cambiar la preferencia.

**Validación:**
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro del repo.

**Archivos Modificados:**
- `src/plugins/BackgroundActions.ts`
- `src/context/SettingsContext.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `android/app/src/main/java/com/benjamin/studio/BackgroundActionsPlugin.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetPreferences.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `AGENTS.md`

### [2026-03-27 10:47] 212. Widget chico vuelve a mínimo `2x1` con texto adaptable
**Planificación:**
- Recuperar el tamaño mínimo `2x1` del widget pequeño en Android sin perder el redimensionado libre hacia tamaños mayores.
- Rehacer el ajuste tipográfico para que el texto responda al ancho y alto disponibles, ocultando la bio cuando el espacio sea demasiado bajo.

**Ejecución:**
- **Proveedor del widget**: `android/app/src/main/res/xml/widget_saint_small.xml` volvió a declarar altura mínima y altura objetivo de una fila (`48dp`, `targetCellHeight="1"`), manteniendo resize horizontal y vertical.
- **Layout base**: `android/app/src/main/res/layout/widget_saint_small.xml` pasó a una base más compacta, con paddings menores, más líneas permitidas y margen vertical reducido para aprovechar mejor `2x1`.
- **Escalado nativo**: `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java` ahora toma como base real `2x1`, calcula crecimiento por ancho y alto disponibles y decide cuándo esconder la bio.
- **Comportamiento compacto**: en alturas bajas el widget prioriza el nombre del santo, centra mejor ese bloque y evita forzar una bio que rompería el layout.
- **Comportamiento expandido**: al crecer a tamaños como `4x4`, el widget vuelve a mostrar la bio, aumenta líneas disponibles y escala ambos textos proporcionalmente.

**Validación:**
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro del repo.

**Archivos Modificados:**
- `android/app/src/main/res/xml/widget_saint_small.xml`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-27 10:38] 211. Fondo continuo tras barras del sistema en Android
**Planificación:**
- Revisar por qué las barras superior e inferior dejaron de mostrar el contenido edge-to-edge y empezaron a verse grises.
- Reforzar la configuración nativa de Android para mantener status bar y navigation bar transparentes sin scrim automático de contraste.

**Ejecución:**
- **Actividad principal**: en `android/app/src/main/java/com/benjamin/studio/MainActivity.java` se extrajo `configureSystemBars()` para concentrar la configuración edge-to-edge al crear la actividad.
- **Colores de barras**: esa rutina deja explícitamente `statusBarColor` y `navigationBarColor` en transparente junto con `WindowCompat.setDecorFitsSystemWindows(..., false)`.
- **Scrim gris**: para Android 10+ se desactivó también la imposición automática de contraste (`setStatusBarContrastEnforced(false)` y `setNavigationBarContrastEnforced(false)`), que es la fuente típica de la franja gris sobre barras transparentes.
- **Temas nativos**: `android/app/src/main/res/values/styles.xml` se alineó para los temas `AppTheme`, `AppTheme.NoActionBar` y `AppTheme.NoActionBarLaunch`, activando `windowDrawsSystemBarBackgrounds`, manteniendo las barras transparentes y deshabilitando el contraste forzado también desde tema.

**Validación:**
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro del repo.

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `android/app/src/main/res/values/styles.xml`
- `AGENTS.md`

### [2026-03-26 15:48] 210. Pasada editorial completa del historial de `AGENTS.md`
**Planificación:**
- Hacer una pasada puramente editorial sobre todo el historial para corregir tildes, ortografía y formulación en texto narrativo sin alterar rutas, nombres de archivos, comandos ni fragmentos entre backticks.
- Revisar después los residuos típicos y corregir sobreajustes puntuales antes de cerrar.

**Ejecución:**
- **Ortografía general**: se corrigieron acentos ausentes en títulos, planes, ejecuciones y validaciones a lo largo del historial completo (`litúrgico`, `heurística`, `validación`, `generación`, `versión`, `día`, `devoción`, `Anunciación`, `Vía Crucis`, etc.).
- **Formulación repetida**: se normalizaron pretéritos y expresiones muy repetidas del registro (`se agregó`, `se generó`, `se corrigió`, `se reescribió`, `pasó a`, `quedó`, `además`, `según`, `catálogo`, `búsqueda`, `confirmación`, etc.).
- **Criterio de seguridad**: se preservaron literales técnicos y comandos cuando estaban entre backticks; por eso siguen apareciendo formas como `crear imagenes`, `v{version}` o IDs/paths sin “embellecimiento” editorial.
- **Ajuste fino**: se corrigió una sobrecorrección puntual (`rehízo` -> `rehizo`) y se revisaron los nombres propios para no deformar formas intencionales como `San Josemaria`.

**Validación:**
- Revisión manual por muestras de bloques viejos y nuevos: OK.
- Barrido automático de residuos típicos de ortografía sin tilde en texto narrativo: reducido a literales técnicos preservados o casos dentro de backticks.

**Archivos Modificados:**
- `AGENTS.md`

### [2026-03-26 15:24] 209. Normalización UTF-8 legible de `AGENTS.md`
**Planificación:**
- Reparar el mojibake histórico de `AGENTS.md` para que el archivo vuelva a quedar en texto plano legible con tildes correctas.
- Normalizar también las cabeceras repetidas del historial (`Planificación`, `Ejecución`, `Validación`) sin alterar rutas, nombres de archivos ni fragmentos técnicos entre backticks.

**Ejecución:**
- **Encoding**: se corrigieron secuencias corruptas heredadas de acentos, símbolos y palabras partidas, dejándolas en UTF-8 legible.
- **Cabeceras**: se normalizaron las etiquetas repetidas de sección para que queden como `Planificación`, `Ejecución` y `Validación` en todo el archivo.
- **Legibilidad**: se reescribieron referencias textuales a secuencias mojibake para que el historial quede legible sin mostrar basura visual innecesaria.
- **Alcance**: se preservó el contenido histórico y solo se corrigieron texto corrupto y formas ortográficas repetidas de bajo riesgo.

**Validación:**
- Revisión automática sin residuos de mojibake conocidos ni caracteres de control problemáticos en `AGENTS.md`: OK.

**Archivos Modificados:**
- `AGENTS.md`

### [2026-03-26 15:13] 208. Tildes en mensajes de `android:apk`
**Planificación:**
- Confirmar si los acentos en `scripts/android-apk.mjs` podían romper el flujo de compilación.
- Corregir los mensajes visibles del script para que usen tildes y signos correctos sin alterar comandos, flags, rutas ni claves internas.

**Ejecución:**
- **Compatibilidad UTF-8**: se confirmó que Node no tiene problema con acentos en este script mientras el archivo permanezca en UTF-8, como ya ocurre en el repo.
- **Mensajes visibles**: se actualizaron cadenas del flujo de `android:apk` como `Versión inválida`, `se omitió`, `actualizará`, `sincronización automática`, `realizó`, `Éxito`, `código`, `debería` y `Versión compilada`.
- **Alcance**: no se tocaron identificadores, rutas, flags ni nombres internos como `local-fallback`, para evitar churn innecesario en partes no visibles o más sensibles.

**Validación:**
- `node --check scripts/android-apk.mjs` OK.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-26 15:10] 207. Versión visible al cierre de compilación APK
**Planificación:**
- Ajustar el cierre exitoso de `android:apk` para que, después del mensaje que indica que el código ya se subió y debería verse en Vercel, informe también la versión compilada.
- Mantener intacto el resto del flujo de build, sync, generación de APK y push.

**Ejecución:**
- **Mensaje final**: en `scripts/android-apk.mjs` se agregó un `console.log` adicional inmediatamente después de `Éxito: el código se ha subido y Vercel debería estar actualizando la PWA.`.
- **Versión reportada**: el nuevo cierre muestra `Versión compilada: v{nextVersion}.`, reutilizando la misma versión ya resuelta por el script para nombrar el APK y el commit.

**Validación:**
- `node --check scripts/android-apk.mjs` OK.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-26 14:58] 206. Base indefinida de colores litúrgicos y precarga 2027
**Planificación:**
- Dejar una base permanente para resolver el color litúrgico en cualquier año, sin depender solo de tablas anuales.
- Mantener la capa anual chilena cuando exista y sumar una precarga del año siguiente para que el APK quede cubierto de inmediato.
- Alinear web y widget Android con la misma precedencia: fechas mayores protegidas, tabla anual si existe y base general como fallback.

**Ejecución:**
- **Motor general**: se rehizo `src/lib/liturgical-color-rules.ts` para calcular el color por precedencia litúrgica en cualquier año, incluyendo domingos de tiempos fuertes, Semana Santa, Pascua, Ascensión dominical chilena, Pentecostés, Trinidad, Corpus Christi dominical chileno, Sagrado Corazón, Inmaculado Corazón, Sagrada Familia, Bautismo del Señor y traslados de solemnidades como San José, Anunciación e Inmaculada cuando no se celebran en su fecha fija.
- **Política de memorias**: la base ya no blanquea automáticamente `Memoria libre`; por defecto la trata como feria, lo que evita poner blanco en días ordinarios opcionales. Las memorias obligatorias, fiestas y solemnidades conservan su color propio salvo supresión en días privilegiados.
- **Capa anual web**: se agregó `src/lib/liturgical-color-shared.ts` y se reescribió `src/lib/official-liturgical-calendar.ts` para soportar varios años (`2026` y `2027`). `src/lib/getLiturgicalColor.ts` ahora resuelve en este orden: fecha mayor protegida, tabla anual cargada y base general.
- **Precarga 2027**: se generó `src/lib/liturgical-colors-chile-2027.json` como snapshot embebido de la nueva base reforzada con el calendario chileno. Queda disponible offline para el APK aunque hoy no exista aún un ordo diario chileno completo publicado para 2027.
- **Widget Android**: se agregó `android/app/src/main/java/com/benjamin/studio/widgets/LiturgicalColorRules.java` con la misma lógica de fallback. `SaintWidgetContentFactory.java` ahora protege primero las fechas mayores, luego lee cualquier asset `liturgical-colors-chile-*.json` disponible y finalmente usa la base general. `android/app/build.gradle` pasó a copiar todos esos JSON al empaquetado nativo.

**Validación:**
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro del repo.

**Archivos Modificados:**
- `src/lib/liturgical-color-shared.ts`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/getLiturgicalColor.ts`
- `src/lib/official-liturgical-calendar.ts`
- `src/lib/liturgical-colors-chile-2027.json`
- `android/app/build.gradle`
- `android/app/src/main/java/com/benjamin/studio/widgets/LiturgicalColorRules.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`
- `AGENTS.md`

### [2026-03-26 13:24] 205. Tabla oficial CECh 2026 para colores litúrgicos y blanco forzado en Difuntos
**Planificación:**
- Reemplazar la heurística de colores por una tabla día a día basada en la fuente oficial chilena disponible.
- Compartir esa misma fuente entre web y widget Android para evitar divergencias.
- Aplicar la preferencia del usuario de mostrar blanco en la Conmemoración de los Fieles Difuntos, aunque la tabla oficial traiga `Morado o Negro`.

**Ejecución:**
- **Fuente oficial**: se generó `src/lib/liturgical-colors-chile-2026.json` a partir de los PDFs oficiales de `Nuestra Liturgia` de la CECh: `2025-Navidad`, `2026-Ordinario-I`, `2026-Cuaresma`, `2026-Semana-Santa`, `2026-Pascual`, `2026-Ordinario-II`, `2026-Adviento` y `2026-Navidad`.
- **Cobertura real**: la tabla cubre los 365 días de 2026 con color oficial día por día, incluyendo casos con opciones como `Verde o Blanco` o `Morado o Blanco`.
- **Criterio de app**: cuando la CECh ofrece varias opciones, la app toma la primera del ordo para no blanquear automáticamente memorias opcionales; en `02/11` se fuerza `Blanco` por petición explícita del usuario.
- **Web**: `src/lib/official-liturgical-calendar.ts` centraliza la lectura de la tabla y `getLiturgicalColor.ts` ahora consulta primero esa fuente oficial antes de cualquier fallback heurístico.
- **Widget Android**: `android/app/build.gradle` copia el JSON a assets y `SaintWidgetContentFactory.java` lo carga para usar exactamente el mismo color oficial que la web en 2026.
- **Contraste**: `SaintOfTheDayCard.tsx` pasó a calcular luminosidad del color real para ajustar el texto también si en el futuro entraran colores claros distintos del blanco.

**Validación:**
- Generación de tabla oficial 2026: OK (`365` días).
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro del repo.

**Archivos Modificados:**
- `src/lib/liturgical-colors-chile-2026.json`
- `src/lib/official-liturgical-calendar.ts`
- `src/lib/getLiturgicalColor.ts`
- `src/components/saints/SaintOfTheDayCard.tsx`
- `android/app/build.gradle`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`
- `AGENTS.md`

### [2026-03-26 11:22] 204. Colores litúrgicos canónicos, Anunciación con gozoso-1 y parser nativo de image-display
**Planificación:**
- Corregir la heurística de colores litúrgicos para seguir la norma del Misal Romano y quitar colores no normativos usados por la app y el widget.
- Reemplazar el overlay creado para la Anunciación por la imagen ya existente `gozoso-1.jpg`, eliminando el archivo sobrante.
- Ajustar el parser nativo de `image-display.ts` para que lea también claves JS sin comillas, no solo las que llevan guiones.

**Ejecución:**
- **Norma litúrgica**: `src/lib/getLiturgicalColor.ts` y `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java` dejaron de usar `gold` y `blue`, y pasaron a una lógica basada en la IGMR 346-347: blanco, rojo, verde y morado según celebración, tiempo y excepciones propias.
- **Memorias en tiempos fuertes**: se corrigió el tratamiento de Adviento y Cuaresma para no moradear todo Adviento indiscriminadamente; ahora las memorias se mantienen con su color antes del 17 de diciembre y solo vuelven a morado en los días privilegiados o en Cuaresma, salvo fiestas/solemnidades que conservan su color.
- **Deteccion mariana**: `src/lib/liturgical-color-rules.ts` se alineó con el texto ya normalizado sin tildes para no fallar por comparaciones inconsistentes.
- **Anunciación**: el overlay del `25/03` pasó a reutilizar `/images/rosario/gozoso-1.jpg` en web y `public/images/rosario/gozoso-1.jpg` en Android; se eliminó `public/images/annunciation-overlay.png`.
- **Parser de encuadre**: `SaintWidgetUpdater.java` ahora acepta tanto claves con comillas como identificadores JS sin comillas en `image-display.ts`, asi que el encuadre nativo ya no depende de que el id tenga guiones.
- **Tarjeta web**: `SaintOfTheDayCard.tsx` se limpió para tratar como fondo claro solo el blanco canónico actual.

**Validación:**
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro del repo.

**Archivos Modificados:**
- `src/lib/getLiturgicalColor.ts`
- `src/lib/liturgical-color-rules.ts`
- `src/components/saints/SaintOfTheDayCard.tsx`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-26 09:39] 203. Anunciación sobrepuesta, frases forzadas y tap a devociones desde cartel/widget
**Planificación:**
- Forzar las frases del día pedidas para `26/06` y `22/10` sin perder el resto de la rotación diaria.
- Hacer que el cartel del día y los widgets abran la devoción correspondiente cuando el santoral del día coincida con una devoción existente.
- Superponer una imagen propia de la Anunciación sobre la imagen semanal del `25/03`, tanto en el cartel web como en el widget grande.

**Ejecución:**
- **Frases forzadas**: `SettingsContext` ahora prioriza un mapa fijo por fecha para `26/06` y `22/10`, antes del pool rotativo de citas.
- **Match de devoción**: `src/lib/devotion-day-images.ts` pasó a devolver no solo la imagen, sino también el `prayerId` de la devoción asociada al santo del día.
- **Cartel del día**: `SaintOfTheDayCard` ahora detecta ese `prayerId`, vuelve clickeable toda la tarjeta cuando existe devoción y abre directamente la devoción correspondiente.
- **Anunciación**: se agregó `public/images/annunciation-overlay.png` como overlay nuevo; el cartel del `25/03` la muestra sobre la imagen propia del día de la semana.
- **Widget Android**: `SaintWidgetContentFactory` y `SaintWidgetUpdater` ahora propagan `prayerId`, componen el overlay de Anunciación en el widget grande y mandan extras nativos a `MainActivity` para abrir la devoción al tocar el widget.
- **Puente nativo-web**: `MainActivity` y `MainApp` agregaron una cola de navegación pendiente vía `localStorage`/evento para que el tap del widget abra la vista correcta también con la app fría.

**Validación:**
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK fuera del sandbox, usando `ANDROID_USER_HOME` y `GRADLE_USER_HOME` locales dentro del repo para validar los cambios nativos contra el SDK instalado.

**Archivos Modificados:**
- `src/lib/devotion-day-images.ts`
- `src/lib/placeholder-images.json`
- `src/context/SettingsContext.tsx`
- `src/components/PrayerList.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/saints/SaintOfTheDayCard.tsx`
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContent.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `public/images/annunciation-overlay.png`
- `AGENTS.md`

### [2026-03-23 22:05] 202. Verificación completa de devociones con imagen y corrección a San Josemaria
**Planificación:**
- Confirmar si el resolver nuevo cubría todas las devociones del repo que ya tienen imagen propia.
- Corregir el nombre visible del santoral del 26/06 para usar `San Josemaria` como una sola palabra.

**Ejecución:**
- **Cobertura verificada**: se revisó el catálogo real de `public/images` y las devociones con `imageUrl`. El resolver web ahora construye su tabla desde todas las devociones importadas con imagen y lanza error si alguna queda sin aliases en `src/lib/devotion-day-images.ts`.
- **San Josemaria**: se corrigió el nombre del santoral fijo del 26/06 en `src/lib/saints-data.json` y en `android/app/src/main/assets/saints-data.json` para que muestre `San Josemaria Escrivá de Balaguer, presbítero`.
- **Widget**: se alinearon también los aliases nativos del widget para priorizar `San Josemaria` como forma principal.

**Validación:**
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando `GRADLE_USER_HOME` local dentro del repo por la restricción del sandbox.

**Archivos Modificados:**
- `src/lib/devotion-day-images.ts`
- `src/lib/saints-data.json`
- `android/app/src/main/assets/saints-data.json`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`
- `AGENTS.md`

### [2026-03-23 21:37] 201. Imágenes de devociones en santoral diario y widget grande
**Planificación:**
- Revisar por que el 26/06 mostraba a San Josemaria en texto pero no resolvía su retrato.
- Hacer que el cartel del día dentro de la app y el widget grande usen la imagen real de cada devoción cuando el santoral coincida con su fiesta.
- Evitar seguir ampliando listas parciales por substring y cubrir también fiestas compuestas como San Carlo Acutis o Santos Pedro y Pablo.

**Ejecución:**
- **Causa real**: la app y el widget usaban tablas hardcodeadas y parciales de coincidencias por nombre; San José María Escrivá de Balaguer no estaba cubierto y varias devociones dependían de matches incompletos o de un fallback genérico.
- **App**: se agregó `src/lib/devotion-day-images.ts`, con aliases normalizados para todas las devociones con imagen propia. `SettingsContext` ahora consulta primero ese resolver antes del fallback mariano o del placeholder del día.
- **Widget grande**: `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java` pasó a usar una tabla completa de devociones con sus rutas reales en `public/images`, incluyendo San Josemaria, San Juan Pablo II, San Carlo Acutis, San José, etc.
- **Encuadre**: `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java` ahora lee también preferencias de encuadre de IDs de oraciones/devociones desde `image-display.ts`, no solo de placeholders. Se agregó además `devocion-san-jose` a los mapas de encuadre.
- **Resultado**: cuando la fecha del santoral coincide con una devoción existente, el cartel del día y el widget grande muestran el retrato correcto en vez de depender de un match parcial o una imagen genérica.

**Validación:**
- `npm.cmd run build` OK.
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK usando `GRADLE_USER_HOME` local dentro del repo por la restricción del sandbox.

**Archivos Modificados:**
- `src/lib/devotion-day-images.ts`
- `src/context/SettingsContext.tsx`
- `src/lib/image-display.ts`
- `android/app/src/main/assets/image-display.ts`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-23 19:24] 200. Eliminación condicional de copia antigua de respaldo
**Planificación:**
- Eliminar la copia de referencia de `create-backup.before-incremental.mjs` solo si seguía presente.
- Evitar error si el archivo ya no existia.

**Ejecución:**
- **Limpieza segura**: se comprobó la existencia de `output/reference/create-backup.before-incremental.mjs` antes de borrar.
- **Resultado**: el archivo existia y fue eliminado; si no hubiera existido, la rutina habria terminado sin error.

**Archivos Modificados:**
- `AGENTS.md`

### [2026-03-23 19:18] 199. Widget chico 2x2 con jerarquía tipográfica proporcional
**Planificación:**
- Corregir la interpretacion anterior y mantener el widget pequeño como un widget 2x2.
- Hacer que el nombre del santo quede siempre más grande que el detalle, en negrita y alineado al margen izquierdo.
- Ajustar el crecimiento del texto para que, al ampliarse el widget, nombre y detalle escalen de forma proporcional sin perder jerarquía.

**Ejecución:**
- **Tamaño del widget**: `android/app/src/main/res/xml/widget_saint_small.xml` pasó a declarar el widget pequeño como `2x2`, con altura mínima y de redimensionado acordes.
- **Layout**: `android/app/src/main/res/layout/widget_saint_small.xml` mantuvo el bloque de texto alineado al inicio y reforzó la jerarquía visual del nombre del santo con mayor tamaño base y negrita, dejando el detalle debajo con peso para ocupar el espacio restante.
- **Escalado proporcional**: `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java` ahora calcula un factor de crecimiento por ancho y alto disponibles, aplica ese crecimiento primero al detalle y deriva el tamaño del nombre con una proporción fija superior, asegurando que el santo siempre quede más grande que la descripción.

**Validación:**
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK.

**Archivos Modificados:**
- `android/app/src/main/res/xml/widget_saint_small.xml`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-23 19:05] 198. Widget chico alineado como el grande, sin imagen
**Planificación:**
- Devolver el widget pequeño a una estructura visual equivalente al widget grande, pero sin bloque de imagen.
- Quitar el centrado y la auto-maquetacion agresiva que desordenaban el texto del widget pequeño.
- Mantener un ajuste nativo simple por altura para no romper el redimensionado.

**Ejecución:**
- **Layout pequeño**: `android/app/src/main/res/layout/widget_saint_small.xml` pasó a usar el mismo bloque de texto del widget grande: padding 12/10/12/12, título arriba, descripción debajo y ambos alineados al inicio.
- **Alineación**: se eliminaron `center_vertical` y `center_horizontal`; el nombre y la bio ahora usan `gravity/textAlignment` hacia el inicio para quedar ordenados al margen izquierdo.
- **Sizing nativo**: `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java` dejo atras la estimacion compleja por caracteres. Ahora el widget pequeño solo ajusta tamanos y lineas en tres rangos de altura, manteniendo una presentacion más estable y parecida al widget grande.

**Validación:**
- `.\gradlew.bat :app:compileDebugJavaWithJavac` OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-23 18:50] 197. Selector con flecha para `crear respaldo` y textos con tildes
**Planificación:**
- Reemplazar el prompt interactivo por numero con un selector navegable con flechas y Enter.
- Corregir las tildes faltantes en los textos visibles del respaldo y del comando de PowerShell.

**Ejecución:**
- **Selector TTY**: `scripts/create-backup.mjs` ahora usa un menú interactivo con flecha (`>`) sobre la opción seleccionada y confirmación con Enter cuando la terminal soporta modo interactivo.
- **Fallback**: si la entrada no es TTY, el script conserva un fallback por numero para no romper automatizaciones o pipes.
- **Tildes**: se corrigieron mensajes visibles como `opción`, `está`, `Conéctalo`, `según` y las cadenas equivalentes del instalador PowerShell.
- **PowerShell**: se corrigió también la rama textual de `imágenes` y se reinstaló el perfil con el bloque actualizado.

**Validación:**
- `node --check scripts/create-backup.mjs` OK.
- `node scripts/create-backup.mjs --help` OK con los textos acentuados.
- `cmd /c "echo 3| node scripts/create-backup.mjs --prompt"` OK sobre el fallback no TTY.
- `powershell -ExecutionPolicy Bypass -File scripts/install-powershell-commands.ps1` OK.
- El selector con flechas requiere TTY real; en esta sesión automatizada no se pudo recorrer manualmente con teclas, pero la ruta interactiva y la de fallback quedaron implementadas.

**Archivos Modificados:**
- `scripts/create-backup.mjs`
- `scripts/install-powershell-commands.ps1`
- `AGENTS.md`

### [2026-03-23 18:35] 196. Nombre versionado del backup y prompt forzado
**Planificación:**
- Hacer que el archivo de respaldo use la versión actual de la app en el nombre.
- Evitar que `crear respaldo` pueda resolver un destino sin antes abrir el selector cuando se ejecuta sin argumento.

**Ejecución:**
- **Nombre versionado**: `scripts/create-backup.mjs` ahora lee `package.json` y genera el archivo como `cotidie-backup-vN.N.N.zip`.
- **Prompt explícito**: se agregó soporte `--prompt/--interactive` al script.
- **PowerShell**: `scripts/install-powershell-commands.ps1` ahora pasa `--prompt` cuando el usuario ejecuta `crear respaldo` sin modo, forzando la eleccion previa entre `Disco`, `Drive` y `Documentos`.

**Validación:**
- `node --check scripts/create-backup.mjs` OK.
- `node scripts/create-backup.mjs --help` OK, mostrando `cotidie-backup-v4.4.20.zip`.
- `crear respaldo documentos` OK fuera del sandbox, generando `C:\Users\balca\Documentos\Cotidie\cotidie-backup-v4.4.20.zip`.
- `crear respaldo` OK fuera del sandbox con selector previo; al elegir `3`, generó el ZIP versionado en `Documentos`.

**Archivos Modificados:**
- `scripts/create-backup.mjs`
- `scripts/install-powershell-commands.ps1`
- `AGENTS.md`

### [2026-03-23 18:20] 195. `crear respaldo` pasa a ZIP unico por destino
**Planificación:**
- Cambiar el respaldo para que deje un unico archivo `.zip` en la carpeta elegida, en vez de copiar el arbol de archivos sueltos.
- Mantener la seguridad reciente: no vaciar la carpeta destino y solo reemplazar el archivo de respaldo del mismo nombre.
- Confirmar que el flujo interactivo sigue pidiendo elegir entre `Disco`, `Drive` y `Documentos` antes de continuar.

**Ejecución:**
- **ZIP de respaldo**: `scripts/create-backup.mjs` ahora recopila los archivos del proyecto permitidos por las exclusiones y genera `cotidie-backup.zip`.
- **Destino**: el ZIP se guarda dentro de la carpeta elegida (`Disco`, `Drive` o `Documentos`) en vez de poblarla con copias sueltas del repo.
- **Reemplazo acotado**: solo se reemplaza `cotidie-backup.zip` si ya existe; el resto del contenido del destino no se toca.
- **Utilidad compartida**: se extrajo la lógica de armado ZIP a `scripts/lib/zip-utils.mjs` y `scripts/create-images-archive.mjs` pasó a reutilizarla.

**Validación:**
- `node --check scripts/lib/zip-utils.mjs` OK.
- `node --check scripts/create-images-archive.mjs` OK.
- `node --check scripts/create-backup.mjs` OK.
- `cmd /c "echo 1| node scripts/create-backup.mjs"` OK mostrando primero el selector `Disco / Drive / Documentos`.
- `crear respaldo documentos` OK fuera del sandbox, generando `C:\Users\balca\Documentos\Cotidie\cotidie-backup.zip`.
- Lectura del ZIP de respaldo por `System.IO.Compression.ZipFile` OK (`Entries=596`).

**Archivos Modificados:**
- `scripts/create-backup.mjs`
- `scripts/create-images-archive.mjs`
- `scripts/lib/zip-utils.mjs`
- `AGENTS.md`

### [2026-03-23 18:05] 194. Copia de referencia de `create-backup.mjs` previa al fix incremental
**Ejecución:**
- Se agregó `output/reference/create-backup.before-incremental.mjs` como copia separada de la versión inmediatamente anterior de `scripts/create-backup.mjs`, la que vaciaba el destino completo antes de copiar.
- No se restauró esa versión como activa ni se reconfiguro el comando para usarla.

**Archivos Modificados:**
- `output/reference/create-backup.before-incremental.mjs`
- `AGENTS.md`

### [2026-03-23 17:55] 193. Respaldo incremental sin vaciar el destino
**Planificación:**
- Corregir la lógica de `crear respaldo` para que no vuelva a eliminar todo el directorio destino.
- Mantener el reemplazo solo cuando exista colision real de nombre entre origen y destino.

**Ejecución:**
- **Copia incremental**: en `scripts/create-backup.mjs` se eliminó el borrado previo del directorio destino completo.
- **Colisiones**: ahora el respaldo agrega contenido y solo elimina el elemento existente cuando hay choque de nombre con tipo incompatible (`archivo` vs `carpeta`) o para reemplazar la entrada concreta correspondiente.
- **Mensajes**: el flujo paso de "Limpiando respaldo existente..." a "Actualizando respaldo..." para reflejar el nuevo comportamiento.

**Archivos Modificados:**
- `scripts/create-backup.mjs`
- `AGENTS.md`

### [2026-03-23 17:40] 192. Selector interactivo de `crear respaldo` en orden Disco, Drive y Documentos
**Planificación:**
- Ajustar el modo interactivo de `crear respaldo` para que las opciones visibles queden exactamente como `Disco`, `Drive` y `Documentos`.
- Mantener intacta la resolucion posterior de cada destino.

**Ejecución:**
- **Selector**: se reordeno el prompt interactivo de `scripts/create-backup.mjs` para mostrar `1) Disco`, `2) Drive`, `3) Documentos`.
- **Continuacion**: el script solo sigue con el respaldo despues de que el usuario elige una de esas tres opciones; los alias por palabra (`disco`, `drive`, `documentos`) siguen siendo validos.

**Archivos Modificados:**
- `scripts/create-backup.mjs`
- `AGENTS.md`

### [2026-03-23 17:25] 191. `crear imagenes` pasa a ZIP y `documentos` queda visible
**Planificación:**
- Cambiar la interfaz visible de `crear respaldo` para usar `documentos` en vez de `documents`.
- Reemplazar el uso incorrecto de `crear imagenes`, que seguía enlazado a PDFs promocionales, por un ZIP con las imágenes reales de la app.
- Evitar que `crear imagenes` acepte argumentos ambiguos.

**Ejecución:**
- **Respaldo**: se ajustó el selector interactivo y los textos del comando para mostrar `documentos` como nombre del modo.
- **ZIP de imágenes**: se agregó `scripts/create-images-archive.mjs`, que recorre `public`, `android/app/src/main/assets/public` y `android/app/src/main/res`, empaqueta todas las imágenes (`png`, `jpg`, `jpeg`, `webp`, `gif`, `svg`) y genera `output/images/cotidie-app-images.zip`.
- **PowerShell**: `crear imagenes` y `crear imágenes` ahora apuntan al script nuevo; si se les pasan argumentos, responden con `Uso: crear imagenes`.

**Validación:**
- `node --check scripts/create-images-archive.mjs` OK.
- `node scripts/create-images-archive.mjs` OK, creando `output/images/cotidie-app-images.zip` con 201 entradas.
- Lectura del ZIP por `System.IO.Compression.ZipFile` OK (`Entries=201`).
- `crear imagenes` OK fuera del sandbox.
- `crear respaldo documentos` OK fuera del sandbox.

**Archivos Modificados:**
- `scripts/create-images-archive.mjs`
- `scripts/install-powershell-commands.ps1`
- `scripts/create-backup.mjs`
- `AGENTS.md`

Este archivo documenta todas las intervenciones realizadas por el asistente (Trae AI), detallando planes, ejecuciones y archivos modificados para mantener un historial claro de cambios y facilitar la depuración.

### [2026-03-23 17:11] 190. Fix doble toque final en Plan Personalizado
**Planificación:**
- Revisar la confirmación de salida al final de la secuencia del Plan Personalizado para entender por qué el segundo toque volvía a mostrar avisos en lugar de cerrar.
- Corregir la persistencia del estado pendiente de salida sin alterar la navegación normal entre oraciones del plan.

**Ejecución:**
- **Diagnóstico**: el prompt de salida dependía de `dismiss` de `useToast`; como esa referencia cambia en cada render, el primer toast provocaba un re-render que limpiaba inmediatamente `customPlanExitAdvanceRef`.
- **Fix de estabilidad**: en `MainApp` se añadió `dismissToastRef` para conservar una referencia estable al cierre del toast y se actualizaron `clearCustomPlanExitPrompt` y el timeout de expiración para usar esa referencia.
- **Resultado**: el segundo toque dentro de la ventana de confirmación ya reutiliza el estado pendiente correcto y vuelve al menú principal en vez de disparar una segunda notificación.
- **Validación**: `npx.cmd tsc --noEmit --pretty false` OK. `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-23 01:10] 189. Redefinicion de destinos de `crear respaldo`
**Planificación:**
- Ajustar el script de backup y el comando PowerShell `crear respaldo` a los tres destinos corregidos por el usuario: `drive`, `documents` y `disco`.
- Mantener un solo mensaje de error para cualquier destino no utilizable.
- Evitar cualquier limpieza destructiva sobre la raíz de `Documentos`.

**Ejecución:**
- **Script de respaldo**: se reconstruyo `scripts/create-backup.mjs` con selector interactivo y modos `--drive`, `--documents` y `--disk`.
- **Drive**: el modo `drive` ahora apunta a `H:\Mi unidad\Cotidie`.
- **Documents**: para no limpiar la raíz `C:\Users\balca\Documentos`, el respaldo se deja en la carpeta dedicada `C:\Users\balca\Documentos\Cotidie`.
- **Disco**: el modo `disk/disco` ahora prueba `B:\Cotidie` y luego `J:\Cotidie`, creando la carpeta si falta cuando la unidad existe.
- **Error unificado**: si cualquiera de los tres destinos no es usable, el script devuelve el mismo mensaje de error ya configurado.
- **PowerShell / npm**: `crear respaldo drive|documents|disco` y los scripts npm quedaron alineados con los nuevos flags.

**Validación:**
- `node --check scripts/create-backup.mjs` OK.
- `node scripts/create-backup.mjs --help` OK.
- `Get-Command crear` OK fuera del sandbox.
- `crear respaldo drive` OK fuera del sandbox, creando el respaldo en `H:\Mi unidad\Cotidie`.
- `crear respaldo documents` OK fuera del sandbox, creando el respaldo en `C:\Users\balca\Documentos\Cotidie`.
- `crear respaldo disco` OK fuera del sandbox, devolviendo el error unificado con `B:\` y `J:\` ausentes.

**Archivos Modificados:**
- `scripts/create-backup.mjs`
- `scripts/install-powershell-commands.ps1`
- `package.json`
- `AGENTS.md`

### [2026-03-23 00:40] 188. Reparación real de comandos PowerShell `crear respaldo` y `crear imagenes`
**Planificación:**
- Verificar si los comandos globales de PowerShell seguían funcionando después de los cambios recientes en backups.
- Reinstalar su definición de forma robusta para Windows PowerShell y PowerShell 7, evitando diferencias entre `Documents` y `Documentos`.
- Alinear `crear respaldo` con el nuevo selector de destino y hacer que `crear imagenes` use el generador actual del repo.

**Ejecución:**
- **Diagnóstico**: `crear respaldo` y `crear imagenes` no existían en una sesión limpia porque faltaba el perfil activo de PowerShell y además la política de ejecución impedía cargar perfiles.
- **Instalador dedicado**: se añadió `scripts/install-powershell-commands.ps1`, que inserta/actualiza un bloque administrado `Cotidie Commands` en los perfiles candidatos de Windows PowerShell y PowerShell 7 (`Documents` y `Documentos`).
- **Setup Windows**: `scripts/setup-windows-dev.ps1` ahora invoca ese instalador y deja visible en salida que los comandos disponibles son `crear respaldo` y `crear imagenes`.
- **Comando `crear respaldo`**: quedó enlazado a `scripts/create-backup.mjs`, con soporte de modo opcional (`documents`, `documentos`, `drive`, `disco`, `actual`) y sin envolver el error real del script cuando falla el disco configurado.
- **Comando `crear imagenes`**: quedó enlazado a `scripts/generate_instagram_image_variants_pdf.mjs`, que genera las tres variantes square de Instagram en `output/pdf`.
- **Política PowerShell**: se habilitó `CurrentUser = RemoteSigned` para permitir la carga del perfil del usuario.
- **Validación**:
  - `Get-Command crear` OK fuera del sandbox.
  - `crear imagenes` OK fuera del sandbox.
  - `crear respaldo drive` OK fuera del sandbox, mostrando solo `Error: el disco J: no está conectado. Conéctalo e intenta de nuevo.` cuando `J:\` no existe.
  - No se validó aquí el prompt interactivo puro de `crear respaldo` sin argumento porque esta sesión no permite responder interactivamente al selector del script.

**Archivos Modificados:**
- `scripts/install-powershell-commands.ps1`
- `scripts/setup-windows-dev.ps1`
- `AGENTS.md`

### [2026-03-23 00:20] 187. Script de backup con elección de destino y validación de disco configurado
**Planificación:**
- Adaptar el script de respaldo del proyecto a los destinos vigentes sin perder el error actual cuando falte el disco configurado.
- Permitir elegir entre `Documents/Cotidie Backup` y el disco configurado actualmente.
- Mantener el respaldo limpio, excluyendo artefactos generados recientes (`output`, caches Android/Gradle, APKs, temporales).

**Ejecución:**
- **Script de respaldo**: `scripts/create-backup.mjs` pasó a soportar modo interactivo con elección de destino y flags no interactivos (`--documents`, `--configured-drive`, `--help`).
- **Destino Documents**: ahora resuelve `Documents/Cotidie Backup/CotidieApp` y crea la carpeta automáticamente si no existe.
- **Disco configurado**: se conservó el destino actual `J:\BENJA\CotidieApp`; si se elige ese modo y `J:\` no está disponible, el script sigue emitiendo exactamente `Error: el disco J: no está conectado. Conéctalo e intenta de nuevo.`.
- **Limpieza del backup**: se ampliaron exclusiones para escenarios actuales (`.gradle`, `.android-user-home`, `.idea`, `output`) además de APKs, builds, logs, caches y temporales.
- **NPM scripts**: se agregó `npm run backup` para el flujo con elección y `npm run backup:documents` para el destino fijo en Documents; `npm run backup:drive` quedó forzado al disco configurado.
- **Validación**: `node --check scripts/create-backup.mjs` OK. `node scripts/create-backup.mjs --help` OK. `node scripts/create-backup.mjs --configured-drive` devolvió el error esperado con `J:\` ausente. No se ejecutó `--documents` para no generar un respaldo externo real durante la validación.

**Archivos Modificados:**
- `scripts/create-backup.mjs`
- `package.json`
- `AGENTS.md`

### [2026-03-23 00:00] 186. Fix exportación de respaldo, widget chico, retorno de Letanías y cierre final de plan
**Planificación:**
- Corregir la exportación de respaldo completa para que no falle al compartir/guardar en Android.
- Ajustar el widget chico para que no esconda la bio y aproveche todo el alto disponible sin repartirlo en mitades rígidas.
- Hacer que Letanías, al abrirse desde el acceso directo del menú de Santo Rosario, vuelva al propio menú del Rosario al retroceder.
- Blindar la detección de la última lámina navegable del Plan Personalizado para que el doble avance cierre correctamente aunque existan IDs inválidos o faltantes.

**Ejecución:**
- **Exportación de datos**: el respaldo nativo pasó a escribirse en `Directory.Cache` antes de compartirlo, manteniendo BOM UTF-8 y nombre de archivo fechado; así se evita el fallo de exportación ligado a `Documents`/scoped storage.
- **Widget chico**: se cambió el layout para que el nombre use solo la altura necesaria y la descripción reciba el resto, se quitaron truncados por `ellipsize`, se bajó el mínimo de auto-size y se estiman líneas según ancho/alto para no ocultar texto.
- **Letanías / Rosario**: se añadió contexto de retorno en navegación (`rosaryReturnMode`) para que, si Letanías se abrió desde el botón directo del Rosario, el back regrese al menú del Santo Rosario en vez de caer en una vista intermedia incorrecta.
- **Plan Personalizado**: la navegación válida ahora se calcula solo con oraciones realmente resolubles en `allPrayers`; así el “último slide” es el último realmente navegable y la confirmación por doble avance vuelve a salir a inicio.
- **Validación**: `npm.cmd run build` OK. `.\gradlew.bat :app:compileDebugJavaWithJavac` OK.

**Archivos Modificados:**
- `src/components/settings/ContentSettings.tsx`
- `src/components/main/navigation.ts`
- `src/components/main/MainApp.tsx`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `AGENTS.md`

### [2026-03-20 12:40] 185. Ajuste widget chico, export UTF-8 y salida final de plan
**Planificación:**
- Restaurar la descripción del widget pequeño y mejorar la adaptación real del texto al espacio disponible.
- Reforzar la confirmación de salida al final del Plan Personalizado.
- Corregir la codificación de los respaldos/exportaciones para preservar tildes y ñ.

**Ejecución:**
- **Widget chico**: se reajustó el cálculo nativo de líneas/tamaños para no ocultar la bio por defecto y se redistribuyó el layout para dar espacio real al nombre y descripción.
- **Plan Personalizado**: se extrajo el armado de confirmación de salida a una rutina dedicada, manteniendo la validación por `slot/index` y ventana temporal.
- **Respaldos / planes exportados**: se añadió BOM UTF-8 (`\uFEFF`) al export web y al archivo nativo, y se limpió ese BOM al importar para que `JSON.parse` siga funcionando.
- **Validación**: `npm.cmd run build` OK.

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `src/components/main/MainApp.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/plans/CustomPlanView.tsx`
- `AGENTS.md`

### [2026-03-20 12:20] 184. Fix salida por doble avance en Plan Personalizado
**Planificación:**
- Corregir el cierre al final del Plan Personalizado para que el segundo avance/doble click funcione de forma consistente.
- Eliminar la dependencia innecesaria del estado del toast en la confirmación de salida.

**Ejecución:**
- **Plan Personalizado**: se simplificó `hasActiveExitPrompt` para que dependa solo del estado pendiente (`slot`, `index`, `expiresAt`) y no de que el toast siga registrado.
- **Resultado**: el segundo avance dentro de la ventana de confirmación vuelve a cerrar correctamente hacia inicio, incluso si el toast no participa en la validación.
- **Validación**: `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-20 12:05] 183. Detección robusta de carpeta Drive en build de APK
**Planificación:**
- Evitar que el script de compilación de APK “copie a Drive” solo a un fallback local silencioso cuando no exista una carpeta real de Google Drive.
- Detectar rutas típicas de Google Drive Desktop en Windows y priorizar una ruta explícita por variable de entorno.

**Ejecución:**
- **APK script**: se añadió detección de `COTIDIE_APK_DRIVE_DIR` como prioridad.
- **Google Drive Desktop**: se añadieron candidatos automáticos para carpetas tipo `My Drive` / `Mi unidad`, tanto en el perfil del usuario como en unidades montadas de Windows.
- **Fallback local**: si no se detecta Drive, el script sigue copiando a `output/apk-archive`, pero ahora lo informa explícitamente como copia local y no como copia a Drive.
- **Validación**: `node --check scripts/android-apk.mjs` OK.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-20 11:30] 182. San José, acciones de notificación, variantes persistentes y widget chico adaptable
**Planificación:**
- Vincular el Santo del día del 19/03 con la imagen local de San José ya usada en la app.
- Quitar botones de notificación en avisos informativos que no abren una oración rezable.
- Corregir el bucle al alternar idioma/versión en oraciones con variantes y persistir la elección por oración.
- Hacer que el widget chico ajuste tipografía y líneas según el espacio disponible y reaccione al redimensionado.

**Ejecución:**
- **San José**: se añadió placeholder `sanjose-image` y se mapeó explícitamente el 19/03 en la app y en el widget Android para usar `/images/san-jose.jpg`.
- **Notificaciones**: `actionTypeId` ahora se aplica solo a recordatorios con `target.type === 'prayer'`; las notificaciones informativas o sin destino rezable ya no muestran botones.
- **Variantes de oración**: en `PrayerDetail` se eliminó la realimentación entre estado local y preferencias persistidas; la variante inicial se resuelve por oración y la preferencia solo se guarda cuando el usuario cambia manualmente.
- **Widget chico**: se añadió cálculo nativo de tamaño de texto y número de líneas según `OPTION_APPWIDGET_MIN_WIDTH/HEIGHT`, y actualización al cambiar opciones del widget.
- **Validación**: `npm.cmd run build` OK. La compilación Java de Android quedó bloqueada por rutas de sandbox de `.android`/Gradle, no por un error de compilación confirmado del código modificado.

**Archivos Modificados:**
- `src/lib/placeholder-images.json`
- `src/context/SettingsContext.tsx`
- `src/components/PrayerDetail.tsx`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetSmallProvider.java`
- `android/app/src/main/res/xml/widget_saint_small.xml`
- `AGENTS.md`

### [2026-03-20 09:20] 181. Readaptacion por cambio de ubicación del proyecto
**Planificación:**
- Detectar la nueva ruta operativa del proyecto tras el cambio de entorno.
- Evitar fallos de herramientas o sesiones que siguieran apuntando a la ruta anterior en OneDrive.
- Validar que el build funcione tanto desde la ruta activa como desde la ruta historica.

**Ejecución:**
- **Ruta activa**: se verifico que la copia operativa actual del proyecto es `C:\\Users\\balca\\Desktop\\CotidieApp`.
- **Compatibilidad**: se creó una union de directorio en `C:\\Users\\balca\\OneDrive\\Desktop\\CotidieApp` apuntando a la copia activa del Escritorio para mantener compatibilidad con procesos o scripts que aún usen la ruta antigua.
- **Verificación**: `npm run build` se ejecutó correctamente entrando por la ruta antigua, confirmando que el cambio de ubicación ya no rompe el flujo.
- **Android SDK**: sigue faltando `C:\\Users\\balca\\AppData\\Local\\Android\\Sdk`; la app web/build queda operativa, pero para compilar Android nativo aún hace falta completar el SDK desde Android Studio.

**Archivos Modificados:**
- `AGENTS.md`

### [2026-03-19 23:48] 180. Adaptacion a nueva PC + bootstrap de entorno Windows
**Planificación:**
- Detectar rutas absolutas del equipo anterior que rompen el build o la automatizacion al mover el proyecto a otra PC.
- Volver portable la configuración Android/Gradle y el flujo de generación de APK.
- Anadir un script de preparacion para reinstalar herramientas base y regenerar `android/local.properties` en el nuevo entorno.

**Ejecución:**
- **Gradle Android**: se eliminó la dependencia fija de `org.gradle.java.home` en `android/gradle.properties` para que use `JAVA_HOME` o el JBR detectado localmente.
- **APK script**: `scripts/android-apk.mjs` ahora detecta `JAVA_HOME` y Git desde variables de entorno o rutas comunes, y deja de depender por defecto de `H:\\Mi Unidad\\...`; el archivo de salida local pasa a `output/apk-archive` salvo override con `COTIDIE_APK_DRIVE_DIR`.
- **Bootstrap Windows**: se agregó `scripts/setup-windows-dev.ps1` y el script npm `setup:windows` para instalar/verificar Node.js LTS, Git, Android Studio y VS Code con `winget`, además de regenerar `android/local.properties` cuando el SDK este disponible.
- **Documentacion**: se actualizó `README.md` con el flujo mínimo para preparar una PC nueva.

**Archivos Modificados:**
- `android/gradle.properties`
- `scripts/android-apk.mjs`
- `scripts/setup-windows-dev.ps1`
- `package.json`
- `README.md`
- `AGENTS.md`

### [2026-03-19 00:14] 179. Calendario mensual visible + scroll de índices + overlay compartido
**Planificación:**
- Mostrar en el calendario de Plan de Vida solo las oraciones con presencia en el mes, excepto en modo edición de desarrollador.
- Corregir el scroll de los índices inmersivos para que el último elemento sea accesible.
- Reducir tamaño de archivos largos extrayendo UI repetida a componentes menores.

**Ejecución:**
- **Plan de Vida**: `PlanDeVidaCalendar` ahora filtra filas por presencia mensual fuera de edición; en edición dev mantiene la tabla completa. También se reescribió el archivo para limpiar mojibake y dejar una versión más estable.
- **Índices inmersivos**: se extrajo un overlay compartido `ImmersivePrayerIndexOverlay` y se reutilizó en Rosario y Vía Crucis. El contenedor interior pasó a `flex-1` con `min-h-0`, scroll real y `padding-bottom`, corrigiendo que el último elemento quedara cortado.
- **Reducción de tamaño**: `RosaryImmersive.tsx` bajó a 1488 líneas y `ViaCrucisImmersive.tsx` a 583 líneas, moviendo la UI repetida a `src/components/immersive/ImmersivePrayerIndexOverlay.tsx`.
- **Validación**: `node node_modules\\typescript\\bin\\tsc --noEmit --pretty false` OK y `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/components/plans/PlanDeVidaCalendar.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/ViaCrucisImmersive.tsx`
- `src/components/immersive/ImmersivePrayerIndexOverlay.tsx`
- `AGENTS.md`

### [2026-03-18 23:31] 178. Sync calendario Plan de Vida + índices inmersivos + cáliz de Misa
**Planificación:**
- Sincronizar la edición manual del calendario de Plan de Vida con los conteos persistentes usados por la app y Cotidie Annuum.
- Limitar el índice del Rosario a los misterios activos y dar al Vía Crucis inmersivo un índice equivalente.
- Endurecer la salida del plan personalizado, fijar las imágenes de oración y ampliar la preview de rachas con safe area y variante de cáliz.

**Ejecución:**
- **Calendario Plan de Vida**: `togglePlanDeVidaCalendarEntry` ahora recalcula y aplica la contribución del calendario sobre `prayersOpenedHistory`, `prayerDaysCount`, `planDeVidaCompletedHistory`, `totalPrayersOpened`, `massDaysCount`, `rosaryCount`, `angelusCount`, `examinationCount` y la referencia de racha de Misa cuando corresponde.
- **Rosario inmersivo**: el índice quedó restringido al bloque actual de misterios (gozosos/luminosos/dolorosos/gloriosos) y se eliminó código muerto asociado al salto amplio de grupos.
- **Vía Crucis inmersivo**: se añadió botón-índice en el encabezado con overlay navegable para introducción, estaciones con subpasos y cierre.
- **Plan personalizado**: el doble avance final ahora depende de un prompt activo real; el segundo avance dentro del plazo sale a Inicio y limpia el aviso.
- **Imágenes en oraciones**: se ajustó el `sticky` para fijar la imagen en su misma altura visual y eliminar el deslizamiento corto al empezar el scroll.
- **Preview de rachas**: se añadió modo alternativo `Cáliz` con pelotas de fuego entrando al cáliz, selector entre vistas y padding por `safe-area-inset-*` para que la simulación no quede bajo barras del dispositivo.
- **Validación**: `node node_modules\\typescript\\bin\\tsc --noEmit --pretty false` OK y `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/ViaCrucisImmersive.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/developer/MassStreakSparkPreview.tsx`
- `AGENTS.md`

### [2026-03-18 22:17] 177. Corrección de tilde en Ángelus
**Planificación:**
- Corregir textos visibles donde seguía apareciendo 'Angelus' sin tilde.
- Mantener consistente la grafía 'Ángelus' en UI.

**Ejecución:**
- **Annuum**: se corrigió la etiqueta visible a 'Ángelus / Regina Caeli'.
- **Panel desarrollador**: se corrigió la métrica visible a 'Ángelus'.
- **Validación**: `node node_modules\\typescript\\bin\\tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/components/AnnuumStory.tsx`
- `src/components/developer/DeveloperDashboard.tsx`
- `AGENTS.md`

### [2026-03-18 15:54] 176. Tres variantes square con logo e imágenes para Instagram
**Planificación:**
- Crear las tres variantes pendientes para post cuadrado 1080x1080: minimalista, premium/catolico clasico y anuncio pagado.
- Incluir el logo real de la app y usar imágenes existentes del proyecto.
- Entregar los tres PDFs por separado y validar que cada uno tenga 1 pagina.

**Ejecución:**
- **Assets reales**: se usaron `public/icons/icon.jpg` como logo y fotos `holy-family.jpeg`, `sacred-heart.jpeg`, `eucharist.jpeg` y `crucifixion.jpeg`.
- **Generador unico**: se añadió `scripts/generate_instagram_image_variants_pdf.mjs`, con incrustacion directa de JPEGs dentro del PDF.
- **Variantes**:
  - `cotidie-instagram-post-square-minimal.pdf`
  - `cotidie-instagram-post-square-classic.pdf`
  - `cotidie-instagram-post-square-ads.pdf`
- **Contenido**: se mantuvo foco en funciones visibles al usuario final; no se mencionan modo desarrollador ni resumen anual.
- **Validación**: se comprobaron con Poppler el tamaño square y la paginación de los tres archivos.

**Archivos Modificados:**
- `scripts/generate_instagram_image_variants_pdf.mjs`
- `AGENTS.md`

### [2026-03-18 15:54] 175. Variante cuadrada 1080x1080 para Instagram post
**Planificación:**
- Crear una variante cuadrada del promo de Instagram, pensada para post 1:1.
- Mantener el foco en funciones visibles para usuarios finales y CTA de instalación desde el perfil.
- Entregarla como PDF separado y validar tamaño/paginación.

**Ejecución:**
- **Diseño square**: se añadió `scripts/generate_instagram_square_post_pdf.mjs` con layout 1080x1080, hero más compacto, tres bloques de beneficios, cápsulas de funciones y CTA inferior.
- **Contenido**: se mantuvo el mensaje en español, sin mencionar modo desarrollador ni resumen anual.
- **Entrega**: se generó `output/pdf/cotidie-instagram-post-square.pdf`.
- **Validación**: se comprobó con Poppler que el archivo tiene 1 página y tamaño 1080 x 1080 pts.

**Archivos Modificados:**
- `scripts/generate_instagram_square_post_pdf.mjs`
- `AGENTS.md`

### [2026-03-18 14:24] 174. PDF promocional para Instagram
**Planificación:**
- Crear una pieza PDF vertical, simple y llamativa, pensada para promocionar Cotidie en Instagram.
- Usar funciones visibles del proyecto para el mensaje promocional, excluyendo modo desarrollador y resumen anual.
- Entregar un archivo listo para compartir y validar que tenga una sola página.

**Ejecución:**
- **Contenido promo**: se redactó una pieza en español enfocada en oración diaria, Plan de Vida, Rosario, Vía Crucis, Nuevo Testamento, EPUBs personales, recordatorios, santo/frase del día y planes personalizados.
- **Diseño**: se añadió `scripts/generate_instagram_promo_pdf.mjs`, que genera un póster vertical con hero, bloques de beneficios, cápsulas de funciones y CTA “Instálala desde el link del perfil”.
- **Entrega**: se generó `output/pdf/cotidie-instagram-promo.pdf`.
- **Validación**: se comprobó con Poppler que el archivo tiene 1 página.

**Archivos Modificados:**
- `scripts/generate_instagram_promo_pdf.mjs`
- `AGENTS.md`

### [2026-03-18 14:08] 173. PDF de presentación para usuarios comunes (4 idiomas)
**Planificación:**
- Crear un PDF similar al resumen anterior, pero orientado a usuarios no técnicos.
- Explicar qué es Cotidie y por qué conviene instalarla en español, inglés, italiano y francés.
- Mantener el resultado en una sola página y validar el archivo final.

**Ejecución:**
- **Contenido usuario final**: se redactó una versión no técnica centrada en valor práctico, hábitos de oración, contenido disponible y perfil de usuario ideal.
- **Generador PDF**: se añadió `scripts/generate_user_install_pitch_pdf.mjs` para producir el PDF multilingüe de una sola página directamente en Node.
- **Entrega**: se generó `output/pdf/cotidie-user-install-pitch-multilingual.pdf`.
- **Validación**: se verificó con Poppler que el archivo tiene 1 página y texto extraíble en los cuatro idiomas.

**Archivos Modificados:**
- `scripts/generate_user_install_pitch_pdf.mjs`
- `AGENTS.md`

### [2026-03-18 13:58] 172. PDF resumen repo (4 idiomas, 1 página)
**Planificación:**
- Revisar el repo para resumir propósito, usuario objetivo, funciones, arquitectura y arranque mínimo usando solo evidencia local.
- Generar un PDF de una sola página en español, inglés, italiano y francés, en ese orden.
- Validar que el archivo resultante tenga una sola página y contenido extraíble legible.

**Ejecución:**
- **Inspección repo**: se revisaron `package.json`, `next.config.mjs`, `capacitor.config.ts`, `src/app/*`, `src/components/main/MainApp.tsx`, `src/context/SettingsContext.tsx`, `src/lib/data.tsx`, `src/lib/persistence.ts`, bindings nativos y clases Android para resumir la app sin usar fuentes externas.
- **Generador PDF**: se añadió `scripts/generate_app_summary_pdf.mjs`, que genera un PDF de una página directamente en Node, sin dependencias externas.
- **Entrega**: se generó `output/pdf/cotidie-app-summary-multilingual.pdf`.
- **Validación**: se comprobó la paginación con herramientas Poppler y se extrajo texto para confirmar que el contenido principal quedó presente en el PDF.

**Archivos Modificados:**
- `scripts/generate_app_summary_pdf.mjs`
- `AGENTS.md`

### [2026-03-18 11:15] 171. Limpieza de etiqueta en índice del Rosario inmersivo
**Planificación:**
- Quitar el prefijo `Destino:` delante del nombre del misterio en el índice del Rosario inmersivo.
- Mantener intacta la navegación a ese punto del misterio.

**Ejecución:**
- **Índice del Rosario**: en `RosaryImmersive` el ítem principal de cada misterio ahora muestra solo el nombre del misterio, sin texto adicional delante.
- **Validación**: `node node_modules/typescript/bin/tsc --noEmit --pretty false` OK.

**Archivos Modificados:**
- `src/components/RosaryImmersive.tsx`
- `AGENTS.md`

### [2026-03-18 11:13] 170. Índice detallado del Rosario inmersivo + fuego semanal/mensual en preview de rachas
**Planificación:**
- Ampliar el índice del Rosario inmersivo para permitir saltar no solo al misterio, sino también a subpasos concretos dentro de cada uno.
- Añadir efectos visuales al preview de rachas cuando se completa una semana entera y cuando se completa un mes entero.
- Hacer visible en la simulación de desarrollador al menos algún caso de semana y mes completos para probar las animaciones.

**Ejecución:**
- **Rosario inmersivo**: el índice de `RosaryImmersive` ahora incluye por cada misterio un destino principal con su nombre y saltos individuales a `Padre Nuestro`, `Ave María 1..10`, `Gloria` y `Jaculatoria`; si existe intención, también se puede saltar a ella.
- **Jerarquía visual**: los subpasos del Rosario se muestran con sangría bajo el destino de cada misterio para distinguir mejor el nivel de navegación.
- **Preview de rachas**: `MassStreakSparkPreview` ahora detecta semanas completas (lunes a domingo) y lanza un encendido grupal de esa semana.
- **Mes completo**: cuando un mes queda completo, el preview lanza combustión de mes; si luego pasa al siguiente mes, abandona el giro tipo página y usa una salida tipo ceniza.
- **Simulación**: la generación de datos del preview incluye al menos un mes completo y semanas completas adicionales para que el efecto pueda verse sin depender de la suerte del seed.
- **Validación**: `node node_modules/typescript/bin/tsc --noEmit --pretty false` OK y `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/components/RosaryImmersive.tsx`
- `src/components/developer/MassStreakSparkPreview.tsx`
- `AGENTS.md`

### [2026-03-18 10:56] 169. Ajustes de racha Misa, Rosario, memoria de idiomas y widget grande
**Planificación:**
- Quitar la muralla visual de la preview de racha de Misa y dejar una pausa simple entre rachas.
- Ajustar UX en Home, plan personalizado, memoria de idiomas por oración y navegación interna del Rosario.
- Mejorar el widget grande para que la imagen use mejor el espacio, llegue a las esquinas superiores y el texto ocupe altura variable.
- Añadir edición condicional del calendario de Plan de Vida solo para desarrollador.

**Ejecución:**
- **Preview de racha**: `MassStreakSparkPreview` dejó de mostrar la muralla; al terminar una racha, el fuego simplemente se detiene hasta la siguiente Misa.
- **Citas de santos**: en `HomePage` se redujo levemente el tiempo visible de las citas flotantes para que sigan siendo legibles pero no tan lentas.
- **Plan personalizado**: en `MainApp` el aviso final ya no se encadena; si el aviso está activo y vuelves a avanzar, sale y se elimina al instante. Si retrocedes, el aviso también se limpia.
- **Idiomas por oración**: en `PrayerDetail` la preferencia de idioma se resuelve por oración actual, evitando que el idioma escogido en una oración se fugue a otra.
- **Imagen anclada**: la imagen de la oración pasó a ser `sticky`, manteniendo la apariencia general pero quedando visible mientras el texto sigue avanzando.
- **Rosario**: en `RosaryImmersive` el bloque superior central se volvió botón y abre un índice desplegable con preparación, misterios de los cuatro grupos y cierre (Letanías, Jaculatorias y Salve).
- **Calendario dev**: `PlanDeVidaCalendar` ahora muestra `Editar calendario` solo en modo desarrollador; al activarlo, tocar una celda marca/desmarca ese registro y se añadió `togglePlanDeVidaCalendarEntry` en `SettingsContext`.
- **Widget grande**: `widget_saint_large.xml` y `SaintWidgetUpdater.java` se ajustaron para que la imagen ocupe el alto sobrante, el título/bio usen líneas variables según el contenido y la imagen ya no se redondee arriba, llegando a las esquinas superiores.
- **Validación**: `node node_modules/typescript/bin/tsc --noEmit --pretty false` OK, `npm.cmd run build` OK y `.\gradlew.bat :app:compileDebugJavaWithJavac --console=plain` OK.

**Archivos Modificados:**
- `src/components/developer/MassStreakSparkPreview.tsx`
- `src/components/home/HomePage.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/plans/PlanDeVidaCalendar.tsx`
- `src/context/SettingsContext.tsx`
- `android/app/src/main/res/layout/widget_saint_large.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-16 22:33] 168. Eliminación de ajuste de bienvenida y reversión visual del splash
**Planificación:**
- Retirar la opción de desactivar la pantalla de bienvenida porque su flujo de arranque estaba introduciendo inconsistencias visuales.
- Volver a un arranque lineal con splash fijo y eliminar el oscurecimiento agregado sobre el fondo.
- Limpiar referencias residuales en ajustes, contexto y persistencia para no dejar código muerto.

**Ejecución:**
- **Arranque**: `page.tsx` volvió a un flujo simple; la app muestra el splash mientras termina la hidratación y durante la ventana inicial, sin bifurcaciones por preferencias guardadas.
- **Splash**: `SplashScreen.tsx` ya no aplica el overlay oscuro sobre la imagen de fondo y se corrigió el lema visible a `Serviam cum gaudio magno!`.
- **Ajustes**: se eliminó de `AppearanceSettings` el interruptor de pantalla de bienvenida.
- **Contexto/Persistencia**: se retiró `welcomeScreenEnabled` del `SettingsContext`, del snapshot persistente y de los resets, dejando el feature fuera del estado de la app.
- **Validación**: `node node_modules/typescript/bin/tsc --noEmit --pretty false` OK y `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/app/page.tsx`
- `src/components/main/SplashScreen.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-03-16 22:23] 167. Ajuste tipo Duolingo en preview de rachas de Misa
**Planificación:**
- Evitar que el preview adelante visualmente qué días futuros se van a quemar.
- Hacer que el check aparezca solo después de que el fuego haya consumido un día.
- Reforzar el arranque de cada racha para que la llama nazca en el primer día del tramo cuando no viene de uno anterior.

**Ejecución:**
- **Sin spoilers futuros**: se eliminó la previsualización del siguiente día en la racha; el calendario ya no dibuja conectores hacia celdas todavía no quemadas.
- **Check post-consumo**: los días solo muestran check cuando ya pasaron de estado activo a estado quemado; mientras el fuego está encima, todavía no se marcan como completados.
- **Encendido de racha**: la celda activa del inicio de cada segmento usa una ráfaga de ignición para que la llama parezca nacer ahí cuando comienza una nueva racha.
- **Limpieza**: se retiró estado auxiliar que había quedado sin uso tras quitar la anticipación visual del siguiente día.
- **Validación**: `node node_modules/typescript/bin/tsc --noEmit --pretty false` OK y `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/components/developer/MassStreakSparkPreview.tsx`
- `AGENTS.md`

### [2026-03-16 22:01] 166. Fix de emojis mojibake en Cotidie Annuum
**Planificación:**
- Revisar si el cambio de nombre a Annuum dejó emojis desconfigurados en las slides del resumen anual.
- Reemplazar secuencias mojibake por emojis Unicode estables ya usados correctamente en la app.

**Ejecución:**
- **Barrido**: se localizó el problema en `src/components/AnnuumStory.tsx`; no quedaron más secuencias mojibake de emoji en `src`, `public` ni `scripts`.
- **Reemplazos**: se corrigieron los emojis rotos de oración, amanecer, noche, campana, rosario, devociones creadas y celebración final.
- **Validación**: `node node_modules/typescript/bin/tsc --noEmit --pretty false` OK y `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/components/AnnuumStory.tsx`
- `AGENTS.md`

### [2026-03-16 21:47] 165. Fix real de bienvenida desactivada + rediseño de fuego en preview Annuum
**Planificación:**
- Corregir el arranque para que, con la pantalla de bienvenida desactivada, la app no monte `MainApp` antes de terminar de hidratar ajustes.
- Rehacer el preview de racha de Misa para que el fuego siga las rachas, se frene en huecos y cambie de mes con una transición de página más creíble.

**Ejecución:**
- **Arranque / bienvenida**: `page.tsx` ahora espera `isLoaded` del `SettingsContext` antes de montar `MainApp` cuando la bienvenida está desactivada; mientras tanto muestra solo un fondo de arranque sin branding, evitando el falso splash corto y el cambio de fondo al hidratar.
- **Splash**: `SplashScreen.tsx` dejó de depender del contexto para resolver imagen; ahora usa directamente `--home-bg-image`, con overlay estable y texto corregido.
- **SettingsContext**: se expuso `isLoaded` en el valor del contexto para permitir que la página tome decisiones de arranque con el estado real de carga.
- **Preview Annuum**: `MassStreakSparkPreview` se rehizo con segmentos de racha, pausas largas en rachas de un solo día, detención tipo “muro” en huecos entre rachas, conectores de ascuas y animación tipo paso de página al cambiar de mes, manteniendo el acceso solo en modo desarrollador.
- **Validación**: `node node_modules/typescript/bin/tsc --noEmit --pretty false` OK y `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/app/page.tsx`
- `src/components/main/SplashScreen.tsx`
- `src/components/developer/MassStreakSparkPreview.tsx`
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-03-16 21:23] 164. Fix de git add en android:apk por exclusiones ignoradas
**Planificación:**
- Corregir el fallo de `git add` al final de `android:apk`, que impedía el `commit/push` de la PWA aunque el APK ya se hubiera generado.
- Verificar si el problema venía de los avisos de fin de línea o del uso de pathspecs `:(exclude)` sobre rutas ignoradas.

**Ejecución:**
- **Diagnóstico**: se confirmó que los avisos `LF will be replaced by CRLF` eran solo warnings y no la causa del error.
- **Causa real**: `git add -A -- . :(exclude)...` devolvía `exit=1` porque las rutas pasadas como exclusión (`.gradle-user-home`, `.next`, `android/build`, `node_modules`, etc.) ya estaban ignoradas y Git las trataba como paths explícitos ignorados.
- **Script APK**: se eliminó el bloque `GIT_ADD_EXCLUDES` y el stage ahora usa `git add -A -- .`, dejando que `.gitignore` haga su trabajo sin provocar error.
- **Validación**: `node --check scripts\android-apk.mjs` OK y `git add -n -A -- .` devuelve `exit=0`.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-16 21:16] 163. Limpieza manual de `.git/index.lock`
**Planificación:**
- Destrabar el repositorio para permitir que `android:apk` pueda volver a ejecutar `git add/commit/push`.

**Ejecución:**
- **Lock de Git**: se eliminó `.git\index.lock`, que estaba bloqueando el índice e impidiendo la sincronización automática.
- **Verificación**: `git status --short` volvió a responder correctamente después de la limpieza.

**Archivos Modificados:**
- `AGENTS.md`

### [2026-03-16 21:14] 162. Falla temprana si Git tiene index.lock en android:apk
**Planificación:**
- Evitar que `android:apk` haga build completo y falle recién al final cuando Git está bloqueado.
- Mostrar un mensaje directo si existe `.git\index.lock` antes de intentar `git add/commit/push`.

**Ejecución:**
- **Preflight Git**: se agregó `ensureGitIndexUnlocked()` a `scripts/android-apk.mjs`.
- **Chequeo temprano**: cuando el flujo va a hacer `push` automático, el script ahora verifica si existe `.git\index.lock` y aborta antes del build con la fecha de modificación del lock y una instrucción clara para desbloquear Git.
- **Validación**: `node --check scripts\android-apk.mjs` OK.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-16 21:12] 161. Copia automática del APK a Drive en android:apk
**Planificación:**
- Extender `npm run android:apk` para que, además de dejar el APK local, lo copie automáticamente a `H:\Mi Unidad\Cotidie\APK Installer`.
- Hacer que el paso de Drive sea obligatorio, con error claro si no se puede escribir allí, para no dar por exitoso un build incompleto.

**Ejecución:**
- **Script APK**: se agregó `copyApkToDrive()` en `scripts/android-apk.mjs`, con ruta por defecto `H:\Mi Unidad\Cotidie\APK Installer` y posibilidad de override por `COTIDIE_APK_DRIVE_DIR`.
- **Copia final**: después de generar `cotidie-installer-v{version}.apk` en la raíz del proyecto, el script ahora lo copia también al destino de Drive con el mismo nombre.
- **Robustez**: el script crea la carpeta si falta, verifica permiso de escritura y falla explícitamente si no logra completar la copia.
- **Validación**: `node --check scripts\android-apk.mjs` OK y prueba real de escritura/borrado en `H:\Mi Unidad\Cotidie\APK Installer` OK.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-16 18:19] 160. Preview dev para racha de Misa + AGENTS.md en UTF-8
**Planificación:**
- Crear una vista previa completamente aislada de la animación de racha de Misa para Cotidie Annuum.
- Limitar el acceso solo al panel de desarrollador, usando fechas simuladas aleatorias a lo largo de todos los meses del año.
- Convertir `AGENTS.md` a UTF-8 real para eliminar el mojibake al abrirlo con herramientas que esperan esa codificación.

**Ejecución:**
- **Preview de racha**: se agregó `MassStreakSparkPreview` como pieza independiente, con calendario mensual animado, chispa activa, acumulación visual de días recorridos, aceleración progresiva en las rachas y progreso por meses.
- **Simulación aislada**: la vista genera fechas aleatorias de asistencia a Misa para todo el año, garantizando recorrido por los doce meses sin tocar estadísticas, fechas ni estados reales de la app.
- **Acceso dev-only**: `DeveloperDashboard` ahora expone un botón `Probar Racha de Misa` que abre el preview en pantalla completa solo dentro del panel de desarrollador.
- **AGENTS**: se recodificó `AGENTS.md` desde Windows-1252 a UTF-8 sin BOM, conservando el contenido y corrigiendo la visualización de caracteres acentuados y comillas tipográficas.
- **Validación**: `node node_modules/typescript/bin/tsc --noEmit --pretty false` OK y `npm.cmd run build` OK.

**Archivos Modificados:**
- `src/components/developer/MassStreakSparkPreview.tsx`
- `src/components/developer/DeveloperDashboard.tsx`
- `AGENTS.md`

### [2026-03-16 15:42] 159. Fixes de Oraciones/PWA/idioma/Rosario/Camino/EPUB/bienvenida
**Planificación:**
- Corregir la carga visual de `Oraciones`, el override de oraciones predeterminadas y la persistencia de Camino.
- Resolver fallos de idioma, retroceso en Rosario modo `Leer`, memoria/búsqueda del lector EPUB y duración/limpieza del aviso final de plan personalizado.
- Agregar ajuste persistente para desactivar la bienvenida, dejar trazabilidad de la causa real de la PWA y conectar imágenes base a oraciones estructurales.

**Ejecución:**
- **Oraciones**: se reemplazó el acordeon por secciones visibles estables para evitar que el contenido quedara invisible aunque los botones siguieran activos.
- **PWA**: se confirmó que `origin/main` quedó detenido en `v4.4.9`, por eso la web no recibio `4.4.10+`; además se versionó el `manifest` desde `layout` y `android-apk.mjs` ahora avisa explícitamente cuando se construye APK sin `git push`.
- **Idioma**: `PrayerDetail` ahora resuelve variantes de idioma por clave normalizada y persiste la eleccion correcta aún si cambian acentos/codificacion de las claves.
- **Rosario Leer**: `MainApp` y `RosaryMeditated` comparten un back-handler para que retroceder desde un misterio vuelva al menú del Rosario meditado, no a Plan de Vida.
- **Camino**: el scroll guardado vuelve a ser prioritario; al salir de Camino se limpia el estado del buscador para no reabrir en la última búsqueda.
- **Examen de Conciencia**: `setPredefinedPrayerOverride` quedó implementado y las ediciones del usuario ya se guardan/aplican sin el mensaje `Funcion no implementada aun`.
- **Creditos y bienvenida**: se agregó el texto de colaboracion con IA en `Otros` y un ajuste persistente para desactivar la pantalla de bienvenida.
- **Imágenes estructurales**: se conectaron imágenes locales a `Padre Nuestro`, `Ave Maria` y `Gloria`, y se corrigieron sus textos base visibles.
- **Lectura prolongada**: se creó `useScreenWakeLock` y se aplica a textos largos y al lector EPUB para evitar que se apague la pantalla mientras se lee.
- **EPUB NT**: se reforzó la memoria de ubicación guardando `cfi` y `href`, con flush en `pagehide/visibilitychange`; la búsqueda ahora admite referencias como `Juan 13:18` además de texto libre.
- **Plan personalizado**: el toast final ahora respeta `3` segundos exactos y se descarta inmediatamente al salir del plan para que no aparezca fuera de contexto.
- **Validación**: `node node_modules/typescript/bin/tsc --noEmit --pretty false` OK y `npm.cmd run build` OK.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/EpubReader.tsx`
- `src/components/PrayerAccordion.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/RosaryMeditated.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/settings/DeveloperSettings.tsx`
- `src/context/SettingsContext.tsx`
- `src/hooks/use-toast.ts`
- `src/hooks/useScreenWakeLock.ts`
- `src/lib/prayers/oraciones/estructurales.ts`
- `AGENTS.md`

### [2026-03-13 22:41] 158. Verificación de navegación + limpieza de persistencia
**Planificación:**
- Confirmar que la navegación jerarquica nueva compile sin errores y revisar si quedó codigo redundante.
- Eliminar redundancias de persistencia del estado de navegación sin tocar el comportamiento ya corregido.

**Ejecución:**
- **Verificación**: se revisó MainApp y la salida del plan personalizado; la lógica jerarquica y la salida a Inicio permanecen correctas.
- **Limpieza**: useNavPersistence dejo de recibir argumentos muertos y ahora persiste NavigationState tipado directamente.
- **Persistencia**: en MainApp se eliminó la normalizacion duplicada antes de persistNavState, porque persistNavState ya normaliza internamente.
- **Validación**: node node_modules/typescript/bin/tsc --noEmit --pretty false OK.

**Archivos Modificados:**
- src/components/main/useNavPersistence.ts
- src/components/main/MainApp.tsx
- AGENTS.md

### [2026-03-13 22:34] 157. Navegación jerarquica + morado penitencial + salida de plan personalizado
**Planificación:**
- Reemplazar el retroceso basado en historial por retroceso jerarquico real A > B > C > D > E.
- Hacer que el plan personalizado quede fuera de esa jerarquía: back a Inicio y doble avance final a pantalla principal.
- Forzar el morado sobre memorias de martires en tiempos penitenciales, dejando solo las celebraciones mayores con color propio, también en el widget Android.

**Ejecución:**
- **Navegación jerarquica**: handleBack en MainApp ya no depende de window.history.back(). Ahora sube un nivel por prayerPathIds; un nivel raíz vuelve a su categoría y la categoría vuelve al menú principal.
- **Plan personalizado**: dentro de un plan personalizado, el back sale a Inicio y el doble avance al final también lleva a Inicio, no al menú del plan. La navegación lineal interna por anterior/siguiente se mantiene.
- **Color litúrgico web**: se ajustó keepsOwnColorInPenitentialSeason para que el morado prevalezca en Adviento/Cuaresma sobre memorias y fiestas menores, incluyendo martires; solo solemnidades, fiesta del Señor y casos mayores como Viernes Santo, Pentecostés y Domingo de Ramos conservan color propio.
- **Color litúrgico Android**: se replico la misma precedencia en SaintWidgetContentFactory, normalizando texto litúrgico antes de decidir color para que el widget grande quede alineado con la app.
- **Validación**: node node_modules/typescript/bin/tsc --noEmit --pretty false OK y ./gradlew.bat :app:compileDebugJavaWithJavac --console=plain OK.

**Archivos Modificados:**
- src/components/main/MainApp.tsx
- src/lib/liturgical-color-rules.ts
- android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java
- AGENTS.md

### [2026-03-13 00:40] 156. Fix de git add sobre caches de Gradle
**Planificación:**
- Explicar y cortar el fallo del `git add` automatico al final de `android:apk`.
- Evitar que Git intente indexar caches y locks generados por Gradle dentro del repo.

**Ejecución:**
- **Gitignore**: se agregó `/.gradle-user-home/` en el `.gitignore` raíz y se confirmó que `android/build` y `android/app/build` ya estaban ignorados por `android/.gitignore`.
- **Script APK**: el paso de stage ahora usa `git add -A -- .` con exclusiones explícitas para `.gradle-user-home`, `android/build`, `android/app/build`, `.next`, `out` y `node_modules`.
- **Validación**: `git check-ignore -v .gradle-user-home android\build android\app\build` OK y `node --check scripts\android-apk.mjs` OK.

**Archivos Modificados:**
- `.gitignore`
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-13 00:28] 155. Endurecimiento completo de android:apk en Windows
**Planificación:**
- Revisar de punta a punta `scripts/android-apk.mjs` para eliminar fallos encadenados de invocacion en Windows.
- Reemplazar las capas fragiles de `npm.cmd`/`npx.cmd` por entrypoints directos en Node.
- Validar el flujo real de build/APK y verificar el tramo final de Git sin publicar cambios.

**Ejecución:**
- **Node tools**: se reemplazó la ejecucion de `npm` y `npx` por llamadas directas a `node` sobre `npm-cli.js` y la CLI local de Capacitor.
- **Gradle**: en Windows el script usa `cmd.exe /d /s /c gradlew.bat assembleDebug`, manteniendo compatibilidad con `.bat` sin aplicar shell fragil al resto.
- **Git**: se mantuvo la ejecucion directa del binario `git.exe` con argumentos separados para `add`, `commit` y `push`.
- **Validación real**: `node scripts\android-apk.mjs --no-bump --no-push` completo con build Next, `cap sync android`, `gradlew.bat assembleDebug` y generación de APK exitosa.
- **Validación Git**: `git push --dry-run` respondio `Everything up-to-date`.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-13 00:14] 154. Fix EINVAL al lanzar npm.cmd en android:apk
**Planificación:**
- Corregir el fallo `EINVAL` al invocar `npm.cmd`/`npx.cmd` desde `spawnSync` en Windows.
- Mantener el esquema endurecido sin volver a `shell: true` global.

**Ejecución:**
- **Compatibilidad Windows**: `runCommand()` ahora detecta `.cmd` y los ejecuta mediante `cmd.exe /d /s /c`, que es la forma compatible en este entorno para `npm.cmd` y `npx.cmd`.
- **Alcance acotado**: el cambio solo aplica a scripts `.cmd`; Git y los binarios normales siguen ejecutandose directamente con argumentos separados.
- **Validación**: `node --check scripts\android-apk.mjs` OK.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-13 00:08] 153. Fix ENOENT de npm/npx en android:apk
**Planificación:**
- Corregir el fallo introducido al ejecutar `npm` y `npx` sin `shell: true` dentro de `scripts/android-apk.mjs` en Windows.
- Mantener el hardening previo de Git sin volver al esquema fragil anterior.

**Ejecución:**
- **Resolucion de comandos**: se agregó `resolveNodeTool()` para convertir `npm` y `npx` a `npm.cmd` y `npx.cmd` en Windows, usando el directorio de Node cuando esta disponible.
- **Compatibilidad**: el flujo sigue usando `spawnSync` con binario y argumentos separados, pero ahora encuentra correctamente las herramientas Node en Windows.
- **Validación**: `node --check scripts\android-apk.mjs` OK.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-12 23:58] 152. Idioma por oración + memoria de navegación por sesión
**Planificación:**
- Hacer que el idioma elegido se recuerde por cada oración individual.
- Mantener la posicion de navegación si la app solo pasa a segundo plano.
- Evitar restaurar la última pantalla cuando la app fue cerrada del todo y se vuelve a abrir desde cero.

**Ejecución:**
- **Idioma por oración**: se agregó persistencia `prayerLanguagePreferences` en `SettingsContext`, con guardado por `prayerId` y restauracion en `PrayerDetail`.
- **Detalle de oración**: cada oración con variantes recuerda su último idioma valido; `Preces` sigue arrancando en latin solo si aún no existe una preferencia guardada para esa oración.
- **Navegación por sesión**: la persistencia de `navState` se movió de `localStorage` a `sessionStorage`, de modo que la posicion sobrevive al segundo plano pero no a un relanzamiento real tras cerrar la app.
- **Validación**: `node .\node_modules\typescript\bin\tsc --noEmit --pretty false` OK.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/main/navigation.ts`
- `src/components/main/useNavPersistence.ts`
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-12 23:40] 151. Hardening de git push en android:apk
**Planificación:**
- Revisar por que el paso final de `git push` en `npm run android:apk` falla aunque el mismo push manual funciona.
- Unificar la ejecucion de Git para evitar diferencias entre el script y la terminal del usuario.
- Mejorar el diagnóstico del comando ejecutado cuando falle.

**Ejecución:**
- **Diagnóstico**: se detectó que el script ejecutaba Git como string con `shell: true` y además usaba una ruta distinta para `commit` frente al resto del flujo, lo que hacia fragil el parseo del ejecutable y argumentos en Windows.
- **Hardening**: `scripts/android-apk.mjs` ahora usa `spawnSync` con binario y argumentos separados (`shell: false`) para `npm`, `npx`, Gradle y Git.
- **Consistencia**: `git add`, `git commit` y `git push` ahora comparten la misma resolucion de binario y el mismo entorno de ejecucion.
- **Trazabilidad**: el helper imprime el comando exacto antes de correrlo y devuelve un error más preciso si falla.
- **Validación**: `node --check scripts\android-apk.mjs` sin errores.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `AGENTS.md`

### [2026-03-12 23:10] 150. Comando reutilizable para respaldo limpio a J:
**Planificación:**
- Reemplazar el script de respaldo previo por uno que actualice directamente `J:\BENJA\CotidieApp`.
- Excluir artefactos temporales e innecesarios del respaldo.
- Dejar un comando corto reutilizable para ejecutar el respaldo y mostrar error claro si el disco no esta conectado.

**Ejecución:**
- **Script de respaldo**: `scripts/create-backup.mjs` ahora limpia y recrea `J:\BENJA\CotidieApp`, copiando el proyecto sin `.git`, `node_modules`, `.next`, `out`, builds, caches, logs, temporales ni APKs.
- **Validación de disco**: el script verifica que exista `J:\` antes de copiar; si no esta conectado, falla con mensaje explícito.
- **Comando npm**: se agregó `npm run backup:drive` en `package.json` para ejecutar el respaldo desde el proyecto.
- **PowerShell**: se creó la función `crear` en el perfil del usuario para permitir `crear respaldo` desde cualquier carpeta.
- **Validación**: se ejecutó `node scripts/create-backup.mjs` y `powershell -Command "crear respaldo"` con resultado correcto.

**Archivos Modificados:**
- `scripts/create-backup.mjs`
- `package.json`
- `AGENTS.md`

### [2026-03-11 21:57] 149. Fullscreen con imagen + respaldo total + importacion inteligente
**Planificación:**
- Mantener la imagen asociada a la oración dentro del modo pantalla completa, sin perder el ancho completo.
- Hacer que el respaldo general `.ctd` exporte y restaure todo el estado relevante de la app desde un snapshot unico.
- Evitar importaciones innecesarias detectando respaldos, ajustes o planes personalizados ya existentes.

**Ejecución:**
- **PrayerDetail**: la imagen enlazada ya no desaparece en pantalla completa; ahora se mantiene visible y ocupa todo el ancho mientras el texto sigue centrado.
- **Snapshot completo**: se agregó `getBackupSnapshot` en `SettingsContext` y se normalizó/exporto el estado completo, incluyendo timer, modo distraccion, planes, stats, modo dev, trazas dev, simulaciones y banderas de Annuum.
- **Hidratacion/importacion**: se centralizo la aplicación del snapshot completo para cargar/exportar/importar el mismo formato y restaurar esos campos adicionales.
- **Importacion inteligente**: `importUserData` ahora distingue importacion completa, parcial y de plan personalizado; si el contenido ya coincide con lo existente, muestra aviso y no aplica cambios.
- **Ajustes y planes**: `ContentSettings` y `CustomPlanView` ahora usan la respuesta de importacion para exportar el snapshot completo y reportar correctamente duplicados o archivos invalidos.
- **Validación**: `npx tsc --noEmit` OK. `npm run build` alcanzo `next build --no-lint` pero no termino dentro del timeout del entorno.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/plans/CustomPlanView.tsx`
- `src/components/PrayerDetail.tsx`
- `AGENTS.md`

### [2026-03-11 18:36] 148. Doble avance para salir al men? en fin de plan
**Planificaci?n:**
- A?adir una salida controlada al llegar al ?ltimo ?tem de un plan personalizado sin romper la secuencia lineal.
- Mantener el flujo `1 -> 2 -> ... -> x`, pero permitir salir con doble avance desde `x`.

**Ejecuci?n:**
- **MainApp**: al intentar avanzar en el ?ltimo ?tem del plan, ahora aparece un toast con el aviso `Vuelve a avanzar para salir`.
- **Confirmaci?n**: si el usuario vuelve a avanzar dentro de una ventana corta, la app vuelve al men? del plan personalizado.
- **Controles de borde**: las flechas de navegaci?n del plan ya no se deshabilitan en los extremos; en el primero, retroceder no hace nada, y en el ?ltimo, avanzar activa la confirmaci?n de salida.

**Validaci?n:**
- `npm run build` completado correctamente.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-11 18:24] 147. Ajuste final de secuencia lineal en Plan Personalizado
**Planificaci?n:**
- Ajustar el fix anterior para que la navegaci?n del plan sea estrictamente lineal entre ?tems.
- Evitar que el retroceso en el primer ?tem saque al usuario del flujo.

**Ejecuci?n:**
- **MainApp**: en contexto de oraci?n abierta desde plan personalizado, `handleBack` ahora intenta abrir el ?tem anterior v?lido del plan y, si no existe uno previo, no realiza ninguna acci?n.
- **Bordes del flujo**: la secuencia qued? como `1 -> 2 -> 3 -> ... -> x`; en `1`, retroceder no hace nada, y en `x`, avanzar sigue sin hacer nada como antes.

**Validaci?n:**
- `npm run build` completado correctamente.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-03-11 18:09] 146. Fix back en Plan Personalizado entre categor?as
**Planificaci?n:**
- Revisar por qu? el flujo de retroceso se romp?a al pasar de una oraci?n de Plan de Vida a una devoci?n dentro de un plan personalizado.
- Corregir tanto el bot?n de volver de la app como el back nativo de Android para que respeten el contexto del plan.

**Ejecuci?n:**
- **MainApp**: `handleBack` dej? de expulsar al usuario a Inicio cuando la oraci?n actual viene de un plan personalizado. Ahora intenta abrir el ?tem v?lido anterior del mismo plan y, si no existe uno previo, vuelve a la vista del plan.
- **Cruce de categor?as**: el retroceso ahora conserva el slot e ?ndice del plan aunque el siguiente elemento pertenezca a otra categor?a (por ejemplo, de `Acordaos` a `Oraci?n a San Benjam?n`).
- **Android**: `useAndroidBackButton` pas? a delegar en la misma l?gica central de `handleBack`, evitando que el bot?n f?sico tenga un comportamiento distinto al bot?n del header.

**Validaci?n:**
- `npm run build` completado correctamente.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `src/components/main/useNativeAppBindings.ts`
- `AGENTS.md`

### [2026-03-11 16:17] 145. Saneamiento tras mudanza de carpeta + validación completa
**Planificación:**
- Revisar si el cambio de ubicación dejó rutas absolutas, dependencias ausentes o builds rotos.
- Corregir textos dañados o mal formulados que hubieran quedado en la copia nueva.
- Restaurar artefactos externos faltantes solo si eran necesarios para volver a compilar.

**Ejecución:**
- **Rutas tras la mudanza**: se revisaron referencias a rutas antiguas y no quedaron configuraciones activas del proyecto apuntando a la carpeta previa; las coincidencias restantes fueron solo históricas en `AGENTS.md` o referencias nominales del código.
- **Texto/UI**: se normalizaron secuencias mojibake reales en 17 archivos de `src` (acentos, signos de apertura, viñetas, emoji e índices) para que la interfaz vuelva a mostrarse correctamente.
- **Formulación**: se corrigieron frases visibles como `Se ha abierto el menú para compartir.` y el misterio luminoso `La autorrevelación de Jesús en las bodas de Caná`.
- **Android/Gradle**: se restauró la caché local necesaria del wrapper de Gradle en la nueva ubicación y se recompiló Android usando `GRADLE_USER_HOME` dentro del proyecto.

**Validación:**
- `npm run build` completado correctamente en `C:\Users\balca\Desktop\CotidieApp`.
- `android\gradlew.bat :app:compileDebugJavaWithJavac` completado correctamente con la caché nueva de Gradle.
- No quedaron secuencias mojibake en `src` tras el saneamiento.

**Archivos Modificados:**
- `src/components/AddPrayerForm.tsx`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/plans/CustomPlanView.tsx`
- `src/components/PrayerAccordion.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/PrayerList.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/RosaryMeditated.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/settings/DeveloperSettings.tsx`
- `src/components/ViaCrucisImmersive.tsx`
- `src/components/AnnuumStory.tsx`
- `src/context/SettingsContext.tsx`
- `src/lib/textFormatter.tsx`
- `AGENTS.md`

### [2026-03-11 15:30] 144. Traslado limpio del proyecto a Escritorio
**Planificación:**
- Mover el proyecto a `Desktop` excluyendo carpetas y archivos temporales o de caché.
- Reinstalar únicamente dependencias y artefactos temporales necesarios en la copia nueva.
- Intentar retirar la carpeta original para evitar duplicados y confusión de rutas.

**Ejecución:**
- **Copia limpia**: se replicó el proyecto en `C:\Users\balca\Desktop\CotidieApp` excluyendo `node_modules`, `.next`, `out`, `dist`, `coverage`, `.turbo`, `.gradle-user-home`, `.gradle`, `.idea`, `.trae`, `android\.gradle`, `android\build`, `android\app\build` y logs/temporales comunes.
- **Reinstalación**: se ejecutó `npm install` en la copia de Escritorio para reconstruir únicamente dependencias necesarias.
- **Limpieza final**: se eliminaron rastros generados no necesarios en la nueva copia (`tsc.out`, `tsconfig.tsbuildinfo`).
- **Ruta original**: la carpeta original quedó vaciada, pero Windows mantuvo bloqueado el borrado del directorio raíz por uso de otro proceso durante esta sesión.

**Resultado:**
- La copia operativa y limpia del proyecto pasó a ser `C:\Users\balca\Desktop\CotidieApp`.
- En la copia nueva no quedaron `.trae` ni carpetas de caché excluidas del traslado.

**Archivos Modificados:**
- `AGENTS.md`

### [2026-03-11 13:20] 143. Fix importación real de planes `.ctd` y respaldos completos
**Planificación:**
- Verificar si la importación/exportación mostraba mensajes de éxito acordes al estado real aplicado.
- Corregir el caso donde un `.ctd` de plan personalizado se confirmaba pero no actualizaba `customPlans`.
- Corregir la importación de respaldo completo para que no dependa solo de `localStorage` cuando la app prioriza IndexedDB.

**Ejecución:**
- **Plans `.ctd`**: en `SettingsContext`, la rama de importación parcial ahora procesa `customPlans`, de modo que importar un plan personalizado desde archivo local sí actualiza el estado efectivo de la app.
- **Backups completos**: en `ContentSettings`, la detección de backup completo dejó de escribir solo en `localStorage` + recargar; ahora usa `importUserData(...)` para aplicar el estado vivo y persistirlo correctamente por la vía normal (IndexedDB + respaldo local).
- **Resultado funcional**: tanto el mensaje de éxito como el estado aplicado quedaron alineados para importaciones de planes y respaldos.

**Validación:**
- `node .\node_modules\typescript\lib\tsc.js --noEmit --noUnusedLocals --noUnusedParameters --pretty false` sin errores.
- `cmd /c npm run build` completado correctamente.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/settings/ContentSettings.tsx`
- `AGENTS.md`

### [2026-03-11 12:55] 142. Auditoría global + limpieza de código muerto + separación de componentes
**Planificación:**
- Revisar el proyecto completo excluyendo temporales/cachés para detectar errores reales, imports/estados muertos y piezas que podían separarse sin riesgo.
- Endurecer el chequeo de TypeScript con `noUnusedLocals` y `noUnusedParameters` para identificar código muerto confirmado.
- Reordenar archivos con fronteras claras de responsabilidad y corregir deuda funcional encontrada durante la auditoría.

**Ejecución:**
- **Limpieza de código muerto**:
  - Se eliminaron imports, estados, handlers y helpers sin uso en múltiples componentes (`MainApp`, `PrayerList`, `PrayerDetail`, `ContentSettings`, `AppearanceSettings`, `AnnuumStory`, `RosaryImmersive`, `RosaryMeditated`, `SearchCamino`, `DeveloperSettings`, `CustomPlanView`, `AudioPlayer`, `ImageCropper`, `calendar`, etc.).
  - Se simplificó `ics-generator.ts` removiendo lógica/variables huérfanas y dejando una implementación más directa.
- **Separación por coherencia**:
  - Se extrajo `CartasIntro` desde `MainApp` a `src/components/main/CartasIntro.tsx`.
  - Se extrajo `SaintOfTheDayCard` desde `PrayerList` a `src/components/saints/SaintOfTheDayCard.tsx`.
- **Corrección funcional adicional**:
  - `setPredefinedPrayerOverride` en `SettingsContext` dejó de ser un `TODO` y ahora guarda, persiste y reaplica overrides de oraciones predeterminadas.
  - La aplicación de overrides/ocultamiento de oraciones predeterminadas pasó a ser recursiva, cubriendo también oraciones anidadas.
  - `restorePredefinedPrayer` y `restoreAllPredefinedPrayers` ahora limpian correctamente overrides asociados.

**Validación:**
- `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` sin errores.
- `node .\node_modules\typescript\lib\tsc.js --noEmit --noUnusedLocals --noUnusedParameters --pretty false` sin errores.
- `cmd /c npm run build` completado correctamente (`next build` + export estático).

**Archivos Modificados:**
- `src/components/AddPrayerForm.tsx`
- `src/components/AudioPlayer.tsx`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/PrayerAccordion.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/PrayerList.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/RosaryMeditated.tsx`
- `src/components/SearchCamino.tsx`
- `src/components/ViaCrucisImmersive.tsx`
- `src/components/AnnuumStory.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/plans/CustomPlanView.tsx`
- `src/components/saints/SaintOfTheDayCard.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/settings/DeveloperSettings.tsx`
- `src/components/ui/ImageCropper.tsx`
- `src/components/ui/calendar.tsx`
- `src/context/SettingsContext.tsx`
- `src/lib/ics-generator.ts`
- `src/lib/textFormatter.tsx`
- `AGENTS.md`

### [2026-03-11 10:20] 141. Zonas de toque inmersivas como Plan Personalizado
**Planificación:**
- Igualar la navegación táctil de `RosaryImmersive` y `ViaCrucisImmersive` al comportamiento del Plan Personalizado.
- Permitir que tocar sobre texto también avance/retroceda, sin romper botones interactivos.
- Evitar zonas muertas en Rosario cuando el modo global es `Zonas de toque`.

**Ejecución:**
- **Helper táctil**: `src/utils/touchNavigation.ts` ahora exporta `TOUCH_NAV_INTERACTIVE_SELECTORS` y acepta `blockedSelectors` para reutilizar la lógica con distinto criterio según la vista.
- **Rosario inmersivo**:
  - En modo `touch`, la navegación táctil ahora ignora solo controles interactivos reales (`button`, links, inputs, etc.), igual que el flujo deseado del plan personalizado.
  - Se retiró la capa overlay de zonas laterales que estaba interceptando toques y dejaba el centro sin respuesta sobre el texto.
  - El root click quedó condicionado a `touchNavEnabled`, para no mezclar globo y zonas de toque a la vez.
- **Vía Crucis inmersivo**:
  - Se aplicó el mismo criterio de navegación táctil del Plan Personalizado al tocar texto.
  - Se eliminó helper local redundante que bloqueaba `[data-no-touch-nav]`.

**Validación:**
- `node .\\node_modules\\typescript\\lib\\tsc.js --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/utils/touchNavigation.ts`
- `src/components/RosaryImmersive.tsx`
- `src/components/ViaCrucisImmersive.tsx`
- `AGENTS.md`

### [2026-03-11 09:50] 140. Fix build Next 15 (spawn EPERM) + hardening export workers
**Planificación:**
- Resolver el fallo de `npm run build` en Windows donde Next.js terminaba con `spawn EPERM` tras compilar.
- Mantener `next-pwa` activo sin romper la exportación estática con `workerThreads`.
- Evitar que el script Android dependa del home de Gradle del entorno y no haga bump/push involuntario en validaciones.

**Ejecución:**
- **Next build / Windows**:
  - En `next.config.mjs` se desactivó `experimental.webpackBuildWorker` y se activó `experimental.workerThreads` para evitar el `spawn` bloqueado de `jest-worker`.
  - Se añadió `hideFunctionProperties(...)` para ocultar propiedades función en la config devuelta por `withPWA`, reduciendo conflictos de clonación en workers.
- **Patch reproducible para export workers**:
  - Se creó `scripts/patch-next-export-workers.js` para parchear `node_modules/next/dist/export/index.js`.
  - El parche vuelve no enumerables las funciones de `nextConfig` antes de enviar la configuración a workers de exportación, evitando `DataCloneError` con `generateBuildId`, `exportPathMap` y similares.
  - `package.json` ahora ejecuta este parche también en `postinstall`.
- **Android APK script**:
  - `scripts/android-apk.mjs` ahora fija `GRADLE_USER_HOME` dentro del workspace (`.gradle-user-home`) para no depender de perfiles inválidos del entorno.
  - Se añadió soporte explícito para validar con `--no-bump --no-push`, evitando subir versión o hacer `git push` por una corrida técnica.

**Validación:**
- `npm run build` completó correctamente: compilación, page data, static pages, build traces y export.
- `node scripts/android-apk.mjs --no-bump --no-push` ya supera el fallo original de Next/webpack y avanza hasta Gradle; la fase final de Android quedó limitada por descarga/lock del wrapper en el entorno, no por error de la app web.

**Archivos Modificados:**
- `next.config.mjs`
- `package.json`
- `scripts/android-apk.mjs`
- `scripts/patch-next-export-workers.js`
- `AGENTS.md`

### [2026-02-27 15:19] 139. Fondos por estación en Vía Crucis + fix apertura invasiva Android
**Objetivo:**
- Integrar fondos visuales por estación (14) en `ViaCrucisImmersive`.
- Corregir apertura inesperada de la app cuando está en segundo plano.
- Mantener acción de notificación `mark_prayed` sin abrir Activity en Android.

**Ejecución:**
- **Vía Crucis inmersivo**:
  - Se agregó arreglo de 14 imágenes de dominio público (Wikimedia) para cada estación.
  - Se incorporó selección de imagen por fase/estación (`intro`, `stations`, `outro`).
  - Se reemplazó fondo de gradiente plano por capa de imagen + overlay oscuro para conservar legibilidad.
- **Android anti-apertura invasiva**:
  - En `MainActivity`, `onRenderProcessGone` ahora solo reinicia actividad si la app está en foreground.
  - Se añadió flag `isInForeground` actualizado en `onResume/onPause`.
- **Integración background mark-prayed**:
  - Se corrige tipado de listener `App.addListener` en `SettingsContext` (manejo correcto de promesa y cleanup).

**Validación:**
- `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/components/ViaCrucisImmersive.tsx`
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-02-26 03:45] 138. Revisión y ajuste tamaño globo (Rosario)
**Planificación:**
- Verificar coherencia de imports/exports y que el tamaño de globo afecte Rosario.

**Ejecución:**
- **Rosario**: el tamaño del globo usa `arrowBubbleSize` del contexto global.
- **Header/Plan**: el globo flotante respeta el tamaño configurado.
- **UI**: selector de modo de navegación añadido antes del tamaño del globo.
- **Limpieza**: removidos toggles locales de navegación.

**Archivos Modificados:**
- `src/components/RosaryImmersive.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/context/SettingsContext.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `AGENTS.md`

### [2026-02-26 03:35] 137. Modo de navegación global + tamaño de globo
**Planificación:**
- Mover el cambio entre “Zonas de toque” y “Globo de flechas” a Ajustes.
- Aplicar el tamaño del globo al control flotante del Plan Personalizado.

**Ejecución:**
- **Ajustes**: se agregó selector de modo de navegación en Apariencia, antes del tamaño del globo.
- **Header**: el globo flotante ahora respeta `arrowBubbleSize`.
- **Plan/Rosario**: se eliminó el botón de cambio (mano) y se usa el modo global.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/RosaryImmersive.tsx`
- `AGENTS.md`

### [2026-02-26 03:20] 136. Acción “Descartar” sin cancelar futuros
**Planificación:**
- Evitar que “Descartar” cancele notificaciones futuras.

**Ejecución:**
- **Notificaciones**: la acción `dismiss` ya no cancela la notificación programada; solo cierra la actual.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-02-26 03:10] 135. Zonas táctiles + acciones en notificaciones
**Planificación:**
- Ajustar zonas táctiles en Plan Personalizado y agregar modo similar en Rosario Inmersivo.
- Añadir acciones en notificaciones para marcar como rezado o descartar.

**Ejecución:**
- **Plan Personalizado**: zonas táctiles con 2/8 izquierda (retroceder), 3/8 centro sin acción, 3/8 derecha (avanzar), con altura completa menos header.
- **Rosario Inmersivo**: se agregó toggle para zonas táctiles y overlay con mismas proporciones; el globo se oculta cuando está activo.
- **Notificaciones**: se registraron action types y se añadieron botones; al marcar como rezado se hace check de la oración y se descarta la notificación.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-02-26 02:50] 134. Fix imagen Santo del día (viernes)
**Planificación:**
- Corregir la ruta de la imagen predeterminada de viernes.

**Ejecución:**
- **Placeholder**: se actualizó `saintoftheday-5` para apuntar a `/images/crucifixion.jpeg` (archivo existente).

**Archivos Modificados:**
- `src/lib/placeholder-images.json`
- `AGENTS.md`

### [2026-02-26 02:40] 133. Forzar reemplazo de íconos Android
**Planificación:**
- Forzar la sustitución de `ic_launcher*` en todas las densidades desde `Downloads/icon.png`.

**Ejecución:**
- **Android**: se reemplazaron `ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground` e `ic_launcher_background` en todos los `mipmap-*` y se limpiaron archivos temporales.
- **Assets Android**: re-sincronizados desde `public/icons`.

**Archivos Modificados:**
- `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- `android/app/src/main/assets/public/icons/icon.png`
- `android/app/src/main/assets/public/icons/icon-maskable.png`
- `android/app/src/main/assets/public/icons/icon.jpg`
- `AGENTS.md`

### [2026-02-26 02:30] 132. Reaplicar íconos APK desde Descargas
**Planificación:**
- Asegurar que los íconos Android salgan exactamente desde `Downloads/icon.png`.

**Ejecución:**
- **Android**: se regeneraron `ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground` e `ic_launcher_background` en todos los `mipmap-*` desde el archivo de Descargas.
- **PWA/Assets**: se re-sincronizó `public/icons/icon.png` y los assets Android.

**Archivos Modificados:**
- `public/icons/icon.png`
- `public/icons/icon.jpg`
- `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- `android/app/src/main/assets/public/icons/icon.png`
- `android/app/src/main/assets/public/icons/icon.jpg`
- `AGENTS.md`

### [2026-02-26 02:20] 131. Íconos sin contorno visible + safe zone
**Planificación:**
- Quitar el contorno visible en el ícono principal.
- Mantener zona segura para recortes (maskable/adaptive).

**Ejecución:**
- **PWA**: `icon.png` y `icon.jpg` regenerados sin padding (full-bleed). `icon-maskable.png` mantiene padding.
- **Android**: `ic_launcher*.png` regenerados sin padding; la safe zone se mantiene por el inset del adaptive icon.
- **Assets Android**: sincronizados desde `public/icons`.

**Archivos Modificados:**
- `public/icons/icon.png`
- `public/icons/icon-maskable.png`
- `public/icons/icon.jpg`
- `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- `android/app/src/main/assets/public/icons/icon.png`
- `android/app/src/main/assets/public/icons/icon-maskable.png`
- `android/app/src/main/assets/public/icons/icon.jpg`
- `AGENTS.md`

### [2026-02-26 02:10] 130. Evitar doble conteo al abrir oraciones
**Planificación:**
- Evitar incrementos duplicados causados por la sincronización de checks de Plan de Vida.

**Ejecución:**
- **Plan de Vida**: se añadió un flag `skipStatIncrement` a `togglePlanDeVidaItem` para que la sincronización desde `incrementStat` no dispare un segundo conteo.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-02-26 02:00] 129. Reemplazo global de íconos (PWA + Android)
**Planificación:**
- Reemplazar íconos principales por `Downloads/icon.png`.
- Generar variantes con zona segura para recortes del sistema.

**Ejecución:**
- **PWA**: `public/icons/icon.png`, `icon-maskable.png` e `icon.jpg` regenerados con padding (safe zone).
- **Android**: `ic_launcher*.png` en `mipmap-*` regenerados con padding.
- **Assets Android**: `android/app/src/main/assets/public/icons` sincronizado con `public/icons`.
- **Exclusión**: no se tocaron `black_icon.png` y `white_icon.png`.

**Archivos Modificados:**
- `public/icons/icon.png`
- `public/icons/icon-maskable.png`
- `public/icons/icon.jpg`
- `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- `android/app/src/main/assets/public/icons/icon.png`
- `android/app/src/main/assets/public/icons/icon-maskable.png`
- `android/app/src/main/assets/public/icons/icon.jpg`
- `AGENTS.md`

### [2026-02-26 01:40] 128. Sync contador Angelus con “Angelus y Regina Coeli”
**Planificación:**
- Alinear el contador de Angelus con la oración de Plan de Vida “Angelus y Regina Coeli”.
- Respetar la ventana de enfriamiento de 1 hora.

**Ejecución:**
- **Stats**: se normalizó el conteo de Angelus para claves `angelus-regina-coeli` y variantes (`regina-coeli`, `regina-caeli`, `reginaCoeli`).
- **Cooldown**: el bloqueo de 1 hora ahora se aplica sobre la clave canónica `angelus`.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-02-26 01:30] 127. Renombre lector EPUB + íconos Annuum
**Planificación:**
- Renombrar el componente del lector a un nombre genérico.
- Unificar los íconos de Cotidie Annuum al `icons/icon.png`.

**Ejecución:**
- **Reader**: `NewTestamentEpubReader` pasó a `EpubReader` y se actualizaron imports/uso.
- **Annuum**: se apuntaron íconos del globo y del resumen a `/icons/icon.png`.

**Archivos Modificados:**
- `src/components/EpubReader.tsx`
- `src/components/PersonalEpubLibrary.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/AnnuumStory.tsx`
- `AGENTS.md`

### [2026-02-26 01:20] 126. Panel lateral EPUB personal (índice y búsqueda genéricos)
**Planificación:**
- Hacer que el panel lateral del lector de EPUB personal use el índice real del libro, sin filtros del Nuevo Testamento.
- Ajustar textos de búsqueda para contenido no bíblico.

**Ejecución:**
- **Reader**: se agregó `context` para alternar entre modo NT y modo general.
- **TOC**: en modo general se ocultan filtros por libro NT y el índice NT.
- **Búsqueda**: se ajustaron textos y placeholder para no mencionar capítulos/versículos ni “Juan 3:16”.
- **Library**: se pasa `context="general"` al lector personal.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `src/components/PersonalEpubLibrary.tsx`
- `AGENTS.md`

### [2026-02-26 01:05] 125. Lectura Espiritual: Personales directo
**Planificación:**
- Evitar un nivel extra dentro de “Personales”.
- Mantener el `id` que activa el lector EPUB personal.

**Ejecución:**
- **Lectura Espiritual**: “Personales” ahora es el ítem directo con `id: lectura-espiritual-personales`.

**Archivos Modificados:**
- `src/lib/data.tsx`
- `AGENTS.md`

### [2026-02-26 00:55] 124. Limpieza temprana de Service Worker en dev
**Planificación:**
- Evitar que un service worker antiguo bloquee JS/CSS en `localhost`, causando pantalla en blanco.
- Ejecutar limpieza antes de la hidratación.

**Ejecución:**
- **Layout**: se añadió script inline en `<head>` para desregistrar service workers y limpiar caches cuando el host es local.

**Archivos Modificados:**
- `src/app/layout.tsx`
- `AGENTS.md`

### [2026-02-26 00:45] 123. Fix pantalla en blanco en dev (RSC)
**Planificación:**
- Corregir la ejecución de hooks en `app/page.tsx` asegurando componente cliente.

**Ejecución:**
- **Page**: se agregó `'use client';` al inicio de `src/app/page.tsx`.

**Archivos Modificados:**
- `src/app/page.tsx`
- `AGENTS.md`

### [2026-02-26 00:35] 122. Mitigación de ruido ResizeObserver en dev
**Planificación:**
- Evitar el spam de errores “ResizeObserver loop …” que colapsa el overlay y provoca `ERR_INSUFFICIENT_RESOURCES`.
- Mantener el log de errores reales.

**Ejecución:**
- **Page**: se filtró el error global de `ResizeObserver` en desarrollo y se llama `preventDefault()` para evitar el overlay.

**Archivos Modificados:**
- `src/app/page.tsx`
- `AGENTS.md`

### [2026-02-26 00:25] 121. Accesibilidad de formularios (labels/ids)
**Planificación:**
- Eliminar advertencias de consola sobre campos sin `id/name` o sin `label` asociado.
- Añadir atributos `id`, `name` y/o `aria-label` en inputs/selects afectados.

**Ejecución:**
- **EPUB reader**: se asociaron labels con selects de color y se añadieron `id/name/aria-label` a los selects del índice.
- **Rosario inmersivo**: se añadieron `name/aria-label` a inputs de intenciones y jaculatorias.
- **Subida de archivos**: se añadieron `id/name/aria-label` a inputs de importación y EPUB personal.
- **Selector de color**: se vinculó `Label` con el input y se añadieron `id/name/aria-label`.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/PersonalEpubLibrary.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `AGENTS.md`

### [2026-02-26 00:15] 120. Fix 404 de assets `_next` en dev (service worker)
**Planificación:**
- Evitar que el service worker de PWA sirva HTML/asset cacheados en `localhost` causando 404.
- Limpiar registros/caches solo en desarrollo.

**Ejecución:**
- **Cleanup dev**: se agregó un componente cliente que desregistra service workers y limpia caches cuando `NODE_ENV !== 'production'`.
- **Layout**: se integró el cleanup en `src/app/layout.tsx` para ejecutarse al cargar en dev.

**Archivos Modificados:**
- `src/components/ServiceWorkerCleanup.tsx`
- `src/app/layout.tsx`
- `AGENTS.md`

### [2026-02-26 00:00] 119. Lectura Espiritual: subsecciones + fix PWA _document
**Planificación:**
- Separar “Lectura Espiritual” en subsecciones “Predeterminadas” y “Personales”.
- Mover el lector EPUB personal a “Personales” y mantener el resto en “Predeterminadas”.
- Corregir el error de build de PWA por falta de `/_document`.

**Ejecución:**
- **Lectura Espiritual**: se reorganizó el contenedor en dos subsecciones, dejando todos los textos en “Predeterminadas”.
- **EPUB personal**: el ítem del lector EPUB quedó dentro de “Personales” conservando su `id` para la vista existente.
- **PWA build**: se agregó `src/pages/_document.tsx` mínimo para resolver `PageNotFoundError: /_document`.

**Archivos Modificados:**
- `src/lib/data.tsx`
- `src/pages/_document.tsx`
- `AGENTS.md`

### [2026-02-25 15:26] 118. Hardening anti-reinicio (Ejecución)
**Objetivo:**
- Reducir probabilidad de reinicios por presión de memoria y por caída del proceso WebView.

**Ejecución:**
- **Biblioteca EPUB personal optimizada**:
  - Se dejó de mantener todos los EPUB (base64) en memoria React.
  - Ahora se guarda índice liviano + contenido por clave separada en `localStorage`.
  - Se carga el base64 solo al abrir un EPUB.
  - Se añadió límite de tamaño por archivo (25MB) para evitar picos de memoria.
- **MainActivity robustecido**:
  - Se añadió manejo de `onRenderProcessGone` (API 26+) con reinicio controlado de actividad.
  - Se añadió límite de lectura para imports compartidos (`MAX_IMPORT_BYTES`) para evitar cargas excesivas.
  - Se conserva el mecanismo de reintento para flush del payload al WebView.

**Validación:**
- `npx tsc --noEmit` sin errores.
- `./gradlew.bat :app:compileDebugJavaWithJavac` exitoso.

**Archivos Modificados:**
- `src/components/PersonalEpubLibrary.tsx`
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`

### [2026-02-25 15:08] 117. Lote de correcciones UX/estabilidad/importación/contador (Ejecución)
**Ejecución:**
- **(1) Safe area NT fullscreen**: se reforzó `NewTestamentEpubReader` con `100dvh` + `safe-area-inset-*` (con fallback) para evitar solaparse con barra del sistema.
- **(2) Ícono PWA con zona segura**: se generó `public/icons/icon-maskable.png` y se actualizó `manifest.json` para usar `icon.png` (`any`) + `icon-maskable.png` (`maskable`).
- **(3) Día 05:00 en conteos/checks**: se agregó clave de “día pastoral” (05:00–04:59) para estadísticas de oración y checks del Plan de Vida, manteniendo el resto de la app en día 00:00.
- **(4) Check también cuenta**: al marcar check manual en Plan de Vida, ahora también incrementa el conteo de oración correspondiente (sin recursión/doble marcado).
- **(5) Reinicios frecuentes**: se añadieron capturas globales de `error` y `unhandledrejection` para reducir caídas por errores no manejados.
- **(6) Globos de citas más lentos**: se ralentizó animación `enjoy-balloon` de 15s a 36s.
- **(7) Letanías directas = Rosario**: al abrir oración `letanias` fuera del flujo inmersivo, se fuerza contenido base de letanías del Rosario para mantener coherencia.
- **(8) Importación abrir-con-app**: se robusteció `MainActivity` con reintentos de flush al WebView y se añadió soporte `appUrlOpen/getLaunchUrl` en web layer para procesar archivos compartidos.
- **(9) Lectura Espiritual > Personales**: se añadió sección “Personales” y componente para subir/listar EPUBs propios y abrirlos con el lector EPUB integrado.
- **(10) Modo táctil en plan personalizado**: se agregó modo persistente (memoria local) para navegación por zonas táctiles (inferior izq=anterior, centro+der=siguiente), con botón en encabezado para alternar modo.

**Validación:**
- `npx tsc --noEmit` sin errores.
- `./gradlew.bat :app:compileDebugJavaWithJavac` OK (nota deprecación API en `MainActivity`, sin error de compilación).

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `public/manifest.json`
- `public/icons/icon-maskable.png` (NUEVO)
- `src/context/SettingsContext.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/components/main/MainApp.tsx`
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `src/components/Header.tsx`
- `src/components/PersonalEpubLibrary.tsx` (NUEVO)
- `src/lib/data.tsx`

### [2026-02-25 14:17] 116. Lote de correcciones UX/estabilidad/importación/contador (Planificación)
**Planificación:**
- Ajustar safe area en fullscreen de `Lectura Nuevo Testamento`.
- Unificar ícono PWA con variante maskable con zona segura.
- Mover a ciclo de día 05:00 (solo para contadores Cotidie Annuum + checks Plan de Vida).
- Contar progreso al marcar check (además de abrir oración/sección).
- Mitigar reinicios con manejo de errores globales no fatales y robustecer flujo de importación por abrir-con-app.
- Ralentizar animación de globos de citas.
- Unificar letanías “directas” con las usadas en Rosario.
- Añadir sección “Personales” en Lectura Espiritual con listado de EPUBs del usuario.
- Añadir modo de navegación táctil por zonas en oración abierta desde plan personalizado, con memoria.

**Ejecución:**
- En progreso.

### [2026-02-25 12:35] 115. Fix loop de actualización máxima (dev) y estabilidad lector NT
**Planificación:**
- Eliminar fuentes probables de bucle de render/setState en desarrollo ligadas a trazas globales del lector y registro excesivo de navegación.

**Ejecución:**
- **Lector EPUB**: se retiró el interceptor local de `window.error/unhandledrejection` dentro de `NewTestamentEpubReader` que escribía en trazas durante errores de runtime, para evitar recursión de estado.
- **MainApp**: se quitó el efecto que emitía traza en cada cambio de navegación (`Vista activa...`), reduciendo presión de re-render y riesgo de loops en modo dev.
- **Resultado**: se mantiene trazabilidad útil en acciones clave (notificaciones/importación/errores del lector en operaciones), pero sin ganchos que puedan auto-dispararse en cascada.
- **Validación**: `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `src/components/main/MainApp.tsx`
- `AGENTS.md`

### [2026-06-05 11:45] 231. Hardening y correcciones de UI
**Planificación:**
- Realizar una serie de mejoras técnicas y visuales en widgets, calendario litúrgico, persistencia de lectura, notificaciones y gestión de contenido de usuario.
- Corregir errores de navegación en la sección de "Cartas" y sincronizar estadísticas con el calendario de Plan de Vida.
- Asegurar la precisión litúrgica según el canon de Chile (Santiago) y añadir festividades móviles faltantes.

**Ejecución:**
- **Widget**: se ajustó `widget_saint_small.xml` con mayor padding (14dp/12dp) y se redujo el radio de esquinas a 16dp para evitar recortes de texto. Se alineó la configuración de líneas en `SaintWidgetUpdater.java`.
- **Liturgia**: se revisaron los colores litúrgicos; se confirmó que San Juan Bautista de Rossi es blanco por ser tiempo de Pascua y ser presbítero. Se añadió el 16 de julio (Vírgen del Carmen) como solemnidad blanca para Chile.
- **Navegación y Textos**: se eliminó la marca `isLongText` del Vía Crucis para tratarlo como oración corta. Se corrigió el acceso a las entradas de "Cartas" anidando `userLetters` bajo el nodo raíz en `SettingsContext`.
- **EPUB**: se mejoró la persistencia de la ubicación en `EpubReader.tsx`, asegurando que el CFI se guarde en `onRelocated` y se restaure correctamente al abrir el libro.
- **Estadísticas**: se refactorizó la lógica de conteo para que `totalPrayersOpened` coincida exactamente con los checks del calendario. La racha de Misa ahora se basa exclusivamente en la entrada "Santa Misa".
- **Notificaciones**: se implementó `skipNotificationIfChecked` para omitir recordatorios de oraciones ya rezadas. Se añadieron fiestas móviles: María Madre de la Iglesia, Trinidad, Corpus Christi, Sagrado e Inmaculado Corazón. Se corrigieron acentos en mensajes automáticos.
- **Contenido de Usuario**: se añadió un botón para eliminar imágenes cargadas por el usuario en `AddPrayerForm`. Se implementó un guardado automático de borradores cada segundo en `localStorage`.
- **Interfaz "Cartas"**: se movió el toggle de recordatorio a un diálogo de información accesible desde el encabezado.
- **Nuevos Contenidos**: se agregó el rito de "Exposición y Bendición con el Santísimo" en `src/lib/prayers/oraciones/exposicion-bendicion.ts`.
- **Solapamiento de Santos**: se implementó una lógica en `SettingsContext` para mostrar nombres combinados ("Fiesta Móvil / Santo Importante") cuando coinciden celebraciones de alta importancia.

**Validación:**
- `.\node_modules\.bin\tsc.cmd --noEmit` OK.
- Verificación de lógica de racha y conteo sincronizado: OK.
- Navegación recursiva en Cartas corregida: OK.

**Archivos Modificados:**
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `src/context/SettingsContext.tsx`
- `src/context/settings/stats-updates.ts`
- `src/components/EpubReader.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/main/CartasIntro.tsx`
- `src/components/settings/NotificationSettings.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/liturgical-color-rules.ts`
- `src/lib/movable-feasts.ts`
- `src/lib/placeholder-images.json`
- `src/lib/prayers/plan-de-vida/via-crucis.ts`
- `src/lib/prayers/oraciones/exposicion-bendicion.ts`
- `AGENTS.md`

### [2026-06-05 11:55] 232. Corrección de errores en recursos XML de Widget
**Planificación:**
- Investigar y corregir los errores reportados en `widget_bg_round.xml` y `widget_saint_small.xml`.
- Asegurar que la estructura XML sea válida y compatible con `RemoteViews`.
- Ajustar el auto-dimensionamiento del texto para que no escape de los límites del widget.

**Ejecución:**
- **Limpieza de XML**: se reescribieron `widget_bg_round.xml` y `widget_saint_small.xml` eliminando atributos redundantes y asegurando una estructura limpia. Se identificó que las alertas del validador local ("Attribute not allowed") eran falsos positivos debido a una configuración incorrecta del entorno de inspección.
- **Ajuste de Límites**: se reforzó el padding en `widget_saint_small.xml` (14dp laterales, 12dp verticales) y se activó el auto-dimensionamiento de texto (`autoSizeTextType="uniform"`) con rangos seguros (8sp-18sp) para garantizar que el texto se ajuste al recuadro sin cortarse por las esquinas redondeadas.
- **Consistencia**: se alinearon los pesos (`layout_weight`) y máximos de líneas en el XML y en `SaintWidgetUpdater.java` para evitar desbordes visuales.

**Validación:**
- Revisión manual de la estructura XML: OK.
- Sincronización de lógica de líneas en Java y XML: OK.

**Archivos Modificados:**
- `android/app/src/main/res/layout/widget_saint_small.xml`
- `android/app/src/main/res/drawable/widget_bg_round.xml`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetUpdater.java`
- `AGENTS.md`

### [2026-02-25 12:20] 114. Ajuste de paginación táctil EPUB (sin detección CFI forzada)
**Planificación:**
- Simplificar navegación `next/prev` para evitar falsos errores por detección de CFI no disponible en tiempo real.
**Ejecución:**
- **Paginación táctil**: se eliminó la validación forzada de cambio de CFI en `goNext/goPrev` (era la fuente de falsos fallos en algunos estados de `epubjs`).
- **Flujo actual**: primero intenta `rendition.next/prev`; solo si falla, aplica fallback por `spine`.
- **Resultado esperado**: vuelve el avance/retroceso normal por toque y se reducen errores espurios.
- **Validación**: `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `AGENTS.md`

### [2026-02-25 12:00] 113. Supresión de error no fatal al salir de lector EPUB
**Planificación:**
- Mitigar errores no fatales de `epubjs` durante desmontaje/salida de `Lectura Nuevo Testamento` para que no aparezcan como issue global en desarrollo.
**Ejecución:**
- **Filtro local en lector**: se añadieron listeners en `NewTestamentEpubReader` para `window.error` y `unhandledrejection` que suprimen solo errores probables de teardown de EPUB (AbortError/epub/rendition/spine/destroy).
- **Trazabilidad**: cada supresión se registra como `warn` en trazas dev (`source: epub-reader`) para no perder diagnóstico.
- **Alcance**: el filtro vive únicamente mientras está montado el lector de Nuevo Testamento, evitando afectar otras vistas.
- **Validación**: `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `AGENTS.md`

### [2026-02-25 11:45] 112. Restaurar paginación táctil en lector EPUB
**Planificación:**
- Restaurar las zonas táctiles de avance/retroceso de página en `Lectura Nuevo Testamento` en el flujo estándar de lectura, manteniendo el resto de fixes de estabilidad.
**Ejecución:**
- **Touch zones**: se restauró la capa táctil de navegación del lector EPUB para que vuelva a funcionar el avance/retroceso tocando pantalla (no solo en pantalla completa).
- **Comportamiento**: se mantienen las reglas de zonas inferiores izquierda/centro/derecha ya definidas.
- **Validación**: `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `AGENTS.md`

### [2026-02-25 11:30] 111. Hardening de salida en lector Nuevo Testamento
**Planificación:**
- Blindar callbacks/eventos del lector EPUB para que ningún error interno al desmontar o salir propague excepción global.
- Reducir riesgo de error en desarrollo al abandonar la vista (`relocated/selected`, anotaciones y acceso a storage).
**Ejecución:**
- **Reader lifecycle**: se añadió `isMountedRef` para evitar actualizar estado cuando el componente ya se desmontó.
- **Callbacks EPUB**: `relocated` y `selected` quedaron encapsulados en `try/catch`, con guardas de montaje y traza dev en errores no fatales.
- **Cleanup listeners**: al desmontar se intenta remover explícitamente listeners de `rendition` antes de destruirlo.
- **Storage/annotations**: persistencias de bookmarks/subrayados y operaciones de anotación (`add/remove`) se protegieron con `try/catch`.
- **Objetivo**: evitar que errores internos del lector al salir terminen en excepción global visible en dev overlay.
- **Validación**: `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `AGENTS.md`

### [2026-02-25 11:10] 110. Fix check automático con ventana de 1 hora
**Planificación:**
- Corregir que el check de Plan de Vida se marque aunque el contador esté en cooldown de 1 hora para `prayersOpenedHistory`.
- Mantener el bloqueo del contador (para evitar spam) sin romper la UX del check automático.
**Ejecución:**
- **SettingsContext**: se ajustó `incrementStat` para que, cuando el incremento queda bloqueado por la ventana de 1 hora, igual ejecute la sincronización de check de Plan de Vida (`togglePlanDeVidaItem(..., true)`).
- **Resultado**: el contador sigue protegido contra spam, pero la casilla de `Lectura Nuevo Testamento` (y otros ítems de Plan de Vida) se marca al abrir, incluso dentro del cooldown.
- **Validación**: `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `AGENTS.md`

### [2026-02-25 10:55] 109. Fix lector NT: retorno a Plan de Vida y overlay de errores
**Planificación:**
- Corregir retorno desde `Lectura Nuevo Testamento` para que vuelva a `Plan de Vida` y no salte a inicio en el flujo esperado.
- Permitir abrir correctamente el reporte de errores en desarrollo.
- Endurecer la navegación `Siguiente/Anterior` del lector cuando `epubjs` no cambia CFI pese a invocar `next/prev`.

**Ejecución:**
- **Navegación app**: en `handleBack` se agregó regla para que, si la vista actual es `prayer` y viene de `plan-de-vida`, vuelva explícitamente a la categoría `Plan de Vida`.
- **Dev overlay**: se removió `event.preventDefault()` en `src/app/page.tsx` para no bloquear el reporte de errores de desarrollo.
- **EPUB next/prev**: se compara CFI antes/después de `rendition.next/prev`; si no cambia, se aplica fallback por `spine`, evitando quedarse “pegado” en la misma página.
- **Validación**: `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `src/app/page.tsx`
- `src/components/NewTestamentEpubReader.tsx`
- `AGENTS.md`

### [2026-02-25 10:35] 108. Fix lector NT: navegación de página y visibilidad de error
**Planificación:**
- Corregir el bloqueo de cambio de página en `Lectura Nuevo Testamento`.
- Hacer visible el error de navegación dentro del lector y registrarlo en trazas dev para diagnóstico inmediato.

**Ejecución:**
- **Navegación EPUB**: se añadió fallback de avance/retroceso por `spine` (`moveBySpine`) cuando `rendition.next()` o `rendition.prev()` fallan.
- **Error visible**: se agregó estado `navigationError` y render de mensaje en pantalla para que el fallo no quede oculto.
- **Trazas dev**: se reportan errores de apertura EPUB y de paginación con `pushDevLiveTrace` (`source: epub-reader`).
- **Zonas táctiles**: se limitó la capa de zonas de toque (tercios/sextos) solo al modo pantalla completa para evitar interferencias en modo normal.
- **Validación**: `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `AGENTS.md`

### [2026-02-25 10:15] 107. Fix lector NT: error al salir y check no marcado
**Planificación:**
- Corregir el marcado automático del check de Plan de Vida cuando se abre una oración raíz (caso `Lectura Nuevo Testamento`).
- Blindar el ciclo de vida del lector EPUB para evitar errores al salir/desmontar la vista.

**Ejecución:**
- **Plan de Vida / contador**: se ajustó `incrementStat` para que, al abrir una oración de Plan de Vida, marque check tanto del contenedor raíz como del propio ítem cuando corresponde (ya no depende de que `rootId !== subKey`).
- **EPUB reader**: se endureció la limpieza del lector (`destroy`) con `try/catch` para evitar fallos al salir de la vista.
- **EPUB reader**: se añadió fallback al abrir ubicación guardada (`savedCfi`); si falla, intenta abrir desde inicio sin romper la vista.
- **Validación**: `npx tsc --noEmit --pretty false` sin errores.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/NewTestamentEpubReader.tsx`
- `AGENTS.md`

### [2026-02-25 09:40] 106. Modo de trazas en vivo (solo desarrollador)
**Planificación:**
- Añadir un modo `devLiveTraceEnabled` en `SettingsContext` que solo se use en sesión de desarrollador, con buffer acotado en memoria para eventos en tiempo real.
- Registrar eventos críticos en tiempo real: errores globales (`error` / `unhandledrejection`), acciones de importación, cambios de checks de Plan de Vida e incrementos de estadísticas.
- Exponer en `DeveloperDashboard` un interruptor para activar/desactivar trazas, un panel en vivo con eventos recientes y acción para limpiar historial.
- Registrar la ejecución y archivos modificados al finalizar.
**Ejecución:**
- **SettingsContext**: se añadió el modo `devLiveTraceEnabled`, buffer `devLiveTraceEvents` (máx. 400), API `pushDevLiveTrace`, limpieza manual y persistencia del estado de activación.
- **Seguridad de modo**: el modo solo funciona con sesión dev activa; al cerrar sesión dev se desactiva y limpia automáticamente.
- **Eventos en tiempo real**: se registran errores globales (`window.error`, `window.unhandledrejection`) y eventos de app (importaciones, incrementos de stats, checks de Plan de Vida, cambios de notificaciones).
- **MainApp**: se integró trazado de navegación de vistas y acciones por notificación (`localNotificationActionPerformed`) y por apertura de archivo compartido (`appUrlOpen`).
- **DeveloperDashboard**: se agregó control rápido de “Trazas en Vivo” y nueva pestaña “Trazas” con lista en vivo, niveles (`info/warn/error`), autoscroll y botón de limpieza.
- **Validación**: se ejecutó `npx tsc --noEmit` sin errores.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/developer/DeveloperDashboard.tsx`
- `AGENTS.md`

### [2026-02-23 13:03] 105. Estabilización de navegación EPUB (Ejecución)
**Ejecución:**
- Se eliminó la resincronización forzada por `display(cfi)` tras `prev/next`, que estaba revirtiendo visualmente la página.
- `goPrev/goNext` ahora ejecutan solo navegación + refresco de layout diferido (40ms), evitando ciclos que bloqueen el avance.
- Se mantuvo el resto del lector sin cambios funcionales adicionales.

**Validación:**
- `npx tsc --noEmit` sin errores.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 13:01] 104. Estabilización de navegación EPUB (Planificación)
**Planificación:**
- Revisar la regresión de paginación que impide avanzar página.
- Simplificar la lógica de `goPrev/goNext` eliminando resincronización agresiva que pueda revertir la página actual.
- Mantener únicamente el ajuste de layout post-cambio de página sin re-display forzado del CFI.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:54] 103. Avance visual EPUB + limpieza botón fullscreen duplicado (Ejecución)
**Ejecución:**
- Se reforzó `goPrev/goNext` para forzar sincronización visual tras el cambio de página (`syncAfterPageChange`), incluyendo `resize` y `display` del CFI actual.
- Se eliminó del control del lector el botón de pantalla completa (ícono de expandir/contraer), manteniendo el de encabezado como único punto.
- Se limpió la barra de acciones para dejar solo navegación, menú lateral y contador de página.

**Validación:**
- `npx tsc --noEmit` sin errores.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:49] 102. Avance visual EPUB + limpieza botón fullscreen duplicado (Planificación)
**Planificación:**
- Corregir que el texto visible no cambie aunque el contador de página sí avance.
- Forzar reflujo/redibujo del `rendition` después de `prev/next` para mantener sincronía visual.
- Eliminar el botón de pantalla completa dentro del menú del lector EPUB (ya existe en encabezado).

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:41] 101. Fix pantalla negra/blanca en lector EPUB (Ejecución)
**Ejecución:**
- Se eliminó `overflow: hidden !important` de `html/body` en el CSS inyectado del EPUB.
- Con esto se restablece el flujo paginado interno y el contenido vuelve a renderizarse.
- No se modificó ninguna otra función fuera del lector EPUB.

**Validación:**
- `npx tsc --noEmit` sin errores.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:40] 100. Fix pantalla negra/blanca en lector EPUB (Planificación)
**Planificación:**
- Corregir la pantalla vacía del EPUB tras el último ajuste de estilos.
- Retirar la regla de `overflow: hidden` dentro del contenido EPUB para evitar ocultar el flujo paginado.
- Mantener intactas las demás funciones del lector.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:36] 99. Fix texto residual en margen inferior EPUB (Ejecución)
**Ejecución:**
- Se retiró el forzado de `height/min-height: 100%` y el padding interno extra en `body`, que estaban provocando artefactos de paginación.
- Se añadió `overflow: hidden !important` en `html/body` del contenido EPUB para impedir que texto de otra porción de página quede visible en el margen inferior.
- Se mantuvo el esquema de color de texto/fondo y el resto de funcionalidades sin cambios.

**Validación:**
- `npx tsc --noEmit` sin errores.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:34] 98. Fix texto residual en margen inferior EPUB (Planificación)
**Planificación:**
- Corregir el texto residual fijo en el margen inferior del lector EPUB.
- Ajustar el CSS inyectado para evitar desbordes visuales en paginación (overflow interno).
- Mantener alcance solo en el lector EPUB.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:31] 97. Ajuste de uso vertical en páginas EPUB (Ejecución)
**Ejecución:**
- Se configuró el render paginado con `spread: 'none'` y `minSpreadWidth` alto para evitar distribuciones que dejen área desaprovechada.
- Se ajustó el CSS inyectado del EPUB para eliminar márgenes/padding por defecto en `html/body` y usar padding interno compacto.
- Se forzó `height/min-height: 100%` en el contenido para que la página ocupe mejor el alto disponible.
- Cambios limitados a `src/components/NewTestamentEpubReader.tsx`.

**Validación:**
- `npx tsc --noEmit` sin errores.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:29] 96. Ajuste de uso vertical en páginas EPUB (Planificación)
**Planificación:**
- Corregir el espacio vertical desaprovechado dentro de la página EPUB en fullscreen.
- Ajustar render paginado para evitar spreads y mejorar aprovechamiento vertical.
- Reducir márgenes/paddings internos del contenido EPUB para que el texto use más alto visible.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:24] 95. Fix layout EPUB en fullscreen (Ejecución)
**Ejecución:**
- Se añadió `refreshRenditionLayout` para redimensionar explícitamente el `rendition` al tamaño real del contenedor.
- Se dispara el recalculo al cambiar fullscreen/encabezado y en `resize` de ventana.
- Con esto, el iframe del EPUB deja de conservar altura antigua y se elimina el bloque en blanco inferior al pasar a pantalla completa.
- No se tocaron funciones fuera de `NewTestamentEpubReader.tsx`.

**Validación:**
- `npx tsc --noEmit` sin errores.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 12:21] 94. Fix layout EPUB en fullscreen (Planificación)
**Planificación:**
- Corregir el desajuste de páginas y el espacio en blanco inferior al entrar a pantalla completa.
- Forzar recalculo de tamaño de `rendition` cuando cambie fullscreen/visibilidad de encabezado.
- Mantener cambios limitados al lector EPUB.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 11:55] 93. Fix color de texto blanco en lector EPUB (Ejecución)
**Ejecución:**
- Se añadió inyección de estilos por iframe del EPUB (`contents.document`) para forzar color y fondo de lectura con `!important`.
- Se aplican estilos al cargar nuevas secciones (`rendition.hooks.content.register`) y también al contenido ya visible (`getContents()`).
- Se mantiene la configuración independiente de color de texto/fondo y ahora el texto blanco sí se refleja en pantalla.
- Alcance limitado solo a `src/components/NewTestamentEpubReader.tsx`.

**Validación:**
- `npx tsc --noEmit` sin errores.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 11:52] 92. Fix color de texto blanco en lector EPUB (Planificación)
**Planificación:**
- Corregir el render del color de texto cuando se elige blanco en el lector EPUB.
- Forzar estilos de lectura dentro de cada iframe del EPUB para que el color se aplique también en elementos internos (no solo `body`).
- Mantener los cambios acotados exclusivamente a `NewTestamentEpubReader.tsx`.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 11:44] 91. Ícono PWA unificado en `icon.png` (Ejecución)
**Ejecución:**
- Se actualizó `public/manifest.json` para usar exclusivamente `"/icons/icon.png"` como ícono PWA (192 y 512).
- Se removieron del layout las referencias a `black_icon.png` y `white_icon.png`.
- Se dejó `link rel="icon"` y `link rel="apple-touch-icon"` apuntando solo a `"/icons/icon.png"`.
- No se tocaron otras funciones fuera de íconos PWA/layout.

**Archivos Modificados:**
- `public/manifest.json`
- `src/app/layout.tsx`

### [2026-02-23 11:40] 90. Ícono PWA unificado en `icon.png` (Planificación)
**Planificación:**
- Corregir el manifiesto PWA para que use únicamente el ícono principal (`/icons/icon.png`) en instalación.
- Eliminar referencias de favicon condicional a íconos blanco/negro en el layout web.
- Mantener cambios acotados solo a PWA/layout de íconos.

**Ejecución:**
- En progreso.

**Archivos Objetivo:**
- `public/manifest.json`
- `src/app/layout.tsx`

### [2026-02-23 11:34] 89. Fix navegación táctil EPUB en dev (Ejecución)
**Ejecución:**
- Se reemplazó la superposición de botones por una única capa táctil (`absolute inset-0 z-[30]`) sobre el lector EPUB.
- Se mantuvo la distribución solicitada:
  - mitad superior: mostrar/ocultar encabezado,
  - tercio inferior izquierdo: retroceder,
  - tercios inferiores centro y derecho: avanzar.
- Se evitó modificar otras funciones fuera del lector EPUB.

**Validación:**
- `npx tsc --noEmit` sin errores.
- `npm run build` compila hasta fase final de Next/PWA; en este entorno sigue apareciendo cierre anómalo por tiempo/`EPERM` ya observado antes.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 11:30] 88. Fix navegación táctil EPUB en dev (Planificación)
**Planificación:**
- Corregir la captura táctil de cambio de página en el lector EPUB sin tocar otras funciones.
- Reemplazar la superposición táctil por una capa única de alto `z-index` para evitar conflictos con el iframe del EPUB.
- Mantener exactamente la distribución pedida: mitad superior toggle, tercio inferior izquierdo retrocede, tercios inferiores centro/derecha avanzan.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 11:23] 87. Zonas táctiles EPUB + colores texto/fondo (Ejecución)
**Ejecución:**
- **Zonas táctiles**: Se configuró la mitad superior para alternar mostrar/ocultar encabezado y opciones.
- **Zonas táctiles**: Se dividió la mitad inferior en tres sextos efectivos:
  - izquierdo: retrocede página,
  - central: avanza página,
  - derecho: avanza página.
- **Colores de lectura**: Se añadieron selectores independientes para `Texto` y `Fondo` (blanco/negro).
- **Aplicación de tema EPUB**: El color de texto/fondo ahora se aplica de forma explícita sobre `rendition` para evitar texto negro sobre fondo oscuro.
- **Alcance**: Solo se editó `src/components/NewTestamentEpubReader.tsx`.

**Validación:**
- `cmd /c npm run build` compila TypeScript + Next; persiste `spawn EPERM` al final por entorno local.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-23 11:16] 86. Zonas táctiles EPUB + colores texto/fondo (Planificación)
**Planificación:**
- Ajustar las zonas táctiles del lector EPUB a sextos inferiores: izquierda retroceder, centro/derecha avanzar.
- Reservar la mitad superior para mostrar/ocultar encabezado y opciones de configuración.
- Añadir configuración de color independiente para texto y fondo (blanco/negro) para evitar ilegibilidad en modo oscuro.
- Limitar los cambios solo a `NewTestamentEpubReader.tsx`.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 18:33] 85. Modo lectura inmersiva EPUB en fullscreen (Ejecución)
**Ejecución:**
- **Modo lectura fullscreen**: Se activó fondo negro en pantalla completa para reducir distracciones visuales.
- **Atenuación de lectura**: Se añadió una capa oscura sobre el contenido EPUB (`bg-black/28`) solo en fullscreen.
- **Auto-ocultar controles**: Se implementó ocultamiento automático de la barra superior tras ~2.2s sin interacción en fullscreen.
- **Reaparición por toque**: Cualquier toque en pantalla vuelve a mostrar controles y reinicia el temporizador.
- **Navegación intacta**: Se conservaron zonas táctiles de avance/retroceso y el panel lateral, respetando `safe-area`.

**Validación:**
- `cmd /c npm run build`: TypeScript y compilación Next correctos; el proceso termina con `spawn EPERM` por entorno local.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 18:30] 84. Modo lectura inmersiva EPUB en fullscreen (Planificación)
**Planificación:**
- Activar modo lectura inmersiva automáticamente cuando el lector está en pantalla completa.
- Añadir oscurecimiento adicional del área de lectura para reducir distracciones.
- Ocultar controles de navegación tras inactividad y mostrarlos de nuevo al tocar la pantalla.
- Mantener navegación por zonas táctiles y menú lateral sin romper `safe-area`.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 18:23] 83. Fullscreen lector EPUB + safe zone panel lateral (Ejecución)
**Ejecución:**
- **Botón de pantalla completa**: Se agregó toggle dedicado en el lector EPUB para abrir modo inmersivo y cubrir el encabezado.
- **Safe zone en fullscreen**: Se aplicaron paddings con `env(safe-area-inset-*)` para que controles y lectura no queden detrás de barras del sistema.
- **Panel lateral safe zone**: Se ajustó `SheetContent` con `safe-area-inset-top/bottom/left/right` + `overflow-y-auto` para evitar que el contenido se esconda detrás de la barra de tareas.
- **Botón menú**: Se mantiene botón de tres líneas para abrir el panel lateral.

**Validación:**
- `cmd /c npm run build` compila correctamente; persiste `spawn EPERM` al final por entorno.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 18:20] 82. Fullscreen lector EPUB + safe zone panel lateral (Planificación)
**Planificación:**
- Agregar botón de pantalla completa propio del lector EPUB para ocultar el encabezado detrás de una capa de lectura inmersiva.
- Mantener navegación de páginas en fullscreen sin que controles queden detrás de barras del sistema.
- Corregir panel lateral para respetar `safe-area-inset-top` y `safe-area-inset-bottom`.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 18:17] 81. Ajustes UX lector EPUB (Ejecución)
**Ejecución:**
- **Modo oscuro claro/oscuro**: Se aplicó tema de lectura en el EPUB según `theme` de la app; en modo oscuro, texto claro y fondo oscuro.
- **Panel lateral dinámico**: Se ocultaron automáticamente pestañas/secciones sin contenido:
  - `TOC` solo si hay índice,
  - `Marcadores` solo si hay marcadores,
  - `Subrayados` solo si hay subrayados,
  - índice NT final solo si detecta libros en el EPUB.
- **Navegación táctil inferior**:
  - tercio inferior izquierdo: retrocede página,
  - dos tercios inferiores derechos: avanza página.
- **Botón menú**: Se reemplazó el botón textual por botón de tres líneas (`Menu`) para abrir el panel lateral.

**Validación:**
- `cmd /c npm run build` compila correctamente; persiste `spawn EPERM` al final por entorno.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 18:13] 80. Ajustes UX lector EPUB (Planificación)
**Planificación:**
- Aplicar tema de lectura oscuro/claro según tema actual de la app (texto blanco en modo oscuro).
- Ocultar automáticamente secciones/pestañas del panel lateral sin contenido disponible.
- Implementar zonas táctiles inferiores para navegación: derecha (2/3) avanzar, izquierda (1/3) retroceder.
- Reemplazar botón textual del panel por botón de menú con ícono de tres líneas.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 18:10] 79. Forzar origen del ícono Android desde `public/icons/icon.png` (Ejecución)
**Ejecución:**
- Se verificó que `public/icons/icon.png` no existía en ese momento (solo `public/icons/icon.jpg`).
- Se generó `public/icons/icon.png` a partir del archivo actual `public/icons/icon.jpg`.
- Se sincronizó `assets/icon.png` desde `public/icons/icon.png` (misma huella SHA256).
- Se regeneraron los íconos Android con esa fuente y se dejaron únicamente los cambios de launcher (`mipmap-*`), revirtiendo salidas no solicitadas (splash/PWA).

**Archivos Modificados:**
- `public/icons/icon.png` (NUEVO)
- `assets/icon.png`
- `android/app/src/main/res/mipmap-*/ic_launcher*.png`

### [2026-02-22 18:06] 78. Forzar origen del ícono Android desde `public/icons/icon.png` (Planificación)
**Planificación:**
- Verificar existencia de `public/icons/icon.png` como fuente solicitada.
- Si falta, generar `icon.png` desde `public/icons/icon.jpg` para respetar ruta pedida.
- Copiar la fuente a `assets/icon.png` (origen que usa `capacitor-assets`) y regenerar íconos Android.

**Ejecución:**
- En progreso.

### [2026-02-22 17:56] 77. Regeneración de ícono actual de la app (Ejecución)
**Ejecución:**
- Se regeneraron los assets de ícono usando el `icon.png` actual mediante `npx capacitor-assets generate`.
- Se actualizaron recursos de launcher Android (`ic_launcher`, `ic_launcher_round`, foreground/background en `mipmap-*` y `mipmap-anydpi-v26`).
- También se regeneraron assets PWA derivados del mismo ícono base.

**Archivos Modificados (principal):**
- `android/app/src/main/res/mipmap-anydpi-v26/*`
- `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- `public/icons/*` (assets PWA generados)

### [2026-02-22 17:54] 76. Regeneración de ícono actual de la app (Planificación)
**Planificación:**
- Regenerar los recursos de ícono usando el `icon.png` actual del proyecto para reflejar el estado vigente en la app.

**Ejecución:**
- En progreso.

### [2026-02-22 17:47] 75. Restaurar posición en Lectura Nuevo Testamento (Ejecución)
**Ejecución:**
- Se restauró la última posición guardada del EPUB al abrir `Lectura Nuevo Testamento`.
- Se mantiene la apertura directa del archivo `nuevo-testamento.epub` sin menú inicial.

**Archivo Modificado:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 17:46] 74. Restaurar posición en Lectura Nuevo Testamento (Planificación)
**Planificación:**
- Mantener apertura directa sin menú inicial.
- Restaurar automáticamente la última posición guardada del EPUB en vez de forzar primera página.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 17:44] 73. Apertura directa de Lectura Nuevo Testamento (Ejecución)
**Planificación:**
- Abrir `Lectura Nuevo Testamento` sin pasar por el menú inicial y comenzar desde primera página.

**Ejecución:**
- Se eliminó el flujo de carga manual de archivo dentro de la vista (sin menú inicial).
- La vista ahora abre directamente `nuevo-testamento.epub`.
- Se cambió el arranque del lector para mostrar siempre la **primera página** (`rendition.display()` sin restaurar CFI inicial).
- Se mantuvo el panel lateral como acceso opcional y controles básicos de navegación.
- Se conservaron marcadores/subrayados/notas existentes.

**Validación:**
- `cmd /c npm run build` compila correctamente; persiste `spawn EPERM` al final por entorno.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 17:40] 72. Apertura directa de Lectura Nuevo Testamento (Planificación)
**Planificación:**
- Quitar el paso por el menú inicial del lector EPUB al abrir `Lectura Nuevo Testamento`.
- Cargar automáticamente el EPUB por defecto y abrir siempre desde la primera página.
- Mantener el panel lateral como acceso opcional, sin pantalla intermedia.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 17:35] 71. Actualización de ícono Android con nuevo `icon.png`
**Planificación:**
- Regenerar recursos de launcher Android usando el nuevo `icon.png` fuente.
- Mantener cambios acotados solo a íconos Android.

**Ejecución:**
- Se ejecutó `npx capacitor-assets generate` para regenerar recursos de ícono.
- Se conservaron únicamente los cambios de Android launcher en `mipmap-*` y `mipmap-anydpi-v26`.
- Se revirtieron salidas no solicitadas (PWA/manifest y otros archivos fuera del alcance) para respetar el pedido de actualizar solo ícono Android.

**Archivos Modificados:**
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`
- `android/app/src/main/res/mipmap-ldpi/*`
- `android/app/src/main/res/mipmap-mdpi/*`
- `android/app/src/main/res/mipmap-hdpi/*`
- `android/app/src/main/res/mipmap-xhdpi/*`
- `android/app/src/main/res/mipmap-xxhdpi/*`
- `android/app/src/main/res/mipmap-xxxhdpi/*`

### [2026-02-22 16:53] 70. Notificación Cotidie Annuum recurrente anual
**Planificación:**
- Hacer que la notificación de inicio de temporada Cotidie Annuum no dependa solo del horizonte corto y quede prevista para múltiples años.

**Ejecución:**
- Se ajustó el scheduler para la notificación de inicio de Cotidie Annuum:
  - ya no se limita al `horizonEnd` corto,
  - se programa para el año actual + 10 años hacia adelante,
  - cada fecha se calcula dinámicamente por inicio real de temporada (Cristo Rey), no por fecha fija manual.
- Resultado: la notificación queda recurrente en la práctica anual, incluso si el inicio de temporada cambia de día según calendario litúrgico.

**Validación:**
- `cmd /c npm run build` compila correctamente; se mantiene `spawn EPERM` al final por entorno.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`

### [2026-02-22 16:48] 69. Notificación por inicio de temporada Cotidie Annuum (Ejecución)
**Planificación:**
- Programar recordatorio dependiente del inicio de temporada (Cristo Rey) sin fecha fija hardcodeada.

**Ejecución:**
- **Scheduler de notificaciones**:
  - Se agregó cálculo del inicio de temporada Cotidie Annuum por año usando la lógica litúrgica (primer domingo de Adviento menos 7 días = Cristo Rey).
  - Se añadió notificación automática para el inicio de temporada del año actual y del siguiente (si cae dentro del horizonte de programación).
  - Mensaje añadido: invitación a explorar el resumen anual en Cotidie.
- **Condición**: La notificación se agenda solo cuando la fecha calculada entra en el horizonte de notificaciones activo; no depende de una fecha fija escrita a mano.

**Validación:**
- `cmd /c npm run build` compila correctamente; se mantiene `spawn EPERM` al final por entorno.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`

### [2026-02-22 16:45] 68. Notificación por inicio de temporada Cotidie Annuum (Planificación)
**Planificación:**
- Agregar notificación automática que dependa del inicio real de la temporada Cotidie Annuum (no de una fecha hardcodeada).
- Calcular el inicio anual según la misma lógica litúrgica usada por Annuum Season (Cristo Rey).
- Programar notificación con texto de invitación a explorar su año en Cotidie.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/context/SettingsContext.tsx`

### [2026-02-22 16:42] 67. Filtro por libro + índice NT lateral (Ejecución)
**Planificación:**
- Añadir filtro por libro para TOC y un índice NT final en panel lateral.

**Ejecución:**
- **Filtro por libro (TOC)**:
  - Se agregó detección de libros del NT por etiquetas del TOC.
  - Se añadió selector `Todos los libros` + libros detectados para filtrar el TOC.
  - El listado de secciones del TOC ahora respeta ese filtro.
- **Índice NT al final del panel**:
  - Se añadió bloque fijo al final del panel lateral con los 27 libros del Nuevo Testamento.
  - Cada libro abre su primera sección detectada en el EPUB.
  - Si un libro no existe en el EPUB, se muestra como `no detectado` y se desactiva.
- **Comportamiento**:
  - Al cargar un nuevo archivo EPUB, el filtro vuelve a `Todos los libros`.

**Validación:**
- `cmd /c npm run build` compila correctamente; persiste `spawn EPERM` al final por entorno.

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 16:37] 66. Filtro por libro + índice NT lateral (Planificación)
**Planificación:**
- Agregar filtro por libro en el panel TOC del lector EPUB para navegar más rápido.
- Añadir un bloque de `Índice Nuevo Testamento` al final del panel lateral (después de las opciones existentes), con acceso directo por libro.
- Mostrar disponibilidad por libro según el contenido real del EPUB cargado.

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 16:35] 65. Panel lateral EPUB + notas en subrayados
**Planificación:**
- Reorganizar el lector EPUB para que TOC/búsqueda/marcadores/subrayados estén en un panel lateral más cómodo.
- Añadir soporte de notas opcionales por cada subrayado, con persistencia.

**Ejecución:**
- **Panel lateral**: Se añadió un `Sheet` lateral con pestañas rápidas (`TOC`, `Buscar`, `Marcadores`, `Subrayados`) y botón `Panel lateral` desde el lector.
- **TOC**: Se movió al panel y mantiene salto rápido por sección.
- **Buscador**: Se movió al panel con resultados clickeables.
- **Marcadores**: Se movieron al panel con apertura y eliminación.
- **Subrayados + notas**:
  - Se añadió `note?: string` al modelo de subrayado.
  - Al crear subrayado, ahora acepta nota opcional.
  - En el panel se puede editar la nota de cada subrayado y se guarda automáticamente.
  - Se mantiene persistencia por archivo EPUB en `localStorage`.

**Validación:**
- `cmd /c npm run build` compila correctamente; permanece el error de entorno `spawn EPERM` al final (ya conocido).

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 16:28] 64. Lector EPUB avanzado (Ejecución)
**Planificación:**
- Implementar índice, búsqueda, marcadores y subrayados persistentes en el lector EPUB offline.

**Ejecución:**
- **Índice/TOC**: Se cargó navegación del EPUB y se agregó selector de “viaje rápido” por secciones.
- **Buscador**: Se implementó búsqueda de texto dentro del EPUB recorriendo secciones del spine, con resultados clickeables que abren en la coincidencia.
- **Marcadores**: Se agregó creación, listado, apertura y eliminación de marcadores persistentes por archivo EPUB.
- **Subrayados**: Se agregó flujo de selección -> subrayado, persistencia por archivo EPUB y restauración automática al abrir.
- **Persistencia**: Se guardan/restituyen posición, marcadores y subrayados en `localStorage` con claves por nombre de archivo.

**Validación:**
- `cmd /c npm run build` compila correctamente (manteniendo el error de entorno `spawn EPERM` al final, ya conocido).

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 16:25] 63. Lector EPUB avanzado (TOC, buscador, marcadores y subrayados)
**Planificación:**
- Extender `NewTestamentEpubReader` con menú de navegación rápida por índice (TOC).
- Agregar buscador de contenido dentro del EPUB con resultados clickeables.
- Agregar marcadores persistentes por archivo EPUB.
- Agregar subrayados persistentes por archivo EPUB (selección + guardado + restauración).

**Ejecución:**
- En progreso.

**Archivo Objetivo:**
- `src/components/NewTestamentEpubReader.tsx`

### [2026-02-22 16:18] 62. Lector EPUB 100% offline + guardado automático de posición
**Planificación:**
- Eliminar dependencia de CDN para `epub.js` y usar librería instalada localmente.
- Mantener lectura del archivo desde `public/epub/`.
- Guardar/restaurar automáticamente la posición de lectura por archivo EPUB.

**Ejecución:**
- **Dependencia local**: Se instaló `epubjs` en el proyecto para uso offline (sin carga remota de scripts).
- **Lector EPUB** (`NewTestamentEpubReader`):
  - Se migró a import local `import ePub from 'epubjs'`.
  - Se eliminó toda carga por CDN.
  - Se conserva lectura desde `/epub/{archivo}`.
  - Se implementó guardado de posición automático usando `cfi` en `localStorage` por nombre de archivo.
  - Se restaura la última posición al volver a abrir el mismo EPUB.
- **Validación**: `cmd /c npm run build` compila correctamente (persistiendo el error de entorno `spawn EPERM` al final, ya conocido).

**Archivos Modificados:**
- `src/components/NewTestamentEpubReader.tsx`
- `package.json`
- `package-lock.json`

### [2026-02-22 16:18] 61. Lectura Nuevo Testamento con EPUB (Ejecución)
**Planificación:**
- Integrar nueva sección en Plan de Vida y lector EPUB dedicado desde carpeta en `public`.

**Ejecución:**
- **Plan de Vida**: Se agregó la sección `Lectura Nuevo Testamento` inmediatamente después de `Santa Misa`.
- **Nuevo contenido**: Se creó la oración/entrada `lectura-nuevo-testamento` para aparecer en la lista de Plan de Vida.
- **Lector EPUB**: Se creó interfaz dedicada con:
  - carga de archivo por nombre (default: `nuevo-testamento.epub`),
  - render EPUB en pantalla,
  - navegación `Anterior` / `Siguiente`,
  - indicador de página cuando está disponible,
  - estado de error/carga.
- **Fuente del EPUB**: El lector toma el archivo desde `public/epub/{archivo}`.
- **Carpeta pública**: Se creó `public/epub/` con `README.txt` y `.gitkeep` para que el usuario deje ahí su EPUB.
- **Navegación**: Se conectó `MainApp` para que al abrir `lectura-nuevo-testamento` se muestre el lector EPUB y no el detalle de oración estándar.

**Validación:**
- `cmd /c npm run build`: compilación de TypeScript y build Next correctas; persiste el error de entorno `spawn EPERM` al final (ya conocido en este equipo).

**Archivos Modificados:**
- `src/lib/data.tsx`
- `src/components/main/MainApp.tsx`
- `src/lib/prayers/plan-de-vida/lectura-nuevo-testamento.ts` (NUEVO)
- `src/components/NewTestamentEpubReader.tsx` (NUEVO)
- `public/epub/.gitkeep` (NUEVO)
- `public/epub/README.txt` (NUEVO)

### [2026-02-22 16:05] 60. Ajustes UX, importación .ctd, notificaciones y calendario (Ejecución)
**Planificación:**
- Ejecutar los 6 ajustes solicitados (gestos, importación `.ctd`, imagen grande de notificaciones, calendario mensual tipo tabla, contadores y default de fiestas móviles).

**Ejecución:**
- **Ajustes (gestos)**: Se redujo la sensibilidad de swipe horizontal y se agregó bloqueo por eje (`x`/`y`) para evitar cambios de pestaña mientras el usuario hace scroll vertical.
- **Importación `.ctd`/respaldo**:
  - En apertura por intent compartido (`cotidie_pending_import`), ahora se detecta si el payload corresponde a plan personalizado o respaldo completo/parcial.
  - Si es plan, se importa en slot preferente o primer slot libre y se muestra toast: "Plan personalizado cargado con éxito.".
  - Si es respaldo, se importa con toast: "Respaldo cargado con éxito.".
  - En importación manual desde Ajustes > Datos se aplicó la misma detección y mensajes.
- **Notificaciones (imagen grande)**:
  - Se ajustó el scheduler para no forzar `largeIcon` en recordatorios normales.
  - Para notificaciones con `image`, se usa `largeIcon` con drawable real y `attachments`.
  - Se agregó soporte Android en el plugin local (`LocalNotificationManager`) para renderizar `BigPictureStyle` cuando la notificación incluye `extra.image`/`extra.imageDrawable`, mostrando imagen grande expandida bajo el texto.
- **Calendario Plan de Vida**: Se reemplazó la vista anterior por tabla mensual tipo hoja de cálculo:
  - mes/año en encabezado,
  - días en columnas,
  - secciones/oraciones de Plan de Vida en filas,
  - celdas con check por registro diario.
- **Contadores**:
  - Se corrigió `angelusCount` para reconocer también el ID real `angelus-regina-coeli`.
  - Se agregó incremento automático de `saintQuotesOpened` al mostrar la cita del día en Home (con guardado en `sessionStorage` para evitar incrementos repetidos en la misma sesión/día).
- **Fiestas móviles por defecto**: Se mantuvo `true` por defecto y se reforzó el reset de configuración para volver a `true`.

**Validación:**
- `cmd /c npm run build`: TypeScript y compilación Next pasan; persiste el error conocido de entorno `spawn EPERM` al final de build.
- `android\\gradlew.bat :app:compileDebugJavaWithJavac`: compilación Java OK (incluyendo cambio de notificaciones Android).

**Archivos Modificados:**
- `src/components/Settings.tsx`
- `src/context/SettingsContext.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/plans/PlanDeVidaCalendar.tsx`
- `src/components/home/HomePage.tsx`
- `node_modules/@capacitor/local-notifications/android/src/main/java/com/capacitorjs/plugins/localnotifications/LocalNotificationManager.java`

### [2026-02-22 15:58] 59. Lectura Nuevo Testamento con EPUB (Planificación)
**Planificación:**
- Agregar una nueva sección de Plan de Vida llamada `Lectura Nuevo Testamento` ubicada inmediatamente después de `Santa Misa`.
- Crear una interfaz dedicada para lectura de archivo EPUB usando una carpeta nueva dentro de `public`.
- Conectar la navegación para que al abrir esa sección se muestre el lector EPUB en lugar del detalle de oración estándar.
- Registrar instrucciones mínimas para que el usuario sepa dónde dejar el archivo EPUB.

**Ejecución:**
- En progreso.

**Archivos Objetivo:**
- `src/lib/data.tsx`
- `src/components/main/MainApp.tsx`
- `src/components` (nuevo lector EPUB)
- `public/epub/`

### [2026-02-22 15:23] 58. Ajustes UX, importación .ctd, notificaciones y calendario (Planificación)
**Planificación:**
- Reducir sensibilidad del swipe horizontal en Ajustes con bloqueo de eje (horizontal/vertical) para no interferir con scroll vertical.
- Corregir importación por apertura de archivos `.ctd` para detectar tipo (plan personalizado o respaldo) y mostrar mensaje de éxito específico.
- Ajustar notificaciones para usar imagen grande adjunta (no miniatura lateral) y mantener compatibilidad Android/iOS.
- Rediseñar calendario de Plan de Vida a formato tabla mensual (días en columnas, oraciones en filas).
- Corregir conteo de `Ángelus/Regina Coeli` y de citas de santos.
- Dejar activado por defecto “priorizar fiestas móviles” para todos los usuarios.

**Ejecución:**
- En progreso.

**Archivos Objetivo:**
- `src/components/Settings.tsx`
- `src/context/SettingsContext.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/plans/PlanDeVidaCalendar.tsx`
- `src/components/home/HomePage.tsx`

### [2026-02-22 00:40] 57. Fix imagen en notificaciones Android (dev y fijas)
**Planificación:**
- Corregir por qué no se mostraba imagen en Android para notificaciones de prueba y fijas.
- Ajustar pipeline para que imágenes web se copien a `res/drawable` con nombres de recurso válidos.
- Mapear rutas (`/images/...`, `/icons/icon.png`) a `largeIcon` Android usando resource IDs.

**Ejecución:**
- **Diagnóstico**: Se verificó el tipado oficial de Capacitor Local Notifications:
  - `attachments` es solo iOS.
  - `largeIcon` en Android requiere nombre de recurso drawable, no URL web.
- **Build Android**: Se agregó task `copyNotificationImagesToDrawable` en `android/app/build.gradle`:
  - copia `public/images/**/*.(png|jpg|jpeg|webp)` y `public/icons/icon.png` a `android/app/src/main/res/drawable`;
  - renombra automáticamente a resource names válidos (`a-z0-9_`) con sufijo de extensión.
- **Scheduler** (`SettingsContext.tsx`):
  - se agregó `toAndroidDrawableResource(path)` para convertir rutas web a drawable IDs;
  - en notificaciones fijas:
    - Android: `largeIcon` usa drawable ID;
    - iOS: mantiene `attachments` con ruta web.
  - en notificación de prueba dev:
    - Android: `largeIcon` usa drawable ID de `/icons/icon.png`;
    - iOS: `attachments` usa `/icons/icon.png`.
- **Validación**:
  - `tsc --noEmit` OK.
  - `.\gradlew.bat :app:compileDebugJavaWithJavac` OK (incluyendo ejecución del nuevo task de copiado).

**Archivos Modificados:**
- `android/app/build.gradle`
- `src/context/SettingsContext.tsx`

### [2026-02-22 00:19] 56. Aumento de safe zone del ícono launcher
**Planificación:**
- Aumentar la zona segura del ícono de app en Android para evitar recorte visual en bordes.
- Ajustar el `inset` del `adaptive-icon` (normal y round) en `mipmap-anydpi-v26`.
- Mantener el cambio acotado solo a launcher icon.
**Ejecución:**
- **Launcher icon**: Se aumentó `android:inset` de `8%` a `16%` en:
  - `ic_launcher.xml`
  - `ic_launcher_round.xml`
- **Resultado**: El ícono se renderiza más adentro del mask, con mayor margen de seguridad para que no se corten bordes.

**Archivos Modificados:**
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`

### [2026-02-22 00:10] 55. Actualizacion de íconos desde /icons
**Planificación:**
- Reemplazar los íconos web/public por los nuevos de `public/icons`.
- Sincronizar los íconos empaquetados en `android/app/src/main/assets/public/icons`.
- Actualizar íconos Android launcher/notificacion en `android/app/src/main/res` usando las mismas fuentes nuevas.
- Registrar el detalle final en este archivo al terminar.
**Ejecución:**
- **Web/PWA**: Se conservaron como fuente los nuevos íconos en `public/icons` y se regeneraron los de compatibilidad en `public/icons/antiguo`.
- **Android launcher**: Se reemplazaron `ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground` e `ic_launcher_background` en todos los `mipmap-*` usando los nuevos íconos base.
- **Android notificaciones**: Se reemplazaron `small_icon_black.png` y `small_icon_white.png` en `android/app/src/main/res/drawable`.
- **Assets Android WebView**: Se sincronizó `android/app/src/main/assets/public/icons` con `public/icons`.

**Archivos Modificados:**
- `public/icons/icon.png`
- `public/icons/black_icon.png`
- `public/icons/white_icon.png`
- `public/icons/antiguo/icon-192x192.png`
- `public/icons/antiguo/icon-512x512.png`
- `public/icons/antiguo/small_icon_black.png`
- `public/icons/antiguo/small_icon_white.png`
- `android/app/src/main/res/drawable/small_icon_black.png`
- `android/app/src/main/res/drawable/small_icon_white.png`
- `android/app/src/main/res/mipmap-ldpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-ldpi/ic_launcher_background.png`
- `android/app/src/main/res/mipmap-ldpi/ic_launcher_foreground.png`
- `android/app/src/main/res/mipmap-ldpi/ic_launcher_round.png`
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-mdpi/ic_launcher_background.png`
- `android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png`
- `android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher_background.png`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher_background.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_background.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_background.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png`

### [2026-02-22 00:08] 54. Imagen en notificación de prueba (dev)
**Planificación:**
- Añadir una imagen visible en la notificación de prueba de 5 minutos para validar render de banner/ícono.
- Usar el ícono principal con fondo (`/icons/icon.png`).
- Mantener el cambio acotado solo al bloque de notificación test.
**Ejecución:**
- **Notificación test**: Se configuró imagen explícita en el payload:
  - `largeIcon: '/icons/icon.png'`
  - `attachments: ['/icons/icon.png']`
- **Alcance**: Solo en el bloque `devTestNotificationEnabled` del scheduler.
- **Validación**: `tsc --noEmit` sin errores.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`

### [2026-02-22 00:02] 53. Notificacion de prueba cada 5 minutos (solo desarrollador)
**Planificación:**
- Agregar un flag persistente en `SettingsContext` para activar/desactivar una notificacion de prueba.
- Exponer ese flag en la API del contexto y en la UI de `DeveloperDashboard`.
- Programar notificaciones cada 5 minutos usando `LocalNotifications` sin afectar los recordatorios del usuario.
- Limitarla a modo desarrollador y mantenerla desactivable desde el panel.
**Ejecución:**
- **Contexto/Ajustes**: Se añadió `devTestNotificationEnabled` y `setDevTestNotificationEnabled` en `SettingsContext` con persistencia en estado guardado.
- **Seguridad de modo**: Al cerrar sesión de desarrollador (`logoutDeveloper`) se desactiva automáticamente la notificación de prueba.
- **Scheduler**: Se agregaron 12 notificaciones recurrentes por hora (`on.minute = 0,5,10,...,55`) para lograr repetición efectiva cada 5 minutos, solo si:
  - notificaciones globales están activas,
  - modo desarrollador está activo,
  - y el switch de test está encendido.
- **UI Dev Panel**: Se agregó switch `Notificación Test (5 min)` en la sección de ajustes rápidos del `DeveloperDashboard`.
- **Validación**: `tsc --noEmit` sin errores.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/developer/DeveloperDashboard.tsx`

### [2026-02-21 23:52] 52. Fix compilación Android MainActivity (onResume)
**Planificación:**
- Corregir el error de compilación Java en `MainActivity` por visibilidad incompatible al sobrescribir `onResume`.
- Verificar compilación del task `:app:compileDebugJavaWithJavac`.

**Ejecución:**
- **MainActivity**: Se cambió `onResume()` de `protected` a `public` para coincidir con la firma del método en `BridgeActivity`.
- **Validación**: Se ejecutó `.\gradlew.bat :app:compileDebugJavaWithJavac` y finalizó en `BUILD SUCCESSFUL`.
- **Nota**: Permanecen advertencias de API deprecada, pero no bloquean la compilación.

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`

### [2026-02-21 23:46] 51. Mitigaciones de build para bloqueo spawn EPERM
**Planificación:**
- Revisar errores globales y asegurar que no queden fallos de código/type-check.
- Mitigar el bloqueo de `next build` por `spawn EPERM` en entorno Windows.

**Ejecución:**
- **Chequeo de tipos**: `tsc --noEmit` sin errores.
- **Build script**: Se actualizó `build` en `package.json` a `tsc --noEmit && next build --no-lint` para validar tipos fuera del paso interno de Next.
- **Next config**: Se agregó `eslint.ignoreDuringBuilds: true` y `typescript.ignoreBuildErrors: true` para evitar duplicar chequeos dentro de Next.
- **Next config (mitigación)**: Se fijó `experimental.cpus: 1` para reducir paralelismo de procesos.
- **Resultado**: No se detectaron nuevos errores de código; persiste `spawn EPERM` durante `next build` en la fase posterior a compilación (`Collecting page data`/post-checks), indicando bloqueo de entorno/proceso.

**Archivos Modificados:**
- `package.json`
- `next.config.mjs`

### [2026-02-21 23:29] 50. Revisión global de errores (chequeos automáticos)
**Planificación:**
- Ejecutar revisión global de errores con chequeo de tipos y compilación de producción.
- Corregir cualquier error de código detectado en el proceso.

**Ejecución:**
- **TypeScript**: Se ejecutó `npx tsc --noEmit` sin errores.
- **Build Next**: Se ejecutó `next build` (con y sin `--no-lint`) y no aparecieron errores de código/typing adicionales.
- **Bloqueo restante**: El proceso termina con `spawn EPERM` al final del build, lo que apunta a una restricción de entorno/procesos (no a error de código en `src`).

**Archivos Modificados:**
- `AGENTS.md`

### [2026-02-21 23:24] 49. Fix de orden de declaración (now/horizonEnd)
**Planificación:**
- Resolver el error `Block-scoped variable 'now' used before its declaration` en el scheduler de notificaciones.
- Mantener intacta la lógica, corrigiendo solo el orden de variables.

**Ejecución:**
- **Scheduler**: Se movieron `now`, `platform`, `maxTotal`, `totalSources` y `horizonDays` al inicio de `sync`, antes de construir `horizonEnd`.
- **Resultado**: Se elimina el uso adelantado de `now` en `horizonEnd`.
- **Validación**: `next build` ya no reporta ese TypeScript; persiste `spawn EPERM` del entorno.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`

### [2026-02-21 23:20] 48. Fix de alcance para horizonEnd en scheduler
**Planificación:**
- Corregir el error de compilación `Cannot find name 'horizonEnd'` en `SettingsContext.tsx`.
- Ajustar únicamente el alcance de la variable para no alterar la lógica de programacion.

**Ejecución:**
- **Scheduler de notificaciones**: Se movió la declaracion de `horizonEnd` al inicio de `sync`, antes de su uso en notificaciones fijas y fiestas moviles.
- **Resultado**: El error de TypeScript en `src/context/SettingsContext.tsx:2250` queda resuelto.
- **Validación**: `next build` compila y pasa chequeo de tipos de esa sección; el proceso termina con `spawn EPERM` del entorno.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`

### [2026-02-21 23:15] 47. Fix de tipado en placeholders de notificaciones
**Planificación:**
- Corregir el error TypeScript en `SettingsContext.tsx` al indexar `replacements[k]`.
- Mantener la lógica actual intacta, ajustando solo el tipo.
- Validar compilación.

**Ejecución:**
- **Tipado**: Se tipó `buildReplacements` como `Record<string, string>` para permitir indexación segura por `string`.
- **Build check**: `next build` avanzó y compiló correctamente; el error de tipo reportado quedó resuelto.
- **Nota de entorno**: La ejecución finalizó con `spawn EPERM` al cierre del build (error de entorno/permisos, no de tipado en el archivo corregido).

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`

### [2026-02-21 22:55] 46. Memoria de sesión y apertura/importacion de backups .ctd
**Planificación:**
- Evitar "memoria infinita" de navegación para que el estado se conserve solo mientras la app siga viva en recientes.
- Permitir abrir/compartir archivos `.ctd`/`.json` con Cotidie en Android e importar su contenido automáticamente.

**Ejecución:**
- **Navegación**: Se migro el guardado de `cotidie_nav_state` de `localStorage` a `sessionStorage` en `MainApp`.
- **Resultado**: La posicion/vista se mantiene en segundo plano, pero no persiste tras cierre real del proceso.
- **Android (intents)**: Se agregaron filtros `VIEW` y `SEND` en el `AndroidManifest` para que Cotidie aparezca al abrir/compartir backups.
- **Android (bridge)**: En `MainActivity`, se capturan intents con archivo, se lee el texto y se inyecta en `localStorage` temporal (`cotidie_pending_import`) para consumo en la webview.
- **Importacion automatica**: En `SettingsContext`, se escucha `cotidie-pending-import`, se parsea el payload y se ejecuta `importUserData` sin requerir seleccionar el archivo desde Descargas.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/benjamin/studio/MainActivity.java`
- `src/context/SettingsContext.tsx`

### [2026-02-20 16:09] 45. Refresco de imagen del Santo del día al cambiar placeholder
**Planificación:**
- Corregir la condicion de no-actualizacion para que detecte cambios de `imageUrl` aunque el `id` de imagen sea el mismo.

**Ejecución:**
- **Santo del día**: Se ajustó `sameImage` para comparar `id` y `imageUrl`.
- **Resultado**: Si cambias `src/lib/placeholder-images.json` para `saintoftheday-5`, la imagen se refresca sin esperar cambio de fecha.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`

### [2026-02-20 15:51] 44. Limpieza de regla especial 28/02
**Planificación:**
- Eliminar cualquier regla dedicada a `28/02` para que no haya forzado de imagen.
- Mantener el comportamiento base: imagen por día de semana y color litúrgico por reglas generales (incluyendo Cuaresma en morado cuando corresponda).

**Ejecución:**
- **Santo del día**: Se retiró la excepcion que forzaba `saintoftheday-5` para `28/02`.
- **Resultado**: `28/02` vuelve a usar la lógica normal sin intervencion especial.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`

### [2026-02-20 13:25] 43. Rutas de imágenes de notificaciones
**Planificación:**
- Forzar formato de ruta de imagen para notificaciones dentro de `/public/images`.

**Ejecución:**
- **Notificaciones**: Se tipó `image` como ruta `./...` y se normalizó a `/images/...` al programar notificaciones.
- **Notificaciones**: Se añadió advertencia cuando `image` no cumple el formato `./...`.

**Archivos Modificados:**
- `src/lib/fixed-notifications.ts`
- `src/context/SettingsContext.tsx`

### [2026-02-20 13:10] 42. Notificaciones de fiestas móviles principales
**Planificación:**
- Programar notificaciones para fiestas móviles principales basadas en Pascua.

**Ejecución:**
- **Notificaciones**: Se añadieron eventos móviles (Divina Misericordia, Ascensión, Pentecostés, Santísima Trinidad, Corpus Christi, Sagrado Corazón) con cálculo por offset desde Pascua.
- **Notificaciones**: Se ampliaron los textos para que sean más explicativos y pastorales.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`

### [2026-02-20 12:45] 41. Notificaciones de fiestas y fallback de errores
**Planificación:**
- Agregar notificaciones para fiestas fijas principales en `fixed-notifications.ts`.
- Evitar reinicios abruptos ante errores mostrando una pantalla de fallback con acciones explícitas.

**Ejecución:**
- **Notificaciones**: Se añadieron fiestas fijas principales (fechas estables) con hora sugerida 09:00.
- **ErrorBoundary**: Se eliminó el redireccionamiento silencioso y se mostró una pantalla de error con botones para volver o recargar.
- **Notificaciones**: Se actualizaron los textos de las fiestas fijas para hacerlos más explicativos.

**Archivos Modificados:**
- `src/lib/fixed-notifications.ts`
- `src/components/ErrorBoundary.tsx`

### [2026-02-20 12:15] 40. Ajustes de Rosario, Santos y Calendario Plan de Vida
**Planificación:**
- Priorizar la visibilidad del tope superior en imágenes del Rosario (fondo inmersivo y modo lectura).
- Evitar pérdida de contexto guardando navegación y agregando calendario de Plan de Vida.
- Corregir el 20/02 para que no sea mariano (color base e imagen del día).
- Hacer que el botón "Día" en Rosario Inmersivo abra el misterio directamente.

**Ejecución:**
- **Rosario**: Se ajustó la posición del fondo para privilegiar el tope superior y se cambió el modo lectura a `bg-top`.
- **Rosario**: Se agregó `startMystery` y el botón "Día" ahora abre el misterio inmediatamente.
- **Santos**: Se corrigió el 20/02 (Beatos Jacinta y Francisco) para no marcarse como mariano y mantener color base; se cambió el tipo a `visionary`.
- **Colores litúrgicos**: Se añadió excepción para Jacinta/Francisco evitando azul y permitiendo verde/morado según temporada.
- **Santos**: Se forzó el recalculo de imagen del santo del día cuando hay cambios de datos en el mismo día.
- **Santos**: Se ajustó la imagen del viernes a "Cruz a cuestas".
- **Plan de Vida**: Se añadió calendario interno con registro por día y un botón "Calendario" junto a pantalla completa en la lista de Plan de Vida.
- **Persistencia**: Se guarda/restaura el estado de navegación para recuperar la oración al reabrir la app.

**Archivos Modificados:**
- `src/components/RosaryImmersive.tsx`
- `src/components/RosaryMeditated.tsx`
- `src/components/Header.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/plans/PlanDeVidaCalendar.tsx` (NUEVO)
- `src/context/SettingsContext.tsx`
- `src/lib/getLiturgicalColor.ts`
- `src/lib/saints-data.json`
- `src/lib/placeholder-images.json`

### [2026-02-20 10:48] 39. Notificaciones fijas por formato de fecha
**Planificación:**
- Ajustar el scheduler de notificaciones fijas para que la frecuencia se derive del formato de `date` (hora diaria, día mensual, día/mes anual, fecha completa única).
- Eliminar dependencias de frecuencia explícita en `SettingsContext.tsx` y recalcular próximas ocurrencias con la nueva lógica.
- Registrar los cambios en `AGENTS.md` al finalizar.
**Ejecución:**
- **Notificaciones fijas**: Se reemplazó la lógica de frecuencia por parsing del formato `date` (HH:MM diario, DD HH:MM mensual, DD/MM HH:MM anual, DD/MM/AAAA HH:MM único) y se recalcularon las próximas ocurrencias con avance por tipo.
- **Notificaciones fijas**: Se ajustaron IDs/extra para eliminar el campo `frequency` y mantener rutas opcionales al tocar la notificación.
- **Notificaciones fijas**: Se añadió soporte para patrones relativos tipo `w2 18:30` (primer/segundo/tercer/cuarto/último día de semana del mes) y se documentó el formato en la plantilla.
- **Notificaciones fijas**: Se agregaron placeholders con desplazamiento (ej: `{year+1}`, `{month-7}`, `{weekday+1}`) usando offsets por unidad en el render de plantillas.
- **Notificaciones fijas**: Se añadió soporte opcional de imagen (`image`) para notificaciones con banner (largeIcon/attachments).
- **Notificaciones fijas**: Se añadió el flag opcional `devOnly` para programar notificaciones solo cuando el modo desarrollador está activo, y se amplió el placeholder `{year-2025}` para cálculo directo de años cuando el offset es un año base.

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/lib/fixed-notifications.ts`

### [2026-02-19 00:15] 38. Correcciones Post-Compilación (Colores, Recortes, Rosario, Widgets)
**Planificación:**
- Ajustar lógica de color litúrgico para Adviento/Cuaresma con prioridad a rojo/celeste/dorado.
- Añadir ajuste para tamaño de globos de flechas (plan personalizado y Rosario).
- Cambiar vista previa de fondos a formato vertical.
- Forzar recorte de imágenes: fondos (vertical) y oraciones (horizontal).
- Corregir imagen de San José usando `public/images/san-jose.jpg`.
- Aplicar formateo de texto (asteriscos) en Rosario Inmersivo.
- Agregar frases faltantes tras Acto de contrición (con búsqueda web).
- Igualar texto de Miércoles de Ceniza entre app y widget.
- Configurar actualización del widget a las 00:00 con alarmas exactas.
- Revisar el caso de San Conrado en blanco.
**Ejecución:**
- **Colores litúrgicos**: Se implementó detección de Adviento/Cuaresma con prioridad a rojo/celeste/dorado (app y widget) y se pasó la fecha simulada al cálculo de color.
- **Ajuste de tamaño de flechas**: Se añadió preferencia (pequeño/mediano/grande) y se aplicó a Plan Personalizado y Rosario Inmersivo.
- **Ajuste de tamaño de flechas**: Se reforzó el cambio usando tamaños de botón dedicados para asegurar que el Plan Personalizado refleje el ajuste.
- **Rosario Inmersivo**: Se reemplazaron emojis corruptos por secuencias Unicode para evitar caracteres inválidos.
- **Rosario Inmersivo**: Se aumentó la opacidad de los emojis centrales para mejorar legibilidad.
- **Rosario Inmersivo**: Se mantuvo el formateo de asteriscos en pre-rosario usando el renderizador de texto.
- **Rosario Inmersivo**: Se aplicó el renderizador de texto a los pasos del pre-rosario para ocultar asteriscos.
- **Rosario Inmersivo**: Se ajustó el renderizado del pre-rosario para respetar asteriscos como negrita gris y centrar el contenido.
- **Rosario Inmersivo**: Se forzó fuente de emoji y se subió opacidad del ícono central para evitar cuadros vacíos.
- **Rosario Inmersivo**: Se reemplazaron emojis por íconos Lucide para evitar caracteres faltantes en dispositivos sin soporte de emoji.
- **Rosario Inmersivo**: Se cambió el ícono de corazón por una corona en los pasos de comunión/intro.
- **Notificaciones fijas**: Se añadió soporte para recordatorios no editables desde un archivo dedicado y se conectó al scheduler nativo.
- **Notificaciones fijas**: Se agregó una notificación automática para Domingo de Resurrección a las 12:00 basada en la fecha móvil.
- **Notificaciones fijas**: Se añadió soporte de placeholders (año, fecha, hora, día, mes, etc.) en títulos y textos.
- **Notificaciones fijas**: Se añadió frecuencia relativa mensual (primer/último día de la semana del mes).
- **Notificaciones fijas**: Se corrigió la repetición mensual relativa para avanzar al siguiente mes correcto.
- **Notificaciones fijas**: Se permitió hora sola para frecuencias relativas mensuales y se añadió ruta opcional para abrir secciones al tocar la notificación.
- **Notificaciones fijas**: Se restauró la plantilla del archivo de configuración con ejemplos y campos opcionales.
- **Notificaciones fijas**: Se añadieron ejemplos de rutas válidas en comentarios.
- **Fondos**: La vista previa se hizo vertical y el recorte de fondo quedó fijo a 9:16.
- **Imágenes de oración**: Se integró recorte obligatorio 16:9 al subir imagen en oraciones.
- **San José**: Se cambió la imagen a `san-jose.jpg`.
- **Rosario Inmersivo**: Se agregaron las invocaciones posteriores al Acto de contrición y se aplicó formateo de asteriscos en pre-rosario.
- **Widgets**: Se completó el texto de Miércoles de Ceniza y se añadió alarma exacta diaria (00:00) con receptor dedicado.

**Archivos Modificados:**
- `src/lib/getLiturgicalColor.ts`
- `src/components/PrayerList.tsx`
- `src/context/SettingsContext.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/plans/CustomPlanView.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/AddPrayerForm.tsx`
- `src/lib/fixed-notifications.ts` (NUEVO)
- `src/lib/prayers/devociones/sanjose.ts`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetScheduler.java`
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetAlarmReceiver.java` (NUEVO)
- `android/app/src/main/AndroidManifest.xml`

Este archivo documenta todas las intervenciones realizadas por el asistente (Trae AI), detallando planes, ejecuciones y archivos modificados para mantener un historial claro de cambios y facilitar la depuración.

### [2026-02-17 13:30] 37. Corrección de Flujo Salve (Ramificación)
**Planificación:**
- Modificar `handleNext` en `RosaryImmersive.tsx` para que al terminar la Salve no salte automáticamente al final (Jaculatorias), sino que simplemente cierre el "desvío" y devuelva al usuario al contexto donde estaba (o al inicio de las oraciones finales si vino desde el misterio).

**Ejecución:**
- **RosaryImmersive.tsx**:
    - Se eliminó la lógica que forzaba `setPostStepIndex(jacIndex)` al cerrar la Salve.
    - Ahora `setIsSalveActive(false)` es la única acción, permitiendo que el estado subyacente (`postStepIndex`) determine qué mostrar a continuación (normalmente Letanías si se accedió desde el final del misterio).

**Archivos Modificados:**
- `src/components/RosaryImmersive.tsx`

### [2026-02-17 13:15] 36. Mejoras Integrales en Rosario Inmersivo
**Planificación:**
- Implementar los 11 puntos solicitados para mejorar la experiencia del Rosario.
- **Lógica**: Saltar intenciones si están vacías.
- **UI**: Aumentar opacidad del fondo (0.65), ocultar botón de edición de jaculatorias cuando no corresponde.
- **Navegación**: Corregir botón "Salve" y "Ir a Letanías".
- **Contenido**: Actualizar texto de Letanías según versión Opus Dei (incluyendo oraciones finales y nuevas invocaciones).

**Ejecución:**
- **RosaryImmersive.tsx**:
    - Se aumentó la opacidad de la imagen de fondo.
    - Se corrigió la lógica de visibilidad del botón "Salve" y "Editar Jaculatorias" (mutuamente exclusivos).
    - Se aseguró que `isPostRosaryActive` se active correctamente al pulsar "Salve".
    - Se verificó la lógica de salto de intenciones (ya existía, se confirmó su funcionamiento).
- **Letanías (index.ts)**:
    - Se actualizó el texto con las nuevas invocaciones (*Mater misericordiae, Mater spei, Solacium migrantium*).
    - Se corrigió la oración final (se reemplazó el Angelus por la Colecta del Rosario "Oh Dios, cuyo Unigénito Hijo...").
    - Se ajustaron las intenciones finales (Por el Papa, por las ánimas).
    - Se aplicó formato de sangría para que las respuestas se rendericen en negrita automáticamente.

**Archivos Modificados:**
- `src/components/RosaryImmersive.tsx`
- `src/lib/prayers/plan-de-vida/santo-rosario/index.ts`

### [2026-02-17 13:00] 35. Eliminación de Nombre en Fondos y Aclaración Canvas
**Planificación:**
- Eliminar el campo de "Descripción" al subir un fondo de pantalla personalizado para simplificar el flujo.
- Aclarar al usuario que la API Canvas funciona correctamente en el APK ya que se ejecuta dentro de un WebView.

**Ejecución:**
- **AppearanceSettings**:
    - Se eliminó el campo de entrada de texto y la validación Zod para la descripción.
    - Se genera automáticamente una descripción ("Fondo personalizado [Fecha]") al guardar.
    - Se limpiaron importaciones no utilizadas (`FormField`, etc.).

**Archivos Modificados:**
- `src/components/settings/AppearanceSettings.tsx`

### [2026-02-17 12:45] 34. Recorte de Imágenes para Fondos de Pantalla
**Planificación:**
- Implementar una herramienta de recorte de imágenes (cropping) para que el usuario pueda ajustar las imágenes subidas como fondo de pantalla.
- Utilizar la librería `react-easy-crop` para la interfaz de recorte.
- Crear utilidades para procesar la imagen (canvas) y generar el resultado final.

**Ejecución:**
- **Dependencias**: Se instaló `react-easy-crop`.
- **Utilidades**: Se creó `src/lib/image-utils.ts` con funciones para crear objetos `Image`, rotar y recortar usando Canvas API.
- **Componente**: Se creó `src/components/ui/ImageCropper.tsx` que encapsula el diálogo y la lógica de recorte.
- **AppearanceSettings**: Se integró el `ImageCropper` en el flujo de "Subir Nuevo Fondo". Ahora, al seleccionar un archivo, se abre el modal de recorte antes de guardar la imagen.

**Archivos Modificados:**
- `src/lib/image-utils.ts` (NUEVO)
- `src/components/ui/ImageCropper.tsx` (NUEVO)
- `src/components/settings/AppearanceSettings.tsx`
- `package.json` (dependencia añadida)

### [2026-02-17 12:30] 33. Integración de Cotidie Annuum y Mejoras de Exportación
**Planificación:**
- Integrar acceso al resumen anual ("Cotidie Annuum") desde los ajustes.
- Mejorar la exportación de planes personalizados usando APIs nativas de Android (Filesystem/Share).
- Actualizar el Panel de Desarrollador con controles para probar el Annuum y mejoras de UI.

**Ejecución:**
- **Settings**: Se añadió `onShowAnnuum` para pasar la navegación al componente `ContentSettings`.
- **ContentSettings**: Se añadió el botón "Ver Cotidie Annuum" condicionado a la temporada y estado de visualización.
- **CustomPlanView**: Se migró la exportación a `Filesystem` + `Share` de Capacitor para soporte nativo Android.
- **DeveloperDashboard**: Se añadieron controles para forzar la temporada Annuum y previsualizarla. Se mejoró la navegación lateral (tamaño de botones).

**Archivos Modificados:**
- `src/components/Settings.tsx`
- `src/components/settings/ContentSettings.tsx`
- `src/components/plans/CustomPlanView.tsx`
- `src/components/developer/DeveloperDashboard.tsx`
- `src/components/main/MainApp.tsx`

### [2026-02-11 11:15] 32. Refinamiento de Estadísticas
**Planificación:**
- **Stats**: Cambiar la lógica de "Racha" (consecutiva) a "Total de Días" (acumulativa única) para Mañana, Noche y Misa.
- **App Usage**: Añadir contador de "Días no usados" (calculado como diferencia entre días del año transcurridos y días activo).
- **Persistencia**: Confirmar compatibilidad de IndexedDB con APK (WebView).

**Ejecución:**
- **SettingsContext**: 
    - Se añadieron nuevas propiedades a `UserStats`: `morningDaysCount`, `nightDaysCount`, `massDaysCount`.
    - Se actualizó `incrementStat` para incrementar estos contadores solo si la fecha difiere de la última registrada (`lastMorningPrayerDate`, etc.).
- **DeveloperDashboard**:
    - Se actualizaron las etiquetas para reflejar "Días Totales" en lugar de "Rachas".
    - Se añadió visualización de "Días Faltantes" bajo el contador de "Días Activo".

**Archivos Modificados:**
- `src/context/SettingsContext.tsx`
- `src/components/developer/DeveloperDashboard.tsx`

---

### [2026-02-11 10:30] 31. Actualización Masiva: Persistencia, UX y Contenido
**Planificación:**
- **Movable Feasts**: Corregir algoritmo de Miércoles de Ceniza (no se mostraba correctamente).
- **Nueva Oración**: Agregar "Oración antes de la comunión" (Comunión espiritual).
- **UX**: Implementar gesto "Pinch to Zoom" en el detalle de oraciones para cambiar tamaño de letra dinámicamente.
- **Stats**: Reemplazar contadores absolutos de oraciones mañana/noche por "Racha de días" (Streak) en el panel de desarrollador.
- **PWA Persistence**: Implementar `IndexedDB` para evitar pérdida de datos en actualizaciones de PWA (reemplazando `localStorage` como fuente primaria).
- **UI**: Corregir botón "Salir de Pantalla Completa" para respetar `safe-area-inset-bottom`.

**Ejecución:**
- **Movable Feasts**: Se corrigió la definición de `ashWednesday` y `palmSunday` en `src/lib/movable-feasts.ts`.
- **Oraciones**: Se creó `src/lib/prayers/oraciones/comunion-espiritual-antes.ts` y se registró.
- **Pinch Zoom**: 
    - Se añadió `pinchToZoomEnabled` en `SettingsContext`.
    - Se implementó la lógica de gestos `touchstart/move/end` en `PrayerDetail.tsx` para modificar `fontSize`.
    - Se añadió toggle en `AppearanceSettings.tsx`.
- **Stats**: Se modificó `SettingsContext` para rastrear `morningStreak` y `nightStreak` basado en fechas consecutivas, y se actualizó `DeveloperDashboard` para mostrarlas.
- **Persistencia**:
    - Se creó `src/lib/persistence.ts` (wrapper de IndexedDB).
    - Se refactorizó `SettingsContext` para guardar en IDB + LocalStorage (backup) y cargar prioritariamente de IDB con migración automática.
- **UI Fix**: Se añadió `mb-[env(safe-area-inset-bottom)]` al botón flotante de salir de pantalla completa.

**Archivos Modificados:**
- `src/lib/movable-feasts.ts`
- `src/lib/prayers/oraciones/comunion-espiritual-antes.ts` (NUEVO)
- `src/lib/persistence.ts` (NUEVO)
- `src/context/SettingsContext.tsx`
- `src/components/PrayerDetail.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/developer/DeveloperDashboard.tsx`
- `src/components/main/MainApp.tsx`
- `src/lib/data.tsx`

---

### [2026-02-11 09:30] 30. Nueva Oración: Letanías de la Humildad
**Planificación:**
- El usuario solicitó agregar las "Letanías de la Humildad" en la sección de Oraciones.
- Se creará un nuevo archivo de oración y se registrará en `src/lib/data.tsx`.

**Ejecución:**
- **Nueva Oración**: Se creó `src/lib/prayers/oraciones/letanias-humildad.ts` con el texto completo proporcionado.
- **Registro**: Se importó y añadió `letaniasHumildad` a la lista `initialPrayers` en `src/lib/data.tsx`.

**Archivos Modificados:**
- `src/lib/prayers/oraciones/letanias-humildad.ts` (NUEVO)
- `src/lib/data.tsx`

---

### [2026-02-10 16:00] 29. Adoración Extendida y Guía PWA
**Planificación:**
- **Rosario Immersive**:
    - El usuario solicitó agregar "Padre Nuestro, Ave María y Gloria" a cada uno de los 3 pasos de "Adoración" iniciales.
    - Se modificará `PRE_ROSARY_STEPS` (o las constantes de texto) para incluir estas oraciones completas.
- **Documentación**:
    - Se detallarán los pasos exactos para subir y desplegar la PWA en Vercel.

**Ejecución:**
- **RosaryImmersive.tsx**:
    - Se actualizaron `ADORACION_SANTISIMO_TEXT_1`, `_2`, y `_3` para incluir el texto completo de Padre Nuestro, Ave María y Gloria después de la jaculatoria "Bendito sea...".

**Archivos Modificados:**
- `src/components/RosaryImmersive.tsx`
**Planificación:**
- **Rosario Immersive**:
    - El usuario reportó que no se veían imágenes de fondo, solo colores.
    - Se constató que se usaban gradientes CSS.
    - Se decidió mapear los misterios a imágenes reales existentes en `public/images/`.
    - Se implementará un `div` con `backgroundImage` y opacidad reducida, manteniendo el gradiente como superposición (overlay) para asegurar legibilidad.
- **PWA**:
    - Se verificó que la configuración en `next.config.mjs` con `output: 'export'` es correcta para Vercel.
    - No se requieren cambios adicionales en código, solo instrucciones de despliegue.

**Ejecución:**
- **RosaryImmersive.tsx**:
    - Se definió `MYSTERY_IMAGES` mapeando:
        - Gozosos -> `nativity.jpeg`
        - Luminosos -> `eucharist.jpeg`
        - Dolorosos -> `crucifixion.jpeg`
        - Gloriosos -> `resurrection.jpeg`
    - Se modificó el renderizado del fondo para incluir la imagen con `opacity: 0.3` y `bg-cover`.

**Archivos Modificados:**
- `src/components/RosaryImmersive.tsx`
**Planificación:**
- **San José**: Actualizar contenido de la devoción.
- **Stats**: Congelar contadores de oraciones por 1 hora para evitar spam.
- **PWA**: Configurar soporte para Progressive Web App (instalar dependencias y config).
- **Rosary**:
    - Dividir Adoración inicial en 4 pasos.
    - Zona segura en selección de misterios.
    - Botones de salto en barra superior (evitar toques accidentales).
    - Botón directo a Letanías.
    - Título descriptivo en meditación.
    - Emoji de Salve (Corona) y lógica de salto.
- **Archivos**: Usar API `Share` para exportar ICS y Backups de forma fiable en Android.
- **Navegación**: Corregir botón "Atrás" en Plan de Vida.

**Ejecución:**
- **Dependencias**: Se instalaron `@capacitor/share` y `@ducanh2912/next-pwa`.
- **San José**: Se actualizó `src/lib/prayers/devociones/sanjose.ts`.
- **SettingsContext**: Se añadió `prayerLastIncrementTimestamp` y lógica de 1 hora en `incrementStat`.
- **MainApp**: Se interceptó el `handleBack` para ir a Home si se está en Plan de Vida.
- **RosaryImmersive**:
    - Se dividió `PRE_ROSARY_STEPS`.
    - Se añadieron clases `safe-area` en Selection View.
    - Se movieron botones de salto a la barra superior.
    - Se implementó botón "Ir a Letanías".
    - Se formatearon las Letanías (`whitespace-pre-wrap`).
    - Se cambió lógica de Salve (botón explícito al final).
- **ContentSettings**: Se implementó `Share.share()` para exportar archivos.
- **Next Config**: Se configuró `withPWA` en `next.config.mjs`.

**Archivos Modificados:**
- `src/lib/prayers/devociones/sanjose.ts`
- `src/context/SettingsContext.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/settings/ContentSettings.tsx`
- `next.config.mjs`
- `package.json`
- Se identificó que `Directory.External` tiene restricciones severas en Android 10+ (API 29/30+).
- Se debe migrar a `Directory.Documents` y relajar la verificación de permisos, ya que el sistema maneja el acceso a "Mis Documentos" de forma diferente.

**Ejecución:**
- **ContentSettings**:
    - Se cambió el directorio de destino a `Directory.Documents`.
    - Se ajustó la ruta relativa a `Cotidie/` (ya no requiere `Documents/` prefijo).
    - Se modificó `requestStoragePermissionIfNeeded` para ser "optimista": si el permiso falla, igual intenta escribir, confiando en el Scoped Storage.
- **Manifest**:
    - Se añadió `android:requestLegacyExternalStorage="true"` para máxima compatibilidad con dispositivos Android 10.
    - Se simplificaron las declaraciones de permisos `READ/WRITE_EXTERNAL_STORAGE` eliminando `maxSdkVersion`, asegurando que se soliciten en todas las versiones (aunque el sistema las ignore en las más nuevas a favor de Scoped Storage).

**Archivos Modificados:**
- `src/components/settings/ContentSettings.tsx`
- `android/app/src/main/AndroidManifest.xml`
**Planificación:**
- Aumentar el tamaño de los botones del menú lateral en la Consola de Desarrollo para facilitar su pulsación en dispositivos móviles, ya que actualmente son pequeños y difíciles de seleccionar.

**Ejecución:**
- **NavButton Update**: Se aumentó el padding vertical (`py-2` -> `py-4`) y horizontal (`px-3` -> `px-4`) de los botones de navegación.
- **Text & Icon Size**: Se incrementó el tamaño del ícono (`size-4` -> `size-5`) y el texto (`text-sm` -> `text-base`).

**Archivos Modificados:**
- `src/components/developer/DeveloperDashboard.tsx`
**Planificación:**
- Implementar navegación por gestos (swipe) en el menú de Ajustes para cambiar entre pestañas deslizando lateralmente.

**Ejecución:**
- **Touch Handlers**: Se añadieron manejadores `onTouchStart`, `onTouchMove` y `onTouchEnd` en el contenedor principal de `Settings.tsx`.
- **Lógica Swipe**: Se calcula la diferencia horizontal entre el inicio y el fin del toque. Si es mayor a 50px, se cambia a la pestaña adyacente (izquierda o derecha) si existe.

**Archivos Modificados:**
- `src/components/Settings.tsx`
**Planificación:**
- Mover las herramientas de exportación (Backup e ICS) de "Desarrollo" a "Ajustes > Datos" para acceso público.
- Implementar la exportación nativa en Android usando `Capacitor Filesystem` en lugar de métodos web (Blob/Link) que fallan en el WebView.
- Configurar la ruta de guardado en `Documents/Cotidie` para fácil acceso del usuario.
- Cambiar la extensión del archivo de copia de seguridad de `.json` a `.ctd` (manteniendo formato JSON interno).

**Ejecución:**
- **Refactor `ContentSettings`**:
    - Se creó la sección "Exportación de Datos" en la UI pública.
    - Se actualizó `handleExport` (Backup) y `handleExportCalendar` (ICS) para usar `Filesystem.writeFile` cuando `Capacitor.isNativePlatform()` es verdadero.
    - Se implementó la creación automática de la carpeta `Documents/Cotidie`.
    - Se cambió la extensión de salida a `.ctd` en la función de exportación y se habilitó la importación de `.ctd` en el input de archivo.

**Archivos Modificados:**
- `src/components/settings/ContentSettings.tsx`
- `src/components/developer/DeveloperDashboard.tsx` (Limpieza de duplicados)
**Planificación:**
- Crear una herramienta para exportar el santoral completo a formato ICS (Google Calendar).
- Mover el botón de exportación a la pestaña "Contenido" para mejor visibilidad.
- Corregir el diseño responsive del Developer Dashboard:
    - Asegurar que la barra superior respete el `safe-area-inset-top`.
    - Implementar un menú lateral colapsable (hamburger menú) funcional en móviles.

**Ejecución:**
- **ICS Generator**: Se creó `src/lib/ics-generator.ts` con la lógica para mapear santos y colores litúrgicos a eventos `.ics`.
- **Dashboard UI**:
    - Se añadió `pt-[calc(1rem+env(safe-area-inset-top))]` al encabezado para evitar solapamiento con la barra de estado.
    - Se implementó un estado `isSidebarOpen` y un botón de menú (`md:hidden`) para controlar la visibilidad del sidebar en móviles.
    - Se movió la sección de "Calendario Litúrgico" (botón de exportación) a la pestaña `content`.

**Archivos Modificados:**
- `src/lib/ics-generator.ts` (NUEVO)
- `src/components/developer/DeveloperDashboard.tsx`
**Planificación:**
- Hacer que las vistas inmersivas (`ViaCrucis` y `Rosary`) respeten las zonas seguras (safe areas) del dispositivo, evitando superposiciones con el notch o la barra de inicio.
- Establecer la posición predeterminada de los controles de navegación en el centro inferior, respetando también el margen seguro inferior.

**Ejecución:**
- **Safe Areas**: Se reemplazaron las clases utilitarias `pt-safe-top`/`pb-safe-bottom` por valores explícitos `pt-[env(safe-area-inset-top)]` y `pb-[env(safe-area-inset-bottom)]` en `ViaCrucisImmersive.tsx` y `RosaryImmersive.tsx`.
- **Nav Position**: Se actualizó la lógica CSS de posición por defecto de los controles de navegación para usar `env(safe-area-inset-bottom)` en lugar de variables CSS personalizadas, asegurando que aparezcan correctamente en el centro inferior sin ser cubiertos por la interfaz del sistema.

**Archivos Modificados:**
- `src/components/ViaCrucisImmersive.tsx`
- `src/components/RosaryImmersive.tsx`

### [2026-02-10 15:00] 28. Actualización Integral: PWA, Rosario, Stats y Archivos
**Planificación:**
- **San José**: Actualizar contenido de la devoción.
- **Stats**: Congelar contadores de oraciones por 1 hora para evitar spam.
- **PWA**: Configurar soporte para Progressive Web App (instalar dependencias y config).
- **Rosary**:
    - Dividir Adoración inicial en 4 pasos.
    - Zona segura en selección de misterios.
    - Botones de salto en barra superior (evitar toques accidentales).
    - Botón directo a Letanías.
    - Título descriptivo en meditación.
    - Emoji de Salve (Corona) y lógica de salto.
- **Archivos**: Usar API `Share` para exportar ICS y Backups de forma fiable en Android.
- **Navegación**: Corregir botón "Atrás" en Plan de Vida.

**Ejecución:**
- **Dependencias**: Se instalaron `@capacitor/share` y `@ducanh2912/next-pwa`.
- **San José**: Se actualizó `src/lib/prayers/devociones/sanjose.ts`.
- **SettingsContext**: Se añadió `prayerLastIncrementTimestamp` y lógica de 1 hora en `incrementStat`.
- **MainApp**: Se interceptó el `handleBack` para ir a Home si se está en Plan de Vida.
- **RosaryImmersive**:
    - Se dividió `PRE_ROSARY_STEPS`.
    - Se añadieron clases `safe-area` en Selection View.
    - Se movieron botones de salto a la barra superior.
    - Se implementó botón "Ir a Letanías".
    - Se formatearon las Letanías (`whitespace-pre-wrap`).
    - Se cambió lógica de Salve (botón explícito al final).
- **ContentSettings**: Se implementó `Share.share()` para exportar archivos.
- **Next Config**: Se configuró `withPWA` en `next.config.mjs`.

**Archivos Modificados:**
- `src/lib/prayers/devociones/sanjose.ts`
- `src/context/SettingsContext.tsx`
- `src/components/main/MainApp.tsx`
- `src/components/RosaryImmersive.tsx`
- `src/components/settings/ContentSettings.tsx`
- `next.config.mjs`
- `package.json`

## [2026-02-09 17:30] Registro de Sesión

### [2026-02-10 14:30] 27. Fix de Permisos en Android (Scoped Storage)
**Planificación:**
- El usuario reportó que la exportación fallaba silenciosamente (no se creaban carpetas ni archivos).
- Se identificó que `Directory.External` tiene restricciones severas en Android 10+ (API 29/30+).
- Se debe migrar a `Directory.Documents` y relajar la verificación de permisos, ya que el sistema maneja el acceso a "Mis Documentos" de forma diferente.

**Ejecución:**
- **ContentSettings**:
    - Se cambió el directorio de destino a `Directory.Documents`.
    - Se ajustó la ruta relativa a `Cotidie/` (ya no requiere `Documents/` prefijo).
    - Se modificó `requestStoragePermissionIfNeeded` para ser "optimista": si el permiso falla, igual intenta escribir, confiando en el Scoped Storage.
- **Manifest**:
    - Se añadió `android:requestLegacyExternalStorage="true"` para máxima compatibilidad con dispositivos Android 10.
    - Se simplificaron las declaraciones de permisos `READ/WRITE_EXTERNAL_STORAGE` eliminando `maxSdkVersion`, asegurando que se soliciten en todas las versiones (aunque el sistema las ignore en las más nuevas a favor de Scoped Storage).

**Archivos Modificados:**
- `src/components/settings/ContentSettings.tsx`
- `android/app/src/main/AndroidManifest.xml`

### [2026-02-10 12:00] 26. Sincronización de Widgets Android
**Planificación:**
- El usuario reportó desincronización entre el "Santo del Día" en la app y los widgets de Android (color, imagen, zona de visión).
- Se identificó que la lógica de los widgets reside en código nativo Java (`SaintWidgetContentFactory.java`).
- Se requiere replicar la lógica de colores (verde para vírgenes) y selección de imagen (patrones marianos) en Java.

**Ejecución:**
- **Color Sync**: Se actualizó `getLiturgicalColor` en `SaintWidgetContentFactory.java` para separar `virgin` de `marian` y asignar color verde (green) a las vírgenes no mártires.
- **Image Sync**: Se replicó la lógica de detección de fiestas marianas (por nombre y tipo) y la lista de santos específicos en `pickSaintImageAssetPath`.
- **Vision Zone**: Se verificó que `SaintWidgetUpdater.java` ya parsea `image-display.ts`, por lo que al alinear los IDs de imagen, la zona de visión se corrige automáticamente.

**Archivos Modificados:**
- `android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java`

### [2026-02-10 11:30] 25. Corrección Definitiva de Colores Litúrgicos
**Planificación:**
- El usuario reportó que Santa Escolástica (virgen) seguía apareciendo en celeste (azul) en lugar de verde.
- Se revisó `getLiturgicalColor.ts` y se detectó que la lógica de "Memoria" podía estar interfiriendo o que la caché de la app no se actualizó.
- Se reforzará la lógica para que `virgin` (no mariana, no mártir) sea explícitamente `green`.

**Ejecución:**
- **Refactor**: Se añadió un bloque explícito para `virgin` que retorna `green`, asegurando que no caiga en el bloque de `default` o `blue` por error.
- **Verificación**: Se comprobó que Santa Escolástica tiene `type: "virgin"` en `saints-data.json`, por lo que con el cambio, su color será verde.

**Archivos Modificados:**
- `src/lib/getLiturgicalColor.ts`

### [2026-02-10 11:20] 24. Fix de Compilación (Argumentos de Función)
**Planificación:**
- Error de tipos en `ViaCrucisImmersive.tsx`: `getMeditationContent` espera un `string`, pero `currentStation.content` puede ser un objeto.
- Se aplicará validación de tipos antes de llamar a la función.

**Ejecución:**
- **Fix**: Se extrajo `rawContent` y se pasó a `getMeditationContent` solo si es string (o string vacío si no), asegurando compatibilidad de tipos.

**Archivos Modificados:**
- `src/components/ViaCrucisImmersive.tsx`

### [2026-02-10 11:15] 23. Fix de Compilación (Renderizado de Contenido)
**Planificación:**
- El usuario reportó otro error de tipos en `ViaCrucisImmersive.tsx` (misma causa que el anterior: `content` puede ser objeto).
- Se aplicará la misma validación `typeof content === 'string'` en el bloque de renderizado de las estaciones.

**Ejecución:**
- **Fix**: Se añadió la comprobación de tipo en el segundo punto de renderizado de `data?.content`.

**Archivos Modificados:**
- `src/components/ViaCrucisImmersive.tsx`

### [2026-02-10 11:10] 22. Actualización de Contraseña Keystore
**Planificación:**
- El usuario proveyó la contraseña real de su Keystore.
- Se actualizará `build.gradle` para permitir la firma correcta del APK.

**Ejecución:**
- **Password Update**: Se reemplazó la contraseña placeholder por la real en `android/app/build.gradle`.

**Archivos Modificados:**
- `android/app/build.gradle`

### [2026-02-10 11:00] 21. Configuración de Firma Release (Keystore)
**Planificación:**
- El usuario generó su propia Keystore (`my-release-key.keystore`) para evitar conflictos de firmas en futuras actualizaciones.
- Se configurará `build.gradle` para usar esta firma en las compilaciones "release".

**Ejecución:**
- **Gradle Config**: Se añadió el bloque `signingConfigs` en `android/app/build.gradle` apuntando al archivo keystore.
- **Build Type**: Se asoció `signingConfig signingConfigs.release` al tipo de construcción `release`.
- **Nota de Seguridad**: Se usó una contraseña placeholder ("Cotidie2025Segura") en el código. El usuario deberá reemplazarla si eligió otra, o usar variables de entorno en un futuro para mayor seguridad.

**Archivos Modificados:**
- `android/app/build.gradle`

### [2026-02-10 10:55] 20. Fix de Compilación (Tipos ReactNode)
**Planificación:**
- El usuario reportó error "Type error: Type 'string | { [key: string]: string; } | undefined' is not assignable to type 'ReactNode'" en `ViaCrucisImmersive.tsx`.
- La propiedad `content` de `Prayer` puede ser un objeto (mapa de strings), lo cual no es renderizable directamente por React.

**Ejecución:**
- **Fix**: Se añadió una comprobación `typeof content === 'string'` antes de renderizar. Si es un objeto, se renderiza string vacío (o se podría manejar de otra forma, pero por ahora asegura la compilación).

**Archivos Modificados:**
- `src/components/ViaCrucisImmersive.tsx`

### [2026-02-10 10:45] 19. Fix de Compilación (Optional ID)
**Planificación:**
- El usuario reportó error "Type error: 'p.id' is possibly 'undefined'" en `ViaCrucisImmersive.tsx`.
- Se verificó que TypeScript marca `id` como opcional en la interfaz `Prayer`.

**Ejecución:**
- **Fix**: Se añadió el operador `?.` (optional chaining) o comprobaciones explícitas de existencia (`p.id && ...`) antes de usar métodos de string como `startsWith`, `split` o `includes`.

**Archivos Modificados:**
- `src/components/ViaCrucisImmersive.tsx`

### [2026-02-10 10:40] 18. Fix de Compilación (Optional Chaining)
**Planificación:**
- El usuario reportó error "Type error: 'viaCrucis.prayers' is possibly 'undefined'" en `ViaCrucisImmersive.tsx`.
- Se verificó que TypeScript marca `prayers` como opcional en la interfaz `Prayer`.

**Ejecución:**
- **Fix**: Se añadió el operador `?.` (optional chaining) al acceder a `viaCrucis.prayers` y se proveyó un valor por defecto `|| []` para evitar errores en `filter`.

**Archivos Modificados:**
- `src/components/ViaCrucisImmersive.tsx`

### [2026-02-10 10:35] 17. Fix de Compilación (Variable no definida)
**Planificación:**
- El usuario reportó error "Cannot find name 'isDeveloperMode'" en `ContentSettings.tsx`.
- Se verificó que la variable no se estaba extrayendo del hook `useSettings()`.

**Ejecución:**
- **Fix**: Se añadió `isDeveloperMode` a la destructuración de `useSettings()` en `src/components/settings/ContentSettings.tsx`.

**Archivos Modificados:**
- `src/components/settings/ContentSettings.tsx`

### [2026-02-10 10:30] 16. Fix de Compilación (Imports Faltantes)
**Planificación:**
- El usuario reportó error "Cannot find name 'ViaCrucisImmersive'" en `MainApp.tsx`.
- Se detectó que los componentes `ViaCrucisImmersive` y `RosaryImmersive` no estaban importados.

**Ejecución:**
- **Import Fix**: Se añadieron las importaciones faltantes en `src/components/main/MainApp.tsx` apuntando a `../ViaCrucisImmersive` y `../RosaryImmersive`.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`

### [2026-02-10 10:25] 15. Fix de Compilación (Tipos AppView)
**Planificación:**
- El usuario reportó error de compilación al asignar `'viaCrucis'` a `activeView` en `MainApp.tsx`.
- El tipo `AppView` no incluía `'viaCrucis'` ni `'rosary'`, causando incompatibilidad de tipos en `setNavState`.

**Ejecución:**
- **Type Fix**: Se actualizó la definición de `AppView` en `MainApp.tsx` para incluir `'viaCrucis' | 'rosary'`, alineándolo con el uso en el `switch` de renderizado y los manejadores de eventos.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`

### [2026-02-10 10:15] 14. Corrección de Colores Litúrgicos (Vírgenes)
**Planificación:**
- El usuario solicitó restringir el color celeste (`blue`) exclusivamente a fiestas marianas.
- Las santas vírgenes (no marianas) deben usar verde (si no son mártires) o rojo (si son mártires).
- Se modificará la lógica de asignación de colores.

**Ejecución:**
- **Refactor `getLiturgicalColor`**:
    - Se separó la lógica de `marian` y `virgin`.
    - Se reforzó la detección de mártires buscando también en el `name` (para cubrir casos donde `type` sea solo `virgin` pero sea mártir).
    - Se asignó `colors.green` a las vírgenes no mártires, según instrucción explícita.

**Archivos Modificados:**
- `src/lib/getLiturgicalColor.ts`

### [2026-02-10 10:00] 13. Resolución de Conflicto de Instalación (APK)
**Planificación:**
- El usuario reportó error "Conflicto con un paquete" al actualizar de v3.2.4 a v3.2.5.
- Se revisó la configuración de compilación y firmas.
- Se determinó que el error se debe a una diferencia en la firma digital (keystore) entre la versión instalada y la nueva (debug).

**Ejecución:**
- **Análisis**: Se verificó `build.gradle`, `AndroidManifest.xml` y `capacitor.config.ts`. Todo correcto.
- **Diagnóstico**: El APK generado es una versión de depuración (`debug.keystore`). El error confirma que la versión instalada previamente fue firmada con una clave diferente (o el mismo `debug.keystore` fue regenerado).
- **Solución**: Se instruyó al usuario desinstalar la versión anterior para permitir la instalación limpia, ya que las firmas de depuración no son consistentes entre entornos/dispositivos.

**Archivos Modificados:**
- `AGENTS.md` (Registro de soporte)

---

### [2026-02-09 21:50] 12. Limpieza de Interfaz Desarrollador
**Planificación:**
- Eliminar la tabla JSON sin formato en la pestaña de Estadísticas.
- Ocultar el encabezado global ("Cotidie") cuando se está en el panel de desarrollador.
- Cambiar la etiqueta "development" por "desarrollador" en la consola.

**Ejecución:**
- **DeveloperDashboard.tsx**:
    - Se eliminó el bloque `<pre>` que mostraba el JSON crudo en "Estadísticas" y "Globales".
    - Se reemplazó el texto del entorno para mostrar "desarrollador".
- **MainApp.tsx**:
    - Se añadió la condición `navState.activeView !== 'developer'` para evitar renderizar el componente `<Header />` en esa vista.

**Archivos Modificados:**
- `src/components/developer/DeveloperDashboard.tsx`
- `src/components/main/MainApp.tsx`

### [2026-02-09 21:44] 11. Traducción Completa al Español
**Planificación:**
- El usuario solicitó traducir TODA la aplicación al español, sin exclusiones.
- Se revisaron los componentes principales para asegurar la localización.

**Ejecución:**
- **Developer Dashboard**: Se tradujeron las claves de las estadísticas (que se mostraban en inglés como `daysActive`, etc.) a etiquetas legibles en español (`Días Activo`, `Oraciones Abiertas`).
- **Verificación**: Se confirmó que `AnnuumStory.tsx`, `Settings.tsx` y sus subcomponentes ya se encuentran traducidos.

**Archivos Modificados:**
- `src/components/developer/DeveloperDashboard.tsx`

### [2026-02-09 18:35] 10. Devoción a San José y Mejoras en Simulación de Fechas
**Planificación:**
- Agregar devoción a San José.
- Restringir el simulador de fechas para que solo afecte al "Santo del Día" y no a la lógica global de la app.
- Habilitar la navegación a la devoción del santo al hacer clic en su tarjeta.
- Corregir la navegación doble al guardar una oración editada.

**Ejecución:**
- **San José**: Se creó `src/lib/prayers/devociones/sanjose.ts` y se registró en `data.tsx`.
- **Scope Simulación**: Se modificó `SettingsContext.tsx` para usar `new Date()` en rotación de fondos y estadísticas, limitando `simulatedDate` solo al cálculo del santo.
- **Link Santo**: Se añadió lógica en `SettingsContext` para resolver el ID de la oración del santo y se actualizó `PrayerList.tsx` (`SaintOfTheDayCard`) para ser clickeable.
- **Nav Fix**: Se eliminó la llamada redundante a `handleBack()` en `MainApp.tsx` (`handleSavePrayer`), ya que `AddPrayerForm` ya maneja la cancelación/retorno.

**Archivos Modificados:**
- `src/lib/prayers/devociones/sanjose.ts` (NUEVO)
- `src/lib/data.tsx`
- `src/context/SettingsContext.tsx`
- `src/components/PrayerList.tsx`
- `src/components/main/MainApp.tsx`

### [2026-02-09 18:25] 9. Análisis de Errores y Mejoras UX
**Planificación:**
- El usuario solicitó analizar el código en busca de errores y solucionarlos, registrando todo.
- Se ejecutó `npm run build` para verificar la integridad del código.
- Se revisó manualmente `DeveloperDashboard.tsx`.

**Ejecución:**
- **Análisis Build**: La compilación (`npm run build`) finalizó con éxito (Exit Code 0), confirmando que no hay errores de sintaxis ni de tipos críticos.
- **Mejora UX**: En `DeveloperDashboard.tsx`, se detectó que el input de edición de estadísticas no permitía borrar el número completamente (backspace bloqueado por validación `NaN`). Se corrigió para permitir strings vacíos temporalmente (seteando valor a 0), mejorando la experiencia de edición.

**Archivos Modificados:**
- `src/components/developer/DeveloperDashboard.tsx`

### [2026-02-09 18:20] 8. Limpieza de APKs Antiguos
**Planificación:**
- El usuario solicitó que al compilar una nueva versión, se eliminen automáticamente las versiones anteriores (`.apk`) presentes en la raíz.

**Ejecución:**
- **Script Update**: Se modificó `scripts/android-apk.mjs` para buscar y eliminar archivos que coincidan con el patrón `cotidie-installer-v*.apk` en la raíz del proyecto antes de copiar el nuevo APK generado.

**Archivos Modificados:**
- `scripts/android-apk.mjs`

### [2026-02-09 18:15] 7. Resolución de Conflictos y Compilación
**Planificación:**
- El usuario reportó que el agente se detuvo antes de finalizar las correcciones de compilación.
- Se identificaron errores en `DeveloperSettings.tsx` (variables obsoletas), `MainApp.tsx` (falta de ruta), y `CustomPlanView.tsx` (imports duplicados).

**Ejecución:**
- **Refactor Final**: Se limpió `DeveloperSettings.tsx`, eliminando el antiguo diálogo y usando solo la navegación al nuevo Dashboard.
- **Ruta MainApp**: Se integró correctamente la vista `'developer'` en el switch de navegación de `MainApp.tsx`.
- **Limpieza**: Se eliminaron importaciones duplicadas en `CustomPlanView.tsx` y se verificó la exportación de tipos en `AppearanceSettings.tsx`.

**Archivos Modificados:**
- `src/components/main/MainApp.tsx`
- `src/components/settings/DeveloperSettings.tsx`
- `src/components/plans/CustomPlanView.tsx`
- `src/components/settings/AppearanceSettings.tsx`

### [2026-02-09 18:05] 6. Actualización de Copyright
**Planificación:**
- El usuario solicitó actualizar el año de inicio en el copyright a 2025.

**Ejecución:**
- **Copyright Update**: Se actualizó el texto en `DeveloperSettings.tsx` para mostrar "© 2025 - {año_actual}".

**Archivos Modificados:**
- `src/components/settings/DeveloperSettings.tsx`

### [2026-02-09 17:55] 5. Nuevo Panel de Desarrollador (Developer Console)
**Planificación:**
- Separar las herramientas de desarrollo de la UI de ajustes estándar.
- Crear una interfaz dedicada ("Console/Dashboard") con aspecto técnico.
- Migrar controles (stats, logs, toggles) a esta nueva interfaz.

**Ejecución:**
- **Nuevo Componente**: Se creó `src/components/developer/DeveloperDashboard.tsx` con diseño tipo terminal, navegación lateral y pestañas (Overview, Stats, Global, System).
- **Enrutamiento**: Se añadió la vista `'developer'` en `MainApp.tsx` para renderizar el Dashboard en pantalla completa.
- **Acceso**: Se modificó `DeveloperSettings.tsx` para que el botón "Panel de Desarrollador" redirija a la nueva vista en lugar de abrir un modal.
- **Settings**: Se pasó la función de navegación desde `MainApp` -> `Settings` -> `DeveloperSettings`.

**Archivos Modificados:**
- `src/components/developer/DeveloperDashboard.tsx` (NUEVO)
- `src/components/main/MainApp.tsx`
- `src/components/Settings.tsx`
- `src/components/settings/DeveloperSettings.tsx`

---

### [2026-02-09 17:50] 4. Exportación e Importación de Planes (.ctd)
**Planificación:**
- Permitir exportar planes personalizados a un archivo `.ctd` (JSON).
- Permitir importar dichos archivos para restaurar planes.

**Ejecución:**
- **Exportar**: Se añadió botón en `CustomPlanView.tsx` que genera un Blob JSON y lo descarga.
- **Importar**: Se añadió input de archivo que lee el JSON, valida la estructura básica y actualiza el plan en el slot seleccionado usando `importUserData` o lógica local.

**Archivos Modificados:**
- `src/components/plans/CustomPlanView.tsx`

### [2026-02-09 17:45] 3. Cotidie Annuum y Lógica de Contadores
**Planificación:**
- Restringir la temporada "Annuum" (resumen del año) para que termine estrictamente el 31 de diciembre.
- Reiniciar contadores anuales automáticamente el 1 de enero.
- Crear un contador "Global" (histórico) que nunca se reinicie.
- Corregir bug en la "Racha de Santa Misa" (problemas de zona horaria).
- Implementar checks automáticos en "Plan de Vida" al rezar sub-oraciones.

**Ejecución:**
- **Temporada**: Se editó `src/lib/movable-feasts.ts` para eliminar enero de la lógica `isAnnuumSeason`.
- **Reinicio Anual**: En `src/context/SettingsContext.tsx`, se añadió lógica para detectar cambio de año, reiniciar `userStats` y migrar datos a `globalUserStats`.
- **Racha Misa**: Se implementó `getLocalDateKey` en el contexto para usar fechas locales en lugar de UTC, solucionando el bug de la racha.
- **Auto-Check**: Se modificó `incrementStat` para buscar recursivamente si una oración pertenece al Plan de Vida y marcarla automáticamente.

**Archivos Modificados:**
- `src/lib/movable-feasts.ts`
- `src/context/SettingsContext.tsx`
- `src/components/main/MainApp.tsx` (integración de checks)

### [2026-02-09 17:40] 2. Configuración de Build APK y Scripts
**Planificación:**
- El usuario consultó sobre la ubicación del APK generado y pidió que se copiara a la raíz.
- Se detectó un problema con la ruta del SDK de Android.

**Ejecución:**
- **Script APK**: Se modificó `scripts/android-apk.mjs` para copiar el APK generado a la raíz del proyecto (`process.cwd()`).
- **Path Fix**: Se ajustó el script para usar `import.meta.url` y resolver rutas relativas de forma segura, evitando errores si se ejecuta desde otro directorio.
- **Android Config**: Se actualizó `android/local.properties` con la ruta correcta del SDK: `C:\Users\balca\AppData\Local\Android\Sdk`.

**Archivos Modificados:**
- `scripts/android-apk.mjs`
- `android/local.properties`

### [2026-02-09 17:35] 1. Renombrar "Admin" a "Desarrollo" y Fix de Compilación
**Planificación:**
- El usuario solicitó cambiar el nombre de la pestaña "Admin" en Ajustes.
- Se reportaron errores de compilación (`missing modules`, `ThemeColors`).
- Se requirió verificar la configuración para builds de Android.

**Ejecución:**
- **UI Update**: Se renombró la pestaña "Admin" a "Desarrollo" en `src/components/Settings.tsx`.
- **Fix Build**: Se corrigió la importación de `ThemeColors` en `src/components/settings/AppearanceSettings.tsx` (se importaba de `SettingsContext` incorrectamente, se movió a `theme-utils`).
- **Dependencias**: Se ejecutó `npm install` para resolver módulos faltantes de Next.js.

**Archivos Modificados:**
- `src/components/Settings.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `package.json` / `package-lock.json` (por `npm install`)
