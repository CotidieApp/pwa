# Registro de Actividad de Agentes (AGENTS.md)

Este archivo documenta todas las intervenciones realizadas por el asistente (Trae AI), detallando planes, ejecuciones y archivos modificados para mantener un historial claro de cambios y facilitar la depuración.

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
- **Verificación**: Se confirmó que `WrappedStory.tsx`, `Settings.tsx` y sus subcomponentes ya se encuentran traducidos.

**Archivos Modificados:**
- `src/components/developer/DeveloperDashboard.tsx`

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

### [2026-02-10 14:30] 32. Fix de Permisos en Android (Scoped Storage)
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

### [2026-02-10 16:00] 35. Adoración Extendida y Guía PWA
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
- **Text & Icon Size**: Se incrementó el tamaño del icono (`size-4` -> `size-5`) y el texto (`text-sm` -> `text-base`).

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
    - Implementar un menú lateral colapsable (hamburger menu) funcional en móviles.

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

### [2026-02-10 15:00] 33. Actualización Integral: PWA, Rosario, Stats y Archivos
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

### [2026-02-09 17:45] 3. Cotidie Annuum y Lógica de Contadores
**Planificación:**
- Restringir la temporada "Annuum" (resumen del año) para que termine estrictamente el 31 de diciembre.
- Reiniciar contadores anuales automáticamente el 1 de enero.
- Crear un contador "Global" (histórico) que nunca se reinicie.
- Corregir bug en la "Racha de Santa Misa" (problemas de zona horaria).
- Implementar checks automáticos en "Plan de Vida" al rezar sub-oraciones.

**Ejecución:**
- **Temporada**: Se editó `src/lib/movable-feasts.ts` para eliminar enero de la lógica `isWrappedSeason`.
- **Reinicio Anual**: En `src/context/SettingsContext.tsx`, se añadió lógica para detectar cambio de año, reiniciar `userStats` y migrar datos a `globalUserStats`.
- **Racha Misa**: Se implementó `getLocalDateKey` en el contexto para usar fechas locales en lugar de UTC, solucionando el bug de la racha.
- **Auto-Check**: Se modificó `incrementStat` para buscar recursivamente si una oración pertenece al Plan de Vida y marcarla automáticamente.

**Archivos Modificados:**
- `src/lib/movable-feasts.ts`
- `src/context/SettingsContext.tsx`
- `src/components/main/MainApp.tsx` (integración de checks)

### [2026-02-09 17:50] 4. Exportación e Importación de Planes (.ctd)
**Planificación:**
- Permitir exportar planes personalizados a un archivo `.ctd` (JSON).
- Permitir importar dichos archivos para restaurar planes.

**Ejecución:**
- **Exportar**: Se añadió botón en `CustomPlanView.tsx` que genera un Blob JSON y lo descarga.
- **Importar**: Se añadió input de archivo que lee el JSON, valida la estructura básica y actualiza el plan en el slot seleccionado usando `importUserData` o lógica local.

**Archivos Modificados:**
- `src/components/plans/CustomPlanView.tsx`

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
