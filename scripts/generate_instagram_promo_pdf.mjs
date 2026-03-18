import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "pdf");
const pdfPath = path.join(outputDir, "cotidie-instagram-promo.pdf");

fs.mkdirSync(outputDir, { recursive: true });

const page = {
  width: 720,
  height: 900,
};

const rgb = (r, g, b) => `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;

const escapePdfText = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");

const wrapText = (text, maxChars) => {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length <= maxChars) {
      current += ` ${word}`;
      continue;
    }
    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
};

const addText = (commands, text, x, y, font, size, color) => {
  commands.push(`BT /${font} ${size} Tf ${rgb(...color)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(text)}) Tj ET`);
};

const addRect = (commands, x, y, width, height, fill, stroke = null, lineWidth = 1) => {
  if (stroke) {
    commands.push(`${lineWidth} w ${rgb(...fill)} rg ${rgb(...stroke)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re B`);
    return;
  }
  commands.push(`${rgb(...fill)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
};

const drawWrapped = (commands, text, x, y, width, font, size, color, lineGap = 2) => {
  const maxChars = Math.max(10, Math.floor(width / (size * 0.56)));
  const lines = wrapText(text, maxChars);
  let cursorY = y;
  for (const line of lines) {
    addText(commands, line, x, cursorY, font, size, color);
    cursorY -= size + lineGap;
  }
  return cursorY;
};

const drawPill = (commands, text, x, y, fill, textColor) => {
  const width = Math.max(72, text.length * 5.1 + 18);
  addRect(commands, x, y - 8, width, 22, fill);
  addText(commands, text, x + 9, y, "F2", 10, textColor);
  return width;
};

const commands = [];

const cream = [0.97, 0.93, 0.86];
const sand = [0.92, 0.86, 0.75];
const gold = [0.83, 0.62, 0.23];
const navy = [0.09, 0.15, 0.23];
const ink = [0.13, 0.17, 0.21];
const softWhite = [0.99, 0.98, 0.96];
const muted = [0.39, 0.40, 0.42];

addRect(commands, 0, 0, page.width, page.height, cream);
addRect(commands, 0, 560, page.width, 340, navy);
addRect(commands, 0, 870, page.width, 30, gold);

addText(commands, "COTIDIE", 52, 820, "F1", 13, [1, 1, 1]);
addText(commands, "Tu guía diaria de oración y vida espiritual", 52, 802, "F2", 11.5, [0.94, 0.92, 0.88]);

addText(commands, "Reza.", 52, 748, "F1", 34, [1, 1, 1]);
addText(commands, "Lee.", 52, 710, "F1", 34, [1, 1, 1]);
addText(commands, "Persevera.", 52, 672, "F1", 34, [1, 1, 1]);

drawWrapped(
  commands,
  "Plan de Vida, Rosario, lecturas, recordatorios y tus propios EPUBs en una sola app.",
  52,
  626,
  290,
  "F2",
  13.2,
  [0.94, 0.92, 0.88],
  3,
);

addRect(commands, 420, 610, 240, 220, softWhite, [0.80, 0.73, 0.58], 1.2);
addRect(commands, 438, 628, 204, 184, [0.99, 0.98, 0.96], [0.14, 0.20, 0.28], 1);
addRect(commands, 438, 792, 204, 20, gold);
addText(commands, "Todo contigo", 458, 774, "F1", 16, navy);
drawWrapped(commands, "Plan de Vida", 458, 746, 150, "F1", 12.5, ink);
drawWrapped(commands, "Rosario y Via Crucis", 458, 722, 150, "F1", 12.5, ink);
drawWrapped(commands, "Nuevo Testamento", 458, 698, 150, "F1", 12.5, ink);
drawWrapped(commands, "EPUB personal", 458, 674, 150, "F1", 12.5, ink);
drawWrapped(commands, "Santo y frase del día", 458, 650, 150, "F1", 12.5, ink);
drawWrapped(commands, "Recordatorios", 458, 626, 150, "F1", 12.5, ink);

addText(commands, "¿Por qué instalarla?", 52, 520, "F1", 18, navy);

addRect(commands, 52, 360, 190, 130, [1, 1, 1], [0.84, 0.82, 0.77], 1);
addText(commands, "Todo en un lugar", 66, 467, "F1", 14, ink);
drawWrapped(
  commands,
  "Devociones, Oraciones, Plan de Vida, Nuevo Testamento y lectura espiritual.",
  66,
  444,
  160,
  "F2",
  10.8,
  muted,
  3,
);

addRect(commands, 264, 360, 190, 130, [1, 1, 1], [0.84, 0.82, 0.77], 1);
addText(commands, "Te acompaña cada día", 278, 467, "F1", 14, ink);
drawWrapped(
  commands,
  "Temporizador, recordatorios, calendario y seguimiento para sostener tu constancia.",
  278,
  444,
  160,
  "F2",
  10.8,
  muted,
  3,
);

addRect(commands, 476, 360, 190, 130, [1, 1, 1], [0.84, 0.82, 0.77], 1);
addText(commands, "También es tuya", 490, 467, "F1", 14, ink);
drawWrapped(
  commands,
  "Guarda devociones, cartas, planes personalizados y EPUBs personales.",
  490,
  444,
  160,
  "F2",
  10.8,
  muted,
  3,
);

addText(commands, "Dentro de la app encuentras:", 52, 314, "F1", 16, navy);

let pillX = 52;
let pillY = 286;
[
  "Plan de Vida",
  "Devociones",
  "Oraciones",
  "Rosario",
  "Via Crucis",
  "Nuevo Testamento",
  "EPUB personal",
  "Santo del día",
  "Frase del día",
  "Planes personalizados",
  "Recordatorios",
  "Fondos y tema",
].forEach((item) => {
  const width = Math.max(72, item.length * 5.1 + 18);
  if (pillX + width > 650) {
    pillX = 52;
    pillY -= 30;
  }
  drawPill(commands, item, pillX, pillY, [1, 1, 1], ink);
  pillX += width + 8;
});

addRect(commands, 52, 72, 616, 110, navy);
addText(commands, "Instálala desde el link del perfil", 86, 145, "F1", 24, [1, 1, 1]);
drawWrapped(
  commands,
  "Cotidie está pensada para ayudarte a rezar más, leer mejor y tener tu vida espiritual siempre a mano.",
  86,
  116,
  520,
  "F2",
  12.5,
  [0.94, 0.92, 0.88],
  3,
);
addText(commands, "Cotidie", 86, 88, "F1", 13, gold);

const contentStream = commands.join("\n");

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  `<< /Length ${Buffer.byteLength(contentStream, "latin1")} >>\nstream\n${contentStream}\nendstream`,
];

const parts = [];
const offsets = [0];
let cursor = 0;

const push = (chunk) => {
  const buffer = Buffer.from(chunk, "latin1");
  parts.push(buffer);
  cursor += buffer.length;
};

push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

objects.forEach((body, index) => {
  offsets.push(cursor);
  push(`${index + 1} 0 obj\n${body}\nendobj\n`);
});

const xrefOffset = cursor;
push(`xref\n0 ${objects.length + 1}\n`);
push("0000000000 65535 f \n");

for (let i = 1; i <= objects.length; i += 1) {
  push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
}

push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

fs.writeFileSync(pdfPath, Buffer.concat(parts));
console.log(pdfPath);
