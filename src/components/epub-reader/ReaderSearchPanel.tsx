import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SearchResult } from '@/lib/epub-reader/types';

type ReaderSearchPanelProps = {
  isNtContext: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchInBook: () => void;
  status: 'idle' | 'loading' | 'ready' | 'error';
  isSearching: boolean;
  searchResults: SearchResult[];
  openSearchResult: (item: SearchResult) => void;
};

export function ReaderSearchPanel({
  isNtContext,
  searchQuery,
  setSearchQuery,
  searchInBook,
  status,
  isSearching,
  searchResults,
  openSearchResult,
}: ReaderSearchPanelProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold">{isNtContext ? 'Buscar texto o referencia bíblica' : 'Buscar texto'}</div>
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isNtContext ? 'Ej: Juan 3:16 o palabra clave' : 'Escribe una palabra o frase'}
        />
        <Button variant="outline" onClick={searchInBook} disabled={status !== 'ready' || isSearching}>
          {isSearching ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>
      <div className="max-h-80 overflow-auto rounded-md border border-border bg-background/60 p-2 space-y-1">
        {searchResults.length === 0 ? (
          <div className="text-xs text-muted-foreground">Sin resultados.</div>
        ) : (
          searchResults.map((item) => (
            <button
              key={item.id}
              className="w-full text-left text-xs hover:bg-accent/30 rounded px-2 py-1"
              onClick={() => openSearchResult(item)}
            >
              {item.excerpt}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
