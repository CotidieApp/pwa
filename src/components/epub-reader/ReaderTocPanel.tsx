import { NT_BOOKS } from '@/lib/epub-reader/constants';
import type { TocEntry } from '@/lib/epub-reader/types';

type ReaderTocPanelProps = {
  isNtContext: boolean;
  tocBookAnchors: Record<string, TocEntry>;
  tocBookFilter: string;
  setTocBookFilter: (value: string) => void;
  status: 'idle' | 'loading' | 'ready' | 'error';
  selectedToc: string;
  jumpToToc: (href: string) => void;
  filteredTocEntries: TocEntry[];
};

export function ReaderTocPanel({
  isNtContext,
  tocBookAnchors,
  tocBookFilter,
  setTocBookFilter,
  status,
  selectedToc,
  jumpToToc,
  filteredTocEntries,
}: ReaderTocPanelProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold">Índice</div>
      {isNtContext && Object.keys(tocBookAnchors).length > 0 ? (
        <select
          id="epub-reader-toc-book"
          name="epub-reader-toc-book"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={tocBookFilter}
          onChange={(e) => setTocBookFilter(e.target.value)}
          disabled={status !== 'ready'}
          aria-label="Libro del índice"
        >
          <option value="all">Todos los libros</option>
          {NT_BOOKS.filter((book) => Boolean(tocBookAnchors[book.id])).map((book) => (
            <option key={book.id} value={book.id}>
              {book.label}
            </option>
          ))}
        </select>
      ) : null}
      <select
        id="epub-reader-toc-entry"
        name="epub-reader-toc-entry"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={selectedToc}
        onChange={(e) => jumpToToc(e.target.value)}
        disabled={status !== 'ready' || filteredTocEntries.length === 0}
        aria-label="Sección del índice"
      >
        <option value="">{filteredTocEntries.length === 0 ? 'Sin secciones' : 'Selecciona una sección'}</option>
        {filteredTocEntries.map((entry) => (
          <option key={entry.id} value={entry.href}>
            {`${'  '.repeat(entry.depth)}${entry.label}`}
          </option>
        ))}
      </select>
    </div>
  );
}
