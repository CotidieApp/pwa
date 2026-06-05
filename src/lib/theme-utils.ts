
export type ThemeColor = { h: number; s: number };
export type ThemeColors = {
  primary: ThemeColor;
  background: ThemeColor;
  accent: ThemeColor;
};

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

export const rgbToHsl = (r255: number, g255: number, b255: number) => {
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
};

export const clampSaturationForToken = (token: keyof ThemeColors, sPct: number) => {
  if (token === 'background') return clampNumber(sPct, 12, 40);
  if (token === 'primary') return clampNumber(sPct, 25, 70);
  return clampNumber(sPct, 25, 75);
};

export const extractThemeColorsFromImageUrl = async (imageUrl: string): Promise<ThemeColors | null> => {
  if (typeof document === 'undefined') return null;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new (globalThis as any).Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    image.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const maxSide = 96;
  const scale = Math.min(1, maxSide / Math.max(1, img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 200) continue;

    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma < 15 || luma > 245) continue;

    const qr = r >> 4;
    const qg = g >> 4;
    const qb = b >> 4;
    const key = (qr << 8) | (qg << 4) | qb;

    const prev = buckets.get(key);
    if (prev) {
      prev.r += r;
      prev.g += g;
      prev.b += b;
      prev.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const candidates = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 24)
    .map((c) => {
      const r = c.r / c.count;
      const g = c.g / c.count;
      const b = c.b / c.count;
      const hsl = rgbToHsl(r, g, b);
      return { ...c, r, g, b, ...hsl };
    })
    .filter((c) => c.s > 0.05);

  if (candidates.length === 0) return null;

  const backgroundCandidate =
    candidates.find((c) => c.l > 0.18 && c.l < 0.85) ?? candidates[0]!;

  const pickByHueDistance = (
    minDistanceFrom: Array<{ h: number; min: number }>,
    fallbackHue: number
  ) => {
    const found = candidates.find((c) =>
      minDistanceFrom.every((ref) => hueDistance(c.h, ref.h) >= ref.min)
    );
    return found?.h ?? fallbackHue;
  };

  const backgroundHue = backgroundCandidate.h;
  const primaryHue = pickByHueDistance([{ h: backgroundHue, min: 25 }], (backgroundHue + 30) % 360);
  const accentHue = pickByHueDistance(
    [
      { h: backgroundHue, min: 45 },
      { h: primaryHue, min: 25 },
    ],
    (backgroundHue + 60) % 360
  );

  const primaryCandidate =
    candidates.find((c) => hueDistance(c.h, primaryHue) < 12) ??
    candidates.find((c) => hueDistance(c.h, backgroundHue) >= 25) ??
    candidates[0]!;

  const accentCandidate =
    candidates.find((c) => hueDistance(c.h, accentHue) < 12) ??
    candidates.find(
      (c) =>
        hueDistance(c.h, backgroundHue) >= 45 && hueDistance(c.h, primaryHue) >= 25
    ) ??
    candidates[Math.min(1, candidates.length - 1)]!;

  const backgroundS = clampSaturationForToken('background', Math.round(backgroundCandidate.s * 100));
  const primaryS = clampSaturationForToken('primary', Math.round(primaryCandidate.s * 100));
  const accentS = clampSaturationForToken('accent', Math.round(accentCandidate.s * 100));

  return {
    primary: { h: Math.round(primaryHue) % 360, s: primaryS },
    background: { h: Math.round(backgroundHue) % 360, s: backgroundS },
    accent: { h: Math.round(accentHue) % 360, s: accentS },
  };
};
