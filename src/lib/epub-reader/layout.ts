import type { Rendition } from 'epubjs';
import { READER_FONT_STYLESHEET_ID } from './constants';
import { getRenditionLocation } from './helpers';
import type { EpubAnchor } from './progress';

export const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

// Bound our DOM work independently of archive size and the controller's same-thread watchdog.
const MAX_ANCHOR_NODES = 512;
const MAX_ANCHOR_NODE_LENGTH = 4096;
const MAX_ANCHOR_RECTS = 2048;
const MAX_ANCHOR_MEASUREMENTS = 2048;

/** Wait for the stylesheet first: fonts.ready alone can resolve before CSS arrives. */
export async function waitForReaderFonts(contents: any): Promise<void> {
  const doc: Document | undefined = contents?.document;
  if (!doc) return;
  const link = doc.getElementById(READER_FONT_STYLESHEET_ID) as HTMLLinkElement | null;
  if (link?.dataset.failed === 'true') throw new Error('No se pudo cargar fonts.css');
  if (link && !link.sheet && link.dataset.loaded !== 'true') {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => { link.removeEventListener('load', loaded); link.removeEventListener('error', failed); };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error('No se pudo cargar fonts.css')); };
      link.addEventListener('load', loaded);
      link.addEventListener('error', failed);
      if (link.sheet) loaded();
    });
  }
  if (doc.fonts) {
    const style = doc.defaultView!.getComputedStyle(doc.body);
    await Promise.all([400, 700].flatMap(weight => ['', 'italic '].map(italic =>
      doc.fonts.load(`${italic}${weight} ${style.fontSize} ${style.fontFamily}`))));
    await doc.fonts.ready;
  }
  await Promise.all(Array.from(doc.images).map(img => img.decode?.().catch(() => undefined)));
}

/** Select the actual text nearest the centre of the clipped reader viewport.
 * iframe coordinates include the translated CSS columns; never use iframe width as the page width.
 */
export function captureEpubAnchor(rendition: Rendition, viewport: HTMLElement,
  fallback: (reason: string) => void): EpubAnchor | null {
  const location = getRenditionLocation(rendition);
  const bounds = viewport.getBoundingClientRect();
  const cx = (bounds.left + bounds.right) / 2;
  const cy = (bounds.top + bounds.bottom) / 2;
  let nodes = 0, rectangles = 0, measurements = 0;
  let budgetExceeded = false;
  let best: { contents: any; node: Text; x: number; y: number; distance: number } | null = null;
  const documents = (rendition as any).getContents() ?? [];
  if (documents.length > 8) budgetExceeded = true;
  scan: for (const contents of documents.slice(0, 8)) {
    const doc: Document = contents.document;
    const frame = contents.window?.frameElement as HTMLIFrameElement | null;
    if (!doc?.body || !frame) continue;
    const fr = frame.getBoundingClientRect();
    if (fr.right <= bounds.left || fr.left >= bounds.right || fr.bottom <= bounds.top || fr.top >= bounds.bottom) continue;
    const sx = fr.width / (frame.clientWidth || fr.width) || 1;
    const sy = fr.height / (frame.clientHeight || fr.height) || 1;
    // SHOW_TEXT can skip arbitrarily many empty elements inside one nextNode call.
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ALL);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      // Check Text.length before reading/normalizing its potentially enormous contents.
      if (++nodes > MAX_ANCHOR_NODES) { budgetExceeded = true; break scan; }
      if (node.nodeType !== 3) continue;
      if ((node as Text).length > MAX_ANCHOR_NODE_LENGTH) {
        budgetExceeded = true; break scan;
      }
      if (!node.textContent?.trim() || node.parentElement?.closest('script,style')) continue;
      const range = doc.createRange();
      range.selectNodeContents(node);
      if (++measurements > MAX_ANCHOR_MEASUREMENTS) { budgetExceeded = true; break scan; }
      const rects = range.getClientRects();
      if (rectangles + rects.length > MAX_ANCHOR_RECTS) { budgetExceeded = true; break scan; }
      rectangles += rects.length;
      for (let index = 0; index < rects.length; index++) {
        const rect = rects[index];
        const left = Math.max(bounds.left, fr.left, fr.left + rect.left * sx);
        const right = Math.min(bounds.right, fr.right, fr.left + rect.right * sx);
        const top = Math.max(bounds.top, fr.top, fr.top + rect.top * sy);
        const bottom = Math.min(bounds.bottom, fr.bottom, fr.top + rect.bottom * sy);
        if (right <= left || bottom <= top) continue;
        const x = Math.max(left + 0.1, Math.min(right - 0.1, cx));
        const y = (top + bottom) / 2;
        const distance = (x - cx) ** 2 + (y - cy) ** 2;
        if (!best || distance < best.distance) best = { contents, node: node as Text,
          x: (x - fr.left) / sx, y: (y - fr.top) / sy, distance };
      }
    }
  }
  let anchorCfi = '';
  if (best && !budgetExceeded) {
    try {
      const doc = best.node.ownerDocument;
      // Character rectangles avoid caret APIs returning the neighbouring column in WebView.
      const range = doc.createRange();
      let distance = Infinity;
      let offset = 0;
      for (let i = 0; i < best.node.length; i++) {
        if (++measurements > MAX_ANCHOR_MEASUREMENTS) { budgetExceeded = true; break; }
        range.setStart(best.node, i); range.setEnd(best.node, i + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const d = ((rect.left + rect.right) / 2 - best.x) ** 2 + ((rect.top + rect.bottom) / 2 - best.y) ** 2;
        if (d < distance) { distance = d; offset = i; }
      }
      if (!budgetExceeded) {
        range.setStart(best.node, offset); range.collapse(true);
        anchorCfi = best.contents.cfiFromRange(range);
      }
    } catch (error) { fallback(`central range: ${String(error)}`); }
  }
  const anchorKind = anchorCfi ? 'center' : 'fallback';
  if (budgetExceeded) fallback('central range budget exceeded; using diagnostic location');
  if (!anchorCfi) {
    anchorCfi = location?.cfi || location?.endCfi || '';
    fallback(`central range unavailable; fallback=${anchorCfi.slice(0, 42) || location?.href || 'none'}`);
  }
  if (!anchorCfi && !location?.href) return null;
  return { anchorCfi, anchorKind, startCfi: location?.cfi ?? '', endCfi: location?.endCfi ?? '', href: location?.href };
}
