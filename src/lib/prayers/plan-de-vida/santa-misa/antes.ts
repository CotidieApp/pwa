import type { Prayer } from '@/lib/types';

const santoTomasAquino: Prayer = {
  id: 'santo-tomas-aquino-antes',
  title: 'Oración de Santo Tomás de Aquino',
  categoryId: 'plan-de-vida',
  content: `Omnipotente y sempiterno Dios, he aquí que me acerco al Sacramento de tu unigénito Hijo Jesucristo, Señor nuestro: me acerco como un enfermo al médico de la vida, como un inmundo a la fuente de la misericordia, como un ciego a la luz de la claridad eterna, como un pobre y necesitado al Señor de los cielos y tierra.

Imploro la abundancia de tu infinita generosidad para que te dignes curar mi enfermedad, lavar mi impureza, iluminar mi ceguera, remediar mi pobreza y vestir mi desnudez, para que me acerque a recibir el Pan de los Angeles, al Rey de reyes y Señor de señores con tanta contrición y piedad, con tanta pureza y fe, y con tal propósito e intención como conviene a la salud de mi alma.

Te pido que me concedas recibir no sólo el sacramento del Cuerpo y de la Sangre del Señor, sino la gracia y la virtud de ese sacramento.

Oh Dios benignísimo, concédeme recibir el Cuerpo de tu unigénito Hijo Jesucristo, Señor nuestro, nacido de la Virgen María, de tal modo que merezca ser incorporado a su Cuerpo místico y contado entre sus miembros.

Oh Padre amantísimo, concédeme contemplar eternamente a tu querido Hijo, a quien, bajo el velo de la fe, me propongo recibir ahora. Que vive y reina contigo en la unidad del Espíritu Santo, Dios, por los siglos de los siglos.

Amén.`
};

const virgenMaria: Prayer = {
  id: 'virgen-maria-antes',
  title: 'Oración a la Santísima Vírgen María',
  categoryId: 'plan-de-vida',
  content: `Oh Madre de piedad y de misericordia, Santísima Virgen María, yo miserable e indigno pecador en ti confío con todo mi corazón y afecto; acudo a tu piedad para que, así como estuviste junto a tu dulcísimo Hijo, clavado en la Cruz, también te dignes estar con clemencia junto a mí, miserable pecador y junto a todos los sacerdotes que aquí y en toda la Santa Iglesia van a celebrar hoy, para que, ayudados con tu gracia, ofrezcamos una hostia digna y aceptable en la presencia de la suma y única Trinidad.

Amén.`
};

const sanJose: Prayer = {
  id: 'san-jose-antes',
  title: 'Preces a San José',
  categoryId: 'plan-de-vida',
  content: `Oh feliz varón, bienaventurado José, a quien le fue concedido no sólo ver y oír al Dios, a quien muchos reyes quisieron ver y no vieron, oír y no oyeron, sino también abrazarlo, besarlo, vestirlo y custodiarlo.

V. Ruega por nosotros, bienaventurado José.
R. Para que seamos dignos de alcanzar las promesas de nuestro Señor Jesucristo.

Oremos:

Oh Dios, que nos concediste el sacerdocio real; te pedimos que, así como San José mereció tratar y llevar en sus brazos con cariño a tu Hijo unigénito, nacido de la Virgen María, hagas que nosotros te sirvamos con corazón limpio y buenas obras, de modo que hoy recibamos dignamente el sacrosanto Cuerpo y Sangre de tu Hijo, y en la vida futura merezcamos alcanzar el premio eterno. Por el mismo Jesucristo nuestro Señor.

Amén.`
};

export const antesMisaPrayers: Prayer[] = [
  santoTomasAquino,
  virgenMaria,
  sanJose,
];
