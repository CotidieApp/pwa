import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "pdf");
const pdfPath = path.join(outputDir, "cotidie-user-install-pitch-multilingual.pdf");

fs.mkdirSync(outputDir, { recursive: true });

const page = {
  width: 792,
  height: 612,
  margin: 24,
  headerHeight: 48,
  gap: 12,
};

const cardWidth = (page.width - page.margin * 2 - page.gap) / 2;
const cardsAreaHeight = page.height - page.margin * 2 - page.headerHeight - page.gap;
const cardHeight = (cardsAreaHeight - page.gap) / 2;

const cards = [
  {
    title: "Español",
    accent: [0.64, 0.42, 0.07],
    labels: {
      what: "Qué es",
      install: "Por qué instalarla",
      includes: "Qué vas a encontrar",
      bestFor: "Ideal para ti si",
    },
    what:
      "Cotidie es una app católica pensada para acompañarte cada día con oración, lectura espiritual y hábitos sencillos de vida interior.",
    install: [
      "Reúne en un solo lugar lo que normalmente terminas buscando en varios sitios o cuadernos.",
      "Te ayuda a sostener una rutina diaria con recordatorios, planes personales y seguimiento de tu constancia.",
      "Combina contenido guiado con espacio para tu propia vida espiritual: devociones, cartas, notas y EPUBs personales.",
    ],
    includes: [
      "Plan de Vida con prácticas diarias.",
      "Rosario, Via Crucis y lecturas espirituales.",
      "Nuevo Testamento en EPUB y biblioteca personal.",
      "Frase y santo del día, calendario y resumen anual.",
    ],
    bestFor: [
      "Quieres rezar más, pero te cuesta mantener el ritmo.",
      "Prefieres una app clara, centrada y hecha para uso diario.",
      "Te sirve tener todo tu material espiritual en el teléfono.",
    ],
  },
  {
    title: "English",
    accent: [0.15, 0.37, 0.56],
    labels: {
      what: "What it is",
      install: "Why install it",
      includes: "What you get",
      bestFor: "Best for you if",
    },
    what:
      "Cotidie is a Catholic app built to support daily prayer, spiritual reading, and simple habits that keep your interior life steady.",
    install: [
      "It brings together the material you would otherwise keep across websites, notes, and separate apps.",
      "It helps you stay consistent with reminders, personal plans, and visible progress over time.",
      "It gives guided content and personal space at once: devotions, letters, notes, and your own EPUB books.",
    ],
    includes: [
      "A Daily Plan with repeatable prayer practices.",
      "Rosary, Way of the Cross, and spiritual reading.",
      "A New Testament EPUB reader plus personal library.",
      "Saint/quote of the day, calendar, and yearly recap.",
    ],
    bestFor: [
      "You want to pray more but struggle to stay regular.",
      "You prefer one focused app instead of scattered resources.",
      "You want spiritual content ready on your phone every day.",
    ],
  },
  {
    title: "Italiano",
    accent: [0.18, 0.48, 0.27],
    labels: {
      what: "Che cos'è",
      install: "Perché installarla",
      includes: "Cosa trovi",
      bestFor: "Ideale per te se",
    },
    what:
      "Cotidie è un'app cattolica pensata per accompagnarti ogni giorno con preghiera, lettura spirituale e abitudini semplici di vita interiore.",
    install: [
      "Riunisce in un solo posto ciò che spesso finisce sparso tra siti, app diverse e appunti personali.",
      "Ti aiuta a mantenere costanza con promemoria, piani personali e tracce visibili del tuo cammino.",
      "Unisce contenuto guidato e spazio personale: devozioni, lettere, note e i tuoi EPUB.",
    ],
    includes: [
      "Piano di Vita con pratiche quotidiane.",
      "Rosario, Via Crucis e letture spirituali.",
      "Nuovo Testamento in EPUB e libreria personale.",
      "Santo/frase del giorno, calendario e riepilogo annuale.",
    ],
    bestFor: [
      "Vuoi pregare di più ma fai fatica a restare costante.",
      "Preferisci un'app chiara, raccolta e adatta all'uso quotidiano.",
      "Ti piace avere tutto il materiale spirituale sul telefono.",
    ],
  },
  {
    title: "Français",
    accent: [0.26, 0.33, 0.42],
    labels: {
      what: "Ce que c'est",
      install: "Pourquoi l'installer",
      includes: "Ce que vous trouvez",
      bestFor: "Idéale pour vous si",
    },
    what:
      "Cotidie est une application catholique conçue pour accompagner chaque jour la prière, la lecture spirituelle et des habitudes simples de vie intérieure.",
    install: [
      "Elle réunit en un seul endroit ce que l'on finit souvent par disperser entre sites, notes et applications séparées.",
      "Elle aide à garder une vraie régularité grâce aux rappels, aux plans personnels et à un suivi visible dans le temps.",
      "Elle combine contenu guidé et espace personnel: dévotions, lettres, notes et vos propres EPUB.",
    ],
    includes: [
      "Un Plan de Vie avec pratiques quotidiennes.",
      "Chapelet, Chemin de Croix et lectures spirituelles.",
      "Nouveau Testament en EPUB et bibliothèque personnelle.",
      "Saint/citation du jour, calendrier et récapitulatif annuel.",
    ],
    bestFor: [
      "Vous voulez prier davantage sans perdre le rythme.",
      "Vous préférez une seule app claire plutôt que des ressources dispersées.",
      "Vous voulez votre contenu spirituel prêt sur le téléphone chaque jour.",
    ],
  },
];

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

const drawParagraph = (commands, label, text, x, y, width, fontSize, accent, bodyColor) => {
  addText(commands, label, x, y, "F1", 7.9, accent);
  const charWidth = fontSize * 0.59;
  const maxChars = Math.max(14, Math.floor(width / charWidth));
  const lines = wrapText(text, maxChars);
  let cursorY = y - 10;
  for (const line of lines) {
    addText(commands, line, x, cursorY, "F2", fontSize, bodyColor);
    cursorY -= fontSize + 1.55;
  }
  return cursorY - 1;
};

const drawBulletBlock = (commands, title, items, x, y, width, accent, bodyColor) => {
  addText(commands, title, x, y, "F1", 7.9, accent);
  let cursorY = y - 10;
  const fontSize = 6.55;
  const charWidth = fontSize * 0.59;
  const maxChars = Math.max(18, Math.floor(width / charWidth));

  for (const item of items) {
    const wrapped = wrapText(item, maxChars - 2);
    wrapped.forEach((line, index) => {
      const prefix = index === 0 ? "- " : "  ";
      addText(commands, `${prefix}${line}`, x, cursorY, "F2", fontSize, bodyColor);
      cursorY -= fontSize + 1.45;
    });
    cursorY -= 0.4;
  }

  return cursorY - 1.5;
};

const commands = [];

addRect(commands, 0, 0, page.width, page.height, [0.95, 0.94, 0.90]);
addRect(commands, page.margin, page.height - 58, page.width - page.margin * 2, 34, [1, 1, 1], [0.86, 0.88, 0.90], 1);
addText(commands, "Cotidie", page.margin + 12, page.height - 36, "F1", 20, [0.08, 0.15, 0.20]);
addText(
  commands,
  "A simple, everyday invitation to pray more and keep your spiritual life close.",
  page.margin + 96,
  page.height - 36,
  "F2",
  8.6,
  [0.31, 0.38, 0.45],
);

cards.forEach((card, index) => {
  const col = index % 2;
  const row = Math.floor(index / 2);
  const cardX = page.margin + col * (cardWidth + page.gap);
  const cardY = page.margin + (1 - row) * (cardHeight + page.gap);
  const topY = cardY + cardHeight;
  const innerX = cardX + 12;
  const innerWidth = cardWidth - 24;
  const accent = card.accent;
  const bodyColor = [0.17, 0.22, 0.27];

  addRect(commands, cardX, cardY, cardWidth, cardHeight, [1, 1, 1], [0.84, 0.88, 0.91], 1);
  addRect(commands, cardX, topY - 5, cardWidth, 5, accent);
  addText(commands, card.title, innerX, topY - 18, "F1", 11.4, [0.08, 0.15, 0.20]);

  let cursorY = topY - 31;
  cursorY = drawParagraph(commands, card.labels.what, card.what, innerX, cursorY, innerWidth, 6.7, accent, bodyColor);
  cursorY = drawBulletBlock(commands, card.labels.install, card.install, innerX, cursorY, innerWidth, accent, bodyColor);
  cursorY = drawBulletBlock(commands, card.labels.includes, card.includes, innerX, cursorY, innerWidth, accent, bodyColor);
  drawBulletBlock(commands, card.labels.bestFor, card.bestFor, innerX, cursorY, innerWidth, accent, bodyColor);
});

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
