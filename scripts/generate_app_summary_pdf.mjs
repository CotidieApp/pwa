import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "pdf");
const pdfPath = path.join(outputDir, "cotidie-app-summary-multilingual.pdf");

fs.mkdirSync(outputDir, { recursive: true });

const page = {
  width: 792,
  height: 612,
  margin: 24,
  headerHeight: 44,
  gap: 12,
};

const cardWidth = (page.width - page.margin * 2 - page.gap) / 2;
const cardsAreaHeight = page.height - page.margin * 2 - page.headerHeight - page.gap;
const cardHeight = (cardsAreaHeight - page.gap) / 2;

const cards = [
  {
    title: "Español",
    accent: [0.62, 0.42, 0.06],
    labels: {
      what: "Qué es",
      who: "Para quién",
      features: "Qué hace",
      architecture: "Cómo funciona",
      run: "Cómo correr",
    },
    what:
      "Cotidie es una app católica de oración y lectura espiritual, hecha con Next.js + Capacitor y publicada como PWA / Android.",
    who: "Católicos que quieren una rutina diaria de oración en el teléfono.",
    features: [
      "Biblioteca única de Devociones, Plan de Vida y Oraciones.",
      "Rosario y Via Crucis en modos inmersivos.",
      "EPUB del Nuevo Testamento con índice, búsqueda, marcadores y subrayados.",
      "EPUBs personales guardados localmente en el dispositivo.",
      "Oraciones, devociones, cartas y 4 planes personalizados.",
      "Temporizador, recordatorios diarios, fiestas y acciones rápidas en notificaciones.",
      "Santo/frase del día, calendario de checks, estadísticas y Cotidie Annuum.",
    ],
    architecture: [
      "UI: page.tsx abre splash + MainApp; MainApp cambia entre inicio, categorías, oración, ajustes y lectores.",
      "Estado/datos: SettingsContext reúne catálogo, stats, recordatorios, santos, temas y planes; persiste con IndexedDB (persistence.ts) + localStorage.",
      "Nativo: Capacitor + Android (MainActivity, receivers, widgets) manejan imports, acciones de notificación, recuperación WebView y widgets del santo.",
    ],
    run: [
      "npm install",
      "npm run dev",
      "Abre la URL local que imprima Next. Guía detallada / comando Android nativo: Not found in repo.",
    ],
  },
  {
    title: "English",
    accent: [0.14, 0.37, 0.55],
    labels: {
      what: "What it is",
      who: "Who it's for",
      features: "What it does",
      architecture: "How it works",
      run: "How to run",
    },
    what:
      "Cotidie is a Catholic prayer and spiritual reading app built with Next.js + Capacitor and shipped as a PWA / Android app.",
    who: "Catholics who want a daily prayer routine on a phone.",
    features: [
      "One library for Devotions, Daily Plan, and Prayers.",
      "Immersive Rosary and Way of the Cross modes.",
      "New Testament EPUB reader with TOC, search, bookmarks, and highlights.",
      "Personal EPUB uploads stored locally on the device.",
      "User prayers, devotions, letters, and 4 custom plans.",
      "Timer, daily reminders, feast notifications, and quick actions.",
      "Saint/quote of the day, check calendar, stats, and Cotidie Annuum recap.",
    ],
    architecture: [
      "UI: page.tsx loads splash + MainApp; MainApp switches home/category/prayer/settings/reader views.",
      "State/data: SettingsContext joins catalog, stats, reminders, saints, themes, and plans; persists with IndexedDB (persistence.ts) + localStorage.",
      "Native: Capacitor + Android (MainActivity, receivers, widgets) handle imports, notification actions, WebView recovery, and saint widgets.",
    ],
    run: [
      "npm install",
      "npm run dev",
      "Open the local URL printed by Next. Detailed onboarding / Android native run command: Not found in repo.",
    ],
  },
  {
    title: "Italiano",
    accent: [0.18, 0.48, 0.27],
    labels: {
      what: "Che cos'è",
      who: "Per chi",
      features: "Cosa fa",
      architecture: "Come funziona",
      run: "Come avviare",
    },
    what:
      "Cotidie è un'app cattolica per preghiera e lettura spirituale, costruita con Next.js + Capacitor e distribuita come PWA / app Android.",
    who: "Cattolici che vogliono una routine quotidiana di preghiera sul telefono.",
    features: [
      "Un'unica libreria per Devozioni, Piano di Vita e Preghiere.",
      "Rosario e Via Crucis in modalità immersive.",
      "Lettore EPUB del Nuovo Testamento con indice, ricerca, segnalibri e sottolineature.",
      "EPUB personali salvati localmente sul dispositivo.",
      "Preghiere, devozioni, lettere e 4 piani personalizzati.",
      "Timer, promemoria giornalieri, feste e azioni rapide dalle notifiche.",
      "Santo/frase del giorno, calendario dei check, statistiche e riepilogo Cotidie Annuum.",
    ],
    architecture: [
      "UI: page.tsx carica splash + MainApp; MainApp gestisce viste home/categoria/preghiera/impostazioni/reader.",
      "Stato/dati: SettingsContext unisce catalogo, statistiche, promemoria, santi, temi e piani; persistenza via IndexedDB (persistence.ts) + localStorage.",
      "Nativo: Capacitor + Android (MainActivity, receiver, widget) gestiscono importazioni, azioni delle notifiche, recupero WebView e widget del santo.",
    ],
    run: [
      "npm install",
      "npm run dev",
      "Apri l'URL locale stampato da Next. Onboarding dettagliato / comando Android nativo: Not found in repo.",
    ],
  },
  {
    title: "Français",
    accent: [0.25, 0.32, 0.41],
    labels: {
      what: "Ce que c'est",
      who: "Pour qui",
      features: "Ce qu'elle fait",
      architecture: "Comment ça marche",
      run: "Comment lancer",
    },
    what:
      "Cotidie est une application catholique de prière et de lecture spirituelle, construite avec Next.js + Capacitor et livrée en PWA / app Android.",
    who: "Des catholiques qui veulent une routine quotidienne de prière sur mobile.",
    features: [
      "Une seule bibliothèque pour Dévotions, Plan de Vie et Prières.",
      "Chapelet et Chemin de Croix en modes immersifs.",
      "Lecteur EPUB du Nouveau Testament avec sommaire, recherche, signets et surlignages.",
      "EPUB personnels stockés localement sur l'appareil.",
      "Prières, dévotions, lettres et 4 plans personnalisés.",
      "Minuteur, rappels quotidiens, fêtes et actions rapides depuis les notifications.",
      "Saint/citation du jour, calendrier des checks, statistiques et récap Cotidie Annuum.",
    ],
    architecture: [
      "UI: page.tsx charge le splash + MainApp; MainApp bascule entre accueil/catégorie/prière/réglages/lecteur.",
      "État/données: SettingsContext regroupe catalogue, stats, rappels, saints, thèmes et plans; persistance via IndexedDB (persistence.ts) + localStorage.",
      "Natif: Capacitor + Android (MainActivity, receivers, widgets) gèrent imports, actions de notification, récupération WebView et widgets du saint.",
    ],
    run: [
      "npm install",
      "npm run dev",
      "Ouvrez l'URL locale affichée par Next. Onboarding détaillé / commande Android native: Not found in repo.",
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

const drawWrappedLine = (commands, label, text, x, y, width, fontSize, color) => {
  const charWidth = fontSize * 0.6;
  const maxChars = Math.max(12, Math.floor(width / charWidth));
  const lines = wrapText(`${label}: ${text}`, maxChars);
  let cursorY = y;
  for (const line of lines) {
    addText(commands, line, x, cursorY, "F3", fontSize, color);
    cursorY -= fontSize + 1.6;
  }
  return cursorY;
};

const drawBulletBlock = (commands, title, items, x, y, width, accent, bodyColor) => {
  addText(commands, title, x, y, "F1", 7.8, accent);
  let cursorY = y - 10;
  const fontSize = 6.45;
  const charWidth = fontSize * 0.6;
  const maxChars = Math.max(18, Math.floor(width / charWidth));

  for (const item of items) {
    const wrapped = wrapText(item, maxChars - 2);
    wrapped.forEach((line, index) => {
      const prefix = index === 0 ? "- " : "  ";
      addText(commands, `${prefix}${line}`, x, cursorY, "F3", fontSize, bodyColor);
      cursorY -= fontSize + 1.45;
    });
  }

  return cursorY - 2;
};

const commands = [];

addRect(commands, 0, 0, page.width, page.height, [0.96, 0.95, 0.92]);
addText(commands, "Cotidie", page.margin, page.height - 28, "F1", 20, [0.08, 0.15, 0.20]);
addText(
  commands,
  "One-page repo summary based only on repository evidence.",
  page.margin,
  page.height - 42,
  "F2",
  8.2,
  [0.30, 0.38, 0.45],
);
addText(
  commands,
  "v4.4.15 | Next.js 15 | React 18 | Capacitor 8 | PWA + Android",
  page.width - 345,
  page.height - 32,
  "F3",
  7.0,
  [0.33, 0.40, 0.48],
);

cards.forEach((card, index) => {
  const col = index % 2;
  const row = Math.floor(index / 2);
  const cardX = page.margin + col * (cardWidth + page.gap);
  const cardY = page.margin + (1 - row) * (cardHeight + page.gap);
  const innerX = cardX + 12;
  const innerWidth = cardWidth - 24;
  const topY = cardY + cardHeight;
  const accent = card.accent;
  const bodyColor = [0.18, 0.23, 0.28];

  addRect(commands, cardX, cardY, cardWidth, cardHeight, [1, 1, 1], [0.84, 0.88, 0.91], 1);
  addRect(commands, cardX, topY - 5, cardWidth, 5, accent);
  addText(commands, card.title, innerX, topY - 18, "F1", 11.4, [0.08, 0.15, 0.20]);

  let cursorY = topY - 31;
  cursorY = drawWrappedLine(commands, card.labels.what, card.what, innerX, cursorY, innerWidth, 6.65, bodyColor) - 1;
  cursorY = drawWrappedLine(commands, card.labels.who, card.who, innerX, cursorY, innerWidth, 6.65, bodyColor) - 2;
  cursorY = drawBulletBlock(commands, card.labels.features, card.features, innerX, cursorY, innerWidth, accent, bodyColor);
  cursorY = drawBulletBlock(commands, card.labels.architecture, card.architecture, innerX, cursorY, innerWidth, accent, bodyColor);
  drawBulletBlock(commands, card.labels.run, card.run, innerX, cursorY, innerWidth, accent, bodyColor);
});

const contentStream = commands.join("\n");

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
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
