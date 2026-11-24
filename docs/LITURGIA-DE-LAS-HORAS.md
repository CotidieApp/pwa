# Liturgia de las Horas y lecturas de la Misa

Al activarla en **Ajustes → Contenido → Visibilidad de Oraciones**, la
**Liturgia de las Horas** aparece al final de **Plan de Vida**. Las lecturas se abren en
**Plan de Vida → Santa Misa → Lecturas de la Misa**. El lector de las Horas abre las Completas
de la fecha local. El selector permite consultar el Invitatorio, el Oficio de
lectura, Laudes, Tercia, Sexta, Nona, Vísperas y Completas. El lector utiliza
las preferencias de tema, tipografía y zoom de las demás oraciones. Tercia,
Sexta y Nona aparecen juntas como Hora intermedia. El menú de oración de las
Horas incluye el temporizador y la lectura en pantalla completa.

Las Horas están ocultas por defecto. Las lecturas están siempre disponibles
al abrir Santa Misa. La casilla del Plan de Vida se marca manualmente. El Leccionario
incluye lecturas alternativas y los formularios de Navidad, Domingo de Ramos
y la Vigilia Pascual cuando están disponibles en la fuente.

## Textos y calendario

### Completas en latín

Las Completas del Tiempo Ordinario ofrecen Español, Latín y Ambos con las
preferencias de idioma ya existentes. Ambos coloca las secciones equivalentes
en paralelo. La app elige el formulario ferial o de I o II Vísperas y la
oración de una solemnidad celebrada entre semana según el calendario de Chile.
Las otras horas y los restantes tiempos litúrgicos siguen en español.

El texto latino proviene del [archivo HTML latino de Breviár](https://breviar.kbs.sk/download/main.htm),
proyecto que [documenta el permiso de la Libreria Editrice Vaticana](https://breviar.kbs.sk/faq.htm)
para su edición digital. Las siete muestras se convierten a fórmulas de la
semana y la app no usa fechas pregrabadas ni requiere red. La antífona final
reutiliza la Salve de Cotidie. Para regenerar el recurso local:

```powershell
python -X utf8 scripts/vendor-compline-latin.py <ruta-a-2026-la-plain.zip> src/lib/compline-latin.json
```

El permiso mencionado corresponde a Breviár. Queda por verificar el uso del
material en una publicación de Cotidie. Universalis también publica
[EPUB de la Liturgia Horarum](https://universalis.com/latin.htm), organizados
por fechas del calendario general, como referencia para cotejar el texto.

### Edición castellana y variantes de Chile

Los textos y el motor de [Breviarium Core](https://breviarium.es/docs/libraries/core)
3.1.8 están en `public/liturgy/breviarium-3.1.8.js`. El módulo mide unos 16 MB
antes de compresión. Cotidie lo abre desde sus propios recursos cuando se
entra al lector. La PWA lo guarda al instalar su caché y Capacitor lo recibe
en la exportación estática. El build comprueba que aparezca en ambos
componentes de la exportación. La lectura y el cálculo prescinden de APIs,
GitHub, descargas de lecturas y credenciales.

Ambos lectores usan el calendario nacional de Chile. Las Horas combinan los
textos de Breviarium, que proceden de la edición española, con un suplemento
local preparado a partir de fuentes latinoamericanas y chilenas.
El calendario se calcula a partir de la fecha gregoriana y las reglas incluidas,
sin una tabla anual ni una fecha de vencimiento. Nuevos decretos o cambios de
edición requerirían actualizar esos recursos.

Cotidie compone el rezo con el ordinario, las lecturas, antífonas, salmos,
preces y oraciones disponibles. Resuelve las primeras y segundas Vísperas,
la concurrencia entre celebraciones y los formularios de Completas. El
Oficio de Pascua muestra lecturas de la Vigilia para quienes no participaron.
El lector usa el ciclo anual del Oficio y los formularios que trae la fuente.
Algunos propios faltan en Breviarium y se muestran los textos de la feria
cuando están disponibles, identificados en el encabezado. Nuestra Señora del
Carmen combina el fascículo histórico de la Comisión Episcopal de Liturgia con
el Común de Santa María. El fascículo aporta, entre otros textos, el responsorio
de I Vísperas, el himno de Laudes y II Vísperas, y la antífona y el versículo
de Sexta. Teresa de los Andes incorpora la lectura del Propio carmelitano.
San Alberto y la beata Laura conservan la salmodia de la feria y la oración de
la memoria, e incorporan la segunda lectura con su responsorio de los oficios
jesuita y salesiano, respectivamente. Quedan pendientes el cotejo con los
cuatro tomos latinoamericanos
y la incorporación del Propio nacional íntegro. Los propios diocesanos y
futuras reformas quedan fuera del cálculo actual.

## Comprobación de 2073

La prueba de los recursos empaquetados abrió las 2.920 combinaciones de fecha
y hora de 2073 y las lecturas de las 1.461 fechas de 2026, 2027, 2028 y 2073.
El 14 de noviembre corresponde al
martes de la 32.ª semana del Tiempo Ordinario y la Pascua cae el 26 de marzo.
El 24 de diciembre conserva el IV domingo de Adviento durante el día y usa
las primeras Vísperas de Navidad y sus Completas al atardecer, según el
[Calendario Litúrgico-Pastoral de la CEE](https://www.conferenciaepiscopal.es/wp-content/uploads/2023/12/CLP-y-salmos-responsoriales-2023-2024_internet.pdf)
para la misma concurrencia en 2023.

## Calendario nacional y ediciones de Chile

El recurso local incluye también el calendario nacional de Chile, basado en
`@romcal/calendar.chile` 3.0.0-dev.119 y cotejado con los Ordos de la CECh de
[2022](https://www.iglesia.cl/docs/Ordo_Pastoral_2022_Final.pdf) y
[2026](https://www.iglesia.cl/docs/2026-Ordinario-II.pdf). Resuelve las
celebraciones de las Horas y de la Misa, las memorias que se ofrecen a elección,
la semana del salterio y los ciclos de lecturas. Las tres solemnidades
trasladadas a domingo son la Epifanía, la Ascensión y Corpus Christi. La Santa
Cruz se celebra el 3 de mayo cuando la precedencia lo permite, y san Felipe y
Santiago el 4. Cuando el 8 de diciembre coincide con el II Domingo de Adviento,
el [Ordo 2020](https://www.iglesia.cl/docs/Ordo_2020.pdf) aplica la Inmaculada
Concepción a la Misa y el domingo a las Horas. En 2073 se verificó la resolución
local de las 365 fechas. El calendario representa las reglas nacionales
documentadas, con los propios diocesanos y futuras reformas fuera de cobertura.
Para Santa Rosa de Lima en domingo se aplica la tabla general de precedencia.
El Ordo 2020 indica expresamente que se omite la fiesta. El Ordo 2026 da las
lecturas del domingo, aunque rotula las Horas como propias de la fiesta en esa
entrada. Conviene confirmar esa indicación al recibir el Propio vigente.

`src/lib/liturgy-chile.ts` identifica la celebración y los ciclos. El lector
abre la combinación correspondiente de `public/liturgy/lectionary-cl.json.gzip`.
El sufijo `.gzip` conserva la ruta y los bytes comprimidos en el APK. Android procesa los archivos `.gz` al empacar.
La aplicación incluye cero EPUB para las dos funciones.

### Citas del Ordo por fecha

`scripts/lectionary-ordo-chile.json` registra por fecha civil el PDF de la
CECh, su página, las citas y los formularios disponibles en el leccionario
local. El generador integra esas entradas en el mismo recurso sin conexión.
Al abrir una fecha incluida, el lector prioriza la selección cotejada con
[Eucaristía Diaria](https://www.eucaristiadiaria.cl/que_es.php) del Arzobispado
de Santiago cuando las fuentes difieren. También ofrece las alternativas
del Ordo y enlaza a las ediciones consultadas. El texto base es El Libro del
Pueblo de Dios. La app señala las variantes y delimitaciones que requieran
cotejo.

El índice cubre del 30 de noviembre de 2025 al 24 de diciembre de 2026,
del 1 al 10 de enero de 2027 y del 28 de noviembre al 24 de diciembre de 2027.
El PDF de Navidad con nombre `2026-Navidad` vuelve a imprimir los días 25
a 31 de diciembre de 2025 antes de pasar a enero de 2027. Las fechas de
Navidad de diciembre de 2026 se muestran como proyección del calendario, al
igual que las demás fechas sin entrada anual.

Para incorporar un Ordo, añadir sus fechas verificadas al índice con el
nombre del PDF, la página digital y las citas. `forms` contiene los
identificadores de los formularios locales en orden de presentación.
`replace` permite tomar un pasaje de otra forma local por identificador,
sección e índice de opción. `pending` y `unverified` señalan la revisión
pendiente de un formulario y de sus partes. Regenerar el recurso y ejecutar
las pruebas litúrgicas después de cada incorporación.

`scripts/lectionary-santiago-chile.json` registra la edición consultada y los
pasajes ajustados para cada formulario revisado con el Arzobispado. Esas
correcciones se cargan en el formulario del ciclo antes de generar las
entradas fechadas. Para cinco fechas de 2027 se contrastó el mismo formulario
en una edición anterior. El índice de 427 fechas quedó sin avisos de cotejo.

Las correcciones que se repiten se incorporan a los formularios del ciclo.
El jueves de la semana XX del Tiempo Ordinario, año impar, usa Jueces 11,
Salmo 39 y Mateo 22. El generador toma el formulario de
[Eucaristía Diaria](https://www.eucaristiadiaria.cl/dia_cal.php?fecha=2025-08-21),
guardado como `ordinario-20-jueves-impar.html` en la carpeta de fuentes, y
lo coteja con las citas del [Ordo 2027](https://www.iglesia.cl/docs/2027-Ordinario-II.pdf).
El jueves de la semana XXII del mismo ciclo conserva Col 1, 9-14 con
la cita corregida.
El Evangelio del martes y del miércoles de la semana XXXIV coincide en
ambos años feriales según los Ordos de 2022, 2026 y 2027. La Transfiguración
usa el Evangelio marcado para cada ciclo dominical en el leccionario de base.
El cotejo posterior de 2025, 2026 y 2027 corrigió otros Evangelios feriales
y los pasajes de Todos los Santos y del sábado de la primera semana de
Adviento. En la semana XVIII, el lunes y el martes usan la serie alternativa
si el domingo se leyó la multiplicación de los panes en el ciclo A. Cuando
la Transfiguración ocupa ese domingo, se conserva la serie habitual.

El lector ofrece en el selector la Misa crismal y las vigilias de Navidad,
Pentecostés (formas breve y extensa), el Nacimiento de san Juan Bautista, san Pedro y
san Pablo y la Asunción junto con el formulario del día. Estas opciones se
calculan aunque falte el índice anual. La Misa crismal se muestra el Jueves
Santo como referencia habitual. Si el Sagrado Corazón cae el 24 de junio, el
Nacimiento de san Juan Bautista se adelanta al 23 y su vigilia al 22 según
el [Ordo chileno de 2022](https://www.iglesia.cl/docs/Ordo_Pastoral_2022_Final.pdf#page=94).
El 2 de noviembre ofrece las lecturas de difuntos y, si cae en domingo,
también las del domingo XXXI, siguiendo el [Ordo chileno de 2025](https://www.iglesia.cl/docs/2025-Ordinario-II.pdf).
El 9 de noviembre ofrece las lecturas del domingo XXXII cuando corresponde
y conserva el formulario de Letrán con su segunda lectura.
Las opciones recurrentes del santoral que documenta el Ordo también se
ofrecen en las ferias de Adviento, Pascua y Tiempo Ordinario cuando corresponde.
Si la edición de Santiago destaca las lecturas de la memoria, ese formulario
se muestra primero y se conserva la feria en el selector.

El selector y el motor admiten fechas hasta el 31 de diciembre del año 99999.
El cálculo aplica los ciclos A, B y C del domingo y los ciclos I y II de
las ferias con el calendario y el leccionario incluidos en la aplicación.

La edición de referencia para Chile es la latinoamericana de México y Colombia
[adoptada por Chile](https://www.cultodivino.va/content/dam/cultodivino/rivista-notitiae/1980/notitiae-22-%281986%29/Notitiae-236-237-1986.pdf).
La [Librería Verbo Divino de Chile](https://libreriaverbodivino.cl/project/liturgia-de-las-horas-para-america-latina-4-vols/)
identifica los cuatro tomos impresos de Desclée De Brouwer con el ISBN
9788433018915 y confirma la aprobación para Chile. Falta localizar un
ejemplar digital íntegro de esta edición.
La [Conferencia Episcopal de Colombia](https://cec.org.co/tags/liturgia-de-las-horas?page=1)
documenta la misma familia editorial de cuatro tomos y el decreto de 1979.
El PDF rotulado Salterio del Diurnal en [la imprenta de Fray Nelson](https://fraynelson.com/imprenta/Liturgia_de_las_Horas_Salterio.pdf)
identifica expresamente la edición española en su primera página. El Propio
del Carmen de la Orden carmelitana contiene también textos para la solemnidad
de esa familia religiosa, con un invitatorio distinto del fascículo chileno.
El anexo [Propio de Chile y oficios nuevos](https://books.google.com/books/about/Propio_de_Chile_Y_Oficios_Nuevos.html?id=3akwzwEACAAJ)
está catalogado como publicación impresa de San Pablo, de 2000 y con 79 páginas.
El lector web que enlaza [Nuestra Liturgia de la CECh](https://www.iglesia.cl/nuestra_liturgia.php)
publica los textos por fecha civil. En las muestras de 2026, el
[18 de agosto](https://liturgiadelashoras.github.io/sync/2026/ago/18/oficio.htm)
trae el oficio de la feria y el
[16 de julio](https://liturgiadelashoras.github.io/sync/2026/jul/16/)
presenta el Carmen como memoria. El Ordo chileno indica memoria obligatoria
de san Alberto y solemnidad del Carmen, ambas de oficio propio de Chile.

La [Parroquia Santa María de Las Condes](https://www.stm.cl/liturgia_horas.php)
enlaza el mismo lector recomendado por la CECh. Otro sitio, [LDHoras](https://ldhoras.com/es-cl/2026/),
ofrece una vista rotulada Chile, pero en las muestras de julio y agosto de
2026 presenta el Carmen como memoria libre y el 18 de agosto como feria.

Para la Misa, los textos de
referencia están en los tres tomos del [Leccionario del Cono Sur](https://www.iglesia.cl/libreria/detalle.php?id=17),
incluido el Santoral con el Propio nacional. La traducción bíblica es
[El Libro del Pueblo de Dios](https://www.clerus.org/clerus/dati/2004-06/09-15/000intro.html).
La edición web de [Eucaristía Diaria](https://www.eucaristiadiaria.cl/que_es.php)
sirve para cotejar fechas y formularios.
### Prueba local con fuentes digitales

Se descargó el [Leccionario completo de Curas.com.ar](https://curas.com.ar/wp/libros-liturgicos/).
El archivo HTML contiene 951 formularios estructurados por fiesta, ciclos
dominicales A/B/C y ciclos feriales I/II. El prototipo usa el calendario chileno
de Cotidie y encuentra un formulario o un archivo complementario en las 1.461
fechas de 2026, 2027, 2028 y 2073. Se extrajo el cuerpo de las lecturas del 14 de
noviembre de 2073, el V domingo de Pascua de 2026 y la Misa del día de Navidad
de 2026. La fecha de 2073 dio Sab 2, 23–3, 9, Sal 33 y Lc 17, 7-10.

La prueba de cobertura comprueba disponibilidad del formulario. La validación
litúrgica requiere cotejar las citas y las variantes con el Leccionario nacional
y el [Ordo de la CECh](https://www.iglesia.cl/docs/2026-Ordinario-II.pdf).
Por ejemplo, el formulario de María, Madre de la Iglesia en el archivo digital
termina en Jn 19, 27. La [notificación del Vaticano](https://press.vatican.va/content/salastampa/es/bollettino/pubblico/2018/03/27/cult.html)
prescribe lecturas propias para esta memoria y el [formulario publicado por la USCCB](https://www.usccb.org/es/prayer-and-worship/liturgical-year-and-calendar/mother-of-the-church)
indica Jn 19, 25-34. La app ofrece primero el formulario de Santiago y conserva
el formulario universal como opción en las proyecciones. En el Carmen se
priorizan el salmo 84 y Hch 1, 12-14 según la edición de Santiago y se
conservan las alternativas nacionales. [Eucaristía Diaria del 16 de julio](https://www.eucaristiadiaria.cl/dia_cal.php?fecha=2026-07-16).
Para Santa Cruz de mayo se confirmó
el [Sal 77, 1-2. 34-38](https://www.eucaristiadiaria.cl/dia_cal.php?fecha=2025-05-03).

Los [seis EPUB de las Horas](https://www.curas.com.ar/Moviles/Epub.htm) también
funcionan como fuente local. Para el 14 de noviembre de 2073, el calendario
chileno condujo al martes del salterio IV y de ahí a Completas del martes
con el salmo 142. El Santoral de esta colección carece de las entradas de
santa Teresa de los Andes y de san Alberto Hurtado. La edición
[Liturgia de las Horas para los fieles, San Pablo](https://www.sanpablo.com.ar/products/liturgia-de-las-horas-para-los-fieles)
documenta el Propio del Carmen, santa Teresa y Laura Vicuña. Cubre Laudes,
Vísperas y Completas. Sigue pendiente localizar el texto íntegro del Propio
vigente y cotejar la edición base de los EPUB.

Los [Hermanos de San Juan](https://teresadelosandes.org/1espagne/priere-liturgie.php?titre=LECTURA+HAGIOGR%C3%81FICA+PARA+EL+OFICIO+DEL+13+DE+JULIO)
publican también para el 13 de julio la segunda lectura de santa Teresa de los
Andes, con la misma selección de sus escritos que el Propio carmelitano y
variantes menores de transcripción.

Para el 22 de enero, el [Propio salesiano en español](https://archive.sdb.org/Documenti/Santita/liturgia/pdf/Vicuna_Colletta_Ufficio_es.pdf)
publica la segunda lectura de la beata Laura Vicuña, tomada de la biografía
de Augusto Crestanello, y su responsorio. Para regenerar el suplemento,
guardar la extracción con `pdftotext -layout -enc UTF-8` como
`laura-oficio-salesiano.txt` en la carpeta de fuentes locales.

El Ordo de la CECh recoge al beato Ceferino Namuncurá como memoria libre el
26 de agosto. El [Propio salesiano en italiano](https://archive.sdb.org/ITA/pdf/Zeffirino_Colletta_Ufficio.pdf)
indica como segunda lectura la carta tras la audiencia con Pío X. Se cotejaron
sus extractos con la [carta del archivo salesiano](https://archive.sdb.org/ESP/pdf/CARTAS-DE-CEFERINO.pdf)
y con la [transcripción española](https://pueblosoriginarios.com/textos/mapuche_cartas/ceferino-03-10-1904.html).
La oración y el responsorio corresponden al formulario salesiano, con el
responsorio traducido del italiano. Para regenerar, guardar la transcripción
HTML como `ceferino-carta.html` en la carpeta de fuentes locales.

Para el 18 de agosto, el [Propio de la Compañía de Jesús en catalán](https://www.jesuites.net/sites/default/files/liturgia_de_les_hores_para_web.pdf)
(Barcelona, 2016, pp. 138–140) permitió identificar la segunda lectura.
Se tomaron los pasajes correspondientes del original español publicado por la
[Fundación Padre Alberto Hurtado](https://padrealbertohurtado.cl/un-testimonio/).
Se preparó el responsorio con los versículos que indica el oficio jesuita,
[Gál 2, 20](https://www.vatican.va/archive/ESL0506/_PYU.HTM) e
[Is 61, 1](https://www.vatican.va/archive/ESL0506/__PBB.HTM). El Ordo chileno
de 2022 remite al Oficio propio nacional, cuyo texto íntegro sigue pendiente
de cotejo. Para regenerar el suplemento, guardar el original de la Fundación
como `hurtado-testimonio.html` en la carpeta de fuentes locales.

Los archivos originales se conservan como material de cotejo fuera del
repositorio. Los datos preparados se incluyen en la copia de trabajo local.
Sigue pendiente verificar los derechos sobre los textos antes de publicar
una versión que los incluya.

## Referencias litúrgicas

Se cotejaron las reglas con la
[Ordenación General de la Liturgia de las Horas](https://www.clerus.org/bibliaclerusonline/es/f5n.htm)
y los casos de
[Navidad II](https://ldhoras.com/es/2025/01/04/horas-1.html) y el
[jueves de la quinta semana de Pascua](https://www.almudi.org/Portals/0/docs/LH/LH_II_CUARESMA_PASCUA.pdf).

## Procedencia y regeneración

`public/liturgy/LICENSE.txt` y `APACHE-2.0.txt` incluyen los avisos de Breviarium,
Romcal e i18next. La licencia del software de Breviarium es la del archivo
LICENSE distribuido, que especifica Apache 2.0. La licencia del código
no acredita los derechos sobre las traducciones litúrgicas incorporadas.
La autorización de redistribución de esos textos queda pendiente de verificar
antes de una publicación. [Decreto sobre libros litúrgicos, n.º 40](https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20211022_decreto-can838-cdc_sp.html)

Para regenerar la misma revisión se necesitan los dos paquetes npm ya
extraídos. El script comprueba el SHA-256 de los archivos de entrada y trabaja
con las copias locales.

```powershell
node scripts/vendor-liturgy-hours.mjs <ruta-a-breviarium/dist/breviarium.es.js> <ruta-a-calendar.chile/esm/es.js>
```

Los generadores del Leccionario y del suplemento de las Horas leen las fuentes
locales. Las Horas usan solo los EPUB de Navidad y Santoral durante la
generación. El suplemento del Carmen utiliza las páginas PDF 52–58 del
[fascículo VI de la BCN](https://obtienearchivo.bcn.cl/obtienearchivo?id=documentos%2F10221.1%2F68351%2F2%2F273286.pdf)
extraídas con `pdftotext -layout`. Los recursos finales son JSON y JSON
comprimido. Los originales y el PDF son material de compilación.

El Leccionario usa además `sumo-sacerdote-hebreos.html` de la
[edición de Santiago del 9 de junio de 2022](https://www.eucaristiadiaria.cl/dia_cal.php?fecha=2022-06-09).
Los archivos `biblia-galatas5.html`, `biblia-1cor8.html`, `biblia-judit13.html`,
`biblia-judit15.html` y `biblia-judit16.html` guardan los capítulos de
[Gálatas](https://www.vatican.va/archive/ESL0506/_PYX.HTM),
[1 Corintios](https://www.vatican.va/archive/ESL0506/_PY7.HTM) y
[Judit 13](https://www.vatican.va/archive/ESL0506/_PQR.HTM),
[15](https://www.vatican.va/archive/ESL0506/_PQT.HTM) y
[16](https://www.vatican.va/archive/ESL0506/_PQU.HTM) del Libro del Pueblo de Dios.

```powershell
python -X utf8 scripts/vendor-lectionary-chile.py <carpeta-de-fuentes> public/liturgy/lectionary-cl.json.gzip
python -X utf8 scripts/vendor-hours-chile.py <carpeta-de-fuentes> public/liturgy/hours-cl.json
```
