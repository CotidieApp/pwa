type RelativeLocations = {
  total: number;
  pause?: number;
  load: (locations: string[] | string) => unknown;
  generate: (chars: number) => Promise<string[]>;
  locationFromCfi: (cfi: string) => number;
};

type RelativeBook = {
  locations: RelativeLocations;
  spine?: {
    spineItems: Array<{ index: number; linear: boolean }>;
    get: (cfi: string) => { index: number } | undefined;
  };
};

type VisiblePage = { index: number; cfi?: string; displayed: { page: number; total: number } };
type VisibleLocation = { start?: VisiblePage };

export type RelativePaginationConfig = {
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
};

type Trace = (message: string, data?: string, error?: unknown) => void;

const REFERENCE_AREA = 360 * 720;
const REFERENCE_CHARS = 1024;
const MIN_CHARS_PER_PAGE = 240;
const MAX_CHARS_PER_PAGE = 4000;

const fontCapacityFactor = (fontFamily: string) => {
  const normalized = fontFamily.toLowerCase();
  if (normalized.includes('eb garamond')) return 1.08;
  if (normalized.includes('times new roman')) return 1.05;
  if (normalized.includes('merriweather')) return 0.92;
  if (normalized.includes('lora')) return 0.97;
  return 1;
};

/**
 * epub.js locations are semantic CFIs split by a character interval. Scaling
 * that interval with the effective viewport and typography gives the reader a
 * stable, session-relative N/T without persisting physical columns or loading
 * another visible rendition.
 */
export const estimateCharsPerPage = ({
  width,
  height,
  fontSize,
  fontFamily,
}: RelativePaginationConfig) => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeFontSize = Math.max(1, fontSize);
  const areaScale = (safeWidth * safeHeight) / REFERENCE_AREA;
  const typeScale = Math.pow(100 / safeFontSize, 2);
  const raw = REFERENCE_CHARS * areaScale * typeScale * fontCapacityFactor(fontFamily);
  const clamped = Math.min(MAX_CHARS_PER_PAGE, Math.max(MIN_CHARS_PER_PAGE, raw));
  return Math.max(MIN_CHARS_PER_PAGE, Math.round(clamped / 16) * 16);
};

export const getReaderFileName = (fileName: string, displayName?: string) => {
  const candidate = displayName?.trim() || fileName.trim();
  const baseName = candidate.split(/[\\/]/).filter(Boolean).pop() || candidate;
  try {
    return decodeURIComponent(baseName);
  } catch {
    return baseName;
  }
};

export const formatRelativePage = (locations: RelativeLocations, cfi: string) => {
  if (!cfi) return null;
  const index = locations.locationFromCfi(cfi);
  if (!Number.isFinite(index) || index < 0) return null;
  const total = Math.max(1, Number(locations.total) + 1);
  const page = Math.min(total, Math.max(1, Math.floor(index) + 1));
  return `${page}/${total}`;
};

/**
 * Generates estimates for unvisited spine items away from the visible rendition.
 * Confirmed displayed columns supply the ordinal and measured chapter lengths.
 */
export class EpubRelativePaginator {
  private latestCfi = '';
  private version = 0;
  private readyVersion = -1;
  private pending: (RelativePaginationConfig & { version: number }) | null = null;
  private runner: Promise<void> | null = null;
  private closed = false;
  private latestPage: VisiblePage | null = null;
  private estimatedPages = new Map<number, number>();
  private measuredPages = new Map<number, number>();

  constructor(
    private readonly book: RelativeBook,
    private readonly onLabel: (label: string, estimated?: boolean) => void,
    private readonly trace: Trace = () => undefined
  ) {}

  relocate(location?: string | VisibleLocation) {
    if (!location || this.closed) return;
    if (typeof location === 'string') {
      this.latestCfi = location;
      this.latestPage = null;
    } else {
      this.latestCfi = location.start?.cfi ?? this.latestCfi;
      const start = location.start;
      this.latestPage = start && Number.isFinite(start.index) &&
        Number.isFinite(start.displayed?.page) && start.displayed.page >= 1 &&
        Number.isFinite(start.displayed?.total) && start.displayed.total >= start.displayed.page
        ? start : null;
    }
    if (this.readyVersion === this.version) this.publish();
  }

  rebuild(config: RelativePaginationConfig) {
    if (this.closed) return Promise.resolve();
    const version = ++this.version;
    this.measuredPages.clear();
    this.pending = { ...config, version };
    this.onLabel('…/…');
    if (!this.runner) {
      this.runner = this.run().finally(() => {
        this.runner = null;
      });
    }
    return this.runner;
  }

  close() {
    this.closed = true;
    this.version += 1;
    this.pending = null;
  }

  waitForIdle() {
    return this.runner ?? Promise.resolve();
  }

  private publish() {
    // The visible ordinal comes from actual columns, never character buckets.
    // Only unvisited spine lengths remain estimates; observed lengths replace
    // them for this layout. A next/prev turn therefore advances one page even
    // if it crosses several semantic locations or a spine boundary.
    const visible = this.latestPage;
    if (visible && this.estimatedPages.size) {
      this.measuredPages.set(visible.index, Math.floor(visible.displayed.total));
      let offset = 0;
      let total = 0;
      const sections = new Set([...this.estimatedPages.keys(), ...this.measuredPages.keys()]);
      for (const index of sections) {
        const count = this.measuredPages.get(index) ?? this.estimatedPages.get(index) ?? 1;
        total += count;
        if (index < visible.index) offset += count;
      }
      this.onLabel(`${offset + Math.floor(visible.displayed.page)}/${total}`,
        [...sections].some((index) => !this.measuredPages.has(index)));
      return;
    }
    const label = formatRelativePage(this.book.locations, this.latestCfi);
    if (label) this.onLabel(label, true);
  }

  private async run() {
    while (!this.closed && this.pending) {
      const request = this.pending;
      this.pending = null;
      const locations = this.book.locations;
      const previousPause = locations.pause;
      const chars = estimateCharsPerPage(request);
      const startedAt = Date.now();

      try {
        // epub.js 0.3.93 appends on generate(), so clear the prior metric map.
        locations.load([]);
        locations.pause = 0;
        const generated = await locations.generate(chars);
        if (this.closed || request.version !== this.version) continue;
        this.estimatedPages.clear();
        for (const section of this.book.spine?.spineItems ?? []) {
          if (section.linear) this.estimatedPages.set(section.index, 1);
        }
        const counts = new Map<number, number>();
        for (const cfi of generated) {
          const index = this.book.spine?.get(cfi)?.index;
          if (index !== undefined && this.estimatedPages.has(index)) counts.set(index, (counts.get(index) ?? 0) + 1);
        }
        for (const [index, count] of counts) this.estimatedPages.set(index, count);
        this.readyVersion = request.version;
        this.publish();
        this.trace(
          'paginación relativa lista',
          `pages=${generated.length || Math.max(1, locations.total + 1)} chars=${chars} ms=${Date.now() - startedAt}`
        );
      } catch (error) {
        if (!this.closed && request.version === this.version) {
          this.onLabel('—/—');
          this.trace('falló paginación relativa', `chars=${chars}`, error);
        }
      } finally {
        locations.pause = previousPause;
      }
    }
  }
}
