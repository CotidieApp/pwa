export type EpubReaderProps = {
  fileName?: string;
  sourceBase64?: string | null;
  context?: 'nt' | 'general';
  onClose?: () => void;
};

export type TocEntry = {
  id: string;
  href: string;
  label: string;
  depth: number;
};

export type SearchResult = {
  id: string;
  target: string;
  excerpt: string;
};

export type StoredReaderLocation = {
  cfi?: string;
  endCfi?: string;
  href?: string;
};

export type BookmarkItem = {
  id: string;
  cfi: string;
  label: string;
  createdAt: number;
};

export type HighlightItem = {
  id: string;
  cfiRange: string;
  text: string;
  note?: string;
  createdAt: number;
};

export type ReaderThemeColors = {
  text: string;
  background: string;
};

export type NtReference = {
  bookId: string;
  chapter: number;
  verse?: number;
};
