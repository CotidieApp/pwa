import type { Rendition } from 'epubjs';
import { captureEpubAnchor, nextFrame, waitForReaderFonts } from './layout';
import { EpubProgressRepository, type EpubAnchor } from './progress';
import type { ReadingTrace } from '../reading-store';

export type EpubOperation = 'restore' | 'display' | 'next' | 'prev' | 'reflow';
type EpubOperationMode = 'fast-page' | 'new-spine' | 'restore' | 'reflow';
type ContentsLike = { document?: Document };
type ViewLike = {
  section?: { index?: number };
  contents?: ContentsLike;
  layout?: { format?: (contents: ContentsLike) => void };
  expand?: () => void;
};

type RenditionSnapshot = {
  spines: number[];
  documents: Set<Document>;
};

const clock = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
const elapsed = (startedAt: number) => Math.max(0, Math.round(clock() - startedAt));
const briefCfi = (value?: string) => value ? value.slice(0, 42) : '-';

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
  private activeAction: Promise<unknown> = Promise.resolve();
  private cancelConfirmation: (() => void) | null = null;
  private fontListeners = new Map<Document, () => void>();
  private fontReadiness = new WeakMap<Document, Promise<void>>();
  private preparedDocuments = new WeakSet<Document>();

  constructor(private rendition: Rendition, private viewport: HTMLElement, resourceId: string,
    private trace: ReadingTrace, private confirmed: (anchor: EpubAnchor) => void,
    private transition: (value: boolean) => void) {
    this.trace = (message, data, error) => trace(message, `${resourceId}: ${data}`, error);
    this.repository = new EpubProgressRepository(resourceId, trace);
    this.rawDisplay = rendition.display.bind(rendition);
    // epub.js 0.3.93 normally calls display(start.cfi) from onResized, outside our
    // serialization. Fixed renderTo dimensions plus the explicit reflow route own it instead.
    (rendition as any).onResized = (size: unknown) => rendition.emit('resized', size);
    // Internal hyperlinks must share the same owner as buttons, touch navigation and reflow.
    rendition.display = ((target?: string) => this.run('display', target).catch(error => {
      this.trace('link', String(error), true);
    })) as Rendition['display'];
  }

  private check(token: number) {
    if (this.stopped || this.failed || token !== this.generation) throw new Error('Reading operation cancelled');
  }

  /** Start and memoize readiness for this iframe. Formatting remains queue-owned. */
  observeContents(contents: ContentsLike): Promise<void> {
    for (const [doc, remove] of this.fontListeners) {
      if (!doc.defaultView?.frameElement?.isConnected) { remove(); this.fontListeners.delete(doc); }
    }
    const doc = contents.document;
    if (!doc) return Promise.resolve();
    let readiness = this.fontReadiness.get(doc);
    if (!readiness) {
      readiness = waitForReaderFonts(contents);
      this.fontReadiness.set(doc, readiness);
    }
    if (doc.fonts && !this.fontListeners.has(doc)) {
      const changed = () => {
        // A genuinely late fallback font changes metrics and requires a full reflow.
        if (this.restored && !this.pending && !this.stopped && !this.failed) {
          void this.run('reflow').catch(error => this.trace('font reflow', String(error), true));
        }
      };
      doc.fonts.addEventListener('loadingdone', changed);
      this.fontListeners.set(doc, () => doc.fonts.removeEventListener('loadingdone', changed));
    }
    return readiness;
  }

  private snapshot(): RenditionSnapshot {
    const views = (((this.rendition as any).manager?.views?.all?.() ?? []) as ViewLike[]);
    const documents = new Set<Document>();
    for (const contents of ((this.rendition as any).getContents?.() ?? []) as ContentsLike[]) {
      if (contents?.document) documents.add(contents.document);
    }
    return {
      spines: views.map(view => view.section?.index).filter((index): index is number => Number.isInteger(index)),
      documents,
    };
  }

  private locationSpines(location: any): number[] {
    const locations = Array.isArray(location) ? location : [location];
    const result = new Set<number>();
    for (const item of locations) {
      for (const edge of [item?.start, item?.end]) {
        if (Number.isInteger(edge?.index)) result.add(edge.index);
      }
    }
    return [...result];
  }

  private changedSpine(before: RenditionSnapshot, after: RenditionSnapshot, location: any) {
    const beforeSpines = before.spines.join(',');
    const locatedSpines = this.locationSpines(location);
    const afterSpines = (locatedSpines.length ? locatedSpines : after.spines).join(',');
    const newDocument = [...after.documents].some(doc => !before.documents.has(doc));
    return { changed: newDocument || beforeSpines !== afterSpines, beforeSpines: beforeSpines || '-',
      afterSpines: afterSpines || '-', newDocument };
  }

  private currentLocation(): any {
    try {
      const location = (this.rendition as any).currentLocation?.();
      return location && typeof location.then !== 'function' ? location : null;
    } catch { return null; }
  }

  /** Predict a section turn only to cover the moment in which epub.js clears the old iframe. */
  private expectsSpineTurn(operation: 'next' | 'prev'): boolean {
    const location = this.currentLocation();
    const first = Array.isArray(location) ? location[0] : location;
    const last = Array.isArray(location) ? location[location.length - 1] : location;
    const start = first?.start;
    const end = last?.end;
    if (Number.isInteger(start?.index) && Number.isInteger(end?.index) && start.index !== end.index) return true;
    const displayed = operation === 'next' ? (end?.displayed ?? start?.displayed) : start?.displayed;
    if (!Number.isFinite(displayed?.page) || !Number.isFinite(displayed?.total)) return false;
    return operation === 'next' ? displayed.page >= displayed.total : displayed.page <= 1;
  }

  private waitForRelocated(action: () => unknown, token: number): Promise<{ location: any; actionAt: number }> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let actionAt = clock();
      const cleanup = () => {
        this.rendition.off('relocated', relocated);
        if (this.cancelConfirmation === cancel) this.cancelConfirmation = null;
      };
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const relocated = (location: any) => finish(() => resolve({ location, actionAt }));
      const cancel = () => finish(() => reject(new Error('Reading confirmation cancelled')));
      this.cancelConfirmation = cancel;
      // next/prev/display resolve before reportLocation's RAF in epub.js 0.3.93.
      this.rendition.on('relocated', relocated);
      const actionPromise = Promise.resolve().then(action);
      this.activeAction = actionPromise;
      actionPromise.then(() => {
        actionAt = clock();
        this.check(token);
      }).catch(error => finish(() => reject(error)));
    });
  }

  private async prepareDocuments(token: number, force: boolean): Promise<number> {
    const views = (((this.rendition as any).manager?.views?.all?.() ?? []) as ViewLike[]);
    const candidates = views.filter(view => {
      const doc = view.contents?.document;
      return !!doc && (force || !this.preparedDocuments.has(doc));
    });
    if (!candidates.length) return 0;
    await Promise.all(candidates.map(view => this.observeContents(view.contents!)));
    this.check(token);
    // One explicit pagination pass per new document (or active document during reflow).
    for (const view of candidates) {
      if (!view.contents) continue;
      view.layout?.format?.(view.contents);
      view.expand?.();
      if (view.contents.document) this.preparedDocuments.add(view.contents.document);
    }
    await (this.rendition as any).q.enqueue(() => undefined);
    await nextFrame();
    this.check(token);
    return candidates.length;
  }

  private async displayWithFallback(target: string | undefined, token: number): Promise<string | undefined> {
    const candidates = [...new Set([target, this.stable?.startCfi, this.stable?.endCfi, this.stable?.href]
      .filter(Boolean))] as string[];
    if (!candidates.length) { await this.rawDisplay(); return undefined; }
    let failure: unknown;
    for (const candidate of candidates) {
      this.check(token);
      try { await this.rawDisplay(candidate); return candidate; }
      catch (error) {
        failure = error;
        this.trace('restore fallback', `${briefCfi(candidate)}: ${String(error)}`, true);
      }
    }
    throw failure ?? new Error('No se pudo restaurar la ubicación guardada');
  }

  private finalTarget(location: any, fallback?: string): string | undefined {
    const item = Array.isArray(location) ? location[0] : location;
    return fallback || item?.start?.cfi || item?.end?.cfi || item?.start?.href;
  }

  run(operation: EpubOperation, target?: string, change?: () => void): Promise<void> {
    if (this.stopped || this.failed) return Promise.reject(new Error('Cierra y vuelve a abrir el lector.'));
    // The initial ResizeObserver notification must not beat historical restoration.
    if (operation !== 'restore' && !this.restored) return Promise.resolve();
    this.pending++;
    const task = this.tail.then(async () => {
      if (this.stopped) return;
      if (this.failed) throw new Error('Cierra y vuelve a abrir el lector.');
      const token = ++this.generation;
      const startedAt = clock();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let transitionActive = false;
      const setTransition = (active: boolean) => {
        if (transitionActive === active) return;
        transitionActive = active;
        this.transition(active);
      };
      const work = async () => {
        if (operation === 'restore') {
          this.stable = await this.repository.load();
          this.check(token);
          target = this.stable?.anchorCfi || this.stable?.startCfi || this.stable?.endCfi || this.stable?.href;
        }
        if (operation === 'reflow') target = this.stable?.anchorCfi || this.stable?.href;
        this.check(token);

        const before = this.snapshot();
        const expectedSpineTurn = (operation === 'next' || operation === 'prev') && this.expectsSpineTurn(operation);
        if (operation === 'restore' || operation === 'reflow' || operation === 'display' || expectedSpineTurn) {
          setTransition(true);
        }

        let destination = target;
        const first = await this.waitForRelocated(async () => {
          change?.();
          if (operation === 'restore' || operation === 'reflow') {
            destination = await this.displayWithFallback(target, token);
          } else if (operation === 'next') {
            await this.rendition.next();
          } else if (operation === 'prev') {
            await this.rendition.prev();
          } else {
            await this.rawDisplay(target);
          }
        }, token);
        this.check(token);

        const after = this.snapshot();
        const spine = this.changedSpine(before, after, first.location);
        const mode: EpubOperationMode = operation === 'restore' ? 'restore'
          : operation === 'reflow' ? 'reflow' : spine.changed ? 'new-spine' : 'fast-page';
        let visibleAt = first.actionAt;
        let relocatedAt = clock();

        // Same-spine next/prev ends here: no font wait, format, expand or display.
        const needsPreparation = mode === 'restore' || mode === 'reflow' || mode === 'new-spine';
        if (needsPreparation) {
          if (!transitionActive) setTransition(true);
          const prepared = await this.prepareDocuments(token, mode === 'reflow');
          const semanticTarget = this.finalTarget(first.location,
            mode === 'restore' || mode === 'reflow' ? destination : undefined);
          if (prepared > 0 && semanticTarget) {
            const final = await this.waitForRelocated(() => this.rawDisplay(semanticTarget), token);
            relocatedAt = clock();
            destination = semanticTarget;
            void final.location;
          }
          visibleAt = clock();
        }

        this.check(token);
        const location = captureEpubAnchor(this.rendition, this.viewport,
          reason => this.trace('anchor fallback', reason, true));
        if (!location) throw new Error('No se pudo confirmar una ubicación de lectura');
        if ((mode === 'reflow' || mode === 'restore') && this.stable?.anchorKind === 'center' &&
          destination === this.stable.anchorCfi) {
          location.anchorCfi = this.stable.anchorCfi;
          location.anchorKind = 'center';
        }
        this.stable = location;
        this.restored = true;
        this.confirmed(location);
        if (transitionActive) {
          setTransition(false);
          visibleAt = clock();
        }

        const queuedAt = clock();
        const { committed } = this.repository.saveQueued(location, operation);
        this.trace('operation', `op=${operation} mode=${mode} spine=${spine.beforeSpines}->${spine.afterSpines} ` +
          `cfi=${briefCfi(location.anchorCfi)} visible=${Math.max(0, Math.round(visibleAt - startedAt))}ms ` +
          `relocated=${Math.max(0, Math.round(relocatedAt - startedAt))}ms persist=queued`);
        void committed.then(() => this.trace('persistence',
          `op=${operation} mode=${mode} cfi=${briefCfi(location.anchorCfi)} persist=${elapsed(queuedAt)}ms`))
          .catch(() => undefined);
      };
      // Error watchdog only; expiry never confirms or persists transient geometry.
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
      } finally {
        clearTimeout(timer);
        if (transitionActive) setTransition(false);
      }
    });
    this.tail = task.catch(() => undefined);
    return task.finally(() => { this.pending--; });
  }

  checkpoint(operation: string) {
    if (this.stable) this.repository.save(this.stable, operation);
  }

  close(): Promise<void> {
    this.checkpoint('close');
    this.stopped = true;
    ++this.generation;
    this.cancelConfirmation?.();
    this.fontListeners.forEach(remove => remove());
    this.fontListeners.clear();
    // Cancellation stops confirmation immediately, but an already-started
    // epub.js display may still own the iframe. Do not let React destroy it first.
    return Promise.allSettled([this.tail, this.inFlight, this.activeAction]).then(() => undefined);
  }
}
