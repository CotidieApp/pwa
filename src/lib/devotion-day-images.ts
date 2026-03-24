import { beatoAlvaroPrayer } from '@/lib/prayers/devociones/beatoalvaro';
import { sanAgustinDeHiponaPrayer } from '@/lib/prayers/devociones/sanagustindehipona';
import { sanAlbertoHurtadoPrayer } from '@/lib/prayers/devociones/sanalbertohurtado';
import { sanBenjaminPrayer } from '@/lib/prayers/devociones/sanbenjamin';
import { sanCarloAcutisPrayer } from '@/lib/prayers/devociones/sancarloacutis';
import { sanFranciscoDeSalesPrayer } from '@/lib/prayers/devociones/sanfranciscodesales';
import { sanJosePrayer } from '@/lib/prayers/devociones/sanjose';
import { sanJosemariaPrayer } from '@/lib/prayers/devociones/sanjosemaria';
import { sanJuanBautistaPrayer } from '@/lib/prayers/devociones/sanjuanbautista';
import { sanJuanPabloIIPrayer } from '@/lib/prayers/devociones/sanjuanpabloii';
import { sanPedroPrayer } from '@/lib/prayers/devociones/sanpedro';
import { santaTeresaDeLosAndesPrayer } from '@/lib/prayers/devociones/santateresadelosandes';
import { santoTomasDeAquinoPrayer } from '@/lib/prayers/devociones/santotomasdeaquino';
import type { ImagePlaceholder, Prayer, SaintOfTheDay } from '@/lib/types';

type DevotionDayImageEntry = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint?: string;
  aliases: string[];
};

const normalizeSaintDayText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const buildDevotionDayImageEntry = (prayer: Prayer, aliases: string[]): DevotionDayImageEntry | null => {
  if (!prayer.id || !prayer.imageUrl) return null;

  return {
    id: prayer.id,
    description: prayer.title,
    imageUrl: prayer.imageUrl,
    imageHint: prayer.imageHint || prayer.title,
    aliases: aliases.map(normalizeSaintDayText),
  };
};

const devotionPrayersWithImages: Prayer[] = [
  sanJosemariaPrayer,
  sanJuanPabloIIPrayer,
  sanBenjaminPrayer,
  sanJuanBautistaPrayer,
  sanPedroPrayer,
  sanCarloAcutisPrayer,
  santaTeresaDeLosAndesPrayer,
  sanAlbertoHurtadoPrayer,
  beatoAlvaroPrayer,
  sanFranciscoDeSalesPrayer,
  sanAgustinDeHiponaPrayer,
  santoTomasDeAquinoPrayer,
  sanJosePrayer,
].filter((prayer) => Boolean(prayer.id && prayer.imageUrl));

const devotionAliasesByPrayerId: Record<string, string[]> = {
  sanjosemaria: ['San Josemaria Escriva', 'San Josemaria Escriva de Balaguer'],
  sanjuanpabloii: ['San Juan Pablo II'],
  sanbenjamin: ['San Benjamin, diacono y martir'],
  sanjuanbautista: ['Natividad de San Juan Bautista', 'Martirio de San Juan Bautista'],
  sanpedro: ['Catedra de San Pedro', 'Santos Pedro y Pablo', 'San Pedro, apostol'],
  sancarloacutis: ['San Carlo Acutis'],
  santateresadelosandes: ['Santa Teresa de los Andes'],
  sanalbertohurtado: ['San Alberto Hurtado'],
  beatoalvaro: ['Beato Alvaro del Portillo'],
  sanfranciscodesales: ['San Francisco de Sales'],
  sanagustindehipona: ['San Agustin, obispo y doctor de la Iglesia', 'San Agustin de Hipona'],
  santotomasdeaquino: ['Santo Tomas de Aquino'],
  'devocion-san-jose': ['San Jose, esposo de la Virgen Maria', 'San Jose Obrero'],
};

const missingAliasPrayerIds = devotionPrayersWithImages
  .map((prayer) => prayer.id)
  .filter((id): id is string => Boolean(id))
  .filter((id) => !devotionAliasesByPrayerId[id]);

if (missingAliasPrayerIds.length > 0) {
  throw new Error(`Missing saint-day aliases for devotion images: ${missingAliasPrayerIds.join(', ')}`);
}

const devotionDayImageEntries = devotionPrayersWithImages
  .map((prayer) => buildDevotionDayImageEntry(prayer, devotionAliasesByPrayerId[prayer.id!]))
  .filter((entry): entry is DevotionDayImageEntry => entry !== null);

export function resolveDevotionDayImage(saint: Pick<SaintOfTheDay, 'name'> | null | undefined): ImagePlaceholder | null {
  if (!saint?.name) return null;

  const normalizedSaintName = normalizeSaintDayText(saint.name);
  const match = devotionDayImageEntries.find((entry) =>
    entry.aliases.some((alias) => normalizedSaintName.includes(alias))
  );

  if (!match) return null;

  return {
    id: match.id,
    description: match.description,
    imageUrl: match.imageUrl,
    imageHint: match.imageHint,
  };
}
