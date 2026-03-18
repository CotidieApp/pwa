import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "pdf");

fs.mkdirSync(outputDir, { recursive: true });

const PAGE = { width: 1080, height: 1080 };

const ASSETS = {
  logo: loadJpeg("public/icons/icon.jpg"),
  holyFamily: loadJpeg("public/images/holy-family.jpeg"),
  sacredHeart: loadJpeg("public/images/sacred-heart.jpeg"),
  eucharist: loadJpeg("public/images/eucharist.jpeg"),
  crucifixion: loadJpeg("public/images/crucifixion.jpeg"),
};

function loadJpeg(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  const size = getJpegSize(bytes);
  return {
    relativePath,
    absolutePath,
    bytes,
    width: size.width,
    height: size.height,
  };
}

function getJpegSize(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Unsupported image format. Expected JPEG.");
  }

  let offset = 2;
  while (offset < buffer.length) {
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    ) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }

  throw new Error("JPEG dimensions not found.");
}

const fmt = (value) => Number(value).toFixed(2);
const rgb = (r, g, b) => `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;

const COLORS = {
  cream: [0.973, 0.945, 0.898],
  warmWhite: [0.992, 0.984, 0.965],
  gold: [0.823, 0.631, 0.235],
  navy: [0.078, 0.133, 0.207],
  ink: [0.121, 0.152, 0.191],
  muted: [0.361, 0.384, 0.412],
  line: [0.816, 0.784, 0.733],
  soft: [0.934, 0.914, 0.875],
  red: [0.690, 0.165, 0.141],
  white: [1, 1, 1],
  paleGold: [0.937, 0.889, 0.764],
};

function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}

function wrapText(text, maxChars) {
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
}

function createComposer() {
  const commands = [];
  const images = new Map();

  const ensureImage = (key) => {
    if (!images.has(key)) {
      images.set(key, {
        key,
        name: `Im${images.size + 1}`,
        asset: ASSETS[key],
      });
    }
    return images.get(key);
  };

  const rect = (x, y, width, height, fill, stroke = null, lineWidth = 1) => {
    if (stroke) {
      commands.push(
        `${lineWidth} w ${rgb(...fill)} rg ${rgb(...stroke)} RG ${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)} re B`,
      );
      return;
    }
    commands.push(`${rgb(...fill)} rg ${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)} re f`);
  };

  const text = (value, x, y, font, size, color) => {
    commands.push(
      `BT /${font} ${size} Tf ${rgb(...color)} rg 1 0 0 1 ${fmt(x)} ${fmt(y)} Tm (${escapePdfText(value)}) Tj ET`,
    );
  };

  const wrapped = (value, x, y, width, font, size, color, lineGap = 4) => {
    const maxChars = Math.max(10, Math.floor(width / (size * 0.56)));
    const lines = wrapText(value, maxChars);
    let cursorY = y;
    for (const line of lines) {
      text(line, x, cursorY, font, size, color);
      cursorY -= size + lineGap;
    }
    return cursorY;
  };

  const imageContain = (key, x, y, width, height) => {
    const image = ensureImage(key);
    const scale = Math.min(width / image.asset.width, height / image.asset.height);
    const drawWidth = image.asset.width * scale;
    const drawHeight = image.asset.height * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    commands.push(`q ${fmt(drawWidth)} 0 0 ${fmt(drawHeight)} ${fmt(drawX)} ${fmt(drawY)} cm /${image.name} Do Q`);
  };

  const imageCover = (key, x, y, width, height) => {
    const image = ensureImage(key);
    const scale = Math.max(width / image.asset.width, height / image.asset.height);
    const drawWidth = image.asset.width * scale;
    const drawHeight = image.asset.height * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    commands.push(
      `q ${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)} re W n ${fmt(drawWidth)} 0 0 ${fmt(drawHeight)} ${fmt(drawX)} ${fmt(drawY)} cm /${image.name} Do Q`,
    );
  };

  const pill = (value, x, y, fill, textColor, minWidth = 118, fontSize = 14) => {
    const width = Math.max(minWidth, value.length * (fontSize * 0.54) + 28);
    rect(x, y - 14, width, 34, fill);
    text(value, x + 14, y, "F2", fontSize, textColor);
    return width;
  };

  return {
    commands,
    images,
    rect,
    text,
    wrapped,
    imageContain,
    imageCover,
    pill,
  };
}

function buildPdf({ outputPath, width, height, commands, images }) {
  const imageEntries = Array.from(images.values());
  const imageObjectStart = 6;
  const imageResources = imageEntries
    .map((entry, index) => `/${entry.name} ${imageObjectStart + index} 0 R`)
    .join(" ");

  const contentObjectNumber = imageObjectStart + imageEntries.length;
  const contentStream = Buffer.from(commands.join("\n"), "latin1");

  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1"),
    Buffer.from("<< /Type /Pages /Count 1 /Kids [3 0 R] >>", "latin1"),
    Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << ${imageResources} >> >> /Contents ${contentObjectNumber} 0 R >>`,
      "latin1",
    ),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>", "latin1"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "latin1"),
  ];

  imageEntries.forEach((entry) => {
    const dict = Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${entry.asset.width} /Height ${entry.asset.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${entry.asset.bytes.length} >>\nstream\n`,
      "latin1",
    );
    const end = Buffer.from("\nendstream", "latin1");
    objects.push(Buffer.concat([dict, entry.asset.bytes, end]));
  });

  objects.push(
    Buffer.concat([
      Buffer.from(`<< /Length ${contentStream.length} >>\nstream\n`, "latin1"),
      contentStream,
      Buffer.from("\nendstream", "latin1"),
    ]),
  );

  const parts = [];
  const offsets = [0];
  let cursor = 0;

  const push = (buffer) => {
    parts.push(buffer);
    cursor += buffer.length;
  };

  push(Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1"));

  objects.forEach((body, index) => {
    offsets.push(cursor);
    push(Buffer.from(`${index + 1} 0 obj\n`, "latin1"));
    push(body);
    push(Buffer.from("\nendobj\n", "latin1"));
  });

  const xrefOffset = cursor;
  push(Buffer.from(`xref\n0 ${objects.length + 1}\n`, "latin1"));
  push(Buffer.from("0000000000 65535 f \n", "latin1"));
  for (let i = 1; i <= objects.length; i += 1) {
    push(Buffer.from(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`, "latin1"));
  }
  push(Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`, "latin1"));

  fs.writeFileSync(outputPath, Buffer.concat(parts));
}

function drawMinimal(outputPath) {
  const c = createComposer();
  c.rect(0, 0, PAGE.width, PAGE.height, COLORS.warmWhite);
  c.rect(0, 1018, PAGE.width, 62, COLORS.gold);
  c.rect(0, 0, PAGE.width, 220, COLORS.navy);
  c.rect(0, 670, 352, 348, COLORS.cream);
  c.imageCover("holyFamily", 620, 214, 380, 804);
  c.rect(620, 214, 380, 804, COLORS.white, COLORS.line, 1.2);

  c.rect(84, 884, 104, 104, COLORS.white, COLORS.line, 1);
  c.imageContain("logo", 96, 896, 80, 80);
  c.text("COTIDIE", 208, 953, "F1", 24, COLORS.navy);
  c.text("Una app para rezar cada dia", 208, 920, "F2", 18, COLORS.muted);

  c.text("Reza sin", 84, 808, "F1", 44, COLORS.navy);
  c.text("dispersarte.", 84, 758, "F1", 44, COLORS.navy);
  c.text("Lee sin salir.", 84, 700, "F1", 38, COLORS.gold);
  c.text("Ten todo contigo.", 84, 654, "F1", 38, COLORS.ink);

  c.wrapped(
    "Plan de Vida, Rosario, Via Crucis, Nuevo Testamento, lectura espiritual y tus propios EPUBs en una sola app.",
    84,
    596,
    460,
    "F2",
    20,
    COLORS.muted,
    7,
  );

  c.text("Dentro de Cotidie:", 84, 456, "F1", 24, COLORS.navy);
  let pillX = 84;
  let pillY = 416;
  [
    "Plan de Vida",
    "Rosario",
    "Via Crucis",
    "Devociones",
    "Oraciones",
    "EPUB personal",
    "Recordatorios",
    "Santo del dia",
  ].forEach((item) => {
    const width = Math.max(132, item.length * 7.1 + 28);
    if (pillX + width > 584) {
      pillX = 84;
      pillY -= 48;
    }
    c.pill(item, pillX, pillY, COLORS.white, COLORS.ink, 132, 14);
    pillX += width + 12;
  });

  c.text("Instalala desde el link del perfil", 84, 148, "F1", 34, COLORS.white);
  c.wrapped(
    "Cotidie te ayuda a rezar mas, leer mejor y llevar tu vida espiritual siempre a mano.",
    84,
    108,
    760,
    "F2",
    17,
    COLORS.soft,
    5,
  );

  buildPdf({
    outputPath,
    width: PAGE.width,
    height: PAGE.height,
    commands: c.commands,
    images: c.images,
  });
}

function drawClassic(outputPath) {
  const c = createComposer();
  c.rect(0, 0, PAGE.width, PAGE.height, COLORS.navy);
  c.rect(62, 62, 956, 956, COLORS.cream, COLORS.gold, 1.6);
  c.rect(86, 86, 908, 908, COLORS.warmWhite);
  c.rect(86, 760, 908, 234, COLORS.navy);
  c.imageCover("sacredHeart", 322, 362, 436, 326);
  c.rect(302, 342, 476, 366, COLORS.warmWhite, COLORS.gold, 1.2);
  c.rect(468, 878, 144, 144, COLORS.warmWhite, COLORS.gold, 1);
  c.imageContain("logo", 486, 896, 108, 108);

  c.text("COTIDIE", 444, 840, "F1", 22, COLORS.paleGold);
  c.text("vida espiritual para cada dia", 348, 808, "F2", 18, COLORS.soft);
  c.text("Una app hecha para rezar", 220, 742, "F1", 40, COLORS.white);
  c.text("con calma y constancia", 242, 694, "F1", 40, COLORS.white);

  c.text("Plan de Vida", 172, 290, "F1", 26, COLORS.navy);
  c.text("Rosario", 422, 290, "F1", 26, COLORS.navy);
  c.text("Nuevo Testamento", 640, 290, "F1", 26, COLORS.navy);
  c.text("Lectura espiritual", 170, 250, "F1", 26, COLORS.navy);
  c.text("EPUB personal", 476, 250, "F1", 26, COLORS.navy);
  c.text("Recordatorios", 726, 250, "F1", 26, COLORS.navy);

  c.wrapped(
    "Cotidie reune oraciones, devociones, lecturas y herramientas sencillas para acompanar tu vida interior cada dia.",
    160,
    192,
    760,
    "F2",
    21,
    COLORS.muted,
    7,
  );

  c.rect(236, 92, 608, 62, COLORS.gold);
  c.text("Instalala desde el link del perfil", 300, 116, "F1", 24, COLORS.navy);

  buildPdf({
    outputPath,
    width: PAGE.width,
    height: PAGE.height,
    commands: c.commands,
    images: c.images,
  });
}

function drawAd(outputPath) {
  const c = createComposer();
  c.rect(0, 0, PAGE.width, PAGE.height, COLORS.cream);
  c.rect(0, 0, PAGE.width, 120, COLORS.red);
  c.rect(0, 680, PAGE.width, 400, COLORS.navy);
  c.imageCover("crucifixion", 0, 680, 436, 356);
  c.imageCover("eucharist", 644, 680, 436, 356);
  c.rect(436, 680, 208, 356, COLORS.gold);
  c.rect(72, 726, 120, 120, COLORS.warmWhite, COLORS.line, 1);
  c.imageContain("logo", 90, 744, 84, 84);

  c.text("INSTALALA HOY", 230, 1000, "F1", 28, COLORS.white);
  c.text("LINK EN EL PERFIL", 716, 1000, "F1", 24, COLORS.white);

  c.text("Tu vida espiritual", 72, 620, "F1", 58, COLORS.navy);
  c.text("cabe en tu telefono.", 72, 556, "F1", 58, COLORS.navy);
  c.wrapped(
    "Cotidie junta Plan de Vida, Rosario, Via Crucis, Nuevo Testamento, devociones y recordatorios en una sola app.",
    72,
    490,
    936,
    "F2",
    23,
    COLORS.muted,
    7,
  );

  const boxY = 256;
  const boxW = 292;
  const boxH = 128;
  const gap = 30;

  c.rect(72, boxY, boxW, boxH, COLORS.warmWhite, COLORS.line, 1);
  c.text("Reza mas facil", 98, 350, "F1", 24, COLORS.ink);
  c.wrapped("Rosario, Via Crucis y oraciones listas para usar.", 98, 314, 236, "F2", 16, COLORS.muted, 5);

  c.rect(72 + boxW + gap, boxY, boxW, boxH, COLORS.warmWhite, COLORS.line, 1);
  c.text("Lee mejor", 98 + boxW + gap, 350, "F1", 24, COLORS.ink);
  c.wrapped("Nuevo Testamento y lectura espiritual con EPUB personal.", 98 + boxW + gap, 314, 236, "F2", 16, COLORS.muted, 5);

  c.rect(72 + (boxW + gap) * 2, boxY, boxW, boxH, COLORS.warmWhite, COLORS.line, 1);
  c.text("No pierdas el ritmo", 98 + (boxW + gap) * 2, 350, "F1", 24, COLORS.ink);
  c.wrapped("Recordatorios, temporizador y planes personalizados.", 98 + (boxW + gap) * 2, 314, 236, "F2", 16, COLORS.muted, 5);

  c.rect(72, 88, 936, 92, COLORS.red);
  c.text("Descargala desde el link del perfil", 138, 132, "F1", 34, COLORS.white);

  buildPdf({
    outputPath,
    width: PAGE.width,
    height: PAGE.height,
    commands: c.commands,
    images: c.images,
  });
}

const outputs = [
  {
    file: path.join(outputDir, "cotidie-instagram-post-square-minimal.pdf"),
    draw: drawMinimal,
  },
  {
    file: path.join(outputDir, "cotidie-instagram-post-square-classic.pdf"),
    draw: drawClassic,
  },
  {
    file: path.join(outputDir, "cotidie-instagram-post-square-ads.pdf"),
    draw: drawAd,
  },
];

outputs.forEach((entry) => entry.draw(entry.file));
outputs.forEach((entry) => console.log(entry.file));
