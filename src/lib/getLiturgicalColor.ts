import {
  isMarianCelebration,
  isPenitentialSeason,
  keepsOwnColorInPenitentialSeason,
  normalizeDate,
  normalizeLiturgicalText,
} from './liturgical-color-rules';

type DateInput = Date | string | null | undefined;

export function getLiturgicalColor(
  saint: { title?: string; type?: string; name?: string },
  dateInput?: DateInput
) {
  if (!saint) return 'hsl(var(--card))';

  const title = normalizeLiturgicalText(saint.title);
  const type = normalizeLiturgicalText(saint.type);
  const name = normalizeLiturgicalText(saint.name);

  const colors = {
    gold: '#B8860B',
    red: '#8B0000',
    white: '#F8F9FA',
    purple: '#5A2A69',
    green: '#225722',
    blue: '#3A5F7A',
  };

  let baseColor = colors.green;

  const isFatimaSeers =
    name.includes('jacinta') && name.includes('francisco') && name.includes('marto');

  if (!isFatimaSeers) {
    if (
      title.includes('solemnidad') ||
      name.includes('senor') ||
      name.includes('cristo rey') ||
      title.includes('fiesta del senor')
    ) {
      baseColor =
        name.includes('pasion') || name.includes('viernes santo') || name.includes('cruz')
          ? colors.red
          : colors.gold;
    } else if (
      name.includes('viernes santo') ||
      name.includes('pentecostes') ||
      name.includes('espiritu santo') ||
      name.includes('pasion') ||
      type.includes('martyr') || type.includes('martir') || name.includes('martir') ||
      type.includes('apostle') || type.includes('apostol') ||
      type.includes('evangelist') || type.includes('evangelista')
    ) {
      baseColor = name.includes('juan') && name.includes('evangelista') ? colors.white : colors.red;
    } else if (isMarianCelebration(type, name)) {
      baseColor = colors.blue;
    } else if (type.includes('virgin') || type.includes('virgen')) {
      baseColor = colors.green;
    } else if (
      type.includes('confessor') ||
      type.includes('doctor') ||
      type.includes('pope') || type.includes('papa') ||
      type.includes('bishop') || type.includes('obispo') ||
      type.includes('religious') || type.includes('religioso') ||
      type.includes('abbot') || type.includes('abad') ||
      title.includes('fiesta') || title.includes('memoria')
    ) {
      baseColor = colors.white;
    }
  }

  const date = normalizeDate(dateInput ?? new Date());
  if (date && isPenitentialSeason(date) && !keepsOwnColorInPenitentialSeason(title, name)) {
    return colors.purple;
  }

  return baseColor;
}
