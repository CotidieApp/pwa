import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HighlightItem } from '@/lib/epub-reader/types';

type ReaderHighlightsPanelProps = {
  highlights: HighlightItem[];
  displayAndPersist: (cfiRange: string) => void | Promise<void>;
  setIsPanelOpen: (open: boolean) => void;
  updateHighlightNote: (id: string, note: string) => void;
  removeHighlight: (item: HighlightItem) => void;
};

export function ReaderHighlightsPanel({
  highlights,
  displayAndPersist,
  setIsPanelOpen,
  updateHighlightNote,
  removeHighlight,
}: ReaderHighlightsPanelProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold">Subrayados</div>
      <div className="max-h-80 overflow-auto rounded-md border border-border bg-background/60 p-2 space-y-2">
        {highlights.length === 0 ? (
          <div className="text-xs text-muted-foreground">Sin subrayados.</div>
        ) : (
          highlights.map((item) => (
            <div key={item.id} className="rounded border border-border/60 p-2 space-y-1">
              <button
                className="w-full text-left text-xs hover:underline"
                onClick={() => {
                  void displayAndPersist(item.cfiRange);
                  setIsPanelOpen(false);
                }}
              >
                {item.text}
              </button>
              <Input
                value={item.note ?? ''}
                onChange={(e) => updateHighlightNote(item.id, e.target.value)}
                placeholder="Nota opcional"
              />
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => removeHighlight(item)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
