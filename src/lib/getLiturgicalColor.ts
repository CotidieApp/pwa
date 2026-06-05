import {
  getGeneralLiturgicalColor,
  getSpecialDateLiturgicalColorName,
  type LiturgicalSaintLike,
} from './liturgical-color-rules';
import { LITURGICAL_COLOR_HEX } from './liturgical-color-shared';
import { getYearlyChileLiturgicalColorName } from './official-liturgical-calendar';

type DateInput = Date | string | null | undefined;

export function getLiturgicalColor(
  saint: LiturgicalSaintLike,
  dateInput?: DateInput
) {
  const protectedColorName = getSpecialDateLiturgicalColorName(dateInput);
  if (protectedColorName) return LITURGICAL_COLOR_HEX[protectedColorName];

  const yearlyColorName = getYearlyChileLiturgicalColorName(dateInput);
  if (yearlyColorName) return LITURGICAL_COLOR_HEX[yearlyColorName];

  return getGeneralLiturgicalColor(saint, dateInput);
}
