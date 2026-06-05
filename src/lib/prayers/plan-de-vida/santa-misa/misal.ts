import type { Prayer } from '@/lib/types';

const ritosIniciales: Prayer = {
  id: 'misal-ritos-iniciales',
  title: 'Ritos iniciales',
  categoryId: 'plan-de-vida',
  content: `
*Antífona de entrada*

**V.** En el nombre del Padre, y del Hijo, y del Espíritu Santo.
**R.** Amén.

**V.** El Señor esté con vosotros.
**R.** Y con tu espíritu.

_O bien:_

**V.** La gracia de nuestro Señor Jesucristo, el amor del Padre y la comunión del Espíritu Santo estén con todos vosotros.
**R.** Y con tu espíritu.

**V.** Hermanos: Para celebrar dignamente estos sagrados misterios, reconozcamos nuestros pecados.

Yo confieso ante Dios todopoderoso y ante vosotros, hermanos, que he pecado mucho de pensamiento, palabra, obra y omisión. Por mi culpa, por mi culpa, por mi gran culpa. Por eso ruego a santa María, siempre Virgen, a los ángeles, a los santos y a vosotros, hermanos, que intercedáis por mí ante Dios, nuestro Señor.

**V.** Dios Todopoderoso tenga misericordia de nosotros, perdone nuestros pecados y nos lleve a la vida eterna.
**R.** Amén.

*Kyrie*

**V.** Señor, ten piedad.
**R.** Señor, ten piedad.

**V.** Cristo, ten piedad.
**R.** Cristo, ten piedad.

**V.** Señor, ten piedad.
**R.** Señor, ten piedad.

*Gloria*

Gloria a Dios en el Cielo, y en la tierra paz a los hombres que ama el Señor. Por tu inmensa gloria te alabamos, te bendecimos, te adoramos, te glorificamos, te damos gracias, Señor Dios, Rey celestial, Dios Padre todopoderoso. Señor, Hijo único, Jesucristo. Señor Dios, Cordero de Dios, Hijo del Padre; tú que quitas el pecado del mundo, ten piedad de nosotros; tú que quitas el pecado del mundo, atiende nuestra súplica; tú que estás sentado a la derecha del Padre, ten piedad de nosotros; porque sólo tú eres Santo, sólo tú Señor, sólo tú Altísimo, Jesucristo, con el Espíritu Santo en la gloria de Dios Padre. Amén.

*Oración colecta*

**R.** Amén.
`.trim(),
};

const liturgiaPalabra: Prayer = {
  id: 'misal-liturgia-palabra',
  title: 'Liturgia de la palabra',
  categoryId: 'plan-de-vida',
  content: `
*Primera lectura*

**V.** Palabra de Dios.
**R.** Te alabamos, Señor.

*Salmo responsorial*

*Segunda Lectura*

**V.** Palabra de Dios.
**R.** Te alabamos, Señor.

*Aleluya o canto – Evangelio*

**V.** El Señor esté con vosotros.
**R.** Y con tu espíritu.

**V.** ✠ Lectura del santo Evangelio según san N.
**R.** Gloria a ti, Señor.

_Acabado el Evangelio:_

**V.** Palabra de Dios.
**R.** Gloria a ti, Señor Jesús.

*Profesión de fe*

Creo en un solo Dios, Padre todopoderoso, Creador del cielo y de la tierra, de todo lo visible y lo invisible.

Creo en un solo Señor, Jesucristo, Hijo único de Dios, nacido del Padre antes de todos los siglos: Dios de Dios, Luz de Luz, Dios verdadero de Dios verdadero, engendrado, no creado, de la misma naturaleza del Padre, por quien todo fue hecho; que por nosotros, los hombres, y por nuestra salvación bajó del cielo, _(En las palabras que siguen, hasta se hizo hombre, todos se inclinan)_ y por obra del Espíritu Santo se encarnó de María, la Virgen, y se hizo hombre; y por nuestra causa fue crucificado en tiempos de Poncio Pilato; padeció y fue sepultado, y resucitó al tercer día, según las Escrituras, y subió al cielo, y está sentado a la derecha del Padre; y de nuevo vendrá con gloria para juzgar a vivos y muertos, y su reino no tendrá fin.

Creo en el Espíritu Santo, Señor y dador de vida, que procede del Padre y del Hijo, que con el Padre y el Hijo recibe una misma adoración y gloria, y que habló por los profetas. Creo en la Iglesia, que es una, santa, católica y apostólica. Confieso que hay un solo bautismo para el perdón de los pecados. Espero la resurrección de los muertos y la vida del mundo futuro. Amén.

*Oración de los fieles*
`.trim(),
};

const liturgiaEucaristica: Prayer = {
  id: 'misal-liturgia-eucaristica',
  title: 'Liturgia eucarística',
  categoryId: 'plan-de-vida',
  content: `
**V.** Bendito seas, Señor, Dios del universo, por este pan, fruto de la tierra y del trabajo del hombre, que recibimos de tu generosidad y ahora te presentamos; él será para nosotros pan de vida.
**R.** Bendito seas por siempre, Señor.

**V.** Bendito seas, Señor, Dios del universo, por este vino, fruto de la vid y del trabajo del hombre, que recibimos de tu generosidad y ahora te presentamos; él será para nosotros bebida de salvación.
**R.** Bendito seas por siempre, Señor.

**V.** Orad, hermanos, para que este sacrificio, mío y vuestro, sea agradable a Dios, Padre todopoderoso.
**R.** El Señor reciba de tus manos este sacrificio, para alabanza y gloria de su nombre, para nuestro bien y el de toda su santa Iglesia.

*Oración sobre las ofrendas*

**R.** Amén.
`.trim(),
};

const plegariaI: Prayer = {
  id: 'misal-plegaria-i',
  title: 'Plegaria eucarística I (Canon Romano)',
  categoryId: 'plan-de-vida',
  content: `
Padre misericordioso, te pedimos humildemente por Jesucristo, tu Hijo, nuestro Señor, que aceptes y bendigas estos ✠ dones, este sacrificio santo y puro que te ofrecemos, ante todo, por tu Iglesia santa y católica, para que le concedas la paz, la protejas, la congregues en la unidad y la gobiernes en el mundo entero, con tu servidor el Papa N., con nuestro Obispo (Prelado) N., y todos los demás Obispos que, fieles a la verdad, promueven la fe católica y apostólica.

Acuérdate, Señor, de tus hijos N. y N. y de todos los aquí reunidos, cuya fe y entrega bien conoces; por ellos y todos los suyos, por el perdón de sus pecados y la salvación que esperan, te ofrecemos, y ellos mismos te ofrecen, este sacrificio de alabanza, a ti, eterno Dios, vivo y verdadero.

Reunidos en comunión con toda la Iglesia, veneramos la memoria, ante todo, de la gloriosa siempre Virgen María, Madre de Jesucristo, nuestro Dios y Señor; la de su esposo, san José; la de los santos apóstoles y mártires Pedro y Pablo, Andrés, _(Santiago y Juan, Tomás, Santiago, Felipe, Bartolomé, Mateo, Simón y Tadeo; Lino, Cleto, Clemente, Sixto, Cornelio, Cipriano, Lorenzo, Crisógono, Juan y Pablo, Cosme y Damián,)_ y la de todos los santos; por sus méritos y oraciones concédenos en todo tu protección. _(Por Cristo, nuestro Señor. Amén.)_

Acepta, Señor, en tu bondad, esta ofrenda de tus siervos y de toda tu familia santa; ordena en tu paz nuestros días, líbranos de la condenación eterna y cuéntanos entre tus elegidos. _(Por Cristo, nuestro Señor. Amén.)_

Bendice y santifica, oh Padre, esta ofrenda, haciéndola perfecta, espiritual y digna de ti, de manera que sea para nosotros Cuerpo y Sangre de tu Hijo amado, Jesucristo, nuestro Señor.

El cual, la víspera de su Pasión, tomó pan en sus santas y venerables manos, y, elevando los ojos al cielo, hacia ti, Dios, Padre suyo todopoderoso, dando gracias te bendijo, lo partió, y lo dio a sus discípulos, diciendo:

TOMAD Y COMED TODOS DE ÉL, PORQUE ESTO ES MI CUERPO, QUE SERÁ ENTREGADO POR VOSOTROS.

Del mismo modo, acabada la cena, tomó este cáliz glorioso en sus santas y venerables manos, dando gracias te bendijo, y lo dio a sus discípulos, diciendo:

TOMAD Y BEBED TODOS DE ÉL, PORQUE ÉSTE ES EL CÁLIZ DE MI SANGRE, SANGRE DE LA ALIANZA NUEVA Y ETERNA, QUE SERÁ DERRAMADA POR VOSOTROS Y POR TODOS LOS HOMBRES PARA EL PERDÓN DE LOS PECADOS. HACED ESTO EN CONMEMORACIÓN MÍA.

**V.** Éste es el Sacramento de nuestra fe.
**R.** Anunciamos tu muerte, proclamamos tu resurrección. ¡Ven, Señor Jesús!

Por eso, Padre, nosotros, tus siervos, y todo tu pueblo santo, al celebrar este memorial de la muerte gloriosa de Jesucristo, tu Hijo, nuestro Señor; de su santa resurrección del lugar de los muertos y de su admirable ascensión a los cielos, te ofrecemos, Dios de gloria y majestad, de los mismos bienes que nos has dado, el sacrificio puro, inmaculado y santo: pan de vida eterna y cáliz de eterna salvación.

Mira con ojos de bondad esta ofrenda y acéptala, como aceptaste los dones del justo Abel, el sacrificio de Abrahán, nuestro padre en la fe, y la oblación pura de tu sumo sacerdote Melquisedec.

Te pedimos humildemente, Dios todopoderoso, que esta ofrenda sea llevada a tu presencia, hasta el altar del cielo, por manos de tu ángel, para que cuantos recibimos el Cuerpo y la Sangre de tu Hijo, al participar aquí de este altar, seamos colmados de gracia y bendición. _(Por Cristo, nuestro Señor. Amén.)_

Acuérdate también, Señor, de tus hijos N. y N., que nos han precedido con el signo de la fe y duermen ya el sueño de la paz.

A ellos, Señor, y a cuantos descansan en Cristo, concédeles el lugar del consuelo, de la luz y de la paz. _(Por Cristo, nuestro Señor. Amén.)_

Y a nosotros, pecadores, siervos tuyos, que confiamos en tu infinita misericordia, admítenos en la asamblea de los santos apóstoles y mártires Juan el Bautista, Esteban, Matías y Bernabé, _(Ignacio, Alejandro, Marcelino y Pedro, Felicidad y Perpetua, Águeda, Lucía, Inés, Cecilia, Anastasia,)_ y de todos los Santos; y acéptanos en su compañía, no por nuestros méritos, sino conforme a tu bondad.

Por Cristo, Señor nuestro, por quien sigues creando todos los bienes, los santificas, los llenas de vida, los bendices y los repartes entre nosotros.

**V.** Por Cristo, con él y en él, a ti, Dios Padre omnipotente, en la unidad del Espíritu Santo, todo honor y toda gloria por los siglos de los siglos.
**R.** Amén.
`.trim(),
};

const plegariaII: Prayer = {
  id: 'misal-plegaria-ii',
  title: 'Plegaria eucarística II',
  categoryId: 'plan-de-vida',
  content: `
**V.** El Señor esté con vosotros.
**R.** Y con tu espíritu.

**V.** Levantemos el corazón.
**R.** Lo tenemos levantado hacia el Señor.

**V.** Demos gracias al Señor, nuestro Dios.
**R.** Es justo y necesario.

*Prefacio*

En verdad es justo y necesario, es nuestro deber y salvación darte gracias, Padre santo, siempre y en todo lugar, por Jesucristo, tu Hijo amado. Por él, que es tu Palabra, hiciste todas las cosas; tú nos lo enviaste para que, hecho hombre por obra del Espíritu Santo y nacido de María, la Virgen, fuera nuestro Salvador y Redentor. Él, en cumplimiento de tu voluntad, para destruir la muerte y manifestar la resurrección, extendió sus brazos en la cruz, y así adquirió para ti un pueblo santo. Por eso, con los ángeles y los santos, proclamamos tu gloria, diciendo:

*Sanctus*

Santo, Santo, Santo es el Señor, Dios del Universo. Llenos están el cielo y la tierra de tu gloria. Hosanna en el cielo. Bendito el que viene en nombre del Señor. Hosanna en el cielo.

Santo eres en verdad, Señor, fuente de toda santidad; por eso te pedimos que santifiques estos dones con la efusión de tu Espíritu, de manera que sean para nosotros Cuerpo y ✠ Sangre de Jesucristo, nuestro Señor.

El cual, cuando iba a ser entregado a su Pasión, voluntariamente aceptada, tomó pan, dándote gracias, lo partió y lo dio a sus discípulos diciendo:

TOMAD Y COMED TODOS DE ÉL, PORQUE ESTO ES MI CUERPO, QUE SERÁ ENTREGADO POR VOSOTROS.

Del mismo modo, acabada la cena, tomó el cáliz, y, dándote gracias de nuevo, lo pasó a sus discípulos, diciendo:

TOMAD Y BEBED TODOS DE ÉL, PORQUE ÉSTE ES EL CÁLIZ DE MI SANGRE, SANGRE DE LA ALIANZA NUEVA Y ETERNA, QUE SERÁ DERRAMADA POR VOSOTROS Y POR TODOS LOS HOMBRES PARA EL PERDÓN DE LOS PECADOS. HACED ESTO EN CONMEMORACIÓN MÍA.

**V.** Éste es el Sacramento de nuestra fe.
**R.** Anunciamos tu muerte, proclamamos tu resurrección. ¡Ven, Señor Jesús!

Así, pues, Padre, al celebrar ahora el memorial de la muerte y resurrección de tu Hijo, te ofrecemos el pan de vida y el cáliz de salvación y te damos gracias, porque nos haces dignos de servirte en tu presencia.

Te pedimos humildemente que el Espíritu Santo congregue en la unidad a cuantos participamos del Cuerpo y Sangre de Cristo.

Acuérdate, Señor, de tu Iglesia extendida por toda la tierra; y con el Papa N., con nuestro Obispo (Prelado) N., y todos los pastores que cuidan de tu pueblo, llévala a su perfección por la caridad.

Acuérdate también de nuestros hermanos que durmieron con la esperanza de la resurrección, y de todos los que han muerto en tu misericordia; admítelos a contemplar la luz de tu rostro.

Ten misericordia de todos nosotros, y así, con María, la Virgen Madre de Dios, su esposo san José, los apóstoles y cuantos vivieron en tu amistad a través de los tiempos, merezcamos, por tu Hijo Jesucristo, compartir la vida eterna y cantar tus alabanzas.

**V.** Por Cristo, con él y en él, a ti, Dios Padre omnipotente, en la unidad del Espíritu Santo, todo honor y toda gloria por los siglos de los siglos.
**R.** Amén.
`.trim(),
};

const plegariaIII: Prayer = {
  id: 'misal-plegaria-iii',
  title: 'Plegaria eucarística III',
  categoryId: 'plan-de-vida',
  content: `
Santo eres en verdad, Padre, y con razón te alaban todas tus criaturas, ya que por Jesucristo, tu Hijo, Señor nuestro, con la fuerza del Espíritu Santo, das vida y santificas todo, y congregas a tu pueblo sin cesar, para que ofrezca en tu honor un sacrificio sin mancha desde donde sale el sol hasta el ocaso.

Por eso, Padre, te suplicamos que santifiques por el mismo Espíritu estos dones que hemos separado para ti, de manera que sean Cuerpo y ✠ Sangre de Jesucristo, Hijo tuyo y Señor nuestro, que nos mandó celebrar estos misterios.

Porque él mismo, la noche en que iba a ser entregado, tomó pan, y dando gracias te bendijo, lo partió y lo dio a sus discípulos diciendo:

TOMAD Y COMED TODOS DE ÉL, PORQUE ESTO ES MI CUERPO, QUE SERÁ ENTREGADO POR VOSOTROS.

Del mismo modo, acabada la cena, tomó el cáliz, dando gracias te bendijo, y lo pasó a sus discípulos, diciendo:

TOMAD Y BEBED TODOS DE ÉL, PORQUE ÉSTE ES EL CÁLIZ DE MI SANGRE, SANGRE DE LA ALIANZA NUEVA Y ETERNA, QUE SERÁ DERRAMADA POR VOSOTROS Y POR TODOS LOS HOMBRES PARA EL PERDÓN DE LOS PECADOS. HACED ESTO EN CONMEMORACIÓN MÍA.

**V.** Éste es el Sacramento de nuestra fe.
**R.** Anunciamos tu muerte, proclamamos tu resurrección. ¡Ven, Señor Jesús!

Así, pues, Padre, al celebrar ahora el memorial de la Pasión salvadora de tu Hijo, de su admirable resurrección y ascensión al cielo, mientras esperamos su venida gloriosa, te ofrecemos, en esta acción de gracias, el sacrificio vivo y santo.

Dirige tu mirada sobre la ofrenda de tu Iglesia, y reconoce en ella la Víctima por cuya inmolación quisiste devolvernos tu amistad, para que, fortalecidos con el Cuerpo y Sangre de tu Hijo y llenos de su Espíritu Santo, formemos en Cristo un solo cuerpo y un solo espíritu.

Que él nos transforme en ofrenda permanente, para que gocemos de tu heredad junto con tus elegidos: con María, la Virgen Madre de Dios, su esposo san José, los apóstoles y los mártires, _(san N.)_ y todos los santos, por cuya intercesión confiamos obtener siempre tu ayuda.

Te pedimos, Padre, que esta Víctima de reconciliación traiga la paz y la salvación al mundo entero. Confirma en la fe y en la caridad a tu Iglesia, peregrina en la tierra: a tu servidor, el Papa N., a nuestro Obispo (Prelado) N., al orden episcopal, a los presbíteros y diáconos, y a todo el pueblo redimido por ti.

Atiende los deseos y súplicas de esta familia que has congregado en tu presencia. Reúne en torno a ti, Padre misericordioso, a todos tus hijos dispersos por el mundo.

A nuestros hermanos difuntos y a cuantos murieron en tu amistad recíbelos en tu reino, donde esperamos gozar todos juntos de la plenitud eterna de tu gloria, por Cristo, Señor nuestro, por quien concedes al mundo todos los bienes.

**V.** Por Cristo, con él y en él, a ti, Dios Padre omnipotente, en la unidad del Espíritu Santo, todo honor y toda gloria por los siglos de los siglos.
**R.** Amén.
`.trim(),
};

const plegariaIV: Prayer = {
  id: 'misal-plegaria-iv',
  title: 'Plegaria eucarística IV',
  categoryId: 'plan-de-vida',
  content: `
**V.** El Señor esté con vosotros.
**R.** Y con tu espíritu.

**V.** Levantemos el corazón.
**R.** Lo tenemos levantado hacia el Señor.

**V.** Demos gracias al Señor, nuestro Dios.
**R.** Es justo y necesario.

*Prefacio*

En verdad es justo darte gracias, y deber nuestro glorificarte, Padre santo, porque tú eres el único Dios vivo y verdadero que existes desde siempre y vives para siempre; luz sobre toda luz. Porque tú sólo eres bueno y la fuente de la vida; hiciste todas las cosas para colmarlas de tus bendiciones y alegrar su multitud con la claridad de tu gloria. Por eso, innumerables ángeles en tu presencia, contemplando la gloria de tu rostro, te sirven siempre y te glorifican sin cesar. Y con ellos también nosotros, llenos de alegría, y por nuestra voz las demás criaturas, aclamamos tu nombre cantando:

*Sanctus*

Santo, Santo, Santo es el Señor, Dios del Universo. Llenos están el cielo y la tierra de tu gloria. Hosanna en el cielo. Bendito el que viene en nombre del Señor. Hosanna en el cielo.

Te alabamos, Padre Santo, porque eres grande, y porque hiciste todas las cosas con sabiduría y amor. A imagen tuya creaste al hombre y le encomendaste el universo entero, para que, sirviéndote sólo a ti, su Creador, dominara todo lo creado. Y cuando por desobediencia perdió tu amistad, no lo abandonaste al poder de la muerte, sino que, compadecido, tendiste la mano a todos, para que te encuentre el que te busca. Reiteraste, además, tu alianza a los hombres; por los profetas los fuiste llevando con la esperanza de salvación.

Y tanto amaste al mundo, Padre santo, que, al cumplirse la plenitud de los tiempos, nos enviaste como Salvador a tu único Hijo. El cual se encarnó por obra del Espíritu Santo, nació de María, la Virgen, y así compartió en todo nuestra condición humana menos en el pecado; anunció la salvación a los pobres, la liberación a los oprimidos y a los afligidos el consuelo. Para cumplir tus designios, él mismo se entregó a la muerte, y, resucitando, destruyó la muerte y nos dio nueva vida.

Y porque no vivamos ya para nosotros mismos, sino para él, que por nosotros murió y resucitó, envió, Padre, al Espíritu Santo como primicia para los creyentes, a fin de santificar todas las cosas, llevando a plenitud su obra en el mundo.

Por eso, Padre, te rogamos que este mismo Espíritu santifique estas ofrendas, para que sean Cuerpo y ✠ Sangre de Jesucristo, nuestro Señor, y así celebremos el gran misterio que nos dejó como alianza eterna.

Porque él mismo, llegada la hora en que había de ser glorificado por ti, Padre Santo, habiendo amado a los suyos que estaban en el mundo, los amó hasta el extremo. Y, mientras cenaba con sus discípulos, tomó pan, te bendijo, lo partió y se lo dio, diciendo:

TOMAD Y COMED TODOS DE ÉL, PORQUE ESTO ES MI CUERPO, QUE SERÁ ENTREGADO POR VOSOTROS.

Del mismo modo, tomó el cáliz lleno del fruto de la vid, te dio gracias y lo pasó a sus discípulos, diciendo:

TOMAD Y BEBED TODOS DE ÉL, PORQUE ÉSTE ES EL CÁLIZ DE MI SANGRE, SANGRE DE LA ALIANZA NUEVA Y ETERNA, QUE SERÁ DERRAMADA POR VOSOTROS Y POR TODOS LOS HOMBRES PARA EL PERDÓN DE LOS PECADOS. HACED ESTO EN CONMEMORACIÓN MÍA.

**V.** Éste es el Sacramento de nuestra fe.
**R.** Anunciamos tu muerte, proclamamos tu resurrección. ¡Ven, Señor Jesús!

Por eso, Padre, al celebrar ahora el memorial de nuestra redención, recordamos la muerte de Cristo y su descenso al lugar de los muertos, proclamamos su resurrección y ascensión a tu derecha; y mientras esperamos su venida gloriosa, te ofrecemos su Cuerpo y su Sangre, sacrificio agradable a ti y salvación para todo el mundo.

Dirige tu mirada sobre esta Víctima que tú mismo has preparado a tu Iglesia, y concede a cuantos compartimos este pan y este cáliz, que, congregados en un solo cuerpo por el Espíritu Santo, seamos en Cristo víctima viva para alabanza de tu gloria.

Y ahora, Señor, acuérdate, de todos aquellos por quienes te ofrecemos este sacrificio: de tu servidor el Papa N., de nuestro Obispo (Prelado) N., del orden episcopal y de los presbíteros y diáconos, de los oferentes y de los aquí reunidos, de todo tu pueblo santo y de aquellos que te buscan con sincero corazón.

Acuérdate también de los que murieron en la paz de Cristo y de todos los difuntos, cuya fe sólo tú conociste.

Padre de bondad, que todos tus hijos nos reunamos en la heredad de tu Reino, con María, la Virgen Madre de Dios, con su esposo san José, con los apóstoles y los santos; y allí, junto con toda la creación libre ya del pecado y de la muerte, te glorifiquemos por Cristo, Señor nuestro, por quien concedes al mundo todos los bienes.

**V.** Por Cristo, con él y en él, a ti, Dios Padre omnipotente, en la unidad del Espíritu Santo, todo honor y toda gloria por los siglos de los siglos.
**R.** Amén.
`.trim(),
};

const ritoComunion: Prayer = {
  id: 'misal-rito-comunion',
  title: 'Rito de la Comunión',
  categoryId: 'plan-de-vida',
  content: `
**V.** Fieles a la recomendación del Salvador y siguiendo su divina enseñanza, nos atrevemos a decir:

Padre nuestro, que estás en el cielo, santificado sea tu Nombre, venga a nosotros tu reino, hágase tu voluntad en la tierra como en el cielo. Danos hoy nuestro pan de cada día, perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal.

**V.** Líbranos de todos los males, Señor, y concédenos la paz en nuestros días, para que, ayudados por tu misericordia, vivamos siempre libres de pecado y protegidos de toda perturbación, mientras esperamos la gloriosa venida de nuestro Salvador Jesucristo.
**R.** Tuyo es el Reino, tuyo el poder y la gloria, por siempre, Señor.

**V.** Señor Jesucristo, que dijiste a tus apóstoles: «La paz os dejo, mi paz os doy», no tengas en cuenta nuestros pecados, sino la fe de tu Iglesia y, conforme a tu palabra, concédele la paz y la unidad. Tú que vives y reinas por los siglos de los siglos.
**R.** Amén.

**V.** La paz del Señor esté siempre con vosotros.
**R.** Y con tu espíritu.

_(V. Daos fraternalmente la paz.)_

*Agnus Dei*

Cordero de Dios, que quitas el pecado del mundo, ten piedad de nosotros.
Cordero de Dios, que quitas el pecado del mundo, ten piedad de nosotros.
Cordero de Dios, que quitas el pecado del mundo, danos la paz.

**V.** Este es el Cordero de Dios, que quita el pecado del mundo. Dichosos los invitados a la cena del Señor.
**R.** Señor, no soy digno de que entres en mi casa, pero una palabra tuya bastará para sanarme.

*Antífona de comunión*

*Oración después de la comunión*

**R.** Amén.
`.trim(),
};

const ritoConclusion: Prayer = {
  id: 'misal-rito-conclusion',
  title: 'Rito de conclusión',
  categoryId: 'plan-de-vida',
  content: `
**V.** El Señor esté con vosotros.
**R.** Y con tu espíritu.

**V.** La bendición de Dios todopoderoso, Padre, Hijo ✠ y Espíritu Santo, descienda sobre vosotros.
**R.** Amén.

**V.** Podéis ir en paz.
**R.** Demos gracias a Dios.
`.trim(),
};

export const misal: Prayer = {
  id: 'santa-misa-misal',
  title: 'Misal',
  categoryId: 'plan-de-vida',
  prayers: [
    ritosIniciales,
    liturgiaPalabra,
    liturgiaEucaristica,
    {
      id: 'misal-plegarias-eucaristicas',
      title: 'Plegaria eucarística',
      categoryId: 'plan-de-vida',
      prayers: [
        plegariaI,
        plegariaII,
        plegariaIII,
        plegariaIV
      ]
    },
    ritoComunion,
    ritoConclusion
  ],
};
