# Persistencia de lectura: validación

## Seguridad local — 15/10/2026

La captura de ancla tiene presupuestos de nodos, rectángulos y mediciones. Ante contenido excesivo usa el CFI diagnóstico, marcado como fallback, sin aceptar un centro parcial. Regresiones Node cubren nodos enormes, muchos nodos/rectángulos y caracteres, además del segundo spine visible. Queda por comprobar en PWA/WebView real la restauración, columnas, rotación y tipografía con estos límites; las pruebas Node no certifican geometría física.

## Ronda de funciones sensibles — 8/10/2026

- 36 regresiones Node correctas. Además de los contratos del lector: commit/aborto/apertura recuperable, migración cifrada y retención ante fallos, integridad/caducidad/revisiones, exclusión de privilegios, presupuesto real de expansión ZIP, borrado EPUB con checkpoints tardíos y fechas civiles en Santiago/DST/Auckland. Los fixtures de binarios son EPUB válidos; el NT empaquetado pasa el mismo validador.
- `npm.cmd run build` coordinado correcto: TypeScript previo y export Next completos. Java de MainActivity, BackgroundActions, planificador, almacenamiento privado y receptores compila contra API 35/Capacitor/AndroidX locales bajo el coordinador. XML de exclusión bien formado. Esto no certifica un APK instalado.
- Navegador local con datos ficticios: migración conservó tema/7 minutos en pausa/examen; retiró plaintext y dejó claves no extraíbles/ciphertext. Edición y opción 24 h sobrevivieron a recarga. Listo retiró examen y clave; no reapareció. Import con privilegios/actividad del timer en true: sin panel ni inicio, 3 minutos en pausa. Export sin privilegios/trazas/examen. Reinicio completo retiró nota/opción y restableció el timer desactivado.
- EPUB eliminado conserva un marcador durable de retirada para impedir resurrección; no cambia el ID de libros conservados ni sus CFIs. Un fallo de limpieza heredada se reintenta. ZIP se valida antes de guardar y también al abrir fuentes antiguas.
- Pendientes físicos: entrega/permiso exacto/canal bloqueado/reinicio/muerte del proceso, Keystore/copia/transferencia y Android 7; APK completo y PWA instalada/offline. ADB sin dispositivos en esta ronda. Las validaciones USB de versiones anteriores siguen siendo históricas.

## Correcciones y ejecución reproducible (2026-10-09)

`npm test` ejecuta las regresiones de persistencia, parches nativos y lifecycle de ajustes. Requiere fake-indexeddb y react-test-renderer@18.3.1 externos; no necesita credenciales ni historial Git. En este equipo:

```powershell
$env:COTIDIE_TEST_DEPS = 'C:\Users\balca\.codex\projects\cotidie\validation-2026-10-08\deps'
npm test
```

En otro equipo, instalar las dependencias en un directorio auxiliar externo (`npm install --prefix <directorio> --no-save --no-package-lock --ignore-scripts fake-indexeddb react-test-renderer@18.3.1`) y apuntar la variable a él. Compilación/tipos con `npm run build`, que ya incorpora el control de concurrencia.

E25: 55 pruebas correctas. Cuatro pruebas montan hooks/proveedor con React 18 y simulan puentes nativos: el widget reacciona al tipo litúrgico; cambiar tema conserva la sincronización y usa el icono vigente; desmontar cancela trabajo pendiente. En el proveedor real, cambiar ajustes no repite hidratación ni suscripciones; los eventos usan la fecha vigente. Un fallo de carga no consume acciones nativas, y el reintento explícito recupera la configuración. No certifican entrega Android ni aspecto del widget físico.

Cierre E31/E32 del11deoctubre: lint0errores/0advertencias activas (8excepciones nuevas de línea justificadas+3supresiones previas);55pruebas,tipos/build y117recursosPWA correctos. UI aislada conserva instanciaEPUB con tamaño100→120%,Mateo tras recarga/reapertura,timer cancelar/guardar yplanes personales. APK final firmado v2:SHA256 ca29f16614f4a461a23fec5f2caa7f8d4b9a57f977847e31db66f55010717dbf. Pendientes físicos/externos y evidencia exacta en docs/CORRECCIONES-2026-10-09.md y correction-state.md externo.

Nueva base: IndexedDB de lectura v2 conserva books/progress y añade audio/restore. Respaldo .ctdb incluye binarios e identidades de lectura; importación reanudable. Pruebas47 correctas: ida/vuelta de audio, progreso legado, checksums, truncamiento, reintento de restauración y migración fallida. EPUB sigue en0.3.93; XML parser fijado a0.8.15. Pendientes pruebas visuales completas EPUB/anotaciones y físicas Android de esta nueva base; no extender certificaciones anteriores.

## Contratos del lector

Implementación para epub.js **0.3.93**, sin reemplazo de dependencia. El controlador adapta
`onResized` antes de que `start` lo enlace y encauza `display` interno (enlaces) por la misma cola.
En esta versión `reportLocation()` encola un requestAnimationFrame cuyo final no está incluido
en la promesa de `next/prev`: la confirmación espera el evento, con el listener ya registrado.
Un giro dentro del mismo spine termina allí: no espera fuentes, no formatea/expande y no llama
`display`. Un iframe nuevo o un reflow espera sus recursos efectivos, pagina una vez y recoloca
el CFI semántico dentro del mismo documento antes de aceptar el `relocated` final.
Al cambiar epub.js hay que revisar estos contratos y ejecutar de nuevo la matriz.

## Validación automatizada

- `npm run build` incluye TypeScript y usa el coordinador; no ejecutar una segunda comprobación pesada en paralelo.
- 36 pruebas con el runner incorporado de Node. No se agregó un framework de pruebas al proyecto.
  `fake-indexeddb` se instala solamente en un directorio temporal:

```powershell
$testDeps = Join-Path $env:USERPROFILE '.codex/projects/Cotidie/reading-test-deps'
npm install --prefix $testDeps --no-save --no-package-lock --ignore-scripts fake-indexeddb
$preload = Join-Path $testDeps 'node_modules/fake-indexeddb/auto'
node --require $preload --test tests/reading-persistence.cjs
```

Las pruebas cubren la preferencia por localStorage heredado, CFI plano/JSON, reparación en
ambos sentidos, revisión, escrituras fuera de orden, aborto posterior al put, cuota local,
migración de binarios y retención si falla, binario de 6 MiB, ancla de Camino bajo zoom,
selección del centro entre dos documentos, espera de CSS antes de fuentes, navegación rápida sin
`display`/fuentes/layout/expand, preparación única de spine nuevo, navegación serializada,
`relocated` tardío, cierre, resize anterior a restauración, reflow de fuente/tamaño, compatibilidad
de identidad NT URL/base64 y personal ArrayBuffer, nombre visible de archivo, paginación relativa
del EPUB completo dependiente de viewport/tipografía, restauración de una página cuyo inicio y centro
pertenecen a spine items distintos, y fallback de CFI inválido.
IndexedDB está simulado y la rendition usa un doble de eventos: estas pruebas NO certifican
el render real, ni la ejecución de APK/PWA en un dispositivo.

## Matriz manual APK/PWA

En los casos EPUB ejecutar con NT y con un libro personal. Elegir una frase del centro
visible y crear un marcador como referencia antes de la acción. Tras una repaginación debe
estar visible la frase anclada; no se exige el mismo número físico de página.
En Camino registrar el número de punto y el tramo visible. Comprobar también controles,
volver, índice, búsqueda NT/general, marcadores, subrayados, temas y safe areas.

| Caso | Procedimiento y resultado esperado | APK | PWA |
| --- | --- | --- | --- |
| 1. Páginas rápidas | Avanzar/retroceder repetidamente dentro de un capítulo. La página debe aparecer de inmediato, sin negro ni overlay; la traza debe indicar `mode=fast-page`. | OK en Z2468N: grabaciones de tres avances en NT y un retroceso en EPUB personal, todas sin intervalo negro (`blackdetect`); la página anterior permaneció visible hasta componer la siguiente. | Parcial: el build local offline paginó correctamente; no se grabó todavía una secuencia fast-page propia de PWA. |
| 2. Salto de capítulo | Pasar el límite de capítulo en ambos sentidos. Se admite solo un overlay breve mientras se prepara el iframe nuevo; traza `mode=new-spine`. | OK en ambos sentidos: avance real `13c.xhtml` -> `13c-1.xhtml` y retroceso al primer documento, con persistencia confirmada en el spine final. El avance medido anteriormente mantuvo el overlay en 323 ms. | Parcial: el NT offline avanzó entre los primeros spine items sin error; no se midió el overlay de PWA. |
| 3. Página entre dos spine | Dejar visible el fin de un documento y el inicio del siguiente, cerrar/reabrir y avanzar/retroceder. Restaurar la frase central correcta sin volver a la página anterior. | OK por regresión dirigida y cruce USB: la prueba guarda `startCfi` en el spine anterior y el centro/final en el siguiente, cierra/restaura y exige que el primer `display` use el centro nuevo. En la configuración real `spread: none` no existe una página final estable con dos iframes a la vez; USB confirmó los dos cruces reales del límite. | Misma garantía compartida por el controlador; no se atribuye una composición visual imposible con `spread: none`. |
| 4. Background inmediato | Pasar página y cambiar inmediatamente de app. Reabrir en la última página confirmada, nunca en una ubicación transitoria. | OK: avance desde 1/25, HOME a unos 350 ms y reapertura en 2/25. | Pendiente de dispositivo. |
| 5. Muerte del proceso | Tras ver una página nueva, matar el proceso y reabrir sin borrar datos. Recuperar el espejo local aun si IDB estaba en cola. | OK: `force-stop`, relanzamiento y reapertura del NT en 2/25. | Pendiente de dispositivo. |
| 6. Orientación | Rotar vertical/horizontal varias veces. Reflow único, frase central conservada y sin deriva acumulativa. | OK: 2/25 vertical, 3/40 horizontal y 2/25 al volver; se conservó «Testimonio de Juan Bautista». | Pendiente de dispositivo. |
| 7. Teclado | Mostrar/ocultar teclado desde búsqueda y notas. Solo un cambio efectivo de viewport dispara reflow; no guardar geometría transitoria. | OK con búsqueda: teclado abierto/cerrado y retorno a 2/25 con la misma frase semántica. Notas pendiente. | Pendiente de dispositivo. |
| 8. Fuente/tamaño | Cambiar familia y tamaño repetidamente, cerrar/reabrir. Mantener la frase anclada tras cargar las fuentes efectivas. | OK: 110% -> 120% -> 110% conservó «Testimonio de Juan Bautista»; Literata -> Lora conservó el pasaje de Judas al reabrir y recalculó el total 1824 -> 1895. Se restituyó Literata al terminar. | Pendiente de dispositivo. |
| 9. NT PWA offline | Descargar NT, activar modo avión y continuar. Mantener progreso, marcadores y subrayados con identidad `nuevo-testamento.epub`; comprobar también el NT empaquetado del APK. | OK para NT empaquetado, navegación y persistencia. | OK en Chrome USB con el build exacto: tras detener el servidor y retirar `adb reverse`, se creó un subrayado con nota y un marcador, se desmontó/reabrió el lector desde el SPA y el EPUB de IDB reapareció con ambos registros y un `g.cotidie-highlight`. Los datos de prueba se retiraron. El host de desarrollo `localhost` desregistra deliberadamente el service worker, por lo que no se atribuye a esta prueba una recarga dura offline del shell. |
| 10. Personal heredado | Abrir un libro histórico desde localStorage. Conservar nombre, ID `personal-${id}.epub`, binario, progreso y anotaciones tras migrarlo a IDB. | Parcial: «Magnifica Humanitas» (registro 9/7/2026) abrió, restauró 14/23 y avanzó sin error. El origen localStorage previo a su migración no puede demostrarse después del hecho; lo cubre la prueba automatizada. | Pendiente de dispositivo. |

## Corrección de contador del 8/10/2026

- El ordinal usa `start.displayed.page` de la ubicación confirmada, más los tamaños de spine anteriores. El índice de caracteres no representa un avance visual.
- `displayed.total` mide capítulos visitados; los demás conservan estimaciones y la UI indica `total estimado`. El total puede ajustarse al visitar capítulos o cambiar tipografía/viewport; no se persiste ni restaura lectura.
- Regresión: bloques semánticos 4 -> 6 con páginas visibles 5 -> 6, cruce en ambos sentidos y descarte de medidas al repaginar. Se conservan pruebas de restauración, navegación rápida y cierre.
- Recertificar APK/PWA: avanzar 5/8 -> 6/8, retroceder, cruzar capítulos, cambiar fuente/orientación conservando el pasaje, en NT y libro personal. La tabla USB de septiembre describe la versión anterior y no certifica este cambio.
- Web local verificada con el export actual servido en `127.0.0.1:8767` y Codex In-app Browser: NT 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 5, incluyendo cambios de spine y un avance dentro del prólogo; la biblioteca personal abrió el mismo archivo público con identidad independiente desde página 1 y confirmó 5 -> 6 -> 5. Total mostrado en ese viewport: 487, señalado como estimación. Las verificaciones esperan la ubicación confirmada antes de leer el ordinal. Esto no certifica APK ni PWA instalada/offline.

## Datos y límites

- Progreso EPUB: claves históricas `cotidie_epub_location_${fileName.toLowerCase()}` en el espejo
  local, store `progress` de `cotidie-reading` en IDB. Lectura directa del antiguo
  `cotidie-db/settings-store` para migrar, sin depender de sus errores silenciados.
- Un registro nuevo contiene versión, fecha, revisión, recurso, ancla central, inicio/final y href;
  `anchorKind` distingue centro, fallback y migración. Las copias antiguas no contenían un centro:
  se parte de su CFI disponible y se captura un centro en la primera restauración confirmada.
- Comparación/put IDB en una sola transacción readwrite, resolución en commit. La cola y el
  espejo impiden que la finalización de una escritura anterior revierta una posterior.
- Camino usa `cotidie_camino_progress_v1`, punto + fracción dentro del punto y fracción de
  viewport. `scrollPositions['camino-libro']` solo sirve para la primera migración.
- Personales: Blob/ArrayBuffer y metadatos en `cotidie-reading/books`. Se conserva el ID heredado
  y la identidad de progreso `personal-${id}.epub`. El índice antiguo sigue siendo legible.
- El cierre/background guarda el último estado confirmado; no consulta una rendition destruida.
  El watchdog de 20 s falla sin guardar una ubicación transitoria y pide reabrir el libro.
- Validación USB ejecutada el 21/9/2026 en un Z2468N (1080x2400) con APK 6.4.21 y
  con el `out/` exacto servido temporalmente a Chrome. El lector PWA ya cargado se comprobó también
  después de detener el servidor y retirar `adb reverse`; no se publicó ni se sustituyó la WebAPK de producción.
- Las celdas marcadas como parciales o pendientes no se consideran certificadas. Los avisos repetidos
  de métricas `first_paint/first_image_paint` provienen de Chromium; no hubo `FATAL EXCEPTION`,
  excepción JavaScript no controlada, error de cuota ni error del controlador EPUB durante la sesión.
