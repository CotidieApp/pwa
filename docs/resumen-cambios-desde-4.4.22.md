# Resumen de cambios posteriores a la versión 4.4.22

Este documento resume los cambios incorporados en el repositorio después de la build `v4.4.22` (`16c9dc7`, 2026-03-23 23:01 -03:00) y hasta el estado actual publicado en `v4.4.26`.

## Alcance

- Versiones cubiertas: `4.4.23`, `4.4.24` y `4.4.26`.
- También incluye ajustes intermedios que quedaron entre esas builds.
- En el historial de Git no aparece una build `v4.4.25`.

## Resumen ejecutivo

- Se reforzó el santoral diario con imágenes de devociones, apertura directa desde cartel y widget, y ajustes puntuales de textos y frases forzadas.
- Se rehízo por completo la lógica de colores litúrgicos: primero con criterios canónicos, luego con tabla oficial CECh 2026 y finalmente con una base general reutilizable y precarga 2027.
- Android recibió una pasada importante en edge-to-edge, widgets y notificaciones: barras realmente transparentes, widget chico configurable y notificaciones con banner expandido cuando hay imagen.
- `Cotidie Annuum` fue reescrito hacia un tono más contemplativo y menos gamificado.
- `Cartas` ganó un recordatorio propio tras 30 días sin nueva entrada, con reactivación correcta y acceso directo a la sección.
- Hubo además mantenimiento de tooling y documentación: mensajes de `android:apk`, limpieza de scripts PDF antiguos y normalización editorial de `AGENTS.md`.

## Cambios por versión

### `4.4.23`

- Correcciones textuales menores:
  - `Salmo II` pasó a usar `por los siglos de los siglos`.
  - La bio de San Óscar Romero quedó con `Misa` en mayúscula.
- Santoral y devociones:
  - El cartel del santo del día y el widget grande pasan a usar imágenes de devociones cuando el santo coincide con una devoción existente.
  - Al tocar cartel o widget, la app abre directamente la devoción correspondiente.
  - Se forzaron frases del día concretas para `26/06` y `22/10`.
  - La Anunciación del `25/03` tuvo ajuste visual específico y terminó consolidada con la imagen ya existente `gozoso-1.jpg`.
- Colores litúrgicos:
  - Se eliminaron colores no canónicos como `gold` y `blue`, alineando la lógica con la norma litúrgica.
  - Se corrigió el criterio para memorias en Adviento y Cuaresma.
  - Se añadió la tabla oficial CECh 2026, compartida entre web y widget Android.
  - El `02/11` queda forzado a blanco según el criterio pedido por la app.
  - Se incorporó una base general reutilizable para cualquier año y una precarga 2027 para funcionamiento offline en APK y widget.
- Android y widget:
  - El parser nativo de `image-display.ts` quedó preparado para leer también claves JS sin comillas.
  - Web y widget Android quedaron alineados con la misma precedencia para resolver color litúrgico.
- Herramientas:
  - `android:apk` ahora informa explícitamente la versión compilada al final del flujo exitoso.
  - Se eliminaron varios scripts PDF auxiliares que ya no formaban parte del flujo principal.

### `4.4.24`

- `android:apk` normalizó tildes y mensajes visibles, sin cambiar su lógica de build.
- `AGENTS.md` fue reparado a UTF-8 legible.
- `AGENTS.md` recibió además una pasada editorial completa para corregir tildes, ortografía y formulaciones repetidas.

### `4.4.26`

- Edge-to-edge Android:
  - Se restauró el fondo continuo detrás de status bar y navigation bar.
  - Se desactivó el scrim gris automático y luego se reforzó la transparencia en ventana, `decorView`, `android.R.id.content` y `WebView`.
  - La capa web añadió respaldos explícitos para safe areas, de modo que las barras muestren el fondo real o el color del encabezado según la pantalla.
- Widget chico:
  - Volvió a tamaño mínimo `2x1`.
  - Se rehízo el escalado tipográfico según ancho y alto disponibles.
  - Se agregó una preferencia Android para elegir entre mostrar todo reducido o priorizar solo el nombre del santo cuando falta espacio.
- `Cotidie Annuum`:
  - Se reescribió la narrativa para que funcione como memoria agradecida y contemplativa del año.
  - Las estadísticas quedaron subordinadas a una lectura espiritual, ya no a una lógica gamificada.
  - Hubo un segundo ajuste para bajar aún más el tono cursi en textos visibles.
- `Cartas`:
  - Se agregó un recordatorio local propio tras 30 días sin nueva carta.
  - Al tocar la notificación, la app abre `Plan de Vida > Cartas`.
  - La vista incorporó un switch específico para ese recordatorio.
  - Reactivarlo ya no reinicia el conteo; si el plazo ya venció, se reprograma en corto plazo.
- Notificaciones Android:
  - Las notificaciones con imagen real ahora se muestran con banner expandido (`BigPictureStyle`) y no solo como texto largo.
  - El parche quedó persistido para futuras reinstalaciones de dependencias.

## Notas

- La build `v4.4.26` solo actualiza numeración; los cambios funcionales grandes quedaron concentrados en el commit previo `Publica cambios pendientes`.
- Este resumen cubre el ajuste textual intermedio del 2026-03-26 y las entradas funcionales posteriores registradas en `AGENTS.md` desde la serie `203` hasta la `219`.
