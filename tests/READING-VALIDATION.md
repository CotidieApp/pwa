# Persistencia de lectura: validación

Implementación para epub.js **0.3.93**, sin reemplazo de dependencia. El controlador adapta
`onResized` antes de que `start` lo enlace y encauza `display` interno (enlaces) por la misma cola.
En esta versión `reportLocation()` encola un requestAnimationFrame cuyo final no está incluido
en la promesa de `next/prev`: la confirmación espera el evento, con el listener ya registrado.
Al cambiar epub.js hay que revisar estos contratos y ejecutar de nuevo la matriz.

## Validación automatizada

- `npx tsc --noEmit`
- `npm run build`
- 16 pruebas con el runner incorporado de Node. No se agregó un framework ni dependencias al proyecto.
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
selección del centro entre dos documentos, espera de CSS antes de fuentes, navegación
serializada, relocated tardío, cierre, resize anterior a restauración, reflow y fallback de CFI inválido.
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
| 1. Avanzar y cerrar | Avanzar varias páginas, volver con botón del lector y reabrir; repetir con back Android. Recuperar la frase central. | Pendiente de dispositivo | Pendiente de dispositivo |
| 2. Background inmediato | Pasar página, ir inmediatamente a otra app y volver. Conservar la última página confirmada; si seguía el overlay, la anterior confirmada. | Pendiente de dispositivo | Pendiente de dispositivo |
| 3. Matar proceso | Tras ver la nueva página, matar el proceso y reabrir sin borrar datos. Recuperar la posición aunque IDB no haya terminado; la traza debe mostrar reparación desde local si corresponde. | Pendiente de dispositivo | Pendiente de dispositivo |
| 4. Orientación | Rotar vertical/horizontal varias veces y cerrar/reabrir. Conservar la frase anclada sin desplazamiento acumulativo. | Pendiente de dispositivo | Pendiente de dispositivo |
| 5. Teclado | Abrir búsqueda o nota, mostrar/ocultar teclado y cerrar/reabrir. No guardar la página transitoria del resize. | Pendiente de dispositivo | Pendiente de dispositivo |
| 6. Fuente | Cambiar tamaño y familia, repetir, cerrar/reabrir. Mantener la frase anclada con las fuentes efectivamente cargadas. | Pendiente de dispositivo | Pendiente de dispositivo |
| 7. Dos spine items | Situarse en una vista que contenga fin/inicio de documentos, cerrar/reabrir y rotar. El CFI central puede pertenecer a cualquiera de ambos según lo visible. | Pendiente de dispositivo | Pendiente de dispositivo |
| 8. NT offline | Leer por URL, descargar NT en PWA, activar modo avión, reabrir y seguir leyendo. Conservar progreso, marcadores y subrayados bajo `nuevo-testamento.epub`. En APK comprobar la copia empaquetada sin red. | Pendiente de dispositivo | Pendiente de dispositivo |
| 9. Personal heredado | Abrir un libro existente solo en localStorage. Verificar lectura, nombre, ID y anotaciones; confirmar binario en IDB antes de retirar la copia. Simular fallo IDB: libro abre y copia antigua permanece. | Pendiente de dispositivo | Pendiente de dispositivo |
| 10. Camino y zoom | Abrir con scroll heredado, desplazarse, cambiar zoom/familia y orientación; background, matar proceso y reabrir. Mantener punto y desplazamiento relativo, sin escrituras de scroll a Settings. | Pendiente de dispositivo | Pendiente de dispositivo |

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
