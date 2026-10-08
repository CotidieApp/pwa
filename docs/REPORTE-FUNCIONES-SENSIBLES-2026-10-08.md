# Revisión de funciones sensibles de Cotidie

Fecha: 8 de octubre de 2026. Alcance: código web/Android del árbol local, datos personales, importación, persistencia, borrado, permisos, recordatorios y lectura. Se conservaron los cambios previos del planificador nativo. No se examinó una versión publicada ni se realizaron ataques sobre datos del usuario.

## Resultado y prioridades

Actualización de soluciones (8/10/2026): FS-01 a FS-09 tienen correcciones implementadas en la fuente local. La tabla original y las reproducciones siguientes describen el estado anterior; la verificación y los límites actuales figuran al final.

P1: resolver antes de considerar robusta la protección o durabilidad afectada. P2: siguiente ronda funcional. Son hallazgos de código y límites de diseño; no se afirma explotación remota.

| ID | Prioridad | Hallazgo | Consecuencia |
| --- | --- | --- | --- |
| FS-01 | P1 | Modo desarrollador restaurable desde datos; credenciales en el cliente | La pantalla de acceso no constituye una barrera de autorización |
| FS-02 | P1 | Depuración WebView habilitada sin distinguir release | Un depurador con acceso al dispositivo puede inspeccionar datos y ejecutar código |
| FS-03 | P1 | Información íntima sin cifrado propio ni exclusión explícita de respaldo Android | Borrado lógico y exclusión del export no certifican ausencia de copias del sistema |
| FS-04 | P1 | Guardado de ajustes sin esperar commit; errores de apertura silenciados | Puede mostrarse éxito sin datos durables |
| FS-05 | P2 | Límites de archivos desiguales; expansión EPUB y píxeles sin presupuesto | Archivos grandes pueden agotar memoria o bloquear la interfaz |
| FS-06 | P2 | Borrado EPUB conserva progreso y anotaciones | Quedan datos personales huérfanos |
| FS-07 | P2 | Mezcla de días UTC, locales y pastorales | Citas, actividad y checks pueden atribuirse a fechas diferentes |
| FS-08 | P2 | Planificador nativo no devuelve programación efectiva | Revocación de permisos o fallo de agenda no quedan certificados por la respuesta |
| FS-09 | P2 | Límites del temporizador ante muerte del proceso y Android 7 | No recupera la sesión; en API 24/25 la retirada automática depende del proceso |

## Evidencia, solución y aceptación

### FS-01 — Acceso de desarrollador

Evidencia: `src/lib/dev-credentials.ts` contiene las credenciales consumidas por `loginAsDeveloper` en `src/context/SettingsContext.tsx`. `applyBackupSnapshot` aplica `isDeveloperMode` e `isEditModeEnabled`; importación completa y parcial usan ese método y los respaldos incluyen los indicadores. No se reproducen credenciales en este reporte.

Solución: decidir si es una herramienta local del propietario o una función restringida. Para la primera opción, habilitarla solo en builds de desarrollo o mediante una opción local explícita. Para la segunda, usar autorización verificable. Excluir indicadores de privilegio de importaciones y exportaciones ordinarias.

Aceptación: importar datos completos/parciales con ambos indicadores en `true` no activa privilegios; el cliente distribuido no contiene una contraseña reutilizable destinada a autenticar al desarrollador.

Reproducción local: un `.ctd` ficticio con `isDeveloperMode: true` mostró el botón del panel y permitió abrirlo sin pasar por la pantalla de credenciales. Solo se utilizó el origen local de validación, sin datos del usuario.

### FS-02 — Depuración Android

Evidencia: `capacitor.config.ts` configura `android.webContentsDebuggingEnabled: true` sin condición de build. No se certificó el valor en el APK release publicado. El riesgo exige acceso de depuración al dispositivo; no se demostró acceso remoto.

Solución: limitar depuración a debug y verificar el artefacto release empaquetado.

Aceptación: APK debug inspeccionable; WebView del APK release inaccesible al depurador remoto y manifiesto release sin `debuggable`.

### FS-03 — Privacidad, respaldos y borrado

Evidencia: `saveState` guarda cartas, oraciones y ajustes en IndexedDB y localStorage sin cifrado propio. El nuevo examen usa claves separadas en `src/lib/confession-notebook.ts`, fuera del respaldo de Cotidie y de las trazas. Listo elimina su clave de forma síncrona y no tiene una cola que la restaure. El manifiesto tiene `android:allowBackup="true"`, sin política explícita `dataExtractionRules`/`fullBackupContent` para estos datos.

La caducidad se comprueba mientras la app está abierta y al volver a abrirla, antes de mostrar la nota. Con el proceso cerrado, no existe un servicio que retire físicamente sus bytes a las 24 horas. Eliminar una clave tampoco equivale a borrado forense de flash o de respaldos anteriores. La exclusión del export de Cotidie no demuestra exclusión del respaldo/transferencia del sistema.

Solución: definir datos respaldables, establecer exclusiones Android y probar restauración y transferencia. Para el examen, estudiar almacenamiento nativo en `noBackupFilesDir` y cifrado con clave en Android Keystore; valorar protección de pantalla. En PWA, documentar una política propia sin prometer ejecución con el navegador cerrado. Verificar configuración por versión Android y fabricante conforme a la [documentación de Auto Backup](https://developer.android.com/identity/data/autobackup).

Aceptación: Listo, cierre, restauración y transferencia no recuperan un examen borrado; una nota vencida no aparece al abrir. Exports, diagnósticos y pantallas de depuración no contienen su texto.

### FS-04 — Durabilidad de ajustes

Evidencia: `src/lib/persistence.ts` resuelve escritura/eliminación en el éxito de la solicitud, antes del commit. Los errores al abrir la base se capturan y convierten en una resolución sin error; `dbPromise` puede conservar una promesa rechazada. `saveState` no espera confirmación y la importación informa aplicada al actualizar React. Al cargar se prioriza IndexedDB, incluso si un fallo durable dejó ese estado más antiguo que el espejo.

Solución: adoptar el contrato de `src/lib/reading-store.ts`: resolver en `transaction.oncomplete`, propagar abortos, ordenar escrituras y comparar revisiones. Reiniciar aperturas rechazadas recuperables; mostrar el estado de guardado y confirmar importaciones durables antes de informar éxito.

Aceptación: cuota agotada, apertura rechazada, aborto después de `put.onsuccess`, escrituras consecutivas y cierre inmediato no producen falso éxito ni recuperan una revisión antigua como nueva.

### FS-05 — Archivos e importación

Evidencia: `DeveloperSettings.handleFileImport` lee todo con `FileReader` sin límite previo. Android limita archivos compartidos a 15 MiB. `PersonalEpubLibrary` limita el EPUB comprimido a 25 MiB, sin comprobar expansión/número de entradas antes de epub.js. `getCroppedImg` crea un canvas del tamaño original sin presupuesto de píxeles. No se demostró ejecución de scripts EPUB.

Solución: unificar límites web/Android, limitar texto/estructuras, validar ZIP/EPUB y presupuesto de descompresión, y reducir imágenes antes del canvas. Conservar datos previos ante fallos.

Aceptación: rechazar archivos excesivos antes de leerlos por completo; expansión o imagen excesivas generan un error visible sin bloquear ni borrar datos. Cubrir cancelación y falta de espacio.

### FS-06 — Eliminación completa de un EPUB

Evidencia: `deletePersonalEpub` en `src/lib/personal-epubs.ts` elimina el binario en `books` y su copia heredada, sin borrar el progreso de `personal-${id}.epub` ni las claves de marcadores/subrayados de `EpubReader`. El índice de biblioteca se actualiza por separado.

Solución: centralizar eliminación de binario, metadatos, espejos, progreso y anotaciones. Esperar cierre/cola del controlador antes del borrado para impedir checkpoints tardíos; permitir reintentar fallos parciales.

Aceptación: después de crear y eliminar un libro con marcador, subrayado con nota y progreso, no queda ningún registro asociado ni reaparece por escrituras tardías. Un fallo deja una situación recuperable.

### FS-07 — Consistencia del día

Evidencia: actividad y cita diaria en `SettingsContext` usan `toISOString().slice(0, 10)`; checks y calendario usan día pastoral. UTC puede adelantarse respecto de Santiago durante la tarde/noche.

Solución: definir día civil/pastoral por función y usar sus helpers consistentemente. No inventar fechas históricas al migrar registros cuya fecha real no pueda reconstruirse.

Aceptación: probar tarde, medianoche, cambio de día pastoral, zona y horario de verano; cada función sigue el contrato definido.

### FS-08 — Estado efectivo de recordatorios

Evidencia: `CotidieNotificationSchedulerPlugin.replaceSchedule` guarda reglas, llama `scheduleNext` y resuelve sin informar la próxima alarma. `scheduleNext` cancela la alarma anterior y retorna si falta permiso exacto. El hook web sí comprueba permisos y ofrece ajustes, pero no certifica programación desde un receptor de arranque o tras una revocación.

Solución: devolver estado efectivo, próxima entrega y motivo de bloqueo. Al volver a primer plano, distinguir configurado/programado/sin permiso y conservar reglas sin duplicar entregas.

Aceptación: revocar/devolver permisos, reiniciar y actualizar; verificar siguiente alarma y entregas físicas sin duplicados. Sin permiso no debe mostrarse programado.

### FS-09 — Sesión del temporizador

Evidencia: la cuenta usa un plazo y consulta `SystemClock.elapsedRealtime` al volver de suspensión en Android. Su notificación usa el cronómetro del sistema y se retira en primer plano. Al reiniciar la app se restaura detenido, conforme al requisito de no iniciarlo automáticamente; el plazo nativo no se persiste entre procesos. `setTimeoutAfter` retira la notificación mediante el sistema desde API 26; API 24/25 depende del callback del proceso. Referencia: [Notification.Builder](https://developer.android.com/reference/android/app/Notification.Builder#setTimeoutAfter(long)).

Solución: decidir si una sesión iniciada explícitamente debe sobrevivir a muerte del proceso; si se requiere, mantener estado nativo verificable separado de la opción de mostrar el temporizador. Valorar una alarma de retirada para API 24/25 o declarar ese límite.

Aceptación: inicio explícito, HOME, bloqueo prolongado, regreso, pausa, edición, fin y muerte del proceso. Sin notificación en primer plano ni inicio al habilitar/importar ajustes.

## Correcciones aplicadas

| ID | Solución implementada | Límite de la certificación |
| --- | --- | --- |
| FS-01 | Acceso local explícito con los mismos usuarios/contraseñas, verificados mediante PBKDF2 con sal; export/import excluyen privilegios, pruebas y trazas. La sesión local vigente se conserva al importar. | Herramienta local del propietario; un cliente modificable no sustituye autorización de un servidor. No se agregó un servicio ni una contraseña nueva. |
| FS-02 | Configuración Capacitor sin depuración; Android la habilita únicamente cuando la app tiene `FLAG_DEBUGGABLE`. | Revisar el artefacto release y depuración USB en dispositivo antes de publicar. |
| FS-03 | Ajustes/cartas/oraciones y examen cifrados con AES-GCM. Android: claves por registro en Keystore y archivos atómicos en `noBackupFilesDir`. PWA: claves no extraíbles en IndexedDB. Migración comprobada antes de retirar copias antiguas. Exclusiones de copia/transferencia Android. Listo elimina registro y clave. Caducidad autenticada, comprobada antes de descifrar, y alarma nativa de retirada. | Los `.ctd` exportados siguen siendo legibles y deben protegerse como documentos personales. Un navegador cerrado no ejecuta borrados: comprueba caducidad antes de mostrar al abrir. Android puede retrasar alarmas sin permiso exacto. Sin promesa de borrado forense ni revocación de copias antiguas. El cifrado web no protege de código malicioso en el mismo origen. |
| FS-04 | Resolución en commit, errores propagados y apertura recuperable. Un registro cifrado autoritativo, colas y revisión comparada atómicamente frente a ventanas obsoletas. Una carga fallida bloquea el autoguardado de valores por defecto. Importación aplicada a la UI solo tras guardar. | Garantiza el último commit confirmado, no una escritura interrumpida por cierre abrupto. |
| FS-05 | Respaldo limitado a 15 MiB en todas las entradas, estructura acotada y sin claves de contaminación de prototipos. EPUB: 25 MiB comprimidos, 4096 entradas, 32 MiB por entrada y 150 MiB expandidos; nombres/rangos/bytes reales inspeccionados mediante bloques. Recorte directo con salida máxima de 2048 px y límite de imagen de 80 MP. | Archivos que excedan presupuestos se rechazan. Los límites evitan expansión/canvas sin presupuesto; no prometen que cualquier archivo quepa en un dispositivo con poca RAM. |
| FS-06 | Binario/progreso eliminados en una transacción. Marcador durable bloquea migraciones y checkpoints tardíos. Limpieza de progreso heredado, espejo, marcadores, subrayados e índice antiguo. Fallos de limpieza reintentables sin recrear el libro. | No borra sectores físicos; verificar cuota/recarga y varias ventanas en dispositivos reales. |
| FS-07 | Cita y actividad usan fecha civil local; checks/estadísticas pastorales conservan el corte a las 05:00. | Los registros históricos no se reinterpretan. |
| FS-08 | Plugin devuelve estado, próxima alarma aceptada y motivo de bloqueo; revisa al volver al primer plano. Reconfigurar conserva entregas diarias; permisos/canal bloqueados no consumen eventos. Publicación fallida no se marca entregada. Sincronización serializada y descartada si quedó obsoleta. | Confirma aceptación de agenda/permisos observados, no entrega física futura. Pendiente revocación/reinicio/fabricantes. Un cierre entre publicación y commit puede reintentar el mismo ID, sin garantía de entrega exactamente una vez. |
| FS-09 | Plazo nativo persistido con reloj monotónico y número de arranque. Tras muerte del proceso recupera el restante en pausa o informa el fin: no inicia al habilitar/abrir/importar. Alarma independiente de retirada también en API 24/25, protegida de alarmas viejas. | Probar HOME, bloqueo, muerte del proceso y Android 7. No recupera una cuenta activa a través de reinicio del dispositivo. |

Hallazgos adicionales corregidos sin cambiar los flujos normales:

- FS-10: las trazas de importación guardaban un fragmento del JSON y podían registrar contenido desde errores del parser. Ahora guardan tamaño/motivo genérico y no se exportan.
- FS-11: el reinicio completo borraba solo localStorage. Ahora espera retirada de ajustes/examen cifrados, datos EPUB, recordatorios y acciones pendientes antes de recargar; notifica fallos.
- FS-12: la búsqueda construía una expresión regular con texto del usuario. Ahora compara el prefijo literal, conservando resultados ordinarios y evitando errores/bloqueos con metacaracteres.

## Verificación y límites actuales

Las verificaciones finales están en `AGENTS-history.md` y `tests/READING-VALIDATION.md`. Las correcciones están implementadas; la certificación física Android, de transferencia/backup y PWA instalada permanece pendiente.

La revisión se apoya en código y regresiones. No se imprimieron secretos ni datos del usuario. Backup/transferencia, permisos, bloqueo y muerte del proceso necesitan un dispositivo de prueba. Compilación y recorridos de esta intervención se registran en `AGENTS-history.md` y la caché del proyecto. El total EPUB permanece estimado para capítulos no visitados; se señala en pantalla y no interviene en la restauración del pasaje.
