export const DEFAULT_FILE_NAME = 'nuevo-testamento.epub';
export const EPUB_FONT_SIZE_STORAGE_KEY = 'cotidie_epub_font_size';

export const READER_STYLE_TAG_ID = 'cotidie-reader-colors';
export const READER_FONT_STYLESHEET_ID = 'cotidie-reader-fonts';
export const EPUB_PAGE_BOTTOM_GUARD = '2.5em';
export const MIN_READER_FONT_SIZE = 60;
export const MAX_READER_FONT_SIZE = 200;
export const READER_FONT_SIZE_STEP = 10;
export const READER_RESIZE_DEBOUNCE_MS = 120;
export const READER_MAX_RESTORE_SUPPRESSION_MS = 5000;
export const READER_MAX_RESTORE_NUDGE_STEPS = 6;
export const READER_FONT_FAMILIES: Record<string, string> = {
  literata: "'Literata', serif",
  lora: "'Lora', serif",
  merriweather: "'Merriweather', serif",
  ebgaramond: "'EB Garamond', serif",
  timesnewroman: "'Times New Roman', serif",
};

export const NT_BOOKS = [
  { id: 'mateo', label: 'Mateo', aliases: ['mateo', 'mt'] },
  { id: 'marcos', label: 'Marcos', aliases: ['marcos', 'mc'] },
  { id: 'lucas', label: 'Lucas', aliases: ['lucas', 'lc'] },
  { id: 'juan', label: 'Juan', aliases: ['juan', 'jn'] },
  { id: 'hechos', label: 'Hechos', aliases: ['hechos', 'actos'] },
  { id: 'romanos', label: 'Romanos', aliases: ['romanos', 'rom'] },
  { id: '1-corintios', label: '1 Corintios', aliases: ['1 corintios', 'i corintios'] },
  { id: '2-corintios', label: '2 Corintios', aliases: ['2 corintios', 'ii corintios'] },
  { id: 'galatas', label: 'Galatas', aliases: ['galatas', 'gal'] },
  { id: 'efesios', label: 'Efesios', aliases: ['efesios', 'efe'] },
  { id: 'filipenses', label: 'Filipenses', aliases: ['filipenses', 'flp'] },
  { id: 'colosenses', label: 'Colosenses', aliases: ['colosenses', 'col'] },
  { id: '1-tesalonicenses', label: '1 Tesalonicenses', aliases: ['1 tesalonicenses', 'i tesalonicenses'] },
  { id: '2-tesalonicenses', label: '2 Tesalonicenses', aliases: ['2 tesalonicenses', 'ii tesalonicenses'] },
  { id: '1-timoteo', label: '1 Timoteo', aliases: ['1 timoteo', 'i timoteo'] },
  { id: '2-timoteo', label: '2 Timoteo', aliases: ['2 timoteo', 'ii timoteo'] },
  { id: 'tito', label: 'Tito', aliases: ['tito'] },
  { id: 'filemon', label: 'Filemon', aliases: ['filemon'] },
  { id: 'hebreos', label: 'Hebreos', aliases: ['hebreos'] },
  { id: 'santiago', label: 'Santiago', aliases: ['santiago', 'stg'] },
  { id: '1-pedro', label: '1 Pedro', aliases: ['1 pedro', 'i pedro'] },
  { id: '2-pedro', label: '2 Pedro', aliases: ['2 pedro', 'ii pedro'] },
  { id: '1-juan', label: '1 Juan', aliases: ['1 juan', 'i juan'] },
  { id: '2-juan', label: '2 Juan', aliases: ['2 juan', 'ii juan'] },
  { id: '3-juan', label: '3 Juan', aliases: ['3 juan', 'iii juan'] },
  { id: 'judas', label: 'Judas', aliases: ['judas'] },
  { id: 'apocalipsis', label: 'Apocalipsis', aliases: ['apocalipsis', 'revelacion'] },
];
