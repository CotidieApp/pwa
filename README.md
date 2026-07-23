# Cotidie

Cotidie es una aplicación católica de oración y vida espiritual, diseñada
principalmente para Android y preparada para conservar localmente su contenido
y los datos del usuario.

Reúne el Plan de Vida enseñado por San Josemaría, oraciones y devociones, santoral, lectores EPUB,
audios, recordatorios, widgets, respaldos y herramientas de personalización.
Cotidie está diseñada para funcionar completamente sin conexión a internet:
una vez instalada, no necesita conectividad para acceder a sus contenidos ni
utilizar ninguna de sus funciones.

## Estado del proyecto

- Plataforma principal: Android.
- Interfaz web local para desarrollo y pruebas rápidas.
- Funcionamiento esencial sin conexión.
- Proyecto privado y en desarrollo activo.
- La versión vigente se encuentra en `version.ts`.

## Tecnologías principales

- Next.js 15 y React 18.
- TypeScript y Tailwind CSS.
- Capacitor 8 para la integración con Android.
- epub.js para los lectores EPUB integrados.
- Gradle y Android SDK para la compilación nativa.

La aplicación web se exporta estáticamente al directorio `out/`. Capacitor
copia esa exportación al proyecto nativo ubicado en `android/`.

## Preparación del entorno

Se requiere:

- Node.js y npm.
- Android Studio.
- Java 21, preferentemente el JBR incluido con Android Studio.
- Android SDK configurado.
- PowerShell en Windows para los flujos locales existentes.

Instalar las dependencias:

```powershell
npm install
```

El comando `postinstall` aplica parches necesarios para las notificaciones
locales y el proceso de exportación de Next.js. No debe omitirse.

## Desarrollo local

Iniciar Cotidie en el puerto habitual de desarrollo:

```powershell
npm run dev -- -p 3018
```

Abrir `http://127.0.0.1:3018/` en el navegador. La vista adaptable permite
simular dimensiones móviles, por ejemplo `360 x 780`, y orientación horizontal.

La versión web sirve para comprobar rápidamente:

- Diseño, navegación y adaptación a distintos tamaños.
- Oraciones, planes, búsquedas y lectores EPUB.
- Modos claro y oscuro.
- Persistencia basada en almacenamiento web.

Estas funciones deben verificarse además en Android real o en un emulador:

- Notificaciones exactas y permisos del sistema.
- Widgets.
- Selector de archivos y almacenamiento del dispositivo.
- Barras de estado y navegación.
- Instalación, firma y comportamiento del APK.
- Consumo de memoria y gestos multitáctiles físicos.

## Verificación

Comprobar TypeScript:

```powershell
npx tsc --noEmit
```

Generar la exportación web de producción:

```powershell
npm run build
```

## Generación del APK

El comando principal no se limita a compilar: de forma predeterminada aumenta
la versión de parche y puede publicar los resultados configurados por el
proyecto.

```powershell
npm run android:apk
```

Opciones disponibles:

| Opción | Función |
| --- | --- |
| `--set X.Y.Z` | Establece una versión concreta. |
| `--no-bump` | Conserva la versión actual. |
| `--no-push` | Omite Git y la publicación en GitHub. |
| `--no-drive` | Omite la copia secundaria configurada. |

Para compilar localmente sin publicar ni modificar la versión:

```powershell
npm run android:apk -- --no-bump --no-push --no-drive
```

## Estructura principal

- `src/app/`: entrada de Next.js.
- `src/components/`: interfaz y experiencias principales.
- `src/components/epub-reader/`: paneles auxiliares del lector EPUB.
- `src/components/settings/`: subsecciones de Ajustes.
- `src/context/`: ajustes, persistencia y servicios transversales.
- `src/lib/prayers/`: oraciones, devociones y contenido del Plan de Vida.
- `src/lib/`: datos, utilidades y lógica compartida.
- `public/`: imágenes, fuentes, EPUB y demás recursos locales.
- `android/`: proyecto nativo administrado mediante Capacitor.
- `scripts/`: compilación, respaldos y parches del proyecto.
- `docs/`: documentación complementaria.
- `AGENTS.md`: instrucciones obligatorias e historial de intervenciones.

## Trabajo con agentes de codificación

Antes de modificar el proyecto, toda IA o agente debe:

1. Leer completamente este archivo.
2. Leer y obedecer las instrucciones vigentes de `AGENTS.md`.
3. Revisar el código relacionado antes de editar.
4. Limitar los cambios al alcance solicitado por el usuario.
5. Respetar los cambios existentes que no formen parte de su tarea.
6. Ejecutar las verificaciones proporcionales al cambio realizado.
7. Registrar cada intervención en `AGENTS.md` con la modalidad allí definida.

`README.md` describe el proyecto y su operación. `AGENTS.md` contiene las
reglas obligatorias para agentes y el historial técnico; no deben confundirse.

## Autoría y reproducción del contenido

Cotidie fue creado por Benjamín Alcalde Gueneau de Mussy. El proyecto comenzó
el 3 de octubre de 2025 y ha sido desarrollado con asistencia de distintas
herramientas de inteligencia artificial.

© 2025-2026 Benjamín Alcalde. Todos los derechos sobre la aplicación, su código,
su diseño, su organización y sus elementos originales permanecen reservados,
salvo autorización expresa en contrario.

Se permite la reproducción total o parcial de los textos devocionales y de
lectura espiritual incluidos en Cotidie. Esta autorización se refiere al
contenido textual ofrecido para la oración y la formación espiritual; no
concede por sí sola permiso para copiar, redistribuir o publicar el código
fuente, la aplicación compilada, su identidad visual ni otros elementos
originales del software.

Cuando un texto, traducción, imagen, audio u otro recurso pertenezca a un
tercero, se mantienen los derechos y condiciones que correspondan a su fuente.
