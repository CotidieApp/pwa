import type {
  TriviaCategoryId,
  TriviaDifficultyId,
  TriviaQuestion,
} from '@/lib/trivia-questions';

const question = (
  id: string,
  category: TriviaCategoryId,
  difficulty: TriviaDifficultyId,
  prompt: string,
  options: TriviaQuestion['options'],
  correctIndex: TriviaQuestion['correctIndex'],
  explanation: string,
  source: string
): TriviaQuestion => ({
  id,
  category,
  difficulty,
  prompt,
  options,
  correctIndex,
  explanation,
  source,
});

export const additionalSpiritualTriviaQuestions: readonly TriviaQuestion[] = [
  question(
    'jesus-26',
    'jesus',
    'inicial',
    '¿En qué localidad creció Jesús después de volver de Egipto?',
    ['Belén', 'Nazaret', 'Jericó', 'Betania'],
    1,
    'José se estableció con María y Jesús en Nazaret, donde Jesús vivió antes de comenzar su ministerio público.',
    'Mt 2,19-23; Lc 4,16'
  ),
  question(
    'jesus-27',
    'jesus',
    'inicial',
    '¿Cómo se llamaba la madre de Jesús?',
    ['Isabel', 'Marta', 'María', 'Ana'],
    2,
    'María concibió a Jesús por obra del Espíritu Santo y acompañó fielmente la misión de su Hijo.',
    'Lc 1,26-38'
  ),
  question(
    'jesus-28',
    'jesus',
    'inicial',
    '¿Qué fariseo visitó a Jesús de noche para conversar con Él?',
    ['Nicodemo', 'Gamaliel', 'Jairo', 'Simón'],
    0,
    'Nicodemo acudió de noche y escuchó de Jesús la enseñanza sobre nacer del agua y del Espíritu.',
    'Jn 3,1-21'
  ),
  question(
    'jesus-29',
    'jesus',
    'inicial',
    '¿Qué gesto de servicio realizó Jesús durante la Última Cena?',
    ['Lavó los pies de sus discípulos', 'Repartió monedas entre los Doce', 'Ungió las manos de Pedro', 'Encendió doce lámparas'],
    0,
    'Jesús lavó los pies de sus discípulos y les dejó el ejemplo de servirse unos a otros.',
    'Jn 13,1-15'
  ),
  question(
    'jesus-30',
    'jesus',
    'inicial',
    '¿Quién fue obligado a ayudar a Jesús a llevar la cruz?',
    ['José de Arimatea', 'Simón de Cirene', 'Bartimeo', 'Nicodemo'],
    1,
    'Los soldados cargaron la cruz sobre Simón de Cirene para que la llevara detrás de Jesús.',
    'Lc 23,26'
  ),
  question(
    'jesus-31',
    'jesus',
    'inicial',
    '¿Cómo se llamaba el lugar donde crucificaron a Jesús?',
    ['Getsemaní', 'Gólgota', 'Betesda', 'Tabor'],
    1,
    'Jesús fue llevado al Gólgota, nombre que significa Lugar de la Calavera.',
    'Jn 19,17-18'
  ),
  question(
    'jesus-32',
    'jesus',
    'inicial',
    '¿Qué apóstol negó tres veces conocer a Jesús?',
    ['Juan', 'Santiago', 'Pedro', 'Andrés'],
    2,
    'Pedro negó tres veces al Señor antes de que cantara el gallo y después lloró amargamente.',
    'Lc 22,54-62'
  ),
  question(
    'jesus-33',
    'jesus',
    'inicial',
    '¿Qué día de la semana encontraron vacío el sepulcro de Jesús?',
    ['El primer día de la semana, domingo', 'El viernes', 'El sábado', 'El cuarto día de la semana'],
    0,
    'Las mujeres fueron al sepulcro el primer día de la semana, que los cristianos celebran como domingo.',
    'Mc 16,1-6; Jn 20,1'
  ),
  question(
    'jesus-34',
    'jesus',
    'intermedia',
    '¿Qué invitación acompaña el primer anuncio del Reino en el Evangelio de Marcos?',
    ['Ayunen y guarden silencio', 'Conviértanse y crean en el Evangelio', 'Suban inmediatamente a Jerusalén', 'Abandonen todas las ciudades'],
    1,
    'Jesús anunció que el Reino de Dios estaba cerca e invitó a la conversión y a la fe en el Evangelio.',
    'Mc 1,14-15'
  ),
  question(
    'jesus-35',
    'jesus',
    'intermedia',
    '¿Qué discípulo estaba sentado en el despacho de impuestos cuando Jesús lo llamó?',
    ['Mateo', 'Felipe', 'Tomás', 'Bartolomé'],
    0,
    'Jesús llamó a Mateo mientras cobraba impuestos; él se levantó y lo siguió.',
    'Mt 9,9'
  ),
  question(
    'jesus-36',
    'jesus',
    'intermedia',
    '¿Cuántos años llevaba enfermo el hombre que Jesús curó junto a la piscina de Betesda?',
    ['Doce años', 'Veinticinco años', 'Treinta y ocho años', 'Cuarenta años'],
    2,
    'El hombre llevaba treinta y ocho años enfermo cuando Jesús le mandó levantarse y caminar.',
    'Jn 5,1-9'
  ),
  question(
    'jesus-37',
    'jesus',
    'intermedia',
    '¿Cuántas tinajas de piedra había en las bodas de Caná?',
    ['Tres', 'Seis', 'Siete', 'Doce'],
    1,
    'Había seis tinajas destinadas a las purificaciones de los judíos; Jesús mandó llenarlas de agua.',
    'Jn 2,6-9'
  ),
  question(
    'jesus-38',
    'jesus',
    'intermedia',
    '¿Junto a qué pozo habló Jesús con la mujer samaritana?',
    ['El pozo de Jacob', 'El pozo de Abraham', 'El pozo de Elías', 'El pozo de David'],
    0,
    'Jesús se sentó junto al pozo de Jacob, cerca de Sicar, y ofreció a la mujer el agua viva.',
    'Jn 4,5-15'
  ),
  question(
    'jesus-39',
    'jesus',
    'intermedia',
    '¿Qué palabras dijo Jesús al devolver la vida a la hija de Jairo?',
    ['Effetá', 'Talitha kum', 'Eloí, Eloí', 'Rabbuní'],
    1,
    'Jesús tomó a la niña de la mano y le dijo «Talitha kum», que significa «Niña, levántate».',
    'Mc 5,35-43'
  ),
  question(
    'jesus-40',
    'jesus',
    'intermedia',
    '¿Qué gritó Jesús ante el sepulcro de Lázaro?',
    ['Lázaro, sal fuera', 'Lázaro, tu fe te ha salvado', 'Despierta y vuelve a Galilea', 'Levántate y entra en el templo'],
    0,
    'Después de orar al Padre, Jesús llamó a Lázaro y el difunto salió del sepulcro.',
    'Jn 11,41-44'
  ),
  question(
    'jesus-41',
    'jesus',
    'intermedia',
    '¿Dónde indicó Jesús a Pedro que encontraría la moneda para pagar el impuesto del templo?',
    ['Bajo una piedra', 'En la boca de un pez', 'Dentro de una vasija', 'En una red abandonada'],
    1,
    'Jesús mandó a Pedro pescar; en la boca del primer pez hallaría la moneda necesaria.',
    'Mt 17,24-27'
  ),
  question(
    'jesus-42',
    'jesus',
    'intermedia',
    '¿En qué momento reconocieron a Jesús los discípulos de Emaús?',
    ['Cuando explicó la primera parábola', 'Al partir el pan', 'Al llegar al templo', 'Cuando curó a un enfermo'],
    1,
    'Sus ojos se abrieron y lo reconocieron al partir el pan, después de escucharlo explicar las Escrituras.',
    'Lc 24,13-35'
  ),
  question(
    'jesus-43',
    'jesus',
    'avanzada',
    'Según las bienaventuranzas, ¿qué se promete a los limpios de corazón?',
    ['Poseerán la tierra', 'Verán a Dios', 'Serán llamados hijos de Dios', 'Recibirán consuelo'],
    1,
    'Jesús proclama bienaventurados a los limpios de corazón porque ellos verán a Dios.',
    'Mt 5,8'
  ),
  question(
    'jesus-44',
    'jesus',
    'avanzada',
    '¿Durante qué fiesta proclamó Jesús: «Si alguno tiene sed, venga a mí y beba»?',
    ['La Pascua', 'Pentecostés', 'La fiesta de las Tiendas', 'La Dedicación'],
    2,
    'Jesús pronunció esa invitación en el último día de la fiesta de las Tiendas o Tabernáculos.',
    'Jn 7,37-39'
  ),
  question(
    'jesus-45',
    'jesus',
    'avanzada',
    '¿Qué sumo sacerdote afirmó que convenía que un solo hombre muriera por el pueblo?',
    ['Anás', 'Caifás', 'Zacarías', 'Eleazar'],
    1,
    'Caifás, sumo sacerdote aquel año, pronunció sin saberlo una profecía sobre la muerte redentora de Jesús.',
    'Jn 11,47-52'
  ),
  question(
    'jesus-46',
    'jesus',
    'avanzada',
    '¿Cómo se llamaba el siervo del sumo sacerdote a quien cortaron una oreja durante el arresto de Jesús?',
    ['Malco', 'Bartimeo', 'Cleofás', 'Jairo'],
    0,
    'Juan identifica al siervo como Malco; Lucas añade que Jesús le curó la oreja.',
    'Jn 18,10; Lc 22,50-51'
  ),
  question(
    'jesus-47',
    'jesus',
    'avanzada',
    '¿Qué apóstol pidió a Jesús: «Señor, muéstranos al Padre»?',
    ['Felipe', 'Tomás', 'Andrés', 'Judas Tadeo'],
    0,
    'Felipe hizo la petición y Jesús respondió que quien lo ha visto a Él ha visto al Padre.',
    'Jn 14,8-11'
  ),
  question(
    'jesus-48',
    'jesus',
    'avanzada',
    '¿En qué tres lenguas estaba escrita la inscripción colocada sobre la cruz?',
    ['Hebreo, latín y griego', 'Arameo, copto y latín', 'Griego, persa y hebreo', 'Latín, siríaco y árabe'],
    0,
    'La inscripción «Jesús el Nazareno, el rey de los judíos» fue escrita en hebreo, latín y griego.',
    'Jn 19,19-20'
  ),
  question(
    'jesus-49',
    'jesus',
    'avanzada',
    '¿Cuántos peces grandes recogieron los discípulos en la pesca después de la Resurrección?',
    ['Setenta y dos', 'Ciento veinte', 'Ciento cincuenta y tres', 'Doscientos'],
    2,
    'La red quedó llena con ciento cincuenta y tres peces grandes y, aun así, no se rompió.',
    'Jn 21,1-11'
  ),
  question(
    'jesus-50',
    'jesus',
    'avanzada',
    '¿Qué salmo comienza con las palabras que Jesús pronunció en la cruz: «Dios mío, Dios mío, ¿por qué me has abandonado?»?',
    ['Salmo 22', 'Salmo 51', 'Salmo 91', 'Salmo 130'],
    0,
    'El grito de Jesús remite al comienzo del Salmo 22, que describe el sufrimiento del justo y culmina en alabanza.',
    'Mt 27,46; Sal 22,2'
  ),

  question(
    'antiguo-testamento-26',
    'antiguo-testamento',
    'inicial',
    '¿Quién mató a su hermano Abel?',
    ['Caín', 'Set', 'Esaú', 'Lamec'],
    0,
    'Caín, movido por la ira y los celos, atacó a su hermano Abel y lo mató.',
    'Gn 4,1-12'
  ),
  question(
    'antiguo-testamento-27',
    'antiguo-testamento',
    'inicial',
    '¿En qué río fue colocado Moisés cuando era un bebé?',
    ['Jordán', 'Éufrates', 'Nilo', 'Tigris'],
    2,
    'Su madre lo puso en una cesta entre los juncos del Nilo para salvarlo del decreto del faraón.',
    'Ex 2,1-10'
  ),
  question(
    'antiguo-testamento-28',
    'antiguo-testamento',
    'inicial',
    '¿Cómo se llamaba la hermana de Moisés que vigiló la cesta en el río?',
    ['Débora', 'Miriam', 'Rut', 'Séfora'],
    1,
    'Miriam siguió de lejos la cesta y después propuso a la madre del niño como nodriza.',
    'Ex 2,4-8'
  ),
  question(
    'antiguo-testamento-29',
    'antiguo-testamento',
    'inicial',
    '¿Qué juez de Israel fue conocido por su fuerza extraordinaria?',
    ['Gedeón', 'Sansón', 'Jefté', 'Ehúd'],
    1,
    'Sansón recibió una fuerza extraordinaria y combatió a los filisteos.',
    'Jue 13-16'
  ),
  question(
    'antiguo-testamento-30',
    'antiguo-testamento',
    'inicial',
    '¿Qué reina arriesgó su vida para salvar al pueblo judío?',
    ['Ester', 'Jezabel', 'Betsabé', 'Atalía'],
    0,
    'Ester se presentó ante el rey sin ser llamada e intercedió para impedir la destrucción de su pueblo.',
    'Est 4-8'
  ),
  question(
    'antiguo-testamento-31',
    'antiguo-testamento',
    'inicial',
    '¿Qué profeta pasó tres días dentro de un gran pez?',
    ['Amós', 'Jonás', 'Oseas', 'Miqueas'],
    1,
    'Jonás fue tragado por un gran pez y desde allí oró al Señor antes de ser devuelto a tierra.',
    'Jon 2,1-11'
  ),
  question(
    'antiguo-testamento-32',
    'antiguo-testamento',
    'inicial',
    '¿Quién soñó con una escalera que unía la tierra y el cielo?',
    ['Jacob', 'Isaac', 'José', 'Moisés'],
    0,
    'Jacob vio en sueños una escalera apoyada en tierra cuya cima alcanzaba el cielo.',
    'Gn 28,10-22'
  ),
  question(
    'antiguo-testamento-33',
    'antiguo-testamento',
    'inicial',
    '¿En qué se convirtió la mujer de Lot al mirar hacia atrás?',
    ['En una estatua de piedra', 'En una columna de sal', 'En polvo', 'En una fuente'],
    1,
    'La mujer de Lot miró hacia atrás durante la huida de Sodoma y quedó convertida en columna de sal.',
    'Gn 19,15-26'
  ),
  question(
    'antiguo-testamento-34',
    'antiguo-testamento',
    'intermedia',
    '¿Quién fabricó el becerro de oro mientras Moisés estaba en el monte?',
    ['Aarón', 'Josué', 'Caleb', 'Jetró'],
    0,
    'Aarón recogió el oro del pueblo y formó el becerro que Israel adoró.',
    'Ex 32,1-6'
  ),
  question(
    'antiguo-testamento-35',
    'antiguo-testamento',
    'intermedia',
    '¿Qué mujer fue profetisa y juez de Israel?',
    ['Débora', 'Ana', 'Noemí', 'Abigaíl'],
    0,
    'Débora juzgaba a Israel y animó a Barac a enfrentarse al ejército de Sísara.',
    'Jue 4,4-10'
  ),
  question(
    'antiguo-testamento-36',
    'antiguo-testamento',
    'intermedia',
    '¿Con cuántos hombres redujo Dios el ejército de Gedeón antes de la batalla?',
    ['Cien', 'Trescientos', 'Mil', 'Tres mil'],
    1,
    'Dios redujo el ejército a trescientos hombres para que la victoria no fuera atribuida a la fuerza humana.',
    'Jue 7,1-22'
  ),
  question(
    'antiguo-testamento-37',
    'antiguo-testamento',
    'intermedia',
    '¿Quién fue la madre del profeta Samuel?',
    ['Ana', 'Miriam', 'Raquel', 'Isabel'],
    0,
    'Ana pidió un hijo al Señor y, al nacer Samuel, lo consagró a su servicio.',
    '1 S 1,9-28'
  ),
  question(
    'antiguo-testamento-38',
    'antiguo-testamento',
    'intermedia',
    '¿Cómo se llamaba el hijo de Saúl que fue gran amigo de David?',
    ['Jonatán', 'Abner', 'Isbaal', 'Joab'],
    0,
    'Jonatán hizo alianza con David y lo protegió frente a la hostilidad de Saúl.',
    '1 S 18,1-4; 20'
  ),
  question(
    'antiguo-testamento-39',
    'antiguo-testamento',
    'intermedia',
    '¿Qué rey trasladó el Arca de la Alianza a Jerusalén?',
    ['Saúl', 'David', 'Salomón', 'Ezequías'],
    1,
    'David llevó el Arca a Jerusalén entre cantos y danzas delante del Señor.',
    '2 S 6,1-19'
  ),
  question(
    'antiguo-testamento-40',
    'antiguo-testamento',
    'intermedia',
    '¿Cómo fue arrebatado Elías de la vista de Eliseo?',
    ['En una nube silenciosa', 'En un carro de fuego', 'Dentro de una cueva', 'Sobre las aguas del Jordán'],
    1,
    'Un carro de fuego separó a ambos y Elías subió al cielo en el torbellino.',
    '2 R 2,1-12'
  ),
  question(
    'antiguo-testamento-41',
    'antiguo-testamento',
    'intermedia',
    '¿Qué objeto hizo flotar Eliseo en el agua?',
    ['Una espada', 'El hierro de un hacha', 'Una vasija', 'Una cadena'],
    1,
    'Eliseo arrojó un palo al agua e hizo flotar el hierro del hacha que se había hundido.',
    '2 R 6,1-7'
  ),
  question(
    'antiguo-testamento-42',
    'antiguo-testamento',
    'intermedia',
    '¿Qué arcángel acompañó al joven Tobías durante su viaje?',
    ['Miguel', 'Gabriel', 'Rafael', 'Uriel'],
    2,
    'Rafael acompañó a Tobías bajo apariencia humana y después reveló que había sido enviado por Dios.',
    'Tb 5,4-17; 12,15'
  ),
  question(
    'antiguo-testamento-43',
    'antiguo-testamento',
    'avanzada',
    '¿De qué ciudad era rey Melquisedec?',
    ['Salem', 'Hebrón', 'Siquén', 'Jericó'],
    0,
    'Melquisedec era rey de Salem y sacerdote del Dios Altísimo; bendijo a Abraham y ofreció pan y vino.',
    'Gn 14,18-20'
  ),
  question(
    'antiguo-testamento-44',
    'antiguo-testamento',
    'avanzada',
    '¿Qué cueva compró Abraham como sepultura familiar?',
    ['La cueva de Adulam', 'La cueva de Macpelá', 'La cueva de Horeb', 'La cueva de Engadí'],
    1,
    'Abraham compró la cueva de Macpelá para sepultar a Sara; allí serían enterrados otros patriarcas.',
    'Gn 23,1-20; 49,29-32'
  ),
  question(
    'antiguo-testamento-45',
    'antiguo-testamento',
    'avanzada',
    '¿A quién llenó Dios de sabiduría para dirigir la construcción del Santuario y sus objetos?',
    ['Besalel', 'Coré', 'Balaán', 'Nadab'],
    0,
    'Dios llamó a Besalel y le concedió habilidad artística para realizar las obras del Santuario.',
    'Ex 31,1-11'
  ),
  question(
    'antiguo-testamento-46',
    'antiguo-testamento',
    'avanzada',
    '¿Qué grupo pidió a Moisés una herencia porque su padre había muerto sin hijos varones?',
    ['Las hijas de Selofjad', 'Las hermanas de Moisés', 'Las viudas de Leví', 'Las hijas de Job'],
    0,
    'Las cinco hijas de Selofjad presentaron su causa y el Señor confirmó su derecho a heredar.',
    'Nm 27,1-11'
  ),
  question(
    'antiguo-testamento-47',
    'antiguo-testamento',
    'avanzada',
    '¿Qué juez zurdo liberó a Israel del rey Eglón de Moab?',
    ['Ehúd', 'Otoniel', 'Tola', 'Jair'],
    0,
    'Ehúd, de la tribu de Benjamín, ocultó una espada y venció al rey Eglón.',
    'Jue 3,12-30'
  ),
  question(
    'antiguo-testamento-48',
    'antiguo-testamento',
    'avanzada',
    '¿Qué señal recibió el rey Ezequías para confirmar que sería curado?',
    ['Una vara floreció', 'La sombra retrocedió diez grados', 'Cayó fuego del cielo', 'El Jordán se detuvo'],
    1,
    'Como señal, la sombra retrocedió diez grados en el reloj de Acaz.',
    '2 R 20,1-11; Is 38,1-8'
  ),
  question(
    'antiguo-testamento-49',
    'antiguo-testamento',
    'avanzada',
    '¿Cómo se llamaba la mujer con quien el profeta Oseas contrajo matrimonio como signo profético?',
    ['Gómer', 'Judit', 'Abigaíl', 'Tamar'],
    0,
    'Oseas tomó por esposa a Gómer; su matrimonio se convirtió en signo de la fidelidad de Dios ante la infidelidad de Israel.',
    'Os 1,2-9; 3,1-5'
  ),
  question(
    'antiguo-testamento-50',
    'antiguo-testamento',
    'avanzada',
    '¿Cuántos hijos de una misma madre fueron martirizados por permanecer fieles a la Ley?',
    ['Tres', 'Cinco', 'Siete', 'Doce'],
    2,
    'El segundo libro de los Macabeos relata el martirio de siete hermanos y de su madre.',
    '2 M 7'
  ),

  question(
    'santos-26',
    'santos',
    'inicial',
    '¿Qué santo es conocido como padre y maestro de la juventud y fundador de los Salesianos?',
    ['San Juan Bosco', 'San Felipe Neri', 'San Vicente de Paúl', 'San Carlos Borromeo'],
    0,
    'San Juan Bosco dedicó su vida a la formación humana y cristiana de los jóvenes, especialmente los más pobres.',
    'Vatican News, Santos: san Juan Bosco'
  ),
  question(
    'santos-27',
    'santos',
    'inicial',
    '¿Qué santo francés organizó las Cofradías de la Caridad y fundó la Congregación de la Misión?',
    ['San Vicente de Paúl', 'San Luis Gonzaga', 'San Martín de Tours', 'San Bernardo'],
    0,
    'San Vicente de Paúl impulsó numerosas obras al servicio de los pobres y la formación del clero.',
    'Vatican News, Santos: san Vicente de Paúl'
  ),
  question(
    'santos-28',
    'santos',
    'inicial',
    '¿Qué santa dominica ayudó a impulsar el regreso del Papa de Aviñón a Roma?',
    ['Santa Catalina de Siena', 'Santa Rosa de Lima', 'Santa Brígida de Suecia', 'Santa Ángela de Foligno'],
    0,
    'Santa Catalina de Siena trabajó por la unidad y reforma de la Iglesia y exhortó a Gregorio XI a regresar a Roma.',
    'Vatican News, Santos: santa Catalina de Siena'
  ),
  question(
    'santos-29',
    'santos',
    'inicial',
    '¿Qué santo obispo de Ginebra es patrono de los periodistas y escritores católicos?',
    ['San Francisco de Sales', 'San Ambrosio', 'San Roberto Belarmino', 'San Carlos Borromeo'],
    0,
    'San Francisco de Sales difundió la fe mediante una escritura clara, amable y accesible.',
    'Vatican News, Santos: san Francisco de Sales'
  ),
  question(
    'santos-30',
    'santos',
    'inicial',
    '¿En qué país africano nació santa Josefina Bakhita?',
    ['Sudán', 'Etiopía', 'Kenia', 'Uganda'],
    0,
    'Bakhita nació en Sudán, sufrió la esclavitud y más tarde conoció la libertad y la fe cristiana en Italia.',
    'Vatican News, Santos: santa Josefina Bakhita'
  ),
  question(
    'santos-31',
    'santos',
    'inicial',
    '¿Qué profesión ejerció santa Gianna Beretta Molla?',
    ['Médica', 'Maestra', 'Abogada', 'Arquitecta'],
    0,
    'Santa Gianna fue médica, esposa y madre, y vivió su profesión como servicio a la vida.',
    'Vaticano, biografía de santa Gianna Beretta Molla'
  ),
  question(
    'santos-32',
    'santos',
    'inicial',
    '¿De qué ciudad fue arzobispo san Óscar Romero?',
    ['San Salvador', 'Lima', 'Managua', 'Guatemala'],
    0,
    'San Óscar Romero fue arzobispo de San Salvador y dio testimonio del Evangelio hasta el martirio.',
    'Vaticano, canonización de san Óscar Romero'
  ),
  question(
    'santos-33',
    'santos',
    'inicial',
    '¿Qué obra fundó san Alberto Hurtado para acoger a personas sin hogar en Chile?',
    ['Hogar de Cristo', 'Techo para Chile', 'Cáritas Roma', 'Ciudad del Niño'],
    0,
    'El padre Hurtado fundó el Hogar de Cristo para ofrecer acogida y dignidad a quienes vivían abandonados.',
    'Vaticano, biografía de san Alberto Hurtado'
  ),
  question(
    'santos-34',
    'santos',
    'intermedia',
    '¿Qué santa alemana, abadesa y compositora, fue proclamada Doctora de la Iglesia en 2012?',
    ['Santa Hildegarda de Bingen', 'Santa Gertrudis la Grande', 'Santa Matilde', 'Santa Edith Stein'],
    0,
    'Santa Hildegarda de Bingen fue abadesa benedictina, autora espiritual, compositora y estudiosa de la naturaleza.',
    'Vaticano, proclamación de santa Hildegarda como Doctora de la Iglesia'
  ),
  question(
    'santos-35',
    'santos',
    'intermedia',
    '¿Qué ministerio ejercía san Lorenzo, mártir de Roma?',
    ['Diácono', 'Obispo', 'Monje', 'Catequista laico'],
    0,
    'San Lorenzo era uno de los diáconos de Roma y estaba encargado de la asistencia a los pobres.',
    'Vatican News, Santos: san Lorenzo, diácono y mártir'
  ),
  question(
    'santos-36',
    'santos',
    'intermedia',
    '¿De qué ciudad fue obispo san Policarpo?',
    ['Esmirna', 'Éfeso', 'Corinto', 'Antioquía'],
    0,
    'San Policarpo fue obispo de Esmirna y discípulo de la generación apostólica.',
    'Vatican News, Santos: san Policarpo de Esmirna'
  ),
  question(
    'santos-37',
    'santos',
    'intermedia',
    '¿En qué ciudad de la Galia fue obispo san Ireneo?',
    ['Lyon', 'Tours', 'Arlés', 'Poitiers'],
    0,
    'San Ireneo fue obispo de Lyon y defendió la unidad de la fe frente a las doctrinas gnósticas.',
    'Vatican News, Santos: san Ireneo de Lyon'
  ),
  question(
    'santos-38',
    'santos',
    'intermedia',
    '¿Entre qué pueblos evangelizaron especialmente los santos Cirilo y Metodio?',
    ['Los pueblos eslavos', 'Los pueblos celtas', 'Los pueblos escandinavos', 'Los pueblos ibéricos'],
    0,
    'Los hermanos Cirilo y Metodio anunciaron el Evangelio a los pueblos eslavos y tradujeron para ellos los textos litúrgicos.',
    'Vatican News, Santos: santos Cirilo y Metodio'
  ),
  question(
    'santos-39',
    'santos',
    'intermedia',
    '¿A qué pueblo indígena pertenecía santa Kateri Tekakwitha?',
    ['Mohawk', 'Mapuche', 'Quechua', 'Navajo'],
    0,
    'Santa Kateri era hija de un jefe mohawk y vivió su fe cristiana con gran firmeza.',
    'Vaticano, canonización de santa Kateri Tekakwitha'
  ),
  question(
    'santos-40',
    'santos',
    'intermedia',
    '¿A qué orden religiosa perteneció san Martín de Porres?',
    ['Dominicos', 'Franciscanos', 'Agustinos', 'Mercedarios'],
    0,
    'San Martín de Porres fue hermano cooperador dominico y sirvió con especial caridad a enfermos y pobres.',
    'Vatican News, Santos: san Martín de Porres'
  ),
  question(
    'santos-41',
    'santos',
    'intermedia',
    '¿Quién fue la primera santa canonizada nacida en América?',
    ['Santa Rosa de Lima', 'Santa Mariana de Jesús', 'Santa Teresa de los Andes', 'Santa Kateri Tekakwitha'],
    0,
    'Santa Rosa de Lima fue la primera persona nacida en América inscrita en el catálogo de los santos.',
    'Vatican News, Santos: santa Rosa de Lima'
  ),
  question(
    'santos-42',
    'santos',
    'intermedia',
    '¿Qué expresión italiana se asocia al deseo de santidad de san Pier Giorgio Frassati?',
    ['Verso l’alto', 'Ora et labora', 'Pax et bonum', 'Totus tuus'],
    0,
    '«Verso l’alto», hacia lo alto, resume su orientación a Cristo y su camino de santidad en la vida cotidiana.',
    'Vaticano, biografía de san Pier Giorgio Frassati'
  ),
  question(
    'santos-43',
    'santos',
    'avanzada',
    '¿A qué ciudad fue llevado san Ignacio de Antioquía para sufrir el martirio?',
    ['Roma', 'Alejandría', 'Jerusalén', 'Constantinopla'],
    0,
    'San Ignacio escribió sus cartas mientras era conducido prisionero a Roma, donde fue martirizado.',
    'Vatican News, Santos: san Ignacio de Antioquía'
  ),
  question(
    'santos-44',
    'santos',
    'avanzada',
    '¿Contra qué doctrina defendió san Atanasio la plena divinidad de Cristo?',
    ['El arrianismo', 'El pelagianismo', 'El donatismo', 'El jansenismo'],
    0,
    'San Atanasio combatió el arrianismo y defendió la fe proclamada en el Concilio de Nicea.',
    'Vatican News, Santos: san Atanasio de Alejandría'
  ),
  question(
    'santos-45',
    'santos',
    'avanzada',
    '¿Qué santo diácono y Doctor de la Iglesia es conocido como «la cítara del Espíritu Santo»?',
    ['San Efrén de Siria', 'San León Magno', 'San Beda', 'San Pedro Damián'],
    0,
    'San Efrén expresó la fe mediante himnos y poesía teológica, por lo que recibió ese título tradicional.',
    'Vatican News, Santos: san Efrén de Siria'
  ),
  question(
    'santos-46',
    'santos',
    'avanzada',
    '¿Qué práctica defendió san Juan Damasceno durante la controversia iconoclasta?',
    ['La veneración de las imágenes sagradas', 'El ayuno perpetuo', 'La celebración solo en griego', 'La supresión del canto litúrgico'],
    0,
    'San Juan Damasceno explicó que la Encarnación permite representar y venerar imágenes de Cristo y de los santos.',
    'Vatican News, Santos: san Juan Damasceno'
  ),
  question(
    'santos-47',
    'santos',
    'avanzada',
    '¿Qué obra histórica escribió san Beda el Venerable?',
    ['Historia eclesiástica del pueblo inglés', 'La ciudad de Dios', 'Diálogo de la divina providencia', 'Regla pastoral'],
    0,
    'La Historia eclesiástica del pueblo inglés es la obra más conocida de san Beda.',
    'Vatican News, Santos: san Beda el Venerable'
  ),
  question(
    'santos-48',
    'santos',
    'avanzada',
    '¿Quién fue el primer sacerdote católico nacido en Corea?',
    ['San Andrés Kim Taegon', 'San Pablo Miki', 'San Lorenzo Ruiz', 'San Agustín Zhao Rong'],
    0,
    'San Andrés Kim Taegon fue el primer sacerdote coreano y murió mártir en 1846.',
    'Vatican News, Santos: san Andrés Kim Taegon'
  ),
  question(
    'santos-49',
    'santos',
    'avanzada',
    '¿En qué país fue martirizado san Carlos Lwanga junto con sus compañeros?',
    ['Uganda', 'Nigeria', 'Sudán', 'Kenia'],
    0,
    'San Carlos Lwanga y sus compañeros dieron testimonio de Cristo en Uganda durante el siglo XIX.',
    'Vatican News, Santos: santos mártires de Uganda'
  ),
  question(
    'santos-50',
    'santos',
    'avanzada',
    '¿Quién fue el primer santo filipino canonizado?',
    ['San Lorenzo Ruiz', 'San Pedro Calungsod', 'San Andrés Kim', 'San Pablo Miki'],
    0,
    'San Lorenzo Ruiz, laico, esposo y padre de familia, fue martirizado en Nagasaki y canonizado en 1987.',
    'Vaticano, canonización de san Lorenzo Ruiz'
  ),

  question(
    'san-josemaria-26',
    'san-josemaria',
    'inicial',
    '¿De qué nacionalidad era san Josemaría?',
    ['Española', 'Italiana', 'Portuguesa', 'Francesa'],
    0,
    'San Josemaría nació en Barbastro, España, y desarrolló allí los primeros años de su labor sacerdotal.',
    'Vaticano, biografía de san Josemaría'
  ),
  question(
    'san-josemaria-27',
    'san-josemaria',
    'inicial',
    '¿Qué vocación ministerial recibió san Josemaría?',
    ['Sacerdote', 'Hermano religioso', 'Diácono permanente', 'Monje cartujo'],
    0,
    'Fue ordenado sacerdote en Zaragoza el 28 de marzo de 1925.',
    'Opus Dei, ordenación sacerdotal de san Josemaría'
  ),
  question(
    'san-josemaria-28',
    'san-josemaria',
    'inicial',
    '¿Cómo se llamaba el padre de san Josemaría?',
    ['José Escrivá Corzán', 'Santiago Escrivá Albás', 'Mariano Albás Blanc', 'Julián Escrivá Zaydín'],
    0,
    'Su padre fue José Escrivá Corzán, comerciante y cabeza de una familia profundamente cristiana.',
    'Opus Dei, cronología de san Josemaría'
  ),
  question(
    'san-josemaria-29',
    'san-josemaria',
    'inicial',
    '¿Cómo se llamaba la madre de san Josemaría?',
    ['Dolores Albás Blanc', 'Carmen Escrivá Albás', 'Pascuala Albás Blanc', 'Concepción Corzán'],
    0,
    'Su madre fue Dolores Albás Blanc, a quien san Josemaría recordaba por su fe y fortaleza.',
    'Opus Dei, cronología de san Josemaría'
  ),
  question(
    'san-josemaria-30',
    'san-josemaria',
    'inicial',
    '¿Cómo se llamaba la hermana mayor de san Josemaría?',
    ['Carmen', 'Pilar', 'Dolores', 'María Cruz'],
    0,
    'Carmen Escrivá nació en 1899 y colaboró generosamente con su hermano y con los comienzos del Opus Dei.',
    'Opus Dei, cronología de san Josemaría'
  ),
  question(
    'san-josemaria-31',
    'san-josemaria',
    'inicial',
    '¿Cómo se llamaba el hermano menor de san Josemaría?',
    ['Santiago', 'Álvaro', 'Isidoro', 'Ricardo'],
    0,
    'Santiago Escrivá Albás fue el hermano menor de san Josemaría.',
    'Opus Dei, biografía de san Josemaría'
  ),
  question(
    'san-josemaria-32',
    'san-josemaria',
    'inicial',
    '¿A qué advocación mariana atribuyó su familia la curación de san Josemaría cuando era niño?',
    ['Nuestra Señora de Torreciudad', 'Nuestra Señora de Lourdes', 'Nuestra Señora de Fátima', 'Nuestra Señora de Montserrat'],
    0,
    'Tras una grave enfermedad, sus padres agradecieron su curación llevando al niño a Torreciudad.',
    'Opus Dei, cronología de san Josemaría'
  ),
  question(
    'san-josemaria-33',
    'san-josemaria',
    'inicial',
    '¿Dónde celebró san Josemaría su primera Misa solemne?',
    ['En la Basílica del Pilar', 'En la catedral de Madrid', 'En San Pedro del Vaticano', 'En Torreciudad'],
    0,
    'Celebró su primera Misa solemne el 30 de marzo de 1925 en la Santa Capilla de la Basílica del Pilar de Zaragoza.',
    'Opus Dei, La primera Misa'
  ),
  question(
    'san-josemaria-34',
    'san-josemaria',
    'intermedia',
    '¿En qué ciudad estudió Derecho mientras continuaba su formación sacerdotal?',
    ['Zaragoza', 'Barcelona', 'Salamanca', 'Pamplona'],
    0,
    'San Josemaría estudió Derecho en la Universidad de Zaragoza junto con sus estudios eclesiásticos.',
    'Opus Dei, cronología de san Josemaría'
  ),
  question(
    'san-josemaria-35',
    'san-josemaria',
    'intermedia',
    '¿En qué iglesia de Zaragoza fue ordenado sacerdote?',
    ['San Carlos', 'Santa Engracia', 'San Pablo', 'Santiago el Mayor'],
    0,
    'Recibió la ordenación sacerdotal en la iglesia de San Carlos de Zaragoza.',
    'Opus Dei, ordenación sacerdotal de san Josemaría'
  ),
  question(
    'san-josemaria-36',
    'san-josemaria',
    'intermedia',
    '¿Cuál fue su primer destino pastoral después de la ordenación?',
    ['Perdiguera', 'Barbastro', 'Logroño', 'Pamplona'],
    0,
    'Poco después de ordenarse atendió la parroquia rural de Perdiguera, en la archidiócesis de Zaragoza.',
    'Opus Dei, La parroquia de Perdiguera'
  ),
  question(
    'san-josemaria-37',
    'san-josemaria',
    'intermedia',
    '¿En qué año se trasladó san Josemaría a Madrid?',
    ['1925', '1927', '1930', '1933'],
    1,
    'Se trasladó a Madrid en 1927 para realizar el doctorado en Derecho y ejercer su ministerio sacerdotal.',
    'Opus Dei, cronología de san Josemaría'
  ),
  question(
    'san-josemaria-38',
    'san-josemaria',
    'intermedia',
    '¿En qué institución madrileña fue capellán y atendió a numerosos enfermos y pobres?',
    ['Patronato de Enfermos', 'Hospital de la Princesa', 'Seminario Conciliar', 'Colegio del Pilar'],
    0,
    'Como capellán del Patronato de Enfermos desarrolló una intensa labor sacerdotal entre enfermos y necesitados.',
    'Opus Dei, fundación y primeros años'
  ),
  question(
    'san-josemaria-39',
    'san-josemaria',
    'intermedia',
    '¿Qué cordillera cruzó san Josemaría en 1937 para salir de la zona de persecución religiosa?',
    ['Los Pirineos', 'Los Alpes', 'La Sierra Nevada', 'Los Apeninos'],
    0,
    'Durante la Guerra Civil cruzó los Pirineos con otros miembros del Opus Dei y llegó a Andorra.',
    'Opus Dei, cronología de san Josemaría'
  ),
  question(
    'san-josemaria-40',
    'san-josemaria',
    'intermedia',
    'Además de Derecho y Arquitectura, ¿qué segundo significado daban los jóvenes a las siglas DYA?',
    ['Dios y Audacia', 'Deber y Alegría', 'Doctrina y Apostolado', 'Disciplina y Amistad'],
    0,
    'En la Academia DYA, las siglas de Derecho y Arquitectura expresaban también el lema «Dios y Audacia».',
    'Opus Dei, san Josemaría: fundación y primeros años'
  ),
  question(
    'san-josemaria-41',
    'san-josemaria',
    'intermedia',
    '¿Cómo se titula la homilía que san Josemaría pronunció en 1967 en el campus de la Universidad de Navarra?',
    ['Amar al mundo apasionadamente', 'La grandeza de la vida corriente', 'Hacia la santidad', 'Vida de oración'],
    0,
    'La homilía «Amar al mundo apasionadamente» presenta una visión cristiana de las realidades seculares.',
    'San Josemaría, Amar al mundo apasionadamente, 8-X-1967'
  ),
  question(
    'san-josemaria-42',
    'san-josemaria',
    'intermedia',
    '¿Quién fue el primer sucesor de san Josemaría al frente del Opus Dei?',
    ['Álvaro del Portillo', 'Javier Echevarría', 'Fernando Ocáriz', 'Isidoro Zorzano'],
    0,
    'Álvaro del Portillo fue elegido sucesor del fundador y más tarde primer prelado del Opus Dei.',
    'Opus Dei, biografía del beato Álvaro del Portillo'
  ),
  question(
    'san-josemaria-43',
    'san-josemaria',
    'avanzada',
    '¿Qué nombres recibió san Josemaría en el bautismo?',
    ['José, María, Julián y Mariano', 'José, Santiago, Pedro y Mariano', 'Josemaría, Álvaro y Julián', 'José, Miguel, Rafael y Gabriel'],
    0,
    'Fue bautizado con los nombres José, María, Julián y Mariano; después unió José y María por devoción.',
    'Opus Dei, cronología de san Josemaría'
  ),
  question(
    'san-josemaria-44',
    'san-josemaria',
    'avanzada',
    '¿En qué fecha fue bautizado san Josemaría?',
    ['13 de enero de 1902', '9 de enero de 1902', '23 de abril de 1902', '2 de octubre de 1902'],
    0,
    'Fue bautizado el 13 de enero de 1902 en la catedral de Barbastro, cuatro días después de nacer.',
    'Opus Dei, Santa María de la Paz; cronología de san Josemaría'
  ),
  question(
    'san-josemaria-45',
    'san-josemaria',
    'avanzada',
    '¿Qué antiguo compañero de estudios de Logroño se incorporó al Opus Dei en 1930?',
    ['Isidoro Zorzano', 'Álvaro del Portillo', 'José Luis Múzquiz', 'Pedro Casciaro'],
    0,
    'Isidoro Zorzano se reencontró con san Josemaría en Madrid y pidió la admisión en el verano de 1930.',
    'Opus Dei, Los primeros del Opus Dei'
  ),
  question(
    'san-josemaria-46',
    'san-josemaria',
    'avanzada',
    '¿Quiénes fueron los tres primeros fieles del Opus Dei ordenados sacerdotes en 1944?',
    ['Álvaro del Portillo, José María Hernández Garnica y José Luis Múzquiz', 'Isidoro Zorzano, Pedro Casciaro y Ricardo Fernández Vallespín', 'Álvaro del Portillo, Javier Echevarría y Fernando Ocáriz', 'José María Albareda, Juan Jiménez Vargas y Francisco Botella'],
    0,
    'Álvaro del Portillo, José María Hernández Garnica y José Luis Múzquiz fueron ordenados el 25 de junio de 1944.',
    'Opus Dei, cronología del Opus Dei'
  ),
  question(
    'san-josemaria-47',
    'san-josemaria',
    'avanzada',
    '¿Qué papa concedió en 1950 la aprobación definitiva del Opus Dei?',
    ['Pío XII', 'Juan XXIII', 'Pablo VI', 'Pío XI'],
    0,
    'Pío XII concedió la aprobación definitiva mediante el decreto del 16 de junio de 1950.',
    'Opus Dei, cronología del Opus Dei'
  ),
  question(
    'san-josemaria-48',
    'san-josemaria',
    'avanzada',
    '¿En qué fecha celebró san Josemaría la primera Misa en la iglesia de Santa María de la Paz?',
    ['31 de diciembre de 1959', '2 de octubre de 1958', '14 de febrero de 1960', '26 de junio de 1961'],
    0,
    'Celebró allí la primera Misa el 31 de diciembre de 1959; el templo sería después la iglesia prelaticia.',
    'Opus Dei, Santa María de la Paz'
  ),
  question(
    'san-josemaria-49',
    'san-josemaria',
    'avanzada',
    '¿Ante qué advocación mariana hizo san Josemaría una novena durante su viaje a México de 1970?',
    ['Nuestra Señora de Guadalupe', 'Nuestra Señora de Zapopan', 'Nuestra Señora de Ocotlán', 'Nuestra Señora de San Juan de los Lagos'],
    0,
    'Durante su estancia en México rezó una novena ante la Virgen de Guadalupe por la Iglesia y las necesidades del Opus Dei.',
    'Opus Dei, cronología de san Josemaría'
  ),
  question(
    'san-josemaria-50',
    'san-josemaria',
    'avanzada',
    '¿A quién consagró san Josemaría el Opus Dei el 30 de mayo de 1971?',
    ['Al Espíritu Santo', 'A san José', 'Al Sagrado Corazón de María', 'A san Miguel Arcángel'],
    0,
    'San Josemaría realizó una consagración del Opus Dei al Espíritu Santo el 30 de mayo de 1971.',
    'Opus Dei, cronología de san Josemaría'
  ),
] as const;
