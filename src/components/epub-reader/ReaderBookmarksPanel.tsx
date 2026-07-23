import { Button } from '@/components/ui/button';
import type { BookmarkItem } from '@/lib/epub-reader/types';

type ReaderBookmarksPanelProps = {
  bookmarks: BookmarkItem[];
  displayAndPersist: (cfi: string) => void | Promise<void>;
  setIsPanelOpen: (open: boolean) => void;
  removeBookmark: (id: string) => void;
};

export function ReaderBookmarksPanel({
  bookmarks,
  displayAndPersist,
  setIsPanelOpen,
  removeBookmark,
}: ReaderBookmarksPanelProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold">Marcadores</div>
      <div className="max-h-80 overflow-auto rounded-md border border-border bg-background/60 p-2 space-y-1">
        {bookmarks.length === 0 ? (
          <div className="text-xs text-muted-foreground">Sin marcadores.</div>
        ) : (
          bookmarks.map((item) => (
            <div key={item.id} className="flex items-center gap-1">
              <button
                className="flex-1 text-left text-xs hover:underline"
                onClick={() => {
                  void displayAndPersist(item.cfi);
                  setIsPanelOpen(false);
                }}
              >
                {item.label}
              </button>
              <Button size="sm" variant="ghost" onClick={() => removeBookmark(item.id)}>
                x
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
