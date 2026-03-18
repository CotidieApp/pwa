import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "pdf");
const pdfPath = path.join(outputDir, "cotidie-instagram-post-square.pdf");

fs.mkdirSync(outputDir, { recursive: true });

const page = {
  width: 1080,
  height: 1080,
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
  commands.push(
    `BT /${font} ${size} Tf ${rgb(...color)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(text)}) Tj ET`,
  );
};

const addRect = (commands, x, y, width, height, fill, stroke = null, lineWidth = 1) => {
  if (stroke) {
    commands.push(
      `${lineWidth} w ${rgb(...fill)} rg ${rgb(...stroke)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re B`,
    );
    return;
  }
  commands.push(`${rgb(...fill)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
};

const drawWrapped = (commands, text, x, y, width, font, size, color, lineGap = 4) => {
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
  const width = Math.max(118, text.length * 7.2 + 28);
  addRect(commands, x, y - 14, width, 34, fill);
  addText(commands, text, x + 14, y, "F2", 14, textColor);
  return width;
};

const commands = [];

const cream = [0.97, 0.94, 0.89];
const warmWhite = [0.99, 0.98, 0.96];
const gold = [0.82, 0.61, 0.23];
const navy = [0.08, 0.14, 0.22];
const ink = [0.13, 0.17, 0.22];
const muted = [0.37, 0.39, 0.42];
const line = [0.82, 0.79, 0.73];

addRect(commands, 0, 0, page.width, page.height, cream);
addRect(commands, 0, 660, page.width, 420, navy);
addRect(commands, 0, 1036, page.width, 44, gold);

addText(commands, "COTIDIE", 84, 990, "F1", 22, [1, 1, 1]);
addText(commands, "Tu guia diaria de oracion y vida espiritual", 84, 958, "F2", 18, [0.93, 0.92, 0.88]);

addText(commands, "Todo lo que necesitas", 84, 882, "F1", 42, [1, 1, 1]);
addText(commands, "para rezar cada dia", 84, 832, "F1", 42, [1, 1, 1]);

drawWrapped(
  commands,
  "Plan de Vida, Rosario, Via Crucis, Nuevo Testamento, lectura espiritual, recordatorios y tus propios EPUBs en una sola app.",
  84,
  770,
  520,
  "F2",
  20,
  [0.93, 0.92, 0.88],
  6,
);

addRect(commands, 700, 738, 290, 240, warmWhite, [0.78, 0.71, 0.55], 1.4);
addRect(commands, 724, 762, 242, 192, [0.995, 0.99, 0.97], [0.11, 0.18, 0.26], 1);
addRect(commands, 724, 926, 242, 28, gold);
addText(commands, "Lo encuentras aqui", 754, 892, "F1", 22, navy);
addText(commands, "Plan de Vida", 754, 852, "F1", 17, ink);
addText(commands, "Rosario y Via Crucis", 754, 820, "F1", 17, ink);
addText(commands, "Nuevo Testamento", 754, 788, "F1", 17, ink);
addText(commands, "EPUB personal", 754, 756, "F1", 17, ink);

addText(commands, "Por que instalarla", 84, 608, "F1", 28, navy);

const cardY = 402;
const cardW = 286;
const cardH = 164;
const gap = 28;

addRect(commands, 84, cardY, cardW, cardH, warmWhite, line, 1);
addText(commands, "Todo en un lugar", 108, 536, "F1", 21, ink);
drawWrapped(
  commands,
  "Devociones, Oraciones, Plan de Vida, Nuevo Testamento y lectura espiritual.",
  108,
  502,
  234,
  "F2",
  15,
  muted,
  5,
);

addRect(commands, 84 + cardW + gap, cardY, cardW, cardH, warmWhite, line, 1);
addText(commands, "Te acompana", 108 + cardW + gap, 536, "F1", 21, ink);
drawWrapped(
  commands,
  "Recordatorios, temporizador y calendario para sostener tu constancia.",
  108 + cardW + gap,
  502,
  234,
  "F2",
  15,
  muted,
  5,
);

addRect(commands, 84 + (cardW + gap) * 2, cardY, cardW, cardH, warmWhite, line, 1);
addText(commands, "Tambien es tuya", 108 + (cardW + gap) * 2, 536, "F1", 21, ink);
drawWrapped(
  commands,
  "Guarda devociones, cartas, planes personalizados y EPUBs personales.",
  108 + (cardW + gap) * 2,
  502,
  234,
  "F2",
  15,
  muted,
  5,
);

addText(commands, "Dentro de la app:", 84, 340, "F1", 24, navy);

let pillX = 84;
let pillY = 304;
[
  "Plan de Vida",
  "Rosario",
  "Via Crucis",
  "Devociones",
  "Oraciones",
  "Nuevo Testamento",
  "EPUB personal",
  "Santo del dia",
  "Frase del dia",
  "Planes personalizados",
  "Recordatorios",
  "Tema y fondos",
].forEach((item) => {
  const width = Math.max(118, item.length * 7.2 + 28);
  if (pillX + width > 992) {
    pillX = 84;
    pillY -= 46;
  }
  drawPill(commands, item, pillX, pillY, [1, 1, 1], ink);
  pillX += width + 12;
});

addRect(commands, 84, 74, 912, 108, navy);
addText(commands, "Instalala desde el link del perfil", 128, 142, "F1", 34, [1, 1, 1]);
drawWrapped(
  commands,
  "Cotidie te ayuda a rezar mas, leer mejor y tener tu vida espiritual siempre a mano.",
  128,
  102,
  760,
  "F2",
  17,
  [0.93, 0.92, 0.88],
  5,
);

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
