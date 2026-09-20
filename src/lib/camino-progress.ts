import { compareReading, mirrorReading, nextReadingStamp, queueReading, readReading,
  type ReadingStamp, type ReadingTrace } from './reading-store';

export type CaminoAnchor = { point: number; fraction: number; viewportFraction: number };
export type CaminoProgress = ReadingStamp & CaminoAnchor;
const KEY = 'cotidie_camino_progress_v1';
const RESOURCE = 'camino-libro';

function parse(value: unknown): CaminoProgress | null {
  try {
    const v = typeof value === 'string' ? JSON.parse(value) : value;
    return v?.version === 1 && v.resourceId === RESOURCE && Number.isSafeInteger(v.revision) && v.revision > 0 &&
      Number.isFinite(v.updatedAt) && v.updatedAt > 0 && Number.isInteger(v.point) && v.point > 0 &&
      Number.isFinite(v.fraction) && v.fraction >= 0 && v.fraction <= 1 &&
      Number.isFinite(v.viewportFraction) && v.viewportFraction >= 0 && v.viewportFraction <= 1 ? v : null;
  } catch { return null; }
}
export async function loadCaminoProgress(trace: ReadingTrace): Promise<CaminoProgress | null> {
  let local: CaminoProgress | null = null;
  let durable: CaminoProgress | null = null;
  try { local = parse(localStorage.getItem(KEY)); } catch (error) { trace('Camino local read', String(error), true); }
  try { durable = parse(await readReading(KEY)); } catch (error) { trace('Camino IDB read', String(error), true); }
  const winner = local && durable ? (compareReading(local, durable) >= 0 ? local : durable) : local ?? durable;
  if (!winner) return null;
  const record = mirrorReading(KEY, winner, trace);
  await queueReading(KEY, record, trace).catch(() => undefined);
  trace('Camino read', `${RESOURCE} r${record.revision} ${winner === local ? 'local' : 'IDB'} point=${record.point}`);
  return record;
}
export function saveCaminoProgress(anchor: CaminoAnchor, operation: string, trace: ReadingTrace) {
  const record = mirrorReading(KEY, { ...anchor, ...nextReadingStamp(KEY, RESOURCE) }, trace);
  void queueReading(KEY, record, trace).catch(() => undefined);
  trace(operation, `${RESOURCE} r${record.revision} point=${record.point} offset=${record.fraction.toFixed(3)}`);
}

const points = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>('[data-camino-point]'));
function pointHeight(elements: HTMLElement[], index: number) {
  const rect = elements[index].getBoundingClientRect();
  return Math.max(1, elements[index + 1] ? elements[index + 1].getBoundingClientRect().top - rect.top : rect.height);
}
export function captureCaminoAnchor(container: HTMLElement): CaminoAnchor | null {
  const elements = points(container);
  if (!elements.length) return null;
  const viewportFraction = 0.25;
  const y = container.getBoundingClientRect().top + container.clientTop + container.clientHeight * viewportFraction;
  let index = 0;
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].getBoundingClientRect().top > y) break;
    index = i;
  }
  return { point: Number(elements[index].dataset.caminoPoint), viewportFraction,
    fraction: Math.max(0, Math.min(1, (y - elements[index].getBoundingClientRect().top) / pointHeight(elements, index))) };
}
export function restoreCaminoAnchor(container: HTMLElement, anchor: CaminoAnchor): boolean {
  const elements = points(container);
  const index = elements.findIndex(element => Number(element.dataset.caminoPoint) === anchor.point);
  if (index < 0) return false;
  const top = elements[index].getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientTop;
  container.scrollTo({ top: container.scrollTop + top + pointHeight(elements, index) * anchor.fraction -
    container.clientHeight * anchor.viewportFraction, behavior: 'instant' });
  return true;
}
