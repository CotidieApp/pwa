import { compareReading, mirrorReading, nextReadingStamp, queueReading, readLegacyEpub,
  readReading, rememberReading, type ReadingStamp, type ReadingTrace } from '../reading-store';

export type EpubProgress = ReadingStamp & {
  anchorCfi: string; startCfi: string; endCfi: string; href?: string;
  anchorKind?: 'center' | 'fallback' | 'legacy';
};
export type EpubAnchor = Pick<EpubProgress, 'anchorCfi' | 'startCfi' | 'endCfi' | 'href' | 'anchorKind'>;
export const epubProgressKey = (id: string) => `cotidie_epub_location_${id.trim().toLowerCase()}`;

export function parseEpubProgress(raw: unknown, resourceId: string): EpubProgress | EpubAnchor | null {
  if (!raw) return null;
  let value: any = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { value = raw; }
  }
  if (typeof value === 'string') value = { cfi: value };
  if (!value || typeof value !== 'object') return null;
  const cfi = (v: unknown) => typeof v === 'string' && v.startsWith('epubcfi(') ? v : '';
  const startCfi = cfi(value.startCfi) || cfi(value.cfi);
  const endCfi = cfi(value.endCfi);
  const anchorCfi = cfi(value.anchorCfi) || startCfi || endCfi;
  const href = typeof value.href === 'string' ? value.href : undefined;
  if (!anchorCfi && !href) return null;
  const anchorKind: EpubAnchor['anchorKind'] = value.anchorKind === 'center' && cfi(value.anchorCfi)
    ? 'center' : value.anchorKind === 'fallback' ? 'fallback' : 'legacy';
  const anchor = { anchorCfi, startCfi, endCfi, href, anchorKind };
  if (value.version === 1 && value.resourceId === resourceId && Number.isSafeInteger(value.revision) &&
    value.revision > 0 && Number.isFinite(value.updatedAt) && value.updatedAt > 0) {
    return { ...anchor, version: 1, resourceId, revision: value.revision, updatedAt: value.updatedAt };
  }
  return anchor;
}
const stamped = (value: EpubAnchor | EpubProgress | null): value is EpubProgress => !!value && 'version' in value;

export class EpubProgressRepository {
  readonly resourceId: string;
  readonly key: string;
  constructor(id: string, private trace: ReadingTrace) {
    this.resourceId = id.trim().toLowerCase();
    this.key = epubProgressKey(this.resourceId);
  }
  async load(): Promise<EpubProgress | null> {
    let local: EpubAnchor | EpubProgress | null = null;
    let durable: EpubAnchor | EpubProgress | null = null;
    try { local = parseEpubProgress(localStorage.getItem(this.key), this.resourceId); }
    catch (error) { this.trace('local read error', String(error), true); }
    try {
      durable = parseEpubProgress(await readReading(this.key), this.resourceId);
      if (!durable) durable = parseEpubProgress(await readLegacyEpub(this.key), this.resourceId);
    } catch (error) { this.trace('IDB read error', `${this.resourceId}: ${String(error)}`, true); }
    // Metadata wins; when BOTH are legacy the synchronous old write was the newest.
    let winner = stamped(local) && stamped(durable)
      ? (compareReading(local, durable) >= 0 ? local : durable)
      : stamped(local) ? local : stamped(durable) ? durable : local ?? durable;
    if (!winner) return null;
    const origin = winner === local ? 'local' : 'IDB';
    const migration = !stamped(winner);
    const migrated: EpubProgress = stamped(winner) ? winner : { ...winner, ...nextReadingStamp(this.key, this.resourceId) };
    const record = mirrorReading(this.key, rememberReading(this.key, migrated), this.trace);
    await queueReading(this.key, record, this.trace).catch(() => undefined);
    this.trace('read', `${this.resourceId} r${record.revision} ${migration ? 'migration/' : ''}${origin} ${record.anchorCfi.slice(0, 42)}`);
    return record;
  }
  save(anchor: EpubAnchor, operation: string): EpubProgress {
    const record = mirrorReading(this.key, { ...anchor, ...nextReadingStamp(this.key, this.resourceId) }, this.trace);
    void queueReading(this.key, record, this.trace).catch(() => undefined);
    this.trace(operation, `${this.resourceId} r${record.revision} ${record.anchorCfi.slice(0, 42)}`);
    return record;
  }
}
