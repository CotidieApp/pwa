# Lecturas de la Misa

Esta guía rige el acceso en Santa Misa, el selector de fecha y formularios, el leccionario local y sus fuentes, generador y pruebas. La entrada vive en `../index.ts`. El lector está en `src/lib/liturgy-mass-reader.ts`, el selector en `src/lib/liturgy-chile.ts` y la vista se comparte con las Horas en `src/components/LiturgyHours.tsx`.

## Fuentes

- Dar prioridad a Eucaristía Diaria, la edición oficial del Arzobispado de Santiago, para el formulario principal, las citas y los textos que se hayan cotejado. El Ordo Litúrgico Pastoral de la Conferencia Episcopal de Chile aporta las rúbricas, las lecturas cuando falte esa edición y las alternativas que corresponda conservar.
- Registrar la edición y el alcance del cotejo. Si se usa la edición de otro año, comprobar que corresponda al mismo formulario y ciclo. Si faltan versículos, resolver también el cuerpo antes de cambiar la cita. Mantener la fórmula de proclamación y retirar los subtítulos editoriales del texto mostrado.
- Las proyecciones del calendario chileno permiten consultar fechas sin un Ordo anual cotejado. Indicar claramente su condición. Documentar las divergencias impresas y cualquier formulario o variante pendiente de fuente.

## Cambios y comprobación

- Actualizar primero los datos fuente o `scripts/vendor-lectionary-chile.py` y regenerar `public/liturgy/lectionary-cl.json.gzip`. Las indicaciones para reproducirlo están en `docs/LITURGIA-DE-LAS-HORAS.md`.
- Los cambios del motor de calendario se aplican en `scripts/vendor-liturgy-hours.mjs` y se generan en `public/liturgy/breviarium-3.1.8.js`. El motor y el selector admiten fechas hasta el 31 de diciembre del año 99999.
- Comprobar mediante `readMass` las fechas afectadas, las citas y el comienzo o los límites de los pasajes. Cuando cambien el calendario o la selección, probar las fechas cubiertas por el Ordo y años con ciclos distintos. Incluir las formas corta y larga, vigilias o alternativas cuando el cambio las afecte.
- Conservar la lectura sin conexión y verificar el recurso exportado al cambiar su generación o su ruta. Informar con precisión las fechas cotejadas y la comprobación que quede pendiente.
