import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:\\Users\\balca\\Downloads\\Preparación examen";
const previewDir = "C:\\Users\\balca\\Documents\\Cotidie\\tmp\\preparacion_examen\\previews";
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

function rng(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const random = rng(20260708);
const pick = (arr) => arr[Math.floor(random() * arr.length)];
const round = (n, d = 0) => Number(n.toFixed(d));
const pad = (n, size = 3) => String(n).padStart(size, "0");

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateAdd(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function colLetter(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

function rangeAddress(startRow, startCol, rowCount, colCount) {
  const a = `${colLetter(startCol)}${startRow}`;
  const b = `${colLetter(startCol + colCount - 1)}${startRow + rowCount - 1}`;
  return `${a}:${b}`;
}

function setTitle(sheet, address, title, subtitle = "") {
  const range = sheet.getRange(address);
  range.merge();
  range.values = [[subtitle ? `${title}\n${subtitle}` : title]];
  range.format = {
    fill: "#1F4E78",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  range.format.rowHeight = subtitle ? 42 : 30;
}

function styleHeader(range, fill = "#C6EFCE", fontColor = "#000000") {
  range.format = {
    fill,
    font: { bold: true, color: fontColor },
    wrapText: true,
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: { preset: "outside", style: "medium", color: "#7F7F7F" },
  };
}

function styleAnswer(range) {
  range.format = {
    fill: "#FFF2CC",
    borders: { preset: "outside", style: "thin", color: "#B7B7B7" },
    verticalAlignment: "center",
  };
}

function styleAuxTitle(range) {
  range.format = {
    fill: "#D9D2E9",
    font: { bold: true, color: "#000000" },
    wrapText: true,
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: { preset: "outside", style: "medium", color: "#7F7F7F" },
  };
}

function finishSheet(sheet) {
  sheet.showGridLines = false;
}

const workbook = Workbook.create();

const regions = [
  ["RM", "Metropolitana"],
  ["V", "Valparaíso"],
  ["VIII", "Biobío"],
  ["II", "Antofagasta"],
  ["X", "Los Lagos"],
  ["IX", "Araucanía"],
  ["IV", "Coquimbo"],
  ["XVI", "Ñuble"],
];

const industries = [
  "Retail",
  "Salud",
  "Educación",
  "Minería",
  "Servicios Financieros",
  "Manufactura",
  "Tecnología",
  "Agroindustria",
];

const segments = ["Corporativo", "Mediana Empresa", "Institucional", "Premium", "Emergente"];

const clientNames = [
  "Andes Retail SPA",
  "Clínica Nueva Cordillera",
  "Colegio San Gabriel",
  "Minera Los Altos",
  "Finanzas Sur Ltda",
  "Manufacturas Pacífico",
  "Servicios Digitales Norte",
  "Agrofrutícola Valle Claro",
  "Comercial Puerto Central",
  "Hospital Santa Elena",
  "Universidad del Valle",
  "Minerales del Desierto",
  "Banco Horizonte",
  "Industrial Aconcagua",
  "Nube Austral SPA",
  "Viñas del Mar Interior",
  "Tiendas Patagonia",
  "Laboratorio BioSalud",
  "Instituto Los Robles",
  "Cobre y Energía Chile",
  "Capitales Andinos",
  "Envases del Sur",
  "DataCenter Cordillera",
  "Exportadora Campo Vivo",
  "Mercado Urbano SPA",
  "Red Médica Austral",
  "Fundación Educa Norte",
  "Servicios Mineros Pacífico",
  "Cooperativa Financiera Uno",
  "Textiles del Biobío",
  "Software Ranco",
  "Alimentos Costa Verde",
  "Inversiones Plaza Mayor",
  "Clínica Los Olivos",
  "Liceo Técnico Futuro",
  "Geología Aplicada SPA",
  "Seguros Nueva Era",
  "Maestranza Norte Grande",
  "CloudWorks Chile",
  "Frutícola Santa Clara",
  "Outlet Cordillera",
  "Centro Médico Alameda",
  "Academia del Pacífico",
  "Servicios de Perforación Sur",
  "Pagos Digitales Chile",
  "Metalúrgica Bahía",
  "Automatiza SPA",
  "Agrosemillas del Norte",
  "Supermercados El Faro",
  "Dental Integral Chile",
  "Preuniversitario Horizonte",
  "Minera Ruta del Cobre",
  "Leasing Los Andes",
  "Plásticos Llanquihue",
  "Robótica Aplicada SPA",
  "Lácteos Campo Alto",
  "Comercial La Plaza",
  "Centro Oftalmológico Sur",
  "Colegio Nueva Esperanza",
  "Energía y Minerales Ltda",
];

const clients = clientNames.map((name, idx) => {
  const [regionCode, regionName] = regions[idx % regions.length];
  return {
    id: `CLI-${pad(idx + 1)}`,
    name,
    industry: industries[idx % industries.length],
    segment: segments[idx % segments.length],
    regionCode,
    regionName,
    creditLimit: 45000000 + (idx % 12) * 8500000 + Math.floor(random() * 6000000),
    risk: ["Bajo", "Medio", "Alto"][idx % 3],
  };
});

const productFamilies = [
  ["ERP Cloud", "Software", "Licencias"],
  ["CRM Ejecutivo", "Software", "Licencias"],
  ["Mesa de Ayuda 24/7", "Servicios", "Soporte"],
  ["Ciberseguridad Gestionada", "Servicios", "Seguridad"],
  ["Servidor Edge Pro", "Hardware", "Infraestructura"],
  ["Notebook Rugged", "Hardware", "Equipamiento"],
  ["Analítica BI", "Software", "Datos"],
  ["Integración API", "Servicios", "Integración"],
  ["Firewall Industrial", "Hardware", "Seguridad"],
  ["Capacitación Data", "Servicios", "Formación"],
  ["Licencia Office Empresa", "Software", "Productividad"],
  ["Storage Híbrido", "Hardware", "Infraestructura"],
  ["Monitoreo IoT", "Software", "Operaciones"],
  ["Implementación ERP", "Servicios", "Consultoría"],
  ["Switch Administrable", "Hardware", "Redes"],
  ["Backup Cloud", "Software", "Continuidad"],
  ["Soporte On-site", "Servicios", "Soporte"],
  ["Router 5G Empresarial", "Hardware", "Redes"],
  ["Data Warehouse", "Software", "Datos"],
  ["Auditoría Seguridad", "Servicios", "Seguridad"],
  ["Sensor Industrial", "Hardware", "IoT"],
  ["Automatización RPA", "Software", "Productividad"],
  ["Migración Cloud", "Servicios", "Cloud"],
  ["Cámara Térmica IP", "Hardware", "Seguridad"],
];

const products = productFamilies.map((p, idx) => {
  const list = 120 + (idx % 8) * 95 + Math.floor(random() * 80);
  const cost = round(list * (0.52 + (idx % 5) * 0.045), 0);
  return {
    id: `PROD-${pad(idx + 1)}`,
    name: p[0],
    category: p[1],
    subcategory: p[2],
    costUsd: cost,
    listUsd: list,
    strategic: idx % 4 === 0 ? "Sí" : "No",
  };
});

const executives = [
  ["VEN-01", "Catalina Pérez Soto", "Ejecutiva Comercial", "Norte", "II;IV;RM"],
  ["VEN-02", "Martín Silva Rojas", "Key Account Manager", "Centro", "RM;V;XVI"],
  ["VEN-03", "Isidora Fuentes Lara", "Ejecutiva Comercial", "Sur", "VIII;IX;X"],
  ["VEN-04", "Tomás Herrera Molina", "Jefe Comercial", "Centro", "RM;V;VIII"],
  ["VEN-05", "Fernanda Morales Díaz", "Ejecutiva Comercial", "Norte", "II;IV;V"],
  ["VEN-06", "Benjamín Torres Vidal", "Key Account Manager", "Sur", "VIII;IX;X;XVI"],
  ["VEN-07", "Javiera Contreras León", "Ejecutiva Comercial", "Especialistas", "RM;II;VIII"],
  ["VEN-08", "Nicolás Riquelme Vera", "Ejecutivo Comercial", "Centro", "RM;V;IV"],
  ["VEN-09", "Josefa Araya Muñoz", "Jefa Comercial", "Sur", "VIII;IX;X;RM"],
  ["VEN-10", "Diego Valdés Peña", "Ejecutivo Comercial", "Especialistas", "RM;V;II;XVI"],
  ["VEN-11", "Camila Bustos Gálvez", "Key Account Manager", "Corporativo", "RM;V;VIII;II"],
  ["VEN-12", "Rodrigo Aguilera Paz", "Gerente de Ventas", "Nacional", "RM;V;VIII;II;X;IX;IV;XVI"],
].map((e, idx) => ({
  id: e[0],
  name: e[1],
  role: e[2],
  team: e[3],
  regions: e[4],
  monthlyGoal: 85000000 + idx * 5500000,
}));

const currencies = ["USD", "EUR", "CAD", "CLP"];
const fxRows = [];
for (let y = 2024; y <= 2026; y += 1) {
  const lastMonth = y === 2026 ? 6 : 12;
  for (let m = 0; m < lastMonth; m += 1) {
    const date = new Date(y, m, 1);
    const trend = (y - 2024) * 22 + m * 2.5;
    const usd = round(872 + trend + Math.sin(m / 2) * 18 + (random() - 0.5) * 16, 2);
    const eur = round(usd * (1.06 + Math.sin(m) * 0.015), 2);
    const cad = round(usd * (0.73 + Math.cos(m / 2) * 0.012), 2);
    fxRows.push([date, "USD", usd]);
    fxRows.push([date, "EUR", eur]);
    fxRows.push([date, "CAD", cad]);
    fxRows.push([date, "CLP", 1]);
  }
}

function fxFor(date, currency) {
  const m = monthStart(date).getTime();
  const row = fxRows.find((r) => r[0].getTime() === m && r[1] === currency);
  return row ? row[2] : 1;
}

const corte = new Date(2026, 5, 30);
const statuses = ["Facturada", "Pagada", "Parcial", "Vencida", "Cancelada"];
const statusWeights = [0.30, 0.32, 0.18, 0.16, 0.04];
function weightedStatus() {
  const v = random();
  let acc = 0;
  for (let i = 0; i < statuses.length; i += 1) {
    acc += statusWeights[i];
    if (v <= acc) return statuses[i];
  }
  return statuses[statuses.length - 1];
}

function weightedCurrency() {
  const v = random();
  if (v < 0.49) return "USD";
  if (v < 0.70) return "EUR";
  if (v < 0.86) return "CAD";
  return "CLP";
}

const registroHeaders = [
  "ID_Documento",
  "Fecha_Emision",
  "Codigo_Operacion",
  "ID_Ejecutivo",
  "ID_Cliente",
  "ID_Producto",
  "Codigo_Region",
  "Moneda",
  "Precio_Unitario_Origen",
  "Cantidad",
  "Descuento_%",
  "Estado_Documento",
  "Monto_Pagado_Origen",
  "Dias_Credito",
  "Fecha_Vencimiento",
  "Fecha_Mes",
  "Nombre_Ejecutivo",
  "Cargo_Ejecutivo",
  "Razon_Social_Cliente",
  "Industria_Cliente",
  "Region_Cliente",
  "Nombre_Producto",
  "Categoria_Producto",
  "Subcategoria_Producto",
  "Costo_Unitario_USD",
  "Tipo_Cambio_Doc_CLP",
  "Tipo_Cambio_USD_CLP",
  "Venta_Bruta_CLP",
  "Descuento_CLP",
  "Venta_Neta_CLP",
  "Costo_Total_CLP",
  "Margen_CLP",
  "Margen_%",
  "Monto_Pagado_CLP",
  "Balance_CLP",
  "Dias_Atraso",
  "Estado_Cobro",
  "Check_Region",
  "Tramo_Atraso",
  "Riesgo_Balance",
];

const generatedRows = [];
for (let i = 1; i <= 1800; i += 1) {
  const date = dateAdd(new Date(2024, 0, 1), Math.floor(random() * daysBetween(new Date(2024, 0, 1), new Date(2026, 5, 30))));
  const executive = pick(executives);
  const client = pick(clients);
  const product = pick(products);
  const region = random() < 0.82 ? client.regionCode : pick(regions)[0];
  const currency = weightedCurrency();
  const quantity = 1 + Math.floor(random() * 46);
  const priceOrigin = currency === "CLP"
    ? round(product.listUsd * fxFor(date, "USD") * (0.85 + random() * 0.35), 0)
    : round(product.listUsd * (0.86 + random() * 0.35), 0);
  const discount = [0, 0.03, 0.05, 0.08, 0.10, 0.12, 0.15][Math.floor(random() * 7)];
  const status = weightedStatus();
  const creditDays = [15, 30, 45, 60, 75, 90][Math.floor(random() * 6)];
  const grossOrigin = priceOrigin * quantity;
  const netOrigin = grossOrigin * (1 - discount);
  let paidFactor = 0;
  if (status === "Pagada") paidFactor = 1;
  if (status === "Facturada") paidFactor = random() < 0.55 ? 0 : 0.25;
  if (status === "Parcial") paidFactor = 0.25 + random() * 0.55;
  if (status === "Vencida") paidFactor = random() < 0.75 ? 0 : 0.2;
  if (status === "Cancelada") paidFactor = 0;
  const paidOrigin = round(netOrigin * paidFactor, 0);
  const code = `${executive.id}Precio$${priceOrigin}Moneda/${currency}Cliente:${client.id}Region/${region}Producto:${product.id}`;
  generatedRows.push([
    `DOC-${pad(i, 4)}`,
    date,
    code,
    "",
    "",
    "",
    "",
    "",
    "",
    quantity,
    discount,
    status,
    paidOrigin,
    creditDays,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
}

const datos = workbook.worksheets.add("Datos_Personales");
finishSheet(datos);
setTitle(datos, "B1:E1", "Data Analytics I", "Preparación Examen - Datos Personales");
datos.getRange("B3:C8").values = [
  ["Nombre", ""],
  ["Apellidos", ""],
  ["RUT", ""],
  ["Sección", ""],
  ["Fecha de práctica", new Date(2026, 6, 10)],
  ["Firma", ""],
];
styleHeader(datos.getRange("B3:B8"), "#D9EAD3");
styleAnswer(datos.getRange("C3:C8"));
datos.getRange("C7").format.numberFormat = "yyyy-mm-dd";
datos.getRange("B10:E13").values = [
  ["Guía visual", "", "", ""],
  ["Verde claro", "Título, columna o gráfico que debe desarrollarse", "", ""],
  ["Amarillo", "Celda de respuesta o cálculo requerido", "", ""],
  ["Morado", "Tabla suplementaria o catálogo de apoyo", "", ""],
];
styleHeader(datos.getRange("B10:E10"), "#B7DEE8");
datos.getRange("B11:B11").format.fill = "#C6EFCE";
datos.getRange("B12:B12").format.fill = "#FFF2CC";
datos.getRange("B13:B13").format.fill = "#D9D2E9";
datos.getRange("B3:E13").format.borders = { preset: "outside", style: "medium", color: "#7F7F7F" };
datos.getRange("B1:E13").format.columnWidth = 24;

const reg = workbook.worksheets.add("Registro_Balances");
finishSheet(reg);
reg.freezePanes.freezeRows(1);
reg.getRange(rangeAddress(1, 1, 1, registroHeaders.length)).values = [registroHeaders];
reg.getRange(rangeAddress(2, 1, generatedRows.length, registroHeaders.length)).values = generatedRows;
const regRange = rangeAddress(1, 1, generatedRows.length + 1, registroHeaders.length);
reg.tables.add(regRange, true, "tblRegistroBalances");
styleHeader(reg.getRange("A1:AN1"), "#C6EFCE");
reg.getRange("A1:AN1").format.rowHeight = 44;
reg.getRange("A2:C1801").format.fill = "#FFFFFF";
reg.getRange("J2:N1801").format.fill = "#FFFFFF";
styleAnswer(reg.getRange("D2:I1801"));
styleAnswer(reg.getRange("O2:AN1801"));
reg.getRange("B2:B1801").format.numberFormat = "yyyy-mm-dd";
reg.getRange("K2:K1801").format.numberFormat = "0.00%";
reg.getRange("M2:M1801").format.numberFormat = "#,##0";
reg.getRange("I2:I1801").format.numberFormat = "#,##0";
reg.getRange("Z2:AI1801").format.numberFormat = "$#,##0";
reg.getRange("AG2:AG1801").format.numberFormat = "0.00%";
reg.getRange("AJ2:AJ1801").format.numberFormat = "#,##0";
reg.getRange("A1:AN1801").format.columnWidth = 15;
reg.getRange("C1:C1801").format.columnWidth = 58;
reg.getRange("Q1:X1801").format.columnWidth = 22;
reg.getRange("A1:AN1801").format.wrapText = false;

const clientes = workbook.worksheets.add("Catalogo_Clientes");
finishSheet(clientes);
setTitle(clientes, "B1:I1", "Tabla Suplementaria 1", "Catálogo de Clientes");
const clienteHeaders = ["ID_Cliente", "Razon_Social_Cliente", "Industria", "Segmento", "Codigo_Region", "Region_Cliente", "Limite_Credito_CLP", "Riesgo_Cliente"];
clientes.getRange("B3:I3").values = [clienteHeaders];
clientes.getRange(`B4:I${clients.length + 3}`).values = clients.map((c) => [c.id, c.name, c.industry, c.segment, c.regionCode, c.regionName, c.creditLimit, c.risk]);
styleAuxTitle(clientes.getRange("B3:I3"));
clientes.tables.add(`B3:I${clients.length + 3}`, true, "tblClientes");
clientes.getRange(`H4:H${clients.length + 3}`).format.numberFormat = "$#,##0";
clientes.getRange(`B1:I${clients.length + 3}`).format.columnWidth = 22;
clientes.freezePanes.freezeRows(3);

const productos = workbook.worksheets.add("Catalogo_Productos");
finishSheet(productos);
setTitle(productos, "B1:H1", "Tabla Suplementaria 2", "Catálogo de Productos");
const productoHeaders = ["ID_Producto", "Nombre_Producto", "Categoria_Producto", "Subcategoria", "Costo_Unitario_USD", "Precio_Lista_USD", "Producto_Estrategico"];
productos.getRange("B3:H3").values = [productoHeaders];
productos.getRange(`B4:H${products.length + 3}`).values = products.map((p) => [p.id, p.name, p.category, p.subcategory, p.costUsd, p.listUsd, p.strategic]);
styleAuxTitle(productos.getRange("B3:H3"));
productos.tables.add(`B3:H${products.length + 3}`, true, "tblProductos");
productos.getRange(`F4:G${products.length + 3}`).format.numberFormat = "$#,##0";
productos.getRange(`B1:H${products.length + 3}`).format.columnWidth = 24;
productos.freezePanes.freezeRows(3);

const vendedores = workbook.worksheets.add("Catalogo_Ejecutivos");
finishSheet(vendedores);
setTitle(vendedores, "B1:H1", "Tabla Suplementaria 3", "Información de Ejecutivos");
const vendedorHeaders = ["ID_Ejecutivo", "Nombre_Ejecutivo", "Cargo", "Equipo", "Regiones_Autorizadas", "Meta_Mensual_CLP", "Supervisor"];
vendedores.getRange("B3:H3").values = [vendedorHeaders];
vendedores.getRange(`B4:H${executives.length + 3}`).values = executives.map((v, idx) => [
  v.id,
  v.name,
  v.role,
  v.team,
  v.regions,
  v.monthlyGoal,
  idx < 9 ? "Rodrigo Aguilera Paz" : "Dirección Comercial",
]);
styleAuxTitle(vendedores.getRange("B3:H3"));
vendedores.tables.add(`B3:H${executives.length + 3}`, true, "tblEjecutivos");
vendedores.getRange(`G4:G${executives.length + 3}`).format.numberFormat = "$#,##0";
vendedores.getRange(`B1:H${executives.length + 3}`).format.columnWidth = 25;
vendedores.freezePanes.freezeRows(3);

const fx = workbook.worksheets.add("Tipo_Cambio");
finishSheet(fx);
setTitle(fx, "B1:D1", "Tabla Suplementaria 4", "Tipo de cambio mensual a CLP");
fx.getRange("B3:D3").values = [["Fecha_Mes", "Moneda", "Tipo_Cambio_CLP"]];
fx.getRange(`B4:D${fxRows.length + 3}`).values = fxRows;
styleAuxTitle(fx.getRange("B3:D3"));
fx.tables.add(`B3:D${fxRows.length + 3}`, true, "tblTipoCambio");
fx.getRange(`B4:B${fxRows.length + 3}`).format.numberFormat = "yyyy-mm-dd";
fx.getRange(`D4:D${fxRows.length + 3}`).format.numberFormat = "#,##0.00";
fx.getRange(`B1:D${fxRows.length + 3}`).format.columnWidth = 22;
fx.freezePanes.freezeRows(3);

const parametros = workbook.worksheets.add("Parametros");
finishSheet(parametros);
setTitle(parametros, "B1:E1", "Parámetros de la evaluación", "Use estas celdas como referencias en sus fórmulas");
parametros.getRange("B3:E9").values = [
  ["Parámetro", "Valor", "Uso esperado", ""],
  ["Fecha_Corte", corte, "Calcular días de atraso y tramos de antigüedad", ""],
  ["Umbral_Riesgo_Alto_CLP", 18000000, "Clasificar saldos de mayor riesgo", ""],
  ["Umbral_Riesgo_Medio_CLP", 8000000, "Clasificar saldos intermedios", ""],
  ["Excluir_Estado", "Cancelada", "Excluir de tablas dinámicas y dashboard", ""],
  ["Moneda_Base", "CLP", "Todas las métricas financieras finales", ""],
  ["Nota", "No pegue valores estáticos en celdas amarillas.", "", ""],
];
styleHeader(parametros.getRange("B3:E3"), "#B7DEE8");
styleAnswer(parametros.getRange("C4:C8"));
parametros.getRange("C4").format.numberFormat = "yyyy-mm-dd";
parametros.getRange("C5:C6").format.numberFormat = "$#,##0";
parametros.getRange("B1:E9").format.columnWidth = 28;

const resumen = workbook.worksheets.add("Resumen_Formulas");
finishSheet(resumen);
setTitle(resumen, "B1:J1", "Pregunta 1", "Resumen con fórmulas, funciones condicionales y gráfico combinado");
resumen.getRange("B3:C13").values = [
  ["Tabla 1. Resumen estadístico sobre Balance_CLP", ""],
  ["N documentos válidos", ""],
  ["Balance total CLP", ""],
  ["Balance promedio CLP", ""],
  ["Mediana Balance CLP", ""],
  ["Mínimo Balance CLP", ""],
  ["Máximo Balance CLP", ""],
  ["Primer cuartil", ""],
  ["Tercer cuartil", ""],
  ["Rango intercuartil", ""],
  ["Desviación estándar", ""],
];
resumen.getRange("B3:C3").merge();
styleHeader(resumen.getRange("B3:C3"), "#C6EFCE");
styleAnswer(resumen.getRange("C4:C13"));
resumen.getRange("C5:C13").format.numberFormat = "$#,##0";
resumen.getRange("E3:I3").values = [["Tabla 2. Análisis por categoría", "", "", "", ""]];
resumen.getRange("E3:I3").merge();
styleHeader(resumen.getRange("E3:I3"), "#C6EFCE");
resumen.getRange("E4:I4").values = [["Categoría", "Venta Neta CLP", "Balance CLP", "Margen % Promedio", "% Balance Vencido"]];
styleHeader(resumen.getRange("E4:I4"), "#B7DEE8");
resumen.getRange("E5:E8").values = [["Software"], ["Servicios"], ["Hardware"], ["Total"]];
styleAnswer(resumen.getRange("F5:I8"));
resumen.getRange("F5:H8").format.numberFormat = "$#,##0";
resumen.getRange("H5:I8").format.numberFormat = "0.00%";
resumen.getRange("B16:J16").values = [["Tabla 3. Preguntas finales usando funciones condicionales", "", "", "", "", "", "", "", ""]];
resumen.getRange("B16:J16").merge();
styleHeader(resumen.getRange("B16:J16"), "#C6EFCE");
resumen.getRange("B17:J23").values = [
  ["#", "Pregunta", "Respuesta", "Unidad/Formato", "", "", "", "", ""],
  [1, "¿Cuál es el Balance CLP pendiente de clientes Retail en Región Metropolitana?", "", "Moneda", "", "", "", "", ""],
  [2, "¿Cuántos documentos en EUR están en estado Vencida?", "", "Conteo", "", "", "", "", ""],
  [3, "¿Cuál es el Margen % promedio de Software para clientes de Salud?", "", "Porcentaje", "", "", "", "", ""],
  [4, "¿Qué ID_Documento tiene el mayor Balance CLP?", "", "Texto", "", "", "", "", ""],
  [5, "¿Cuántas operaciones tienen Check_Region Incorrecto?", "", "Conteo", "", "", "", "", ""],
  [6, "¿Cuál es la suma de Venta Neta CLP de productos estratégicos?", "", "Moneda", "", "", "", "", ""],
];
styleHeader(resumen.getRange("B17:E17"), "#B7DEE8");
styleAnswer(resumen.getRange("D18:D23"));
resumen.getRange("B26:J42").values = [["Área para gráfico combinado: Venta Neta CLP en columnas y Margen % promedio en línea por Categoría de Producto", "", "", "", "", "", "", "", ""]];
resumen.getRange("B26:J42").merge();
styleHeader(resumen.getRange("B26:J42"), "#C6EFCE");
resumen.getRange("B1:J42").format.columnWidth = 18;
resumen.getRange("B1:B42").format.columnWidth = 8;
resumen.getRange("C1:C42").format.columnWidth = 72;
resumen.getRange("D1:D42").format.columnWidth = 24;
resumen.getRange("E1:E42").format.columnWidth = 18;
resumen.getRange("C18:C23").format.wrapText = true;
resumen.getRange("B18:E23").format.rowHeight = 34;

const td = workbook.worksheets.add("Respuestas_TD");
finishSheet(td);
setTitle(td, "B1:F1", "Pregunta 2", "Consultas estratégicas usando exclusivamente Tablas Dinámicas");
td.getRange("B3:F3").values = [["#", "Consulta de Gerencia", "Respuesta final", "Hoja/TD usada", "No utilizar"]];
styleHeader(td.getRange("B3:F3"), "#B7DEE8");
const tdQuestions = [
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
];
td.getRange(`B4:F${tdQuestions.length + 3}`).values = tdQuestions.map((q, idx) => [idx + 1, q, "", "", "No utilizar"]);
styleAnswer(td.getRange(`D4:E${tdQuestions.length + 3}`));
td.getRange(`F4:F${tdQuestions.length + 3}`).format.fill = "#D9D9D9";
td.getRange("B1:F14").format.columnWidth = 24;
td.getRange("C1:C14").format.columnWidth = 68;
td.getRange("C4:C13").format.wrapText = true;
td.freezePanes.freezeRows(3);

const dash = workbook.worksheets.add("Dashboard");
finishSheet(dash);
setTitle(dash, "B1:N1", "Pregunta 3", "Dashboard ejecutivo de balances comerciales");
dash.getRange("B3:N4").values = [["Construya aquí un panel que permita entender los balances sin revisar toda la base. Use Tablas Dinámicas, Gráficos Dinámicos y Segmentadores conectados.", "", "", "", "", "", "", "", "", "", "", "", ""]];
dash.getRange("B3:N4").merge();
styleHeader(dash.getRange("B3:N4"), "#D9EAD3");
dash.getRange("B6:D8").values = [["Venta Neta CLP", "", ""], ["Inserte KPI", "", ""], ["", "", ""]];
dash.getRange("E6:G8").values = [["Balance CLP", "", ""], ["Inserte KPI", "", ""], ["", "", ""]];
dash.getRange("H6:J8").values = [["Margen % Consolidado", "", ""], ["Inserte KPI", "", ""], ["", "", ""]];
dash.getRange("K6:N8").values = [["Balance Vencido / Balance Total", "", "", ""], ["Inserte KPI", "", "", ""], ["", "", "", ""]];
for (const addr of ["B6:D8", "E6:G8", "H6:J8", "K6:N8"]) {
  dash.getRange(addr).merge(true);
  styleAnswer(dash.getRange(addr));
}
dash.getRange("B10:G23").values = [["Gráfico dinámico 1: Balance CLP por Industria de Cliente", "", "", "", "", ""]];
dash.getRange("B10:G23").merge();
styleHeader(dash.getRange("B10:G23"), "#C6EFCE");
dash.getRange("I10:N23").values = [["Gráfico dinámico 2: Venta Neta CLP mensual y Balance CLP pendiente", "", "", "", "", ""]];
dash.getRange("I10:N23").merge();
styleHeader(dash.getRange("I10:N23"), "#C6EFCE");
dash.getRange("B25:G38").values = [["Gráfico dinámico 3: Participación del Balance CLP por Estado_Cobro", "", "", "", "", ""]];
dash.getRange("B25:G38").merge();
styleHeader(dash.getRange("B25:G38"), "#C6EFCE");
dash.getRange("I25:N38").values = [["Gráfico dinámico 4: Top 10 clientes por Balance CLP pendiente", "", "", "", "", ""]];
dash.getRange("I25:N38").merge();
styleHeader(dash.getRange("I25:N38"), "#C6EFCE");
dash.getRange("B40:N43").values = [["Segmentadores solicitados: Año, Estado_Documento, Industria_Cliente, Categoria_Producto, Nombre_Ejecutivo, Region_Cliente y Tramo_Atraso. Deben afectar todos los KPIs y gráficos.", "", "", "", "", "", "", "", "", "", "", "", ""]];
dash.getRange("B40:N43").merge();
styleAuxTitle(dash.getRange("B40:N43"));
dash.getRange("B1:N43").format.columnWidth = 16;

const supuestos = workbook.worksheets.add("Supuestos");
finishSheet(supuestos);
setTitle(supuestos, "B1:I1", "Supuestos utilizados", "Registre aquí criterios, fórmulas alternativas o decisiones razonables");
supuestos.getRange("B3:I3").values = [["Etapa", "Elemento", "Supuesto utilizado", "Justificación", "Fecha", "Revisado", "Comentario", ""]];
styleHeader(supuestos.getRange("B3:I3"), "#B7DEE8");
const supRows = Array.from({ length: 18 }, (_, idx) => ["", "", "", "", "", "", "", ""]);
supuestos.getRange("B4:I21").values = supRows;
styleAnswer(supuestos.getRange("B4:I21"));
supuestos.getRange("B1:I21").format.columnWidth = 22;
supuestos.freezePanes.freezeRows(3);

const note = workbook.worksheets.add("Instrucciones_Base");
finishSheet(note);
setTitle(note, "B1:J1", "Instrucciones rápidas de la base Excel", "El enunciado completo está en el PDF");
note.getRange("B3:J15").values = [
  ["1", "Complete primero Registro_Balances usando fórmulas dinámicas, búsquedas y funciones de texto.", "", "", "", "", "", "", ""],
  ["2", "Use Catalogo_Clientes, Catalogo_Productos, Catalogo_Ejecutivos y Tipo_Cambio como tablas suplementarias.", "", "", "", "", "", "", ""],
  ["3", "Complete Resumen_Formulas con funciones estadísticas y condicionales.", "", "", "", "", "", "", ""],
  ["4", "Cree Tablas Dinámicas para responder Respuestas_TD. Excluya Estado_Documento = Cancelada salvo indicación contraria.", "", "", "", "", "", "", ""],
  ["5", "Construya el Dashboard con KPIs, gráficos dinámicos y segmentadores conectados.", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
  ["Código de operación", "Estructura: VEN-xxPrecio$####Moneda/XXXCliente:CLI-###Region/XXProducto:PROD-###", "", "", "", "", "", "", ""],
  ["Fecha de corte", "Use Parametros!C4 para Dias_Atraso, Estado_Cobro, Tramo_Atraso y Riesgo_Balance.", "", "", "", "", "", "", ""],
  ["Formato esperado", "Moneda sin decimales, porcentajes con 2 decimales, fechas yyyy-mm-dd.", "", "", "", "", "", "", ""],
  ["Advertencia", "No pegue valores estáticos en celdas amarillas; las respuestas deben depender de fórmulas, pivots o referencias.", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
  ["Ejercicio", "Preparación no oficial para examen de Data Analytics I.", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
];
note.getRange("B3:J15").format.wrapText = true;
note.getRange("B3:B15").format.fill = "#D9EAD3";
note.getRange("C3:J15").format.fill = "#FFF2CC";
note.getRange("B1:J15").format.columnWidth = 22;

const previewSheets = [
  ["Registro_Balances", "A1:AN25"],
  ["Resumen_Formulas", "B1:J42"],
  ["Respuestas_TD", "B1:F14"],
  ["Dashboard", "B1:N43"],
  ["Catalogo_Clientes", "B1:I18"],
  ["Tipo_Cambio", "B1:D28"],
];

for (const [sheetName, range] of previewSheets) {
  const blob = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, `${sheetName}.png`), new Uint8Array(await blob.arrayBuffer()));
}

const inspectDash = await workbook.inspect({
  kind: "table",
  range: "Dashboard!B1:N43",
  include: "values,formulas",
  tableMaxRows: 45,
  tableMaxCols: 14,
});
console.log(inspectDash.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
const finalPath = path.join(outputDir, "Preparacion-examen.xlsx");
await output.save(finalPath);
console.log(finalPath);
