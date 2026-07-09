from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUT_DIR = Path(r"C:\Users\balca\Downloads\Preparación examen")
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUT_DIR / "Enunciado-preparacion-examen.pdf"


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="TitleMain",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1F4E78"),
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        name="HeadingBlue",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#1F4E78"),
        spaceBefore=8,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="HeadingSmall",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=colors.black,
        spaceBefore=6,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyJustify",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12.2,
        alignment=TA_JUSTIFY,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12.2,
        alignment=TA_LEFT,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="Small",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=10.5,
        alignment=TA_LEFT,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="Hint",
        parent=styles["BodyText"],
        fontName="Helvetica-Oblique",
        fontSize=8.8,
        leading=11,
        textColor=colors.HexColor("#595959"),
        leftIndent=8,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=10.8,
        alignment=TA_LEFT,
        spaceAfter=0,
    )
)


def p(text, style="Body"):
    return Paragraph(text, styles[style])


def c(text, bold=False):
    text = str(text)
    if bold:
        text = f"<b>{text}</b>"
    return Paragraph(text, styles["TableCell"])


def bullet(text):
    return p("- " + text, "Body")


def numbered(items):
    story = []
    for idx, text in enumerate(items, start=1):
        story.append(p(f"{idx}. {text}", "Body"))
    return story


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawString(1.7 * cm, 1.1 * cm, "Data Analytics I - Preparación Examen")
    canvas.drawRightString(A4[0] - 1.7 * cm, 1.1 * cm, f"Página {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(
    str(PDF_PATH),
    pagesize=A4,
    leftMargin=1.7 * cm,
    rightMargin=1.7 * cm,
    topMargin=1.5 * cm,
    bottomMargin=1.7 * cm,
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=header_footer)])

story = []

story.append(p("Data Analytics I", "TitleMain"))
story.append(p("Ejercicio Integral de Preparación para Examen", "TitleMain"))
story.append(p("Universidad de los Andes - práctica no oficial", "Body"))
story.append(Spacer(1, 8))

data_personal = [
    ["Nombre", ""],
    ["Apellidos", ""],
    ["RUT", ""],
    ["Sección", ""],
    ["Fecha sugerida de práctica", "Viernes 10 de julio de 2026"],
    ["Hora de inicio / término", ""],
]
t = Table(data_personal, colWidths=[5.2 * cm, 10.2 * cm])
t.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B7B7B7")),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#D9EAD3")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWHEIGHT", (0, 0), (-1, -1), 18),
        ]
    )
)
story.append(t)
story.append(Spacer(1, 10))

story.append(p("INSTRUCCIONES Y REGLAS GENERALES", "HeadingBlue"))
for item in [
    "Este ejercicio debe resolverse individualmente como simulación de examen. Se recomienda trabajarlo con tiempo límite de 120 a 150 minutos.",
    "Utilice el archivo Preparacion-examen.xlsx. Todas las respuestas deben quedar en las hojas indicadas del mismo archivo.",
    "Las celdas amarillas indican zonas de respuesta o cálculo. Los encabezados en verde claro indican tablas, columnas o gráficos a desarrollar. Las tablas moradas corresponden a catálogos o información auxiliar.",
    "No pegue valores estáticos en celdas amarillas. Toda respuesta debe depender de fórmulas, referencias, tablas dinámicas o gráficos dinámicos.",
    "Puede registrar supuestos razonables en la hoja Supuestos, siempre que no contradigan los datos entregados.",
    "Aplique formato consistente: montos en pesos chilenos sin decimales, porcentajes con dos decimales, fechas como fecha y conteos como número.",
    "El archivo final de práctica debe llamarse Preparacion-examen.xlsx. El objetivo es preparar el examen de este viernes, por lo que conviene revisar fórmulas, tablas dinámicas, segmentadores y gráficos antes de mirar cualquier ayuda externa.",
]:
    story.append(bullet(item))

story.append(Spacer(1, 8))
story.append(p("GUÍA VISUAL EN EXCEL", "HeadingSmall"))
legend = [
    ["Color", "Significado"],
    ["Verde claro", "Elemento que debe ser desarrollado: columna, tabla o gráfico."],
    ["Amarillo", "Celda de respuesta, fórmula o cálculo requerido."],
    ["Morado", "Tabla suplementaria o catálogo de apoyo."],
]
legend_t = Table(legend, colWidths=[4 * cm, 11.4 * cm])
legend_t.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B7B7B7")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#B7DEE8")),
            ("BACKGROUND", (0, 1), (0, 1), colors.HexColor("#C6EFCE")),
            ("BACKGROUND", (0, 2), (0, 2), colors.HexColor("#FFF2CC")),
            ("BACKGROUND", (0, 3), (0, 3), colors.HexColor("#D9D2E9")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]
    )
)
story.append(legend_t)

story.append(PageBreak())

story.append(p("Caso: Gestión de Balances Comerciales de AndesTech Solutions", "HeadingBlue"))
story.append(
    p(
        "AndesTech Solutions comercializa hardware, software y servicios tecnológicos para empresas de distintas industrias en Chile. Durante los últimos años la compañía creció en clientes, ejecutivos, productos y monedas de facturación. Ese crecimiento generó una base de documentos comerciales con saldos pendientes, pagos parciales y documentos vencidos.",
        "BodyJustify",
    )
)
story.append(
    p(
        "La Gerencia Comercial y la Gerencia de Finanzas necesitan consolidar la información, calcular indicadores financieros comparables en pesos chilenos, controlar asignaciones territoriales y construir un panel ejecutivo que permita entender los balances sin revisar todos los registros de detalle.",
        "BodyJustify",
    )
)
story.append(
    p(
        "Usted ha sido contratado como analista de datos para limpiar y ampliar la base, responder preguntas usando tablas dinámicas y diseñar un dashboard de balances. El ejercicio mezcla procesamiento de datos, funciones de búsqueda, estadística descriptiva, tablas dinámicas, gráficos dinámicos y comunicación visual.",
        "BodyJustify",
    )
)

story.append(p("Hojas disponibles en el archivo Excel", "HeadingSmall"))
sheet_rows = [[c("Hoja", True), c("Uso", True)]]
sheet_rows.extend(
    [
        [c("Registro_Balances"), c("Base transaccional principal con 1.800 documentos y columnas por completar.")],
        [c("Catalogo_Clientes"), c("Razón social, industria, segmento, región, límite de crédito y riesgo de cliente.")],
        [c("Catalogo_Productos"), c("Nombre, categoría, subcategoría, costo USD, precio lista y producto estratégico.")],
        [c("Catalogo_Ejecutivos"), c("Nombre, cargo, equipo, regiones autorizadas y meta mensual.")],
        [c("Tipo_Cambio"), c("Tipo de cambio mensual a CLP por moneda.")],
        [c("Parametros"), c("Fecha de corte y umbrales para clasificaciones.")],
        [c("Resumen_Formulas"), c("Tablas que deben resolverse con fórmulas y gráfico combinado.")],
        [c("Respuestas_TD"), c("Respuestas finales obtenidas exclusivamente con tablas dinámicas.")],
        [c("Dashboard"), c("Panel ejecutivo final con KPIs, gráficos dinámicos y segmentadores.")],
    ]
)
sheet_t = Table(sheet_rows, colWidths=[4.1 * cm, 11.3 * cm])
sheet_t.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B7B7B7")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#B7DEE8")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
    )
)
story.append(sheet_t)

story.append(p("Estructura del campo Codigo_Operacion", "HeadingSmall"))
story.append(
    p(
        "La columna Codigo_Operacion contiene datos codificados con este patrón: VEN-xxPrecio$####Moneda/XXXCliente:CLI-###Region/XXProducto:PROD-###. El largo del precio y del código de región puede variar, por lo que debe usar funciones de texto basadas en delimitadores.",
        "Body",
    )
)
story.append(p("Hint: use ENCONTRAR, EXTRAE, IZQUIERDA, DERECHA, LARGO, VALOR y referencias a delimitadores. Evite Texto en columnas.", "Hint"))

story.append(p("Diferencia clave: Doc versus USD", "HeadingSmall"))
story.append(
    p(
        "En esta base la venta puede estar emitida en distintas monedas, pero el costo unitario del catálogo está siempre en USD. Por eso existen dos columnas de tipo de cambio y no se deben intercambiar.",
        "Body",
    )
)
fx_explain_rows = [
    [c("Columna", True), c("Qué busca", True), c("Para qué se usa", True)],
    [
        c("Tipo_Cambio_Doc_CLP"),
        c("Busca el tipo de cambio de la moneda del documento: CLP, USD, EUR o CAD."),
        c("Convertir ventas, descuentos, pagos y saldos desde la moneda del documento a CLP."),
    ],
    [
        c("Tipo_Cambio_USD_CLP"),
        c("Busca siempre el tipo de cambio USD del mismo mes, aunque el documento esté en EUR, CAD o CLP."),
        c("Convertir el costo unitario del producto, porque Costo_Unitario_USD está expresado siempre en dólares."),
    ],
]
fx_explain_t = Table(fx_explain_rows, colWidths=[4.0 * cm, 5.7 * cm, 5.7 * cm])
fx_explain_t.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B7B7B7")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#B7DEE8")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
    )
)
story.append(fx_explain_t)
story.append(
    p(
        "Importante: si la moneda del documento es CLP, Tipo_Cambio_Doc_CLP debe ser 1. Si la moneda del documento es USD, Tipo_Cambio_Doc_CLP y Tipo_Cambio_USD_CLP deben coincidir. Si la moneda del documento es EUR o CAD, normalmente serán distintos.",
        "Hint",
    )
)

story.append(PageBreak())

story.append(p("Pregunta 1: Consolidación, ampliación y análisis con fórmulas (8 puntos)", "HeadingBlue"))
story.append(
    p(
        "Trabaje principalmente en Registro_Balances y Resumen_Formulas. Complete únicamente las columnas y celdas marcadas en amarillo. La base debe quedar automatizada para que cualquier cambio en catálogos o parámetros se refleje en los resultados.",
        "BodyJustify",
    )
)
items_p1 = [
    "<b>(1,2 pts)</b> Extraiga desde Codigo_Operacion los campos ID_Ejecutivo, ID_Cliente, ID_Producto, Codigo_Region, Moneda y Precio_Unitario_Origen. El precio debe quedar como valor numérico utilizable en cálculos.",
    "<b>(0,8 pts)</b> Calcule Fecha_Vencimiento sumando Dias_Credito a Fecha_Emision y cree Fecha_Mes normalizada al día 01 del mes correspondiente.",
    "<b>(1,2 pts)</b> Use funciones de búsqueda para completar Nombre_Ejecutivo, Cargo_Ejecutivo, Razon_Social_Cliente, Industria_Cliente, Region_Cliente, Nombre_Producto, Categoria_Producto, Subcategoria_Producto y Costo_Unitario_USD.",
    "<b>(1,0 pts)</b> Recupere desde Tipo_Cambio el Tipo_Cambio_Doc_CLP según Fecha_Mes y Moneda. Además, recupere Tipo_Cambio_USD_CLP para convertir los costos unitarios expresados en USD.",
    "<b>(1,4 pts)</b> Calcule Venta_Bruta_CLP, Descuento_CLP, Venta_Neta_CLP, Costo_Total_CLP, Margen_CLP, Margen_% y Monto_Pagado_CLP. Use fórmulas auditables, no números escritos manualmente dentro del cálculo.",
    "<b>(1,2 pts)</b> Calcule Balance_CLP, Dias_Atraso, Estado_Cobro, Check_Region, Tramo_Atraso y Riesgo_Balance. La fecha de corte debe venir desde Parametros. Check_Region debe indicar Correcto si la región del documento pertenece a las regiones autorizadas del ejecutivo.",
    "<b>(1,2 pts)</b> Complete Resumen_Formulas: Tabla 1 con estadística descriptiva del Balance_CLP, Tabla 2 por categoría, Tabla 3 con funciones condicionales y el gráfico combinado de Venta Neta CLP y Margen % promedio por categoría.",
]
for line in items_p1:
    story.append(p(line, "Body"))
story.append(p("Hint: para cuartiles puede usar CUARTIL.EXC o PERCENTIL.EXC; para condicionales use SUMAR.SI.CONJUNTO, PROMEDIO.SI.CONJUNTO, CONTAR.SI.CONJUNTO, MAX.SI.CONJUNTO o combinaciones equivalentes.", "Hint"))

story.append(p("Directrices de precisión para el desarrollo", "HeadingSmall"))
story.append(
    p(
        "Las siguientes directrices buscan evitar ambigüedades, pero no reemplazan el desarrollo con fórmulas propias. El estudiante debe escoger las funciones adecuadas, construir referencias correctas y verificar los formatos.",
        "Body",
    )
)
calc_rows = [[c("Elemento", True), c("Criterio que debe cumplir", True)]]
calc_rows.extend(
    [
        [c("Extracción desde Codigo_Operacion"), c("Extraiga ID_Ejecutivo, precio, moneda, cliente, región y producto usando funciones de texto. El precio debe quedar como número utilizable.")],
        [c("Fecha_Mes"), c("Construya una fecha mensual normalizada con día 01 para usarla como llave contra la tabla Tipo_Cambio.")],
        [c("Tipo_Cambio_Doc_CLP"), c("Debe traer el tipo de cambio correspondiente a la moneda del documento y a su Fecha_Mes. Si la moneda es CLP, el resultado esperado es 1.")],
        [c("Tipo_Cambio_USD_CLP"), c("Debe traer el dólar del mismo mes, aunque el documento esté en CLP, EUR o CAD, porque el costo unitario está expresado en USD.")],
        [c("Venta_Bruta_CLP"), c("Debe considerar precio unitario de origen, cantidad y tipo de cambio de la moneda del documento.")],
        [c("Descuento_CLP y Venta_Neta_CLP"), c("El descuento se calcula sobre la venta bruta; la venta neta corresponde a la venta después del descuento.")],
        [c("Costo_Total_CLP"), c("Debe calcularse desde Costo_Unitario_USD, cantidad y tipo de cambio USD del mes.")],
        [c("Margen_CLP y Margen_%"), c("El margen monetario compara venta neta contra costo total. El margen porcentual debe quedar en formato porcentaje con dos decimales.")],
        [c("Monto_Pagado_CLP y Balance_CLP"), c("El pago se convierte desde la moneda del documento. El balance representa el saldo pendiente de cobro.")],
        [c("Estado_Cobro, Tramo_Atraso y Riesgo_Balance"), c("Use Fecha_Corte de Parametros para clasificar documentos pagados, pendientes o vencidos; luego agrupe el atraso por tramo y clasifique el riesgo considerando monto pendiente y días de atraso.")],
        [c("Check_Region"), c("Debe comparar la región de la operación contra las regiones autorizadas del ejecutivo. Tenga cuidado con coincidencias parciales entre códigos de región.")],
    ]
)
calc_t = Table(calc_rows, colWidths=[4.4 * cm, 11.0 * cm], repeatRows=1)
calc_t.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B7B7B7")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#B7DEE8")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
    )
)
story.append(calc_t)

story.append(PageBreak())

story.append(p("Pregunta 2: Tablas Dinámicas para toma de decisiones (6 puntos)", "HeadingBlue"))
story.append(
    p(
        "Una vez consolidada la base, responda las consultas de la hoja Respuestas_TD usando exclusivamente Tablas Dinámicas. Salvo que se indique lo contrario, excluya documentos con Estado_Documento = Cancelada. Puede crear las hojas auxiliares de tablas dinámicas que estime necesarias.",
        "BodyJustify",
    )
)
story.append(p("Se evaluará que las respuestas provengan de pivots y que los filtros, campos, valores y formatos sean coherentes con la consulta.", "Body"))

td_questions = [
    "Cliente con mayor Balance CLP acumulado, excluyendo documentos Cancelada.",
    "Industria con mayor Venta Neta CLP durante 2025.",
    "Ejecutivo con mayor Margen CLP durante 2026.",
    "Categoría con mayor Margen % promedio del período.",
    "Porcentaje de documentos con Check_Region = Incorrecto.",
    "Tramo de atraso que concentra el mayor Balance CLP.",
    "Producto con mayor Venta Neta CLP acumulada en 2025.",
    "Mes con mayor Balance CLP vencido.",
    "Industria con mayor crecimiento de Venta Neta CLP entre 2024 y 2025.",
    "Top 3 clientes que explican mayor Balance CLP pendiente.",
]
td_rows = [[c("#", True), c("Consulta", True)]]
td_rows.extend([[c(str(i)), c(q)] for i, q in enumerate(td_questions, start=1)])
td_t = Table(td_rows, colWidths=[1.1 * cm, 14.3 * cm])
td_t.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B7B7B7")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#B7DEE8")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
    )
)
story.append(td_t)
story.append(Spacer(1, 6))
story.append(p("Directriz de evaluación para Tablas Dinámicas", "HeadingSmall"))
story.append(
    p(
        "No escriba las respuestas a mano ni las obtenga únicamente con fórmulas condicionales. Cree las tablas dinámicas necesarias desde la base consolidada, aplique los filtros correspondientes y registre la respuesta final en Respuestas_TD.",
        "Body",
    )
)
story.append(p("Hint: ordene de mayor a menor cuando se pida identificar máximos, use filtros de año o estado cuando la pregunta lo indique y utilice 'Mostrar valores como' cuando deba expresar un resultado como porcentaje.", "Hint"))
story.append(Spacer(1, 6))
story.append(p("Puntaje sugerido: 4,0 pts por respuestas correctas, 1,0 pto por uso apropiado de filtros/campos de valor y 1,0 pto por formato, orden y trazabilidad de las tablas dinámicas.", "Small"))

story.append(PageBreak())

story.append(p("Pregunta 3: Dashboard ejecutivo de balances (6 puntos)", "HeadingBlue"))
story.append(
    p(
        "Construya la hoja Dashboard para que un usuario ejecutivo pueda entender la situación de ventas, márgenes y balances sin revisar los 1.800 documentos de la base. El panel debe ser funcional, visualmente ordenado e interactivo.",
        "BodyJustify",
    )
)

story.append(p("3.1 Indicadores ejecutivos mínimos (1,2 pts)", "HeadingSmall"))
for item in [
    "Venta Neta CLP.",
    "Balance CLP pendiente.",
    "Margen % consolidado.",
    "Balance Vencido / Balance Total.",
    "Cantidad de documentos o clientes con saldo pendiente, si el espacio lo permite.",
]:
    story.append(bullet(item))
story.append(p("Hint: los indicadores deben responder a los segmentadores. Para porcentajes consolidados, asegúrese de que el cálculo represente el total filtrado y no una lectura visual aislada de una fila.", "Hint"))

story.append(p("3.2 Gráficos dinámicos solicitados (2,4 pts)", "HeadingSmall"))
for item in [
    "Gráfico de barras: Balance CLP por Industria_Cliente.",
    "Gráfico de líneas o combinado: Venta Neta CLP mensual y Balance CLP pendiente.",
    "Gráfico de torta o dona: participación del Balance CLP por Estado_Cobro.",
    "Gráfico de barras: Top 10 clientes por Balance CLP pendiente.",
]:
    story.append(bullet(item))

story.append(p("3.3 Segmentadores y conexión del panel (1,2 pts)", "HeadingSmall"))
story.append(
    p(
        "Incluya segmentadores para Año, Estado_Documento, Industria_Cliente, Categoria_Producto, Nombre_Ejecutivo, Region_Cliente y Tramo_Atraso. Los segmentadores deben afectar simultáneamente todos los KPIs y gráficos dinámicos del Dashboard.",
        "Body",
    )
)

story.append(p("3.4 Presentación ejecutiva (1,2 pts)", "HeadingSmall"))
for item in [
    "El dashboard debe caber en una sola hoja visual, sin obligar a revisar la base completa.",
    "Use títulos claros, unidades visibles y formatos consistentes.",
    "Evite gráficos redundantes y asegure que cada visual responda una pregunta distinta.",
    "No deje tablas dinámicas extensas visibles dentro del Dashboard; ubíquelas en hojas auxiliares si es necesario.",
]:
    story.append(bullet(item))

story.append(p("Checklist final antes de terminar", "HeadingBlue"))
for item in [
    "No hay celdas amarillas importantes vacías en Registro_Balances o Resumen_Formulas.",
    "Las columnas calculadas se actualizan si cambia una tabla suplementaria.",
    "Las tablas dinámicas excluyen Cancelada cuando corresponde.",
    "Los gráficos dinámicos tienen títulos, unidades y filtros conectados.",
    "El Dashboard permite entender ventas, márgenes y balances sin leer el detalle completo.",
    "Los formatos de moneda, porcentaje, fecha y número son consistentes.",
]:
    story.append(bullet(item))

doc.build(story)
print(PDF_PATH)
