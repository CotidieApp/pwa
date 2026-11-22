import { tedeum } from './prayers/oraciones/te-deum';
import { magnificat } from './prayers/oraciones/fundamentales';

export const GLORY = `Gloria al Padre, y al Hijo, y al Espíritu Santo.
Como era en el principio, ahora y siempre,
por los siglos de los siglos. Amén.`;

export const OPENING = `$℣. $Dios mío, ven en mi auxilio.
$℟. $Señor, date prisa en socorrerme.

${GLORY}`;

export const INVITATORY_OPENING = `$℣. $Señor, ábreme los labios.
$℟. $Y mi boca proclamará tu alabanza.`;

export const PRAISE_CONCLUSION = `El Señor nos bendiga, nos guarde de todo mal y nos lleve a la vida eterna.
$℟. $Amén.`;

export const SHORT_CONCLUSION = `$℣. $Bendigamos al Señor.
$℟. $Demos gracias a Dios.`;

export const NIGHT_CONCLUSION = `El Señor todopoderoso nos conceda una noche tranquila y una santa muerte.
$℟. $Amén.`;

export const OUR_FATHER = `Padre nuestro, que estás en el cielo,
santificado sea tu Nombre;
venga a nosotros tu reino;
hágase tu voluntad en la tierra como en el cielo.
Danos hoy nuestro pan de cada día;
perdona nuestras ofensas,
como también nosotros perdonamos a los que nos ofenden;
no nos dejes caer en la tentación,
y líbranos del mal.`;

export const BENEDICTUS = `Bendito sea el Señor, Dios de Israel,
porque ha visitado y redimido a su pueblo,
suscitándonos una fuerza de salvación
en la casa de David, su siervo,
según lo había predicho desde antiguo
por boca de sus santos profetas.

Es la salvación que nos libra de nuestros enemigos
y de la mano de todos los que nos odian;
ha realizado así la misericordia que tuvo con nuestros padres,
recordando su santa alianza
y el juramento que juró a nuestro padre Abrahán.

Para concedernos que, libres de temor,
arrancados de la mano de los enemigos,
le sirvamos con santidad y justicia,
en su presencia, todos nuestros días.

Y a ti, niño, te llamarán profeta del Altísimo,
porque irás delante del Señor
a preparar sus caminos,
anunciando a su pueblo la salvación,
el perdón de sus pecados.

Por la entrañable misericordia de nuestro Dios,
nos visitará el Sol que nace de lo alto,
para iluminar a los que viven en tinieblas
y en sombra de muerte,
para guiar nuestros pasos
por el camino de la paz.`;

export const NUNC_DIMITTIS = `Ahora, Señor, según tu promesa,
puedes dejar a tu siervo irse en paz.

Porque mis ojos han visto a tu Salvador,
a quien has presentado ante todos los pueblos:
luz para alumbrar a las naciones
y gloria de tu pueblo Israel.`;

export const MAGNIFICAT = (magnificat.content as Record<string, string>).español.replace(/\s*Amén\.$/, '');
export const TE_DEUM = (tedeum.content as Record<string, string>).español;

export const MARIAN_ANTIPHON = {
  salve: `Dios te salve, Reina y Madre de misericordia,
vida, dulzura y esperanza nuestra; Dios te salve.
A ti llamamos los desterrados hijos de Eva;
a ti suspiramos, gimiendo y llorando en este valle de lágrimas.
Ea, pues, Señora, abogada nuestra,
vuelve a nosotros esos tus ojos misericordiosos;
y después de este destierro, muéstranos a Jesús,
fruto bendito de tu vientre.
¡Oh clemente, oh piadosa, oh dulce Virgen María!`,
  easter: `Alégrate, Reina del cielo. Aleluya.
Porque el que mereciste llevar en tu seno. Aleluya.
Ha resucitado, según predijo. Aleluya.
Ruega por nosotros a Dios. Aleluya.`,
};
