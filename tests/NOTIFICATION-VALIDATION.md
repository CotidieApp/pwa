# Notificaciones Android — regresiones y certificación

Intervención: 2026-10-08, sobre Cotidie 6.4.24 (`080042a3a`). Nubia Air, Android 15: recuperación USB completada y APK original verificado restaurado, con datos conservados. Con «Ejecución en segundo plano → Permitir», autorizado por el usuario, pasaron entrega fechada/diaria, tres intervalos dev con pantalla apagada, imágenes y recuperación sin ráfagas. Agenda y energía restauradas; pruebas retiradas. Sin publicación.

## Política Nubia y control físico

- Panel real: Información de aplicaciones → Cotidie → Uso de batería en la app → Optimización de la batería. Abre `com.zte.powersavemode/.appsmartoptimizer.AppSmartOptimizeDetailActivity`, una política distinta de la lista Android de exenciones Doze.
- Autoinicio, inicio relacionado y ejecución en segundo plano estaban en «Automático». Su diálogo explica optimización según tipo/uso. Usuario autorizó probar «Permitir» solo en ejecución en segundo plano y conservarlo si resolvía el fallo; otras opciones siguen en «Automático».
- Controles con diario o dos eventos fechados: alarma presente diez segundos antes del horario, sin aviso posterior y con evento/regla aún pendiente en almacenamiento. Estado `scheduled` certifica aceptación de la programación, no entrega futura frente a políticas del fabricante.
- Prioridad de recepción, identidad de token por ocurrencia y exención Doze temporal no corrigieron el control. Cambios experimentales de código y alarmas retirados; exención temporal eliminada. APK instalado confirmado por SHA256 `F39969E5B234A8C106F52E51F1497FE7F411012401128C53B4C701FC4374C4F2`, igual al probado originalmente. Artefacto de build regenerado desde la fuente final restaurada.
- Con ejecución en segundo plano «Permitir», dos avisos fechados con pantalla apagada y proceso inicial cerrado: primera entrega en188ms, segunda en37ms. Tras la segunda, agenda vacía efectiva; el mismo control fallaba con «Automático». Se conserva el ajuste autorizado; Autoinicio e Inicio relacionado siguen en Automático.
- La exención Android añadida temporalmente por shell se retiró antes de cambiar la política Nubia. Al cierre se observó una exención Android presente con «Permitir», sin volver a añadirla por shell; se conserva el estado asociado al ajuste autorizado. No se aisló el mecanismo interno del fabricante.
- No se extrapola a reposo profundo, reinicio, permisos revocados ni otros fabricantes. Evidencia y auxiliares locales: WC-011; no se guardaron textos privados de la agenda en el equipo.

### Resultado final en el dispositivo

- `cold-20261008-215248`: observación externa durante 904 segundos, pantalla apagada sin nuevo despertar y proceso inicialmente cerrado. Aviso fechado publicado +170 ms; diario +36 ms. Tres dev a las 21:55, 22:00 y 22:05 (Chile), publicados +38, +50 y +40 ms respectivamente. Una sola tarjeta dev; imagen real BigPictureStyle de 400 × 300 en dev y fechado, y diario sin imagen según configuración.
- La fase de entrega e imagen pasó. El ejecutor combinado falló después al esperar una recuperación artificial dentro de la instrumentación residente; no se declara aprobado ese ejecutor completo. Se separó exclusivamente esa comprobación para que la instrumentación terminara antes de la alarma.
- `recovery-20261008-221605`: doce intervalos dev atrasados produjeron una tarjeta y un registro de entrega; todas las reglas avanzaron. Diez reanudaciones conservaron la próxima alarma y el mismo `mUpdateTimeMs`, sin nueva publicación. Una segunda prueba entregó una notificación real sin bitmap ni BigPictureStyle al desactivar imagen. Ambas comprobaciones pasaron.
- Restauración verificada: agenda y expiraciones originales, respaldos privados eliminados, paquete de pruebas ausente, USB cargando, simulación de batería retirada y `mForceIdle=false`. Sin sesiones activas; teléfono libre para uso/desconexión. El APK instalado conserva el SHA256 indicado arriba.

## Causas y correcciones

1. **Imagen perdida:** el planificador persistente publica mediante `LocalNotificationManager`, cuya ruta inmediata buscaba `largeIcon` aunque el calendario enviaba `extra.imageDrawable`. El parche autoritativo en `scripts/patch-local-notifications.js` ahora decodifica ese drawable y construye `BigPictureStyle`; conserva la ruta del receptor antiguo. Bitmap limitado a 512 px, sin escalado por densidad y en RGB565. La imagen se comprueba en la notificación expandida, pues el aspecto compacto depende de Android.
2. **Ráfaga al despertar:** el cálculo anterior trataba como pendientes todos los minutos dev anteriores de la hora, sin comprobar que cada ocurrencia hubiera estado programada. Ahora cada regla conserva su próximo instante real. Un retraso entrega una sola prueba, la más reciente, y avanza los intervalos atrasados. Las pruebas usan un único ID visible, con alerta en cada nuevo intervalo; los avisos normales conservan IDs independientes. Se retiran avisos dev heredados de hoy/ayer al reemplazar la agenda.
3. **Alarma pendiente invalidada:** consultar el estado reprogramaba y cancelaba el `PendingIntent`. La consulta es ahora de solo lectura; la programación conserva el token de broadcasts ya en cola. Al volver se rearma primero y después se renueva el calendario sin perder eventos fechados vencidos de una fuente aún activa. Eventos fechados de más de 24 h caducan; fuentes desactivadas y anclas antiguas de Cartas no se restauran.
4. **Entrega durante reposo:** se conserva `setAlarmClock`, con comprobación de acceso exacto y canal. El receptor trabaja con `goAsync`, ejecutor serial y bloqueo parcial de CPU de hasta 30 s, liberado al terminar. Esto permite completar la entrega sin depender de WebView ni pantalla encendida; no demuestra por sí solo que el Nubia despierte a tiempo. La causa concreta de un eventual bloqueo del fabricante sigue sin evidencia física.
5. **Recordatorios generales:** algunos avisos mensuales/anuales solo tenían una ocurrencia, pues dependían de una extensión en `TimedNotificationPublisher`, que esta ruta no ejecuta. Android ahora guarda sus ocurrencias hasta el horizonte nativo existente de diez años, con una sola alarma del sistema. El calendario se renueva al abrir y ante cambios de ajustes. Las reglas diarias se recalculan ante cambio de hora/zona; checks y su opción de omisión sincronizan la agenda. Se conserva el presupuesto de iOS.

La migración usa la alarma anteriormente registrada y el historial de entrega, sin inferir una cola de todos los minutos anteriores. Un fallo de publicación conserva pendientes y programa un reintento separado de 60 s. Un cierre entre publicar y confirmar almacenamiento puede reintentar el mismo ID: no se promete entrega exactamente una vez.

Android documenta que `setAlarmClock` puede despertar durante Doze y que la protección de CPU del broadcast termina al salir de `onReceive`: [AlarmManager](https://developer.android.com/reference/android/app/AlarmManager), [alarmas](https://developer.android.com/develop/background-work/services/alarms) y [Doze](https://developer.android.google.cn/training/monitoring-device-state/doze-standby?hl=en). No se atribuye el fallo a una restricción OEM sin medirla.

## Evidencia automatizada

- `tests/notifications/CotidieNotificationTimelineTest.java` ejecuta la clase Java de producción: **1219 aserciones correctas**. Reproduce despertar a las 09:52 tras habilitar a las 08:01: una prueba de las 09:50, próxima a las 09:55; callback repetido sin entrega. Prueba 400 intervalos consecutivos, medianoche, recordatorio normal simultáneo, omisión de checks, DST diario en Santiago y preservación/caducidad de eventos fechados.
- `tests/notification-patches.cjs`: **5 pruebas correctas**, actualización desde la ruta defectuosa, instalación del estilo desde cero, idempotencia, recurso dev empaquetado, identidad de fuentes y calendario mensual/anual. Fixtures aislados y retirados fuera del repositorio.
- `tests/reading-persistence.cjs`: **36 regresiones correctas**, incluidas privacidad, importación, temporizador y EPUB. La comprobación de credenciales ahora usa el blob histórico anterior a la migración, en lugar de asumir que `HEAD` contiene texto anterior. No imprime credenciales.
- Compilación coordinada Java con JDK 21, API 35, Capacitor y AndroidX locales: nueve fuentes de producción, incluido el administrador regenerado por el parche, y el test JVM. La primera ampliación del classpath usaba clases de APK antiguas; se incorporaron las dependencias actuales de privacidad/temporizador y la compilación pasó.
- `npm.cmd run build` final correcto, con TypeScript previo y export Next.js bajo el coordinador. Se repitió tras corregir el horizonte fijo y cerrar la renovación de zona/calendario en primer plano. Lint completo no ejecutado; Next lo omite por la configuración existente. No se extrapola la compilación Java al empaquetado de un APK.

Para repetir Node, usar Node administrado y `fake-indexeddb/auto` externo:

```text
node --require <scratch>/node_modules/fake-indexeddb/auto --test tests/reading-persistence.cjs tests/notification-patches.cjs
```

El test JVM compila juntos `CotidieNotificationTimeline.java` y `CotidieNotificationTimelineTest.java`, con salida externa, y ejecuta `com.benjamin.studio.CotidieNotificationTimelineTest`. En este Windows, compilar bajo `Invoke-ControlledBuild.ps1`; no ejecutar builds en paralelo. La compilación Android de fuentes requiere además los classpaths de Capacitor/AndroidX y recursos generados.

## Observación anterior — interrupción USB recuperada

- Java del ejecutor y Android coinciden en America/Santiago; el horario guardado de la regla diaria coincide con el fixture. El desajuste horario no explica este ensayo.
- Un primer ensayo encontró fechada, diaria y dev, pero el controlador falló al depender de logcat vacío. Observador corregido para usar `mUpdateTimeMs` del registro Android; no confundir ese fallo del test con ausencia de avisos.
- Último ensayo: aviso fechado previsto 17:02:24.908, entregado 17:02:25.099 (191 ms después), con imagen 400 × 300. Diario previsto 17:03 y cadencia dev posterior ausentes en los controles.
- Snapshot de la agenda sintética conserva 13 reglas, próximo horario y estado `scheduled`, pero AlarmManager no muestra la alarma de dispatch correspondiente. Broadcast fechado terminó normalmente; no hay siguientes broadcasts pendientes. Proceso cached/congelado observado, sin prueba suficiente para atribuir causa al fabricante. PendingIntent no cancelado, permiso de ejecución de fondo permitido, bucket activo y lista de alarmas bloqueadas vacía.
- El snapshot despierta el proceso: esa observación deja de servir para certificar pantalla apagada continua. No se declara matriz completa aprobada ni se introdujo corrección especulativa de producción.
- Se perdió USB al cierre; `finally` no pudo restaurar agenda ni energía. Recuperación posterior con `Restore-InterruptedObservation.ps1`: agenda/expiración y energía restauradas, respaldo y paquete de pruebas retirados, todo verificado. Evidencia histórica WC-010; continuidad actual WC-011.

## Prueba física parcial anterior — Nubia Air / Android 15 (WC-009)

- APK release y APK de instrumentación firmados compilados bajo el coordinador; última compilación correcta en 42 s. App instalada como actualización 6.4.24/113, sin cambiar firma ni borrar datos.
- Aviso sintético fechado: programado a las 15:52:45.855 de Chile y registrado por Android a las 15:52:46.015 (160 ms después), el 2026-10-08. Pantalla apagada y proceso previamente terminado mediante `am kill`, sin forzar detención. Registro confirma `BigPictureStyle` y bitmap de 400 × 300.
- El observador residente quedó congelado durante el ensayo de reposo; ese intento no certifica entregas ni demuestra una causa del fabricante. El ensayo separado del aviso diario no encontró la entrega al horario esperado y terminó antes del primer intervalo dev. Pendiente contrastar la zona horaria del ejecutor de instrumentación con la app antes de atribuirlo al planificador.
- Añadido registro nativo de instante de entrega exclusivamente para pruebas dev habilitadas, sin contenido privado. No se certificaron cadencia completa, ausencia de ráfagas física, reinicio ni reposo profundo.
- Agenda original restaurada; respaldo privado y fixtures retirados, paquete de pruebas desinstalado. Verificado USB cargando y `mForceIdle=false`. Se pausó a petición del usuario; el celular queda libre y puede desconectarse.
- Evidencia y auxiliares externos: `.codex/projects/Cotidie/device-notifications-2026-10-08`; continuidad WC-009. Matriz restante:

| Escenario | Resultado requerido |
| --- | --- |
| Pruebas dev con imagen, app en HOME y pantalla apagada durante al menos 15 min | Registro de entregas en cada intervalo, imagen al expandir y una sola tarjeta dev actualizada. Comparar instantes de alarma/publicación, sin despertar manualmente para provocar entrega. |
| Regreso, varios bloqueos/desbloqueos y callback repetido | Sin ráfaga de intervalos antiguos ni duplicado del mismo recordatorio. |
| Recordatorio normal cercano, junto a pruebas dev, con proceso terminado sin forzar detención | Entrega normal independiente, horario correcto e imagen/acción cuando correspondan. Comprobar también primer jueves/domingo y siguiente ocurrencia mensual. |
| Desactivar pruebas, marcar/desmarcar oración con omisión activa y cambiar ancla de Cartas | Agenda ajustada; ninguna prueba ni evento de la fuente retirada. |
| Revocar/restaurar acceso exacto, permiso de notificación o canal; reinicio y cambio de zona/hora | Motivo de bloqueo veraz, rearmado tras restaurar/abrir, horarios locales actualizados y ningún replay masivo. |

La entrega fechada/diaria, cadencia dev, imagen activada/desactivada y agrupación de atrasos quedaron comprobadas en WC-011. Restan reposo profundo, reinicio, revocación/restauración de permisos, cambios de hora/zona y los demás escenarios de calendario/checks de la matriz. No extrapolar la prueba con pantalla apagada a esos estados.
