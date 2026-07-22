const normalizeCaminoSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const isCaminoLineMatch = (line: string, query: string): boolean => {
  const normalizedQuery = normalizeCaminoSearchText(query);
  if (!normalizedQuery) return false;

  const normalizedLine = normalizeCaminoSearchText(line);
  if (/^\d+$/.test(normalizedQuery)) {
    return new RegExp(`^${normalizedQuery}\\.`).test(normalizedLine);
  }

  return normalizedLine.includes(normalizedQuery);
};

export const countCaminoMatches = (content: string, query: string): number =>
  content.split('\n').filter((line) => isCaminoLineMatch(line, query)).length;
