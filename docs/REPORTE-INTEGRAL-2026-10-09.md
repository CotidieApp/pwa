# Revisión integral de Cotidie

Fecha: 9 de octubre de 2026. Versión local: **6.4.25**. Base Git al iniciar: `91c2633a0`, árbol limpio.

## Resultado ejecutivo

La aplicación compila y sus regresiones existentes pasan, pero **todavía hay fallas de recuperación y respaldo que conviene corregir antes de confiarle una migración de datos**. El caso más urgente es una importación estructuralmente inválida que se guarda y deja la aplicación sin poder abrir, incluso después de recargar. Hay además una discrepancia entre el respaldo presentado como completo y los datos que realmente contiene.

Se registran **17 hallazgos: 4 P1, 11 P2 y 2 P3**. No todos son errores funcionales: se distinguen defectos, riesgos, límites y optimizaciones. No se detectó ni se afirma explotación de datos del usuario. Las prioridades expresan el impacto en Cotidie, no se obtienen automáticamente de la severidad de un aviso de dependencia.

- **P1:** corregir antes de una distribución que se anuncie como segura para restaurar/migrar; atender dependencias de seguridad antes de la próxima publicación.
- **P2:** siguiente ciclo de corrección y robustez.
- **P3:** mejoras de accesibilidad, mantenimiento y experiencia.

Esta intervención es una revisión: no modifica código funcional, dependencias, versión, APK ni servicios publicados.

## Alcance y método

Se revisaron las rutas reales de montaje, ajustes, persistencia, importación/exportación, navegación, planes, audios, lectura EPUB, temporizador, calendario, notificaciones, privacidad Android y scripts de distribución. Se inspeccionaron los puntos de entrada y contratos relevantes; no se verificó individualmente cada oración, biografía, pregunta de trivia, imagen o fecha litúrgica.

La fuente autoritativa es el código local. Para las notificaciones se revisó también el parche de `scripts/patch-local-notifications.js`, no solo su resultado en `node_modules`. La evidencia física previa del 8 de octubre se conserva como histórica y no se presenta como ensayo de hoy ni certificación de la versión 6.4.25.

Las pruebas de navegador usaron Edge aislado y la exportación recién compilada en `127.0.0.1:4176`, con datos ficticios. No se accedió a los datos del teléfono, secretos de `.env`, credenciales ni servicios de publicación. El servidor y la sesión de navegador se cerraron al terminar. Auxiliares y logs: `C:\Users\balca\.codex\projects\cotidie\audit-2026-10-09`.

### Verificación ejecutada

| Comprobación | Resultado | Límite |
| --- | --- | --- |
| `npm run build`, mediante coordinador | Correcto: TypeScript previo y exportación Next completos | El mensaje de Next «Skipping validation of types» no anula el `tsc` previo del adaptador |
| Node: persistencia, privacidad, importación, EPUB, parches | **41/41** correctas | Usa dobles de IndexedDB/lector; no certifica Android |
| Java: clase real `CotidieNotificationTimeline` | **1.219 aserciones** correctas | No ejecuta AlarmManager, permisos ni entrega física |
| ESLint completo, coordinado | **2 errores y 67 advertencias**; salida 1 | Build omite lint; no confundir compilación correcta con calidad estática aprobada |
| `npm audit --omit=dev --json` | **33 paquetes afectados:** 3 críticos, 22 altos, 7 moderados, 1 bajo | Incluye herramientas declaradas como dependencias de producción; no son 33 vías explotables demostradas |
| UI: inicio, Ajustes, Información y Plan de Vida | Apertura y navegación correctas; marcado de check observado | Recorrido de humo, no toda combinación de configuración |
| UI: Nuevo Testamento | Abre iframe y contador estimado; permite salir | Cambio de tamaño produce errores repetidos, AU-11 |
| UI: importación de un respaldo mal formado | Fallo reproducido y persistente tras recarga | Solo fixture aislado; AU-01 |
| Sondas del código real | Export demasiado grande rechazado; ICS mal serializado; pérdida del slot de plan | `probes.cjs` y `probes.log` externos |
| Cuota localStorage en Edge aislado | Una cadena de 8 MiB produce `QuotaExceededError`; temporal retirado | No se midió la cuota exacta de cada WebView |

Hubo dos ajustes del instrumental: Chrome no estaba disponible y se usó Edge; el cargador TypeScript de las sondas se corrigió para priorizar `.ts` sobre un JSON homónimo. Un intento adicional de inyección de fallo de almacenamiento por CLI no produjo evidencia concluyente y **no se cuenta como prueba aprobada** de AU-07. No se relanzaron builds para esos ajustes.

## Hallazgos y correcciones propuestas

### AU-01 · P1 · Una importación mal formada puede impedir abrir la aplicación

**Estado: reproducido en UI, incluida recarga.** `validateImportPayload` limita tamaño, profundidad y claves peligrosas, pero no valida el esquema de cada objeto. `normalizeBackupState` acepta arrays de fondos, oraciones, cartas, devociones y citas sin validar sus elementos.

Un archivo con `{"userHomeBackgrounds":[null],"homeBackgroundId":"audit-missing","autoRotateBackground":false}` pasa la importación. Se guarda antes de aplicarse a React. `useHomeBackgroundRotation` busca `img.id` sobre `null` y produce `TypeError`. El navegador muestra el error global de aplicación; recargar repite el fallo porque el dato ya es durable. El ErrorBoundary de la página está dentro del proveedor y no captura ese error del proveedor.

**Ubicación:** `src/context/settings/normalize.ts:365` y `:401`; `src/context/SettingsContext.tsx:1246`; `src/context/settings/useHomeBackgroundRotation.ts:73`; `src/app/layout.tsx:63`; `src/app/page.tsx:49`.

**Corrección:** esquema completo y versionado antes de guardar; validar objetos anidados, tipos, IDs, rangos y referencias. Rechazar todo el archivo con explicación, o mostrar explícitamente qué se descarta. Añadir recuperación independiente del proveedor, con opción de volver al último estado válido sin borrar datos automáticamente.

**Aceptación:** importar nulls, campos de tipo incorrecto y referencias inexistentes no cambia el estado durable ni impide arrancar; un registro antiguo dañado permite recuperación controlada.

### AU-02 · P1 · La copia presentada como completa no recupera todos los datos

**Estado: confirmado por contrato de código.** `getBackupSnapshot` solo devuelve el snapshot de ajustes. No incluye los EPUB personales, progreso y anotaciones externos de lectura, progreso de Camino, biblioteca personal de audios ni su progreso. Estos viven en `cotidie-reading` y otras claves de almacenamiento. La importación completa anuncia «Se restauró la copia completa de la app».

**Impacto:** cambiar de dispositivo o desinstalar confiando en ese respaldo puede perder datos que el usuario esperaba recuperar. Las exclusiones explícitas de backup/transferencia Android hacen todavía más importante un respaldo propio correcto. La exclusión del examen de conciencia es deliberada y debe mantenerse separada de esta falla.

**Ubicación:** `SettingsContext.tsx:473`, `:620`, `:1330`; `src/lib/personal-epubs.ts`; `src/lib/reading-store.ts`; `src/lib/camino-progress.ts:6`; `src/components/main/spiritualAudio.ts`.

**Corrección:** definir un manifiesto de respaldo con versión, categorías incluidas/excluidas, archivos y sumas de verificación; permitir exportación de biblioteca. Hasta entonces, llamar al archivo «respaldo de ajustes y contenido de oración» y describir exclusiones antes de descargar.

**Aceptación:** restaurar en un perfil vacío un conjunto con carta, oración, plan, EPUB con anotaciones, posición de Camino y audio; comparar todos los datos respaldables, manteniendo fuera el examen.

### AU-03 · P1 · La aplicación puede exportar un respaldo que ella misma rechaza

**Estado: reproducido con normalizador y parser reales.** La exportación serializa todo el snapshot con indentación y BOM sin comprobar tamaño. La importación corta a 15 MiB. Los fondos y contenidos personales pueden crecer por encima de ese umbral; el almacenamiento privado Android admite textos mayores.

La sonda creó un estado normalizado con imagen de 16 MiB: la exportación resultó de **16.781.030 bytes** y `parseImportText` la rechazó. Es una reproducción del contrato, no una biblioteca real del usuario. Cerca del límite, incluso la indentación del JSON puede hacer que el archivo exceda el máximo.

**Ubicación:** `src/components/settings/DeveloperSettings.tsx:55`; `src/lib/import-safety.ts:1`; `src/context/settings/normalize.ts:401`; `PrivateStoragePlugin.java:139`.

**Corrección:** presupuesto coherente de extremo a extremo; validar el archivo final antes de ofrecerlo. Preferir contenedor con archivos binarios separados y límites de expansión, no aumentar el límite sin estudiar memoria.

**Aceptación:** todo respaldo que se ofrezca como válido puede reimportarse; probar justo debajo/en/encima del límite con Unicode, imágenes y BOM.

### AU-04 · P1 · Dependencias con avisos vigentes, pendiente de actualización controlada

**Estado: versiones locales y avisos confirmados; explotación en Cotidie no demostrada.** El lock contiene `@capacitor/android` y `core` 8.0.0, Next 15.5.21, epub.js 0.3.93 y xmldom 0.8.11.

- **Capacitor Android:** aviso crítico por navegación al proxy HTTP interno que puede cargar contenido en el origen de la app. El aviso requiere activar un enlace dentro de WebView. Cotidie elimina INTERNET en su manifiesto fuente, lo que limita la ruta remota descrita; no se debe concluir que el APK está comprometido. Actualizar a una versión corregida compatible y reconstruir el artefacto. [Aviso oficial de Ionic](https://github.com/ionic-team/capacitor/security/advisories/GHSA-rvm3-566m-v7fv).
- **Next:** el audit propone 15.5.27. Uno de los avisos críticos afecta servidores Windows. El APK contiene una exportación estática y tiene `images.unoptimized`; no equivale a ejecutar un servidor Next vulnerable. Sí revisar `server.js` y cualquier uso del servidor de desarrollo accesible por red. [Aviso oficial de Next](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36).
- **EPUB/XML y herramientas:** el informe incluye xmldom, tar y cadenas de Workbox/Babel/PostCSS. Analizar qué código llega realmente al navegador, qué procesa entradas no confiables y qué solo corre durante build.

**Corrección:** actualizar por familias, conservar/revalidar parches nativos y lector. No aplicar `npm audit fix --force` a ciegas: el resultado propone cambios mayores e incluso next-pwa 6.1.0 frente a la rama 10 actual. Las versiones corregidas deben volver a verificarse al ejecutar la actualización.

**Aceptación:** nuevo audit con justificación por aviso restante, regresiones web/Java, APK firmado y prueba de funciones nativas/EPUB. El JSON íntegro de esta consulta queda en `audit-prod.json` externo.

### AU-05 · P2 · Los audios aceptan 25 MiB pero se almacenan como texto en localStorage

**Estado: diseño confirmado y límite reproducido en Edge.** La subida admite hasta 25 MiB, los convierte a data URI y los escribe en localStorage. Base64 incrementa el tamaño aproximadamente un tercio. El almacenamiento es síncrono y comparte cuota con otras claves.

**Ubicación:** `src/components/main/spiritualAudio.ts:27`; `src/components/main/MainApp.tsx:420` y `:449`. MDN documenta una cuota de localStorage muy inferior al tamaño aceptado y la excepción de cuota. [Cuotas de almacenamiento](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

**Corrección:** binarios en IndexedDB/Filesystem, índice pequeño transaccional, URL temporal de reproducción y migración con verificación antes de borrar. Informar espacio disponible y fallo específico; evitar leer archivos grandes completos en el hilo principal.

**Aceptación:** importar/reproducir/renombrar/eliminar un audio de 20–25 MiB en web y Android; simular cuota agotada sin dejar índice o archivo huérfano.

### AU-06 · P2 · Reproductor y progreso no cubren fallos ni cierre en segundo plano

**Estado: confirmado por código; falta ensayo con interrupción real de audio.** `AudioPlayer` cambia el botón a pausa sin esperar `audio.play()` ni capturar rechazo, y no sincroniza con eventos `play`, `pause` y `error`. Puede indicar reproducción cuando el medio falla. El guardado de progreso en MainApp se llama al navegar/cambiar audio, sin checkpoint específico de `pagehide` o background.

Además, el efecto de AudioPlayer resetea tiempo/duración/estado si cambia `initialTime`, aunque `src` siga igual; conviene separar restauración del recurso y actualizaciones del progreso.

**Ubicación:** `AudioPlayer.tsx:25–82`; `MainApp.tsx:401–418` y llamadas a `persistActiveSpiritualAudioProgress`.

**Corrección:** estado derivado de eventos del medio, promesa de play gestionada, guardado acotado en pausa/background/cierre y captura de errores de almacenamiento.

**Aceptación:** medio inválido, play rechazado, pausa externa, cambio de pista y cierre forzado no muestran estados falsos; al reabrir se recupera el último checkpoint confirmado.

### AU-07 · P2 · Un fallo de lectura inicial carece de recuperación persistente

**Corrección de la interpretación original:** al fallar `migratePrivate`, el contexto público exponía `isLoaded` solo; la combinación con `storageReady` correspondía al planificador. El problema era mostrar valores por defecto sin guardado ni recuperación persistente, no un splash necesariamente permanente. La nueva pantalla StorageRecovery conserva los datos y permite reintentar/importar. Comprobado en Edge aislado con configuración cifrada sintética inválida y recuperación por .ctd; fallo criptográfico nativo pendiente de prueba física.

**Ubicación:** `SettingsContext.tsx:625–667`, `:2082`; `src/app/page.tsx:46`.

**Corrección:** estado explícito `loading/ready/error`, reintento seguro y recuperación sin sobrescribir datos por defecto. El bloqueo del autoguardado tras fallo de carga es correcto y debe conservarse.

**Aceptación:** IndexedDB bloqueado, clave no disponible o descifrado fallido muestran un error accionable; el almacenamiento original no se modifica.

### AU-08 · P2 · El reinicio completo puede quedar parcialmente aplicado

**Estado: confirmado por secuencia de código; fallo parcial no inducido en Android.** `hardResetApp` borra ajustes y notas antes de completar notificaciones y base de lectura. Si una etapa posterior falla, no hay rollback; `storageReady` queda false y el usuario recibe una indicación que atribuye el problema a lectores abiertos aunque pueda venir de otra etapa.

**Ubicación:** `SettingsContext.tsx:1137–1165`.

**Corrección:** prevalidar recursos, marcar duraderamente un reinicio en curso y hacerlo reanudable/idempotente, con pantalla independiente del estado normal. Informar qué etapa falló y no prometer conservación de datos ya eliminados.

**Aceptación:** inducir error en cada etapa y reabrir: o bien no comenzó el borrado o bien se puede completar de forma explícita y consistente.

### AU-09 · P2 · Restaurar navegación de un plan pierde el slot

**Estado: reproducido en la función real.** `normalizeNavState` admite `activeView: 'customPlan'` pero no conserva `selectedCustomPlanSlot`; hereda null del estado inicial. El render de esa vista devuelve null si no hay slot. La sonda restauró un plan 3 y obtuvo slot null.

**Ubicación:** `src/components/main/navigation.ts:50–90`; `MainApp.tsx:1045–1047`.

**Corrección:** conservar y validar slot y existencia del plan; si falta, regresar a una vista válida. Definir también qué continuidad se espera de sessionStorage tras cierre completo del proceso, sin prometerla solo por persistir allí.

**Aceptación:** abrir plan 1–4, pasar a segundo plano y recargar conserva una vista válida; eliminar el plan antes de restaurar conduce al inicio con explicación.

### AU-10 · P2 · El archivo ICS no escapa saltos de línea ni pliega líneas largas

**Estado: reproducido en el generador.** `description` concatena saltos LF reales; solo escapa comas y punto y coma. La exportación anual produce **366 descripciones con LF sin escapar** y **372 líneas de más de 75 octetos sin plegado**. Los saltos de texto deben representarse como `\n`; también deben escaparse las barras inversas. El plegado es una recomendación de interoperabilidad del estándar, no una razón para afirmar que todo importador rechazará el archivo.

**Ubicación:** `src/lib/ics-generator.ts:57–74`. [RFC 5545, secciones 3.1 y 3.3.11](https://www.rfc-editor.org/rfc/rfc5545).

**Corrección:** serializador ICS probado con escape TEXT, CRLF y plegado por octetos UTF-8. Validar 29 de febrero en años no bisiestos sin asumir que los 366 registros siempre forman fechas válidas para el año de exportación.

**Aceptación:** un parser independiente y al menos un calendario real recuperan títulos, biografías, recurrencias y acentos sin truncar ni crear propiedades espurias.

### AU-11 · P2 · Errores repetidos de ResizeObserver al aumentar letra en EPUB

**Estado: observado en la exportación de producción.** Inicio → Plan de Vida → Nuevo Testamento → Leer sin descargar → aumentar tamaño una vez → volver. Se registraron al menos **47 mensajes** `ResizeObserver loop completed with undelivered notifications`. La navegación de salida funcionó; no se demostró pérdida del pasaje ni bloqueo permanente.

**Ubicación a investigar:** `EpubReader.tsx:620–697`, controlador de reflow y `src/app/page.tsx:25–35`, que registra ese ruido en producción.

**Corrección:** perfilar la causa antes de cambiar la lógica: observadores internos de epub.js, escrituras de dimensiones durante notificación, repetición de reflow y diferencias de redondeo. Coalescer cambios y evitar ciclos. No ocultar indiscriminadamente todos los errores para dar la prueba por resuelta.

**Aceptación:** tamaños y orientación repetidos conservan el pasaje y no producen tormentas de callbacks/errores; medir en WebView real además de Edge.

### AU-12 · P2 · El control de lint falla y no bloquea build

**Estado: ejecutado.** Los dos errores corresponden a `react-hooks/immutability` en `usePrayerTimer.ts:36–37`. Hay 23 advertencias de dependencias de hooks, 20 de memoización, 13 de setState en efectos, 10 de entidades y 1 de CSS. No todos los avisos implican fallos visibles; requieren triage.

**Ubicación:** `eslint.config.mjs`, `next.config.mjs`, `scripts/build-controlled.mjs`, `src/hooks/usePrayerTimer.ts`.

**Corrección:** resolver o justificar específicamente los errores; priorizar dependencias de efectos que puedan alterar lifecycle. Alinear conscientemente ESLint/Next (config 16 frente a runtime 15) y añadir lint al control previo de release, secuencial bajo coordinador.

**Aceptación:** lint sale 0; excepciones mínimas documentadas; build, tipos y pruebas siguen pasando.

### AU-13 · P2 · Optimización: el temporizador provoca guardado del snapshot completo

**Estado: confirmado por dependencias del código; costo no medido en dispositivo.** El timer actualiza `timerTime` aproximadamente cada segundo; ese campo participa en `backupSnapshot`, que activa `saveState`. Cada guardado serializa y cifra también ajustes y contenido. En Android la escritura privada incluye sincronización y relectura del archivo. La cola ordena, pero no combina estados intermedios.

**Ubicación:** `usePrayerTimer.ts:83–96`; `SettingsContext.tsx:473–618`, `:674–677`; `private-storage.ts:49`; `PrivateStoragePlugin.java:143–158`.

**Impacto posible:** trabajo, escrituras y cola innecesarios con bibliotecas de imágenes grandes. No se cuantifica batería o latencia sin perfilado.

**Corrección:** separar estado volátil del durable; persistir deadline/transiciones y checkpoints acotados, conservar el contrato de recuperación nativo y combinar snapshots pendientes obsoletos sin perder commits importantes.

**Aceptación:** contador fluido, escrituras acotadas y medidas durante 15 minutos; pausa/background/muerte de proceso mantienen las garantías previas.

### AU-14 · P2 · La exportación deja una copia legible en caché nativa

**Estado: confirmado por código.** `handleExport` escribe el `.ctd` sin cifrar en `Directory.Cache` y lo comparte. No se ve una limpieza de esos archivos propia de este flujo. La exclusión del backup del sistema no elimina la copia local ni las copias que el usuario comparta.

**Ubicación:** `src/components/settings/DeveloperSettings.tsx:55–94`.

**Corrección:** informar que el respaldo contiene datos personales; ofrecer cifrado portable con contraseña y política de caducidad/limpieza de temporales. No borrar inmediatamente si el receptor aún necesita leer el URI.

**Aceptación:** exportar, cancelar y compartir cumplen la política de conservación declarada; nunca incluyen el examen ni secretos de desarrollo.

### AU-15 · P2 · Mejora operativa: compilar APK puede publicar y añadir cambios ajenos

**Estado: confirmado, no ejecutado.** `android:apk` aumenta versión y puede copiar/publicar por defecto. El script usa `git add -A -- .`, commit y push, con riesgo de incorporar modificaciones del árbol no relacionadas con el artefacto. Está documentado parcialmente, pero el nombre del comando invita a interpretarlo como una compilación local.

**Ubicación:** `scripts/android-apk.mjs:12–14`, `:470–483`, `:579–608`; `package.json`.

**Corrección:** separar `build`, empaquetado y publicación; hacer publicación explícita y comprobar árbol/archivos previstos. Mantener la posibilidad de publicación autorizada. Corregir también `docs/RELEASE-CHECKLIST.md`, que pide Java 25, mientras README y selector del script usan Java 21.

**Aceptación:** el comando de build no modifica versión ni hace push/copia externa; release muestra lista exacta y deja evidencia de versión, firma y hash. No publicar para validar esta separación.

### AU-16 · P3 · Accesibilidad y comunicación de capacidades

**Estado: observaciones de código y snapshot, sin auditoría con lector de pantalla.** El viewport prohíbe zoom del navegador; los controles de AudioPlayer carecen de nombre accesible explícito; algunas categorías se exponen como encabezados clicables y ciertos checks aparecen sin nombre en el árbol accesible. El zoom interno del texto no resuelve necesariamente controles y menús.

**Ubicación:** `src/app/layout.tsx:47–50`, `src/components/AudioPlayer.tsx:136–178`, `CategoryList.tsx`, `PrayerList.tsx`. La planificación local de notificaciones sale inmediatamente en web: no prometer equivalencia total entre Android y PWA.

**Corrección:** nombres accesibles, elementos semánticos con teclado, foco, contraste y tamaños de toque; permitir ampliación donde sea viable. Mostrar claramente qué depende de Android y qué es solo configuración web.

**Aceptación:** recorrer inicio, plan, lector, audio y ajustes con teclado/TalkBack y ampliación, sin perder controles ni contexto.

### AU-17 · P3 · Mantenimiento, pruebas reproducibles y durabilidad PWA

**Estado: oportunidad de mejora.** SettingsContext y MainApp concentran miles de líneas y muchos dominios; no existe un script `test` en package.json y la batería requiere `fake-indexeddb` externo. Una prueba de credenciales depende de un blob Git histórico: un checkout superficial o fuente sin historial puede no ejecutarla. La revisión anterior se centraba en funciones sensibles y dejó sin cobertura los contratos de audio/ICS/respaldo completo.

No se encontró uso de `navigator.storage.persist()`/`estimate()` para informar durabilidad/cuota PWA. El navegador conserva datos bajo sus políticas; pedir persistencia puede ayudar, pero no sustituye un respaldo. [Políticas de almacenamiento](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

**Corrección:** extraer por dominios con pruebas de contratos, no reescritura general; agregar una entrada reproducible de pruebas que mantenga auxiliares fuera del repositorio según las reglas del proyecto. Sustituir dependencia de credenciales históricas por fixtures seguros. Añadir estado de almacenamiento, versión de datos y política de actualización PWA.

**Aceptación:** otro equipo puede correr las pruebas sin secretos ni historial completo; existen regresiones de AU-01/03/09/10 y recorridos de restauración completa.

## Protección y comportamiento que conviene conservar

- Guardados privados serializados, comparación de revisión y confirmación durable; una falla de carga no activa el autoguardado de defaults.
- AES-GCM, claves web no extraíbles y almacenamiento nativo con Keystore/noBackupFilesDir; esto no convierte al código ejecutado en el mismo origen en un adversario aislado.
- Privilegios/trazas fuera del respaldo ordinario, control de tamaño/profundidad y rechazo de claves de contaminación de prototipos.
- EPUB con presupuesto de expansión y borrado coordinado de binario/progreso; restauración por ancla semántica, no por número de página.
- En el código de epub.js inspeccionado, scripts del iframe deshabilitados por defecto; en los formateadores de texto revisados, escape HTML previo al formato. No se acreditó una inyección de scripts en esas rutas.
- Planificador persistente, ledger de entrega, agrupación de atrasos y pruebas de medianoche/DST; no reemplazarlo por timers de JavaScript.
- Android sin permiso INTERNET en la fuente y depuración WebView condicionada a debug. Debe comprobarse siempre el manifiesto fusionado y el APK final.

## Cobertura funcional y pruebas aún necesarias

| Área | Evidencia disponible en esta revisión | Próxima prueba de aceptación |
| --- | --- | --- |
| Inicio/navegación/ajustes | Código y recorrido web | Error de almacenamiento y recuperación; plan restaurado; atrás Android |
| Oraciones, cartas, devociones, planes | Revisión de composición/importación; plan web | Crear/editar/borrar, IDs duplicados y restauración cruzada |
| Examen privado | 41 pruebas incluyen privacidad; revisión de almacenamiento | Keystore, borrado/caducidad y transferencia física; no reutilizar notas reales |
| Audios | Código, cuota web y puntos de guardado | Medio grande, audio focus, bloqueo, kill, error de decodificación |
| EPUB/Camino | Regresiones, NT web y reflow observado | EPUB personal, anotaciones, orientación, varios spine, cierre y Android |
| Calendario/estadísticas/santoral | Generador ICS, reglas y pruebas temporales del scheduler | Medianoche/corte 05:00, año nuevo, años bisiestos, coherencia widget/web |
| Temporizador | Regresiones y lifecycle revisado | Android 7, HOME, bloqueo, muerte de proceso y reinicio; medir escrituras |
| Notificaciones | 1.219 aserciones y 5 pruebas de parche dentro de las 41 | Revocar permisos/canal, reiniciar, reposo profundo y otros fabricantes |
| Widgets | Código de integración y configuración Android | Widget pequeño/grande, medianoche, reinicio y cambio horario físico |
| PWA/offline/actualización | Build correcto; fuentes locales | Instalar en origen de prueba adecuado, desconectar y recargar shell; actualización sin pérdida de datos |
| APK/distribución | Scripts y configuración revisados | Build release sin publicación, firma/manifiesto/assets y upgrade conservando datos |
| Contenido religioso/trivia | No se auditó exactitud editorial completa | Muestreo y revisión por fuentes autorizadas como trabajo específico |

El origen localhost desregistra intencionalmente service workers desde el layout; por eso estos recorridos **no certifican una PWA instalada ni su arranque offline**. La plataforma principal es Android; no se certifica iOS.

## Orden de trabajo recomendado

1. **Integridad y recuperación:** AU-01, AU-07 y AU-08; añadir pruebas de datos inválidos y arranque dañado antes de tocar migraciones.
2. **Respaldo verificable:** AU-02, AU-03 y AU-14; fijar primero qué se incluye, luego probar ida/vuelta en perfil limpio.
3. **Seguridad de dependencias:** AU-04 por familias; validar los parches nativos antes de generar un candidato.
4. **Fallas funcionales acotadas:** AU-05/06, AU-09 y AU-10; cada una con reproducción y regresión propia.
5. **Rendimiento y calidad:** AU-11/12/13; medir en dispositivo y conservar la semántica de lectura/timer.
6. **Salida a distribución:** AU-15 y matriz física/PWA. Incorporar AU-16/17 progresivamente.

No se necesita una reescritura general para resolver los primeros hitos. La revisión queda terminada; las correcciones y la certificación física indicadas quedan pendientes.
