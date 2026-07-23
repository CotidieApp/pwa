import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ReaderSelectionToolbarProps = {
  pendingSelectionCfi: string;
  showBookmarkInput: boolean;
  readerBackgroundColor: string;
  pendingSelectionText: string;
  highlightNoteDraft: string;
  setHighlightNoteDraft: (value: string) => void;
  addHighlightFromSelection: () => void;
  status: 'idle' | 'loading' | 'ready' | 'error';
  clearPendingSelection: () => void;
  bookmarkLabel: string;
  setBookmarkLabel: (value: string) => void;
  addBookmark: () => void;
  currentCfi: string;
};

export function ReaderSelectionToolbar({
  pendingSelectionCfi,
  showBookmarkInput,
  readerBackgroundColor,
  pendingSelectionText,
  highlightNoteDraft,
  setHighlightNoteDraft,
  addHighlightFromSelection,
  status,
  clearPendingSelection,
  bookmarkLabel,
  setBookmarkLabel,
  addBookmark,
  currentCfi,
}: ReaderSelectionToolbarProps) {
  if (!pendingSelectionCfi) return null;

  return (
    <div
      data-no-touch-nav
      className="z-[160] space-y-2 rounded-md border border-border p-3 fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] shadow-xl"
      style={{ backgroundColor: readerBackgroundColor }}
    >
      <div className="line-clamp-2 text-xs text-muted-foreground">
        Selección: {pendingSelectionText || '(sin texto)'}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-0 flex-1"
          value={highlightNoteDraft}
          onChange={(e) => setHighlightNoteDraft(e.target.value)}
          placeholder="Nota opcional"
        />
        <Button
          variant="outline"
          onClick={addHighlightFromSelection}
          disabled={status !== 'ready'}
        >
          Guardar subrayado
        </Button>
        <Button variant="ghost" onClick={clearPendingSelection}>
          Cancelar
        </Button>
      </div>
      {showBookmarkInput ? (
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-0 flex-1"
            value={bookmarkLabel}
            onChange={(e) => setBookmarkLabel(e.target.value)}
            placeholder="Nombre del marcador"
          />
          <Button variant="outline" onClick={addBookmark} disabled={!currentCfi || status !== 'ready'}>
            Guardar marcador
          </Button>
        </div>
      ) : null}
    </div>
  );
}
