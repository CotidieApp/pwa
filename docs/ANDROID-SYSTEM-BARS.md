# Barras del sistema Android: diagnóstico de la franja negra

Esta es una regresión recurrente de Cotidie. Antes de cambiar colores, CSS o `ThemeManager`, comprobar si Android está dejando el WebView fuera de las zonas de la barra de estado o navegación. El caso reproducido en un Nubia Z2468N con Android 15 y Cotidie 6.4.27 se documentó el 15 de octubre de 2026 en `AGENTS-history.md` y en la entrada de caché `WC-027`.

## Comportamiento esperado

- En Inicio con imagen, la imagen debe continuar detrás de los iconos superiores.
- Sin imagen, la barra superior debe seguir el color visible del encabezado y la inferior el fondo visible inmediatamente encima.
- Si un diálogo oscurece la pantalla, debe oscurecer las barras; al cerrarlo deben recuperar su apariencia previa.
- Los iconos deben conservar contraste con el fondo visible.

## Causa comprobada y solución vigente

En el teléfono, el `DecorView` tenía **140 px de padding superior** y su primer hijo empezaba en `y=140`; el WebView solo ocupaba `0,0-1080,2260` dentro de ese hijo. La barra transparente dejaba ver negro porque no había contenido web bajo ella. `WindowCompat.setDecorFitsSystemWindows(window, false)` y las antiguas banderas `SYSTEM_UI_FLAG_LAYOUT_*` por sí solas no quitaron ese relleno.

La fuente del arreglo es `android/app/src/main/java/com/benjamin/studio/MainActivity.java`, método `configureSystemBars()`: el listener de insets del `DecorView` mantiene su padding en cero y devuelve los insets sin consumirlos, para que el WebView siga recibiendo las zonas seguras CSS. Las capas y el contraste web están en `src/components/main/MainApp.tsx` y `src/components/ThemeManager.tsx`. No eliminar el listener suponiendo que basta con una barra transparente.

## Comprobación rápida en el dispositivo

1. Confirmar el dispositivo y la versión instalada: `adb devices -l` y `adb shell dumpsys package com.benjamin.studio`. Reproducir antes de editar.
2. Capturar la pantalla del teléfono y consultar `adb shell dumpsys activity top`. En la jerarquía de `MainActivity`, revisar las coordenadas del primer hijo de `DecorView` y de `CapacitorWebView`. Si el hijo comienza bajo la barra de estado, resolver primero el desplazamiento nativo. En la prueba corregida ambos cubrieron `0,0-1080,2400`.
3. Recorrer Inicio con imagen → Plan de Vida → Cartas → botón de información → cerrar → Inicio. En la prueba original el píxel superior pasó de negro `(0,0,0)` a imagen `(104,62,31)`; Plan y Cartas mostraron el color del encabezado `(146,106,12)` y el diálogo oscureció ambos a `(29,21,2)`. Los valores exactos cambian con tema, imagen y teléfono: comparar superficies visibles, no fijarse en esos RGB como constantes.
4. Comprobar la barra inferior según el modo de navegación disponible. El Nubia usado tenía gestos y no permitió certificar una barra opaca de tres botones.

Para validar cambios nativos, usar el coordinador de compilaciones indicado en `AGENTS.md`, firmar con la clave vigente y probar el APK actualizado en el teléfono sin borrar datos. La instalación local no equivale a publicación. Las capturas de la intervención original están en `C:\Users\balca\.codex\projects\Cotidie\diagnostics\`, referenciadas por `WC-027`.
