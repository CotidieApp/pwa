import type { Rendition } from 'epubjs';
import { captureEpubAnchor, nextFrame, waitForReaderFonts } from './layout';
import { EpubProgressRepository, type EpubAnchor } from './progress';
import type { ReadingTrace } from '../reading-store';

type Operation = 'restore' | 'display' | 'next' | 'prev' | 'layout';
export class EpubReadingController {
  private tail: Promise<void> = Promise.resolve();
  private stopped = false;
  private failed = false;
  private stable: EpubAnchor | null = null;
  private rawDisplay: (target?: string) => Promise<void>;
  private generation = 0;
  private repository: EpubProgressRepository;
  private pending = 0;
  private restored = false;
  private inFlight: Promise<void> = Promise.resolve();
  private cancelConfirmation: (() => void) | null = null;
  private fontListeners = new Map<Document, () => void>();

  constructor(private rendition: Rendition, private viewport: HTMLElement, resourceId: string,
    private trace: ReadingTrace, private confirmed: (anchor: EpubAnchor) => void,
    private busy: (value: boolean) => void) {
    this.trace = (message, data, error) => trace(message, `${resourceId}: ${data}`, error);
    this.repository = new EpubProgressRepository(resourceId, trace);
    this.rawDisplay = rendition.display.bind(rendition);
    // 0.3.93 onResized normally calls display(start.cfi) outside any queue.
    // Install before rendition.start binds it. Fixed numeric renderTo dimensions disable stage auto-resize.
    (rendition as any).onResized = (size: unknown) => rendition.emit('resized', size);
    // epub.js internal hyperlinks use this.display too; route them through the same owner.
    rendition.display = ((target?: string) => this.run('display', target).catch(error => {
      // Internal link handlers do not consume their promise; report without an unhandled rejection.
      this.trace('link', String(error), true);
    })) as Rendition['display'];
  }

  private check(token: number) {
    if (this.stopped || this.failed || token !== this.generation) throw new Error('Reading operation cancelled');
  }

  observeContents(contents: { document?: Document }) {
    for (const [doc, remove] of this.fontListeners) {
      if (!doc.defaultView?.frameElement?.isConnected) { remove(); this.fontListeners.delete(doc); }
    }
    const doc = contents.document;
    if (!doc?.fonts || this.fontListeners.has(doc)) return;
    const changed = () => {
      // Active operations already await this FontFaceSet. A later font load needs its own reflow.
      if (this.restored && !this.pending && !this.stopped && !this.failed) {
        void this.run('layout').catch(error => this.trace('font reflow', String(error), true));
      }
    };
    doc.fonts.addEventListener('loadingdone', changed);
    this.fontListeners.set(doc, () => doc.fonts.removeEventListener('loadingdone', changed));
  }

  private async settle(token: number) {
    let previous = '';
    while (true) {
      this.check(token);
      const contents = (this.rendition as any).getContents() ?? [];
      await Promise.all(contents.map(waitForReaderFonts));
      this.check(token);
      // Force epub.js geometry to use the loaded fonts, including newly mounted spine documents.
      for (const view of (this.rendition as any).manager.views.all()) {
        if (view.contents) { view.layout.format(view.contents); view.expand(); }
      }
      await this.rendition.q.enqueue(() => undefined);
      await nextFrame();
      this.check(token);
      const signature = JSON.stringify((this.rendition as any).manager.views.all().map((view: any) =>
        [view.section.index, view.width(), view.height(), view.contents?.document?.body?.scrollWidth,
          view.contents?.document?.body?.scrollHeight, view.contents?.document?.fonts?.status]));
      if (signature === previous) return;
      previous = signature;
    }
  }

  private async relocate(action: () => unknown, token: number) {
    let reported = false;
    const listener = () => { reported = true; };
    this.rendition.on('relocated', listener); // BEFORE invoking next/prev/display
    try {
      await action();
      await this.settle(token);
      // reportLocation queues a RAF but its returned promise does NOT await that RAF in 0.3.93.
      // Drain older callbacks, then explicitly request and await a fresh report of settled geometry.
      await nextFrame();
      this.check(token);
      await new Promise<void>((resolve, reject) => {
        const done = () => { cleanup(); resolve(); };
        const cancel = () => { cleanup(); reject(new Error('Reading confirmation cancelled')); };
        const cleanup = () => { this.rendition.off('relocated', done); this.cancelConfirmation = null; };
        this.cancelConfirmation = cancel;
        this.rendition.on('relocated', done);
        void this.rendition.reportLocation().catch(cancel);
      });
      this.check(token);
      if (!reported) throw new Error('No relocated confirmation');
    } finally { this.rendition.off('relocated', listener); }
  }

  private async displayWithFallback(target: string | undefined, token: number): Promise<string | undefined> {
    const candidates = [...new Set([target, this.stable?.startCfi, this.stable?.endCfi, this.stable?.href].filter(Boolean))] as string[];
    if (!candidates.length) { await this.rawDisplay(); return undefined; }
    let failure: unknown;
    for (const candidate of candidates) {
      this.check(token);
      try { await this.rawDisplay(candidate); return candidate; }
      catch (error) {
        failure = error;
        this.trace('restore fallback', `${candidate.slice(0, 42)}: ${String(error)}`, true);
      }
    }
    // Keep the original progress on total failure; opening page 1 would erase useful recovery data.
    throw failure ?? new Error('No se pudo restaurar la ubicación guardada');
  }

  run(operation: Operation, target?: string, change?: () => void): Promise<void> {
    if (this.stopped || this.failed) return Promise.reject(new Error('Cierra y vuelve a abrir el lector.'));
    // ResizeObserver fires on initial mount, even before navigation/legacy storage finished loading.
    // It must never bootstrap a new first-page record ahead of restoration.
    if (operation !== 'restore' && !this.restored) return Promise.resolve();
    this.pending++;
    this.busy(true);
    const task = this.tail.then(async () => {
      if (this.stopped) return;
      if (this.failed) throw new Error('Cierra y vuelve a abrir el lector.');
      const token = ++this.generation;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const work = async () => {
        if (operation === 'restore') {
          this.stable = await this.repository.load();
          this.check(token);
          target = this.stable?.anchorCfi || this.stable?.startCfi || this.stable?.endCfi || this.stable?.href;
        }
        if (operation === 'layout') target = this.stable?.anchorCfi || this.stable?.href;
        this.check(token);
        let destination = target;
        await this.relocate(async () => {
          change?.(); // confirmation is already registered for font/resize mutations, too
          if (operation === 'restore' || operation === 'layout') {
            destination = await this.displayWithFallback(target, token);
          } else {
            await (operation === 'next' ? this.rendition.next() : operation === 'prev'
              ? this.rendition.prev() : this.rawDisplay(target));
          }
        }, token);
        const first = captureEpubAnchor(this.rendition, this.viewport, reason => this.trace('anchor fallback', reason, true));
        // Re-display the semantic destination AFTER its iframe CSS/fonts are loaded.
        const anchor = (operation === 'next' || operation === 'prev') ? first?.anchorCfi : destination || first?.anchorCfi;
        if (anchor) await this.relocate(() => this.rawDisplay(anchor), token);
        this.check(token);
        const location = captureEpubAnchor(this.rendition, this.viewport, reason => this.trace('anchor fallback', reason, true));
        if (!location) throw new Error('No se pudo confirmar una ubicación de lectura');
        // Layout/restoration preserve the original semantic point to avoid cumulative drift after zoom cycles.
        if ((operation === 'layout' || operation === 'restore') && this.stable?.anchorKind === 'center' &&
          destination === this.stable.anchorCfi) {
          location.anchorCfi = this.stable.anchorCfi;
          location.anchorKind = 'center';
        }
        this.stable = location;
        this.repository.save(location, operation);
        this.restored = true;
        this.confirmed(location);
      };
      // Error watchdog only: expiry NEVER validates or writes the transient location.
      const watchdog = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          this.failed = true;
          this.cancelConfirmation?.();
          reject(new Error('La lectura no pudo estabilizarse. Cierra y vuelve a abrir el libro.'));
        }, 20000);
      });
      this.inFlight = work();
      try { await Promise.race([this.inFlight, watchdog]); }
      catch (error) {
        if (!this.stopped) { this.failed = true; this.trace(operation, String(error), true); }
        throw error;
      }
      finally { clearTimeout(timer); }
    });
    this.tail = task.catch(() => undefined);
    return task.finally(() => { this.pending--; if (!this.stopped && !this.pending) this.busy(false); });
  }

  checkpoint(operation: string) {
    // Never sample transient DOM during background/close. Last confirmed anchor is synchronous in memory.
    if (this.stable) this.repository.save(this.stable, operation);
  }
  close(): Promise<void> {
    this.checkpoint('close');
    this.stopped = true;
    ++this.generation;
    this.cancelConfirmation?.();
    this.fontListeners.forEach(remove => remove());
    this.fontListeners.clear();
    // Never destroy epub.js while an already-started display is still resolving.
    return Promise.allSettled([this.tail, this.inFlight]).then(() => undefined);
  }
}
