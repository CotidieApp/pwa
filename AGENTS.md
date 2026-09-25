# AGENTS.md — Reglas operativas de Cotidie

Este archivo contiene únicamente las reglas vigentes para trabajar en este repositorio. El historial completo de intervenciones anteriores se conserva en [AGENTS-history.md](AGENTS-history.md).

## Prioridad y alcance

- La solicitud actual del usuario tiene prioridad.
- Después se aplican las instrucciones específicas de la ruta o del repositorio.
- Las instrucciones globales del usuario se aplican cuando no contradicen las anteriores.
- Si hay un conflicto material, se sigue la regla de mayor prioridad y se informa del conflicto.

## Inicio de cada tarea

- Identificar el resultado concreto esperado y clasificar la tarea: breve, investigación, redacción, revisión, archivos, programación o varias etapas.
- Consultar primero solo los archivos, símbolos, errores o pruebas directamente relacionados.
- Revisar las instrucciones más cercanas a los archivos afectados antes de editarlos.
- No releer contexto vigente ni cargar historiales completos sin una razón concreta.

## Regla de alcance mínimo

- Si la petición es solo traducir, redactar, explicar o responder una pregunta general, responder directamente sin leer archivos del proyecto ni ejecutar herramientas.
- Inspeccionar el repositorio solo si la petición menciona código, archivos, errores, pruebas o cambios.
- En tareas pequeñas, empezar por el archivo, símbolo o comportamiento nombrado y evitar búsquedas amplias sin una razón concreta.
- No leer `AGENTS-history.md` completo; consultar solo las reglas de este archivo y la entrada histórica relevante.
- No usar subagentes ni búsquedas amplias salvo que la tarea realmente lo necesite.

## Edición y ejecución

- Mantener los cambios acotados al objetivo y conservar la arquitectura, el estilo y las convenciones existentes.
- No modificar partes no relacionadas ni revertir cambios ajenos.
- Usar `apply_patch` para ediciones manuales de archivos.
- Avanzar con supuestos reversibles y preguntar solo cuando falte una decisión que cambie materialmente el resultado, el riesgo, el costo o una acción externa.
- No publicar, desplegar, borrar, comprar ni modificar sistemas externos sin autorización explícita.

## Verificación

- Validar de forma proporcional al riesgo y empezar por la prueba más cercana al cambio.
- En código, comprobar errores de tipos, compilación, pruebas o lint cuando sean pertinentes.
- No declarar una acción como realizada sin evidencia de su resultado.
- Informar explícitamente de cualquier validación que no haya sido posible.

## Registro de intervenciones

- Las intervenciones sustantivas deben registrarse en `AGENTS-history.md` con las secciones `Planificacion`, `Ejecucion`, `Validacion` y `Archivos Modificados`.
- No registrar cambios mecánicos, triviales o puramente repetitivos; sí registrar correcciones funcionales, cambios de arquitectura, decisiones relevantes, migraciones y validaciones importantes.
- `AGENTS-history.md` contiene el historial completo existente hasta la migración y debe crecer solo con intervenciones relevantes a partir de ahora.
- Si el usuario prohíbe explícitamente editar los archivos de instrucciones o registro, pedir aclaración antes de modificar otros archivos.

## Continuidad y respuesta

- Mantener el mismo hilo mientras se itera sobre un único resultado.
- Si cambia el objetivo o el contexto se vuelve contradictorio, conservar un traspaso breve con objetivo, decisiones, fuentes, trabajo terminado, pendientes y pruebas.
- Responder en español salvo que el usuario pida otro idioma.
- Entregar primero el resultado útil, con una explicación breve de cambios, validación y pendientes cuando corresponda.
