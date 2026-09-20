# Persistencia de lectura: validación

Implementación para epub.js **0.3.93**, sin reemplazo de dependencia. El controlador adapta
`onResized` antes de que `start` lo enlace y encauza `display` interno (enlaces) por la misma cola.
En esta versión `reportLocation()` encola un requestAnimationFrame cuyo final no está incluido
en la promesa de `next/prev`: la confirmación espera el evento, con el listener ya registrado.
Un giro dentro del mismo spine termina allí: no espera fuentes, no formatea/expande y no llama
`display`. Un iframe nuevo o un reflow espera sus recursos efectivos, pagina una vez y recoloca
el CFI semántico dentro del mismo documento antes de aceptar el `relocated` final.
Al cambiar epub.js hay que revisar estos contratos y ejecutar de nuevo la matriz.

## Validación automatizada

- `npx tsc --noEmit`
- `npm run build`
- 19 pruebas con el runner incorporado de Node. No se agregó un framework ni dependencias al proyecto.
  `fake-indexeddb` se instala solamente en un directorio temporal:

```powershell
$testDeps = Join-Path $env:TEMP 'cotidie-reading-test-deps'
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
de identidad NT URL/base64 y personal ArrayBuffer, y fallback de CFI inválido.
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
| 1. Páginas rápidas | Avanzar/retroceder repetidamente dentro de un capítulo. La página debe aparecer de inmediato, sin negro ni overlay; la traza debe indicar `mode=fast-page`. | Pendiente de dispositivo | Pendiente de dispositivo |
| 2. Salto de capítulo | Pasar el límite de capítulo en ambos sentidos. Se admite solo un overlay breve mientras se prepara el iframe nuevo; traza `mode=new-spine`. | Pendiente de dispositivo | Pendiente de dispositivo |
| 3. Página entre dos spine | Dejar visible el fin de un documento y el inicio del siguiente, cerrar/reabrir y avanzar/retroceder. Restaurar la frase central correcta sin volver a la página anterior. | Pendiente de dispositivo | Pendiente de dispositivo |
| 4. Background inmediato | Pasar página y cambiar inmediatamente de app. Reabrir en la última página confirmada, nunca en una ubicación transitoria. | Pendiente de dispositivo | Pendiente de dispositivo |
| 5. Muerte del proceso | Tras ver una página nueva, matar el proceso y reabrir sin borrar datos. Recuperar el espejo local aun si IDB estaba en cola. | Pendiente de dispositivo | Pendiente de dispositivo |
| 6. Orientación | Rotar vertical/horizontal varias veces. Reflow único, frase central conservada y sin deriva acumulativa. | Pendiente de dispositivo | Pendiente de dispositivo |
| 7. Teclado | Mostrar/ocultar teclado desde búsqueda y notas. Solo un cambio efectivo de viewport dispara reflow; no guardar geometría transitoria. | Pendiente de dispositivo | Pendiente de dispositivo |
| 8. Fuente/tamaño | Cambiar familia y tamaño repetidamente, cerrar/reabrir. Mantener la frase anclada tras cargar las fuentes efectivas. | Pendiente de dispositivo | Pendiente de dispositivo |
| 9. NT PWA offline | Descargar NT, activar modo avión y continuar. Mantener progreso, marcadores y subrayados con identidad `nuevo-testamento.epub`; comprobar también el NT empaquetado del APK. | Pendiente de dispositivo | Pendiente de dispositivo |
| 10. Personal heredado | Abrir un libro histórico desde localStorage. Conservar nombre, ID `personal-${id}.epub`, binario, progreso y anotaciones tras migrarlo a IDB. | Pendiente de dispositivo | Pendiente de dispositivo |

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
- Sin ADB ni validación visual del iframe en este entorno. Todos los casos manuales siguen pendientes.
