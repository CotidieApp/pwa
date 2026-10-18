# Cotidie — Correcciones y verificación

Continuación del [reporte integral](REPORTE-INTEGRAL-2026-10-09.md), actualizada el 11 de octubre. Código local 6.4.25, sin publicación ni instalación en dispositivos. Este documento distingue implementación, prueba web y certificación física; el plan recuperable y los logs permanecen fuera del repositorio, bajo `.codex/projects/cotidie`.

**Cambio posterior (15 de octubre):** el respaldo completo se exporta con extensión `.ctd`. Su contenido CTD2 no cambió. La importación distingue la cabecera del archivo y acepta tanto `.ctd` completos como `.ctd` antiguos de solo ajustes y `.ctdb` completos anteriores. Las referencias a `.ctdb` en el historial siguiente describen la versión probada entonces.

## Cambios y evidencia

### Seguimiento local posterior a E32 — 2026-10-11

Se reabrió el cierre local: **AU20, borradores de oraciones**, restaurados por un efecto y vaciados por otro. Se unificó la inicialización por identidad, se validan borradores parciales y se conservan cambios al salir/cambiar tipo. El autoguardado muestra fallos y reintenta; una carga inválida no sobrescribe el original automáticamente. Guardar una oración existente conserva el borrador de creación. El guardado exitoso no recrea el borrador ni permite duplicar la oración si falla su limpieza. Retiradas las tres supresiones de dependencias de AddPrayerForm.

**Estado vigente:** 63 pruebas correctas; lint 0 errores/0 advertencias activas, ocho excepciones puntuales justificadas. Build/tipos y 117 recursos PWA correctos. Edge aislado: cancelar/reabrir recupera título/contenido; cuota simulada conserva texto, muestra aviso y reintenta al restaurar almacenamiento; guardar elimina borrador; service worker activo, consola sin avisos. Los apartados posteriores conservan la evidencia histórica de E32.

Dependencias: overrides acotados a postcss-selector-parser7.1.6, serialize-javascript7.0.5 bajo el plugin Terser y uuid11.1.1 bajo xcode; contratos de selectores, serialización y generación de IDs probados. La auditoría de producción baja **15→6 paquetes (seis altos, cero moderados/críticos)**. Los seis provienen de una sola causa: braces3.0.3, última versión publicada, sin parche oficial para [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Propaga a chokidar, fast-glob, micromatch, Tailwind y next-pwa. No se cambiaron sus versiones principales ni se ocultaron avisos; la migración o corrección mantenida de esta cadena sigue pendiente.

Evidencia: tests-followup.log, lint-followup.json, audit-followup.json, build-followup.log, apk-followup.log y signature-followup.log en el directorio externo de correcciones. **APK vigente**: `dist/cotidie-installer-v6.4.25.apk`, 81.016.754 bytes, SHA256 `42d86902d066d6497fd52dc5302a570325b171ae8d93bce9efe97fcd9afc7d3c`, firma v2 verificada. Sustituye el hash histórico de E32. Gradle290tareas correcto; sin publicar, copiar ni instalar. El pipe de la sesión94092 quedó retenido después del resumen final: se confirmó ausencia de builds/procesosNode y guardia libre antes de cerrarlo conCtrl-C (salida1 de cierre, no de Gradle).

| Hallazgo | Corrección | Evidencia y límites |
| --- | --- | --- |
| AU01, importación insegura | Esquema para estructuras renderizables, contenido recursivo y referencias de planes; rangos normalizados antes de guardar | Rechazo de fondo null por UI; estado cifrado inválido recuperado mediante respaldo válido. Datos previos conservados al rechazar entradas |
| AU02–03, respaldo incompleto/límites | Formato `.ctdb` versionado, configuración, EPUB, audio, posiciones, marcadores y subrayados; `.ctd` sigue disponible para ajustes | Ida/vuelta web con EPUB2360336bytes, audio26214400bytes, marcador y posición42. Checksums y truncamiento cubiertos por Node |
| AU04, dependencias | Capacitor core/android/cli8.5.3, Next15.5.27; epubjs0.3.93 conservado con XMLDOM0.8.15; PostCSS8.5.29 y actualizaciones compatibles del lock | Build/tipos y regresiones aprobados. Audit de producción:15paquetes señalados,0críticos/7altos/8moderados; ver exposición abajo. Certificación nativa pendiente |
| AU05, biblioteca de audio | Binarios en IndexedDB; migración elimina cada dataURL solo después del commit; URLs de objetos se liberan al salir | Fallo de commit conserva fuente y permite reintentar. Archivo sintético25MiB respaldado/restaurado. No equivale a prueba física de decodificación25MiB |
| AU06, reproducción/progreso | Estado por eventos play/pause/error y manejo de promesa; checkpoints periódicos, pausa, fin y lifecycle; MIME conservado | UI: rechazo de play, reproducción real, pausa externa y medio inválido correctos. Pausa en segundo 73 y recarga recuperan 73; renombrado y borrado persisten. Lifecycle físico pendiente |
| AU07, arranque fallido | Pantalla independiente de recuperación, reintento y respaldo | Corregida interpretación del reporte inicial: el contexto exponía isLoaded solo. Prueba de datos malformados cifrados y recuperación aprobada; Keystore físico pendiente |
| AU08, reinicio parcial | Marcador durable antes de borrar, reintento idempotente, detención de lectores y bloqueo de doble ejecución | Marcador de interrupción simulado: UI ofreció continuar y volvió al inicio. Fallos de cada API nativa aún pendientes |
| AU09, navegación | Slot1–4 conservado, salida visible si el plan falta | Regresiones Node; no cambia identidad de las oraciones |
| AU10, ICS | Escape TEXT, CRLF, líneas de hasta 75 octetos UTF-8 y ancla válida para 29 de febrero | Parser independiente ical.js 2.2.1 recupera 732 eventos entre calendario anual y semestres, textos completos y caracteres especiales; recurrencia bisiesta 2028–2032 correcta. Importación en aplicación de calendario pendiente |
| AU11, reflow | Sin parche especulativo; repetición instrumentada sobre dependencias actuales |0errores ResizeObserver en portada/Mateo, cambios de letra y orientaciones1280/390x844/844x390. Causa original no demostrada; conservar seguimiento Android |
| AU12, lint | Revisados hooks/contexto, memoización de HomePage/MainApp/Vía Crucis, lifecycle EPUB, estados derivados y comillas JSX | E25 cerrado localmente: 0 errores/0 advertencias activas. De66avisos:58corregidos y8excepciones puntuales justificadas; se conservan3supresiones previas del formulario. Sin cambios de reglas globales.55pruebas,tipos/build y117recursosPWA correctos |
| AU13, timer | Checkpoint pequeño por segundo, snapshot completo estable durante cuenta activa; exportación con tiempo actual y aviso si falla el guardado | Medición web: siete checkpoints de 38 caracteres y un snapshot completo en siete ticks. Pausa/recarga conservan 893 segundos. Comparación anterior por código, sin medición histórica; Android pendiente |
| AU14, temporales | Aviso de copia sin cifrar; limpieza de copias Cache mayores a24h al arrancar/exportar; URI conservado para compartir | Política implementada; entrega del URI a otra aplicación Android pendiente |
| AU15, distribución | APK local por defecto, sin subir/copiar/bump implícitos ni git add-A/commit; entrega `dist/`, conserva APK de otras versiones; JDK21 documentado | APK actualizado con todos los cambios, firma v2 verificada. `--publish` exige árbol limpio y autorización separada. Hash debajo |
| AU16, accesibilidad | Zoom permitido, nombres de controles audio/sliders/casillas/toast, acceso por teclado y panel oculto inert | PrayerList y ajustes comprobados con teclado; toast «Cerrar aviso» comprobado en UI final. Lectores de pantalla y gestos físicos pendientes |
| AU17, mantenimiento/PWA | Runner reproducible; cuota/persistencia web; precache verificado; actualización espera confirmación del usuario |55pruebas correctas. Registro,recarga/offline y actualización voluntaria conservando datos aprobados.117recursos del build final verificados. Instalación como PWA pendiente |
| AU18, hallazgo adicional | Reconocimiento de títulos ordinales del NT y prioridad de cartas numeradas sobre Juan | NCX y UI: los 27 libros disponibles; antes faltaban 11 cartas en índice abreviado. 1 Juan abre y se recupera tras recargar offline |
| AU19, contenido personal del rosario | Respaldo incluye intenciones y jaculatorias; validación compartida; guardado solo después de leer lo existente; respeta lista vacía intencional | Ida/vuelta Node, rechazo de estructuras inválidas y UI instrumentada: al abrir escribe únicamente la intención conservada y la lista vacía, sin sobrescribir con defaults |

## Respaldo completo

`.ctdb` usa cabecera CTD2, metadatos JSON y binarios sin expansión ZIP del contenedor. Límites:128MiB totales,30MiB de metadatos y25MiB por archivo. Cada binario lleva SHA256. Los EPUB conservan además la validación de archivo comprimido del lector. Los límites de exportación e importación son simétricos; el exportador rechaza una copia que el importador no pueda admitir.

Incluye ajustes y contenido personal confirmado, intenciones y jaculatorias del rosario, bibliotecas EPUB/audio, identidades, progreso y anotaciones. Excluye borradores aún no guardados, posiciones flotantes locales, cuaderno de confesión, acceso de desarrollador, trazas, claves, navegación de sesión y copias regenerables del NT. Es un archivo **sin cifrar**: su posesión permite leer el contenido incluido. El cifrado local del dispositivo no se transfiere.

Antes de sustituir bibliotecas se validan los datos y se preparan los binarios en IndexedDB. Una intención guardada con la configuración permite repetir la fase pendiente tras un corte. Solo al completar se retiran intención y archivos temporales. IndexedDB y almacenamiento local no constituyen una transacción única; la recuperación es reanudable, no un rollback universal. Un error de cuota conserva los datos de restauración para el siguiente intento.

La prueba web detectó y corrigió otra incidencia del validador: referencias compartidas de objetos válidos eran confundidas con ciclos. Ahora solo se rechazan ciclos de ancestros reales, conservando límites de profundidad y cantidad.

Pruebas adicionales inducen cuota insuficiente y aborto de transacción: el binario anterior permanece y la etapa permite reintentar. También se añadió aborto explícito ante un error sincrónico de escritura para impedir que se confirmen borrados ya encolados. La regresión cubre los tres fallos y el reintento exitoso.

## Dependencias: alcance restante

Se corrigieron las rutas directas de Capacitor/Next/XML. Referencias oficiales: [Capacitor](https://github.com/ionic-team/capacitor/security/advisories/GHSA-rvm3-566m-v7fv), [XMLDOM](https://github.com/xmldom/xmldom/security). El paquete de generación de iconos `@capacitor/assets`, sin referencias en scripts/documentación de operación revisados, se retiró junto con su toolchain antiguo; los iconos del producto se conservaron.

Los15avisos restantes del audit de producción se concentran en herramientas: PWA/Workbox/serialize-javascript, Tailwind/globs/braces, parser de selectores y CLI/xcode/uuid. La etiqueta npm «producción» refleja la sección de package.json, no demuestra ejecución en el APK: estos paquetes procesan fuentes/configuración durante la compilación; el producto exporta estáticamente. No compilar configuraciones o árboles de archivos de terceros sin revisión. Esta restricción reduce la exposición, pero **no elimina los avisos**.

No se aplicó `npm audit fix --force`: proponía degradar next-pwa y cambios mayores de arquitectura. Las advertencias restantes requieren una migración controlada de herramientas o parches compatibles probados; no se presentan como corregidas. El audit completo, la lista de nodos y los logs están en el directorio externo `corrections-2026-10-09`.

## Cierre local E31/E32 y candidato

APK actualizado con todos los cambios: `dist/cotidie-installer-v6.4.25.apk`,81.016.338bytes (77,26MiB). Gradle290tareas correcto; firma APKv2 verificada conJDK21/apksigner36.0.0. SHA-256: `ca29f16614f4a461a23fec5f2caa7f8d4b9a57f977847e31db66f55010717dbf`. No instalado ni publicado; sin cambio de versión, copia externa o commit automático.

Regresión final:55pruebas,tipos/build y117recursosPWA correctos. Edge aislado: libro EPUB mantiene instancia al pasar100→120% yviewport390x844, Mateo se restaura al reabrir tras recarga; borrador del timer se descarta al cancelar y conserva2minutos al guardar/reabrir; plan personal creado,guardado y abierto; cierre de toast nombrado. Consola0errores/0advertencias. La preparación de APK convierte `out/` para Android; no servirlo como build PWA sin regenerar web.

E25 revisó las66advertencias:58correcciones y8excepciones de línea razonadas para sincronización con almacenamiento/audio/animación, sorteo fuera del render y CSS local offline. El informe de lint contiene11mensajes suprimidos contando3previos de AddPrayerForm, no revisados en este lote. No se modificó `eslint.config.mjs`. Evidencia externa: `E25-triage.md`, `lint-E25-final.json`, `E31-final-tests.log`, `E31-final-web.log`, `E31-E25-apk.log` y `E31-E25-signature.log`.

## Pendientes externos y límites

1. **E30: Android físico.** ADB no detectó dispositivos el11deoctubre. Requiere teléfono de prueba y autorización de instalación/uso de datos: upgrade,Keystore,compartirURI,notificaciones/timer,EPUB,audio,widgets yaccesibilidad. Ninguna prueba simulada ni firma certifica estos escenarios.
2. **E29: PWA instalada.** Registro,actualización voluntaria yoffline ya verificados; queda instalación y uso como aplicación independiente.
3. **E21: calendario de terceros.** ICS verificado con parser independiente; falta importación en una aplicación de calendario.
4. **AU11: causa original de reflow.** No reproducida; los recorridos web actuales pasan, pero no se afirma haber corregido una causa no demostrada. Conservar seguimiento Android.
5. **Dependencias.** Persisten15paquetes señalados en audit de herramientas, según alcance documentado arriba; no se resolvieron mediante cambios mayores forzados. No cambiaron dependencias de producto enE25, por lo que se conserva la auditoría previa.

El trabajo local llega hasta la entrega revisable deE32. El plan no está certificado de extremo a extremo mientras sigan estas pruebas externas. Publicar requiere autorización explícita independiente.
