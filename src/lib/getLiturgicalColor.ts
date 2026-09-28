import {
  getGeneralLiturgicalColor,
  getSpecialDateLiturgicalColorName,
  type LiturgicalSaintLike,
} from './liturgical-color-rules';
import { LITURGICAL_COLOR_HEX } from './liturgical-color-shared';

type DateInput = Date | string | null | undefined;

export function getLiturgicalColor(
  saint: LiturgicalSaintLike,
  dateInput?: DateInput,
  ignoreSpecialDate?: boolean
) {
  if (!ignoreSpecialDate) {
    const protectedColorName = getSpecialDateLiturgicalColorName(dateInput);
    if (protectedColorName) return LITURGICAL_COLOR_HEX[protectedColorName];
  }

  return getGeneralLiturgicalColor(saint, dateInput, ignoreSpecialDate);
}
