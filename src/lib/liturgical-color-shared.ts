export type LiturgicalColorName =
  | 'Blanco'
  | 'Rojo'
  | 'Verde'
  | 'Morado'
  | 'Rosado'
  | 'Negro'
  | 'Azul'
  | 'Celeste';

export const LITURGICAL_COLOR_HEX: Record<LiturgicalColorName, string> = {
  Blanco: '#F8F9FA',
  Rojo: '#8B0000',
  Verde: '#225722',
  Morado: '#5A2A69',
  Rosado: '#D07A93',
  Negro: '#111827',
  Azul: '#5C83C6',
  Celeste: '#7DB7E8',
};
