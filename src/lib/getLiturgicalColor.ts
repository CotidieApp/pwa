import { getGeneralLiturgicalColor, type LiturgicalSaintLike } from './liturgical-color-rules';

type DateInput = Date | string | null | undefined;

export function getLiturgicalColor(
  saint: LiturgicalSaintLike,
  dateInput?: DateInput,
  ignoreSpecialDate?: boolean
) {
  return getGeneralLiturgicalColor(saint, dateInput, ignoreSpecialDate);
}
