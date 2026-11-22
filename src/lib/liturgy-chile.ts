type Celebration = {
  id: string;
  name: string;
  rank: string;
  precedence: string;
  proper: string;
  sundayCycle: 'YEAR_A' | 'YEAR_B' | 'YEAR_C';
  weekdayCycle: 'YEAR_1' | 'YEAR_2';
  psalterWeek?: 'WEEK_1' | 'WEEK_2' | 'WEEK_3' | 'WEEK_4';
  seasons: string[];
  periods: string[];
  weekdayId?: string;
};

type MassReadingReferences = {
  first: readonly string[];
  psalm: readonly string[];
  second?: readonly string[];
  gospel: readonly string[];
};

// Referencias de los formularios del Ordo Pastoral de la CECh, sin texto bíblico.
// Las listas mantienen primero la cita ordinaria y luego las alternativas impresas.
const properMassReferences: Partial<Record<string, MassReadingReferences>> = {
  exaltation_of_the_holy_cross: {
    first: ['Núm 21, 4b-9'], psalm: ['Sal 77, 1-2. 34-38'], second: ['Flp 2, 6-11'], gospel: ['Jn 3, 13-17'],
  },
  philip_and_james_apostles: {
    first: ['1 Cor 15, 1-8'], psalm: ['Sal 18, 2-5'], gospel: ['Jn 14, 6-14'],
  },
  our_lord_jesus_christ_the_eternal_high_priest: {
    first: ['Is 52, 13–53, 12', 'Heb 10, 12-23'], psalm: ['Sal 39, 6. 9-11'], gospel: ['Lc 22, 14-20'],
  },
  teresa_of_jesus_of_los_andes_virgin: {
    first: ['Os 2, 14-20', 'Flp 4, 4-9'], psalm: ['Sal 33, 2-11'], gospel: ['Mt 18, 1-4'],
  },
  our_lady_of_mount_carmel: {
    first: ['1 Re 18, 1-2a. 41-46', 'Jdt 13, 18-20ad; 15, 8-10', 'Is 9, 1-6'],
    psalm: ['Sal 129, 1-8', 'Jdt 16, 13-17'],
    second: ['1 Tim 2, 1-8', 'Hch 1, 12-14', 'Gál 4, 4-7'],
    gospel: ['Jn 2, 1-11', 'Jn 19, 25-27', 'Lc 11, 27-28'],
  },
  rose_of_lima_virgin: {
    first: ['2 Cor 10, 17–11, 2'], psalm: ['Sal 148'], gospel: ['Mt 13, 44-46'],
  },
  immaculate_conception_of_the_blessed_virgin_mary: {
    first: ['Gén 3, 9-15. 20'], psalm: ['Sal 97'], second: ['Ef 1, 3-6. 11-12'], gospel: ['Lc 1, 26-38'],
  },
  our_lady_of_guadalupe: {
    first: ['Is 7, 10-14; 8, 10'], psalm: ['Sal 66, 2-3. 5. 7-8'], gospel: ['Lc 1, 39-48'],
  },
};

// La notificación del 27-03-2018 prescribe las lecturas propias de esta memoria.
const motherOfTheChurchReferences: MassReadingReferences = {
  first: ['Gén 3, 9-15. 20', 'Hch 1, 12-14'], psalm: ['Sal 86, 1-3. 5-7'], gospel: ['Jn 19, 25-34'],
};

export type ChileanLiturgicalDay = {
  hours: Celebration;
  mass: Celebration;
  optional: Celebration[];
};

export function getChileanMassSelection({ mass }: ChileanLiturgicalDay) {
  // En las memorias rige el leccionario ferial mientras el nacional no indique
  // una lectura estrictamente propia. El Ordo usa la feria para san Alberto.
  const isMotherOfTheChurch = mass.id === 'mary_mother_of_the_church';
  const hasFerialReadings = !isMotherOfTheChurch && (mass.rank === 'MEMORIAL' || mass.rank === 'WEEKDAY');
  return {
    lectionaryId: hasFerialReadings ? mass.weekdayId ?? mass.id : mass.id,
    sundayCycle: mass.sundayCycle,
    weekdayCycle: mass.weekdayCycle,
    properReferences: isMotherOfTheChurch ? motherOfTheChurchReferences : properMassReferences[mass.id],
  };
}
