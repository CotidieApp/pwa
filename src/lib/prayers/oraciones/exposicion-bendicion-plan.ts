import type { Prayer } from '@/lib/types';

type ExpositionPlanBase = Omit<Prayer, 'content'>;

type ExpositionPlanPrayer =
  | (ExpositionPlanBase & {
    singleColumn: true;
    content: string;
  })
  | (ExpositionPlanBase & {
    singleColumn: false;
    content: {
      español: string;
      latin: string;
    };
  });

// Edita o reemplaza estos ejemplos. El orden del arreglo es el orden del recorrido.
// singleColumn: true exige un único texto: content: `Texto...`.
// singleColumn: false exige content con latín a la izquierda y español a la derecha.
export const exposicionBendicionPlanAdicional: ExpositionPlanPrayer[] = [
  {
    id: 'adoracion-piedad-eucaristica',
    title: 'Adoración y piedad eucarística',
    categoryId: 'oraciones',
    singleColumn: true,
    content: `Ya decía san Agustín: «nemo autem illam carnem manducat, nisi prius adoraverit; [...] peccemus non adorando (Nadie come de esta carne sin antes adorarla [...], pecaríamos si no la adoráramos). En efecto, en la Eucaristía el Hijo de Dios viene a nuestro encuentro y desea unirse a nosotros; la adoración cucarística no es sino la continuación obvia de la celebración eucarística, la cual es en sí misma el acto más grande de adoración de la Iglesia. Recibir la Eucaristía significa adorar al que recibimos. Precisamente así, y sólo así, nos hacemos una sola cosa con Él y, en cierto modo, pregustamos anticipadamente la belleza de la liturgia celestial. La adoración fuera de la santa Misa prolonga e intensifica lo acontecido en la misma celebración litúrgica. En efecto, «sólo en la adoración puede madurar una acogida profunda y verdadera. Y precisamente en este acto personal de encuentro con el Señor madura luego también la misión social contenida en la Eucaristía y que quiere romper las barreras no sólo entre el Señor y nosotros, sino también y sobre todo las barreras que nos separan a los unos de los otros»

Benedicto XVI, Sacramentum caritatis, n. 66`
  },
  {
    id: 'pange-lingua',
    title: 'Pange lingua',
    categoryId: 'oraciones',
    singleColumn: false,
    content: {
      español: `Canta, lengua, el misterio del Cuerpo glorioso y de la Sangre preciosa que el Rey de las naciones, fruto de un vientre generoso, derramó como rescate del mundo.`,
      latin: `Pange, lingua, gloriósi Córporis mystérium Sanguinísque pretiósi, quem in mundi prétium fructus ventris generósi Rex effúdit géntium.`,
    },
  },
  {
    id: 'lectura',
    title: 'Lectura de la Palabra de Dios',
    categoryId: 'oraciones',
    singleColumn: true,
    content: `El sacerdote lee un fragmento de la Sagrada Escritura.
    Después, hay un momento de silencio y de reflexión.`
  },
  {
    id: 'oracion-santisimo-sacramento',
    title: 'Oración ante el Santísimo Sacramento',
    categoryId: 'oraciones',
    singleColumn: true,
    content: `V/. Bendito sea Jesús en el Santísimo Sacramento.
    R/. Bendito sea Jesús en el Santísimo Sacramento.
    
    Padre Nuestro...
    Ave María...
    Gloria...
    
    (tres veces)
    
    V/. Bendito sea Jesús en el Santísimo Sacramento.
    R/. Bendito sea Jesús en el Santísimo Sacramento.
    
    Comunión espiritual. Yo quisiera, Señor, recibiros con aquella pureza, humildad y devoción con que os recibió vuestra Santísima Madre; con el espíritu y fervor de los Santos.`
  },
  {
    id: 'tantum-ergo',
    title: 'Canto eucarístico',
    categoryId: 'oraciones',
    singleColumn: false,
    content: {
      español: `Adoremos, reverentes, al Señor Sacramentado. Cante el rito del presente, superior al del pasado. Nuestros ojos lo contemplen con filial, humilde fe.
Gloria al Padre, gloria al Hijo, y al Espíritu Señor.Al Dios santo uno y trino, alabanza y bendición.Suba al cielo en testimonio el incienso del amor. Amén.

V/. Les diste Pan del cielo, (T.P.: Aleluya)
R/. Que contiene en sí todo deleite. (T.P.: Aleluya)

Oremos.
Oh Dios, que en este Sacramento admirable nos dejaste el recuerdo de tu Pasión: te pedimos nos concedas venerar de tal modo los sagrados misterios de tu Cuerpo y de tu Sangre, que experimentemos constantemente el fruto de tu redención. Tú que vives y reinas por los siglos de los siglos.

R/. Amén.`,
      latin: `Tantum ergo Sacraméntum venerémur cérnui; et antiquum documéntum novo cedat rítui; præstet fides suppleméntum sénsuum deféctui.
Genitóri, Genitóque laus et iubilátio, salus, honor, virtus quoque sit et benedíctio: procedénti ab utróque compar sit laudátio. Amen.

V/. Panem de cælo praestitísti eis, (T.P.: Allelúia)
R./ Omne delectaméntum in se habéntem. (T.P.: Allelúia)

Oremus.
Deus, qui nobis sub Sacraménto mirábili Passionis tuæ memóriam reliquísti: tribue, quæsumus, ita nos Córporis et Sánguinis tui sacra mystéria venerári, ut redemptiónis tuæ fructum in nobis iúgiter sentiámus. Qui vivis et regnas in sæcula sæculórum.

R/. Amen.`,
    },
  },
  {
    id: 'bendicion-santisimo-sacramento',
    title: 'Bendición con el Santísimo Sacramento',
    categoryId: 'oraciones',
    singleColumn: true,
    content: `El sacerdote da la bendición con el Santísimo Sacramento.`
  },
  {
    id: 'alabanzas-desagravio',
    title: 'Alabanzas de desagravio',
    categoryId: 'oraciones',
    singleColumn: true,
    content: `Bendito sea Dios.
Bendito sea su Santo Nombre.
Bendito sea Jesucristo, verdadero Dios y verdadero Hombre.
Bendito sea el Nombre de Jesús.
Bendito sea su Sagrado Corazón.
Bendita sea su Preciosa Sangre.
Bendito sea Jesús en el Santísimo Sacramento del altar.
Bendito sea el Espíritu Santo Consolador.
Bendita sea la Incomparable Madre de Dios la Santísima Virgen María.
Bendita sea su Santa e Inmaculada Concepción.
Bendita sea su Gloriosa Asunción.
Bendito sea el Nombre de María Virgen y Madre.
Bendito sea San José su Casto Esposo.
Bendito sea Dios en sus Ángeles y en sus Santos.
Amén.`
  },
  {
    id: 'canto-alabanza',
    title: 'Canto de alabanza',
    categoryId: 'oraciones',
    singleColumn: false,
    content: {
      español: `Alabad al Señor todas las naciones;alabadle todos los pueblos. Porque su misericordia ha sidoconfirmada sobre nosotros; y la verdad del Señor permanece para siempre.
Gloria al Padre, y al Hijo, y al Espíritu Santo; como era en el principio, ahora y siempre, por los siglos de los siglos.
Amén.`,
      latin: `Laudate Dominum omnes gentes; laudate eum omnes populi. Quoniam confirmata est super nos misericordia eius: et veritas Domini manet in aeternum.
Glória Patri et Fílio, et Spirítui Sancto; sicut erat in principio, et nunc et semper, et in sæcula sæculórum. 
Amen.`
    }
  },
  {
    id: 'cantos-santisima-virgen',
    title: 'Cantos a la Santísima Virgen',
    categoryId: 'oraciones',
    singleColumn: false,
    content: {
      español: `Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve. A ti llamamos los desterrados hijos de Eva; a ti suspiramos, gimiendo y llorando en este valle de lágrimas. Ea, pues, Señora, abogada nuestra, vuelve a nosotros esos tus ojos misericordiosos; y después de este destierro, muéstranos a Jesús, fruto bendito de tu vientre. ¡Oh, clementísima, oh piadosa, oh dulce Virgen María!

V/. Ruega por nosotros Santa Madre de Dios.
R/. Para que seamos dignos de alcanzar las promesas de nuestro Señor Jesucristo.


Oremos.
Omnipotente y sempiterno Dios, que con la cooperación del Espíritu Santo, preparaste el cuerpo y el alma de la gloriosa Virgen y Madre María para que fuera digna morada de tu Hijo: haz que los que nos alegramos con su memoria, seamos libres, por su piadosa intercesión, de los males presentes y de la muerte eterna. Por el mismo Cristo nuestro Señor.

R./ Amén.
V./ El auxilio del Señor permanezca siempre con nosotros.
R./ Amén.`,
      latin: `Salve, Regina, Mater misericórdiae, vita, dulcédo et spes nostra, salve. Ad te clamámus, éxsules filii Hevae. Ad te suspirámus geméntes et flentes in hac lacrimárum valle. Eia ergo, advocáta nostra, illos tuos misericórdes óculos ad nos convérte. Et Iesum, benedictum fructum ventris tui, nobis, post hoc exsílium, osténde. O clemens, o pia, o dulcis Virgo María!

V/. Ora pro nobis Sancta Dei Génetrix.
R/. Ut digni efficiámur promissiónibus Christi.


Oremus.
Omnipotens sempitérne Deus, qui gloriosae Vírginis Matris Maríae corpus et ánimam, ut dignum Filii tui habitáculum éffici mereretur, Spíritu Sancto cooperante, praeparásti: da, ut cuius commemoratione lactámur, eius pia intercessione, ab instántibus malis et a morte perpetua liberémur. Per eúndem Christum Dóminum nostrum.

R/. Amen.
V/. Divinum auxilium maneat semper nobiscum.
R/. Amen.`
    }
  },
  {
    id: 'regina-coeli',
    title: 'Regina Coeli (Tiempo Pascual)',
    categoryId: 'oraciones',
    singleColumn: false,
    content: {
      español: `Reina del cielo alégrate; aleluya.
      Porque el Señor a quien has merecido llevar; aleluya.
      Ha resucitado según su palabra; aleluya.
      Ruega al Señor por nosotros; aleluya.
      
      V/. Gózate y alégrate, Virgen María; aleluya.
      R/. Porque verdaderamente ha resucitado el Señor; aleluya.
      
      Oremos.
      Oh Dios, que por la resurrección de tu Hijo, nuestro Señor Jesucristo, has llenado el mundo de alegría, concédenos, por intercesión de su Madre, la Virgen María, llegar a alcanzar los gozos eternos. Por nuestro Señor Jesucristo.
      
      R/. Amén.
      V/. El auxilio del Señor permanezca siempre con nosotros.
      R/. Amén.`,
      latin: `Regina coeli laetáre, allelúia;
      quia quem meruísti portáre, allelúia;
      resurréxit, sicut dixit, allelúia.
      Ora pro nobis Deum, allelúia.
      
      V./ Gaude et lætáre, Virgo María, allelúia.
      R./ Quia surrexit Dóminus vere, allelúia.
      
      Orémus.
      Deus, qui per resurrectiónem Filii tui Domini nostri Iesu Christi mundum laetificáre dignátus es, praesta, quaesumus, ut per eius Genetricem Vírginem Maríam perpétuae capiámus gáudia vitac. Per Christum Dóminum nostrum.
      
      R/. Amen.
      V/. Divinum auxilium maneat semper nobiscum.
      R/. Amen.`
    }
  },
  {
    id: 'ave-regina-caelorum',
    title: 'Ave Regina Caelorum',
    categoryId: 'oraciones',
    singleColumn: false,
    content: {
      español: `Salve Reina de los cielos;
      salve Señora de los Angeles; 
      salve, raíz de nuestros bienes, 
      salve, puerta por la que ha entrado la luz al mundo.
      
      Alégrate, Virgen gloriosa, 
      la más hermosa de todas.
      ¡Salve, oh Virgen llena de gracia!
      y ruega a Cristo por nosotros.`,
      latin: `Ave Regina caelorum, 
      Ave Dómina Angelórum. 
      Salve radix, salve porta, 
      ex qua mundo lux est orta.
      
      Gaude, Virgo gloriósa, 
      super omnes speciósa: 
      vale, o valde decóra, 
      et pro nobis Christum exóra`
    },
  },
  {
    id: 'alma-redemptoris-mater',
    title: 'Alma Redemptoris Mater',
    categoryId: 'oraciones',
    singleColumn: false,
    content: {
      español: `¡Santa Madre del Redentor, 
      que permaneces como puerta de acceso al cielo. 
      ¡Estrella del mar! 
      Socorre al pueblo que cae 
      pero que procura levantarse.

      Tú, que, con pasmo de la naturaleza, 
      engendraste a tu santo Creador.
      Virgen antes y después del parto, 
      que recibiste aquel saludo de boca de Gabriel, 
      ten piedad de los pecadores.`,
      latin: `Alma Redemptóris Mater, 
      quæ pérvia cæli porta manes, 
      et stella maris, 
      succúrre cadénti súrgere qui 
      curat pópulo:

      Tu quæ genuísti, natura miránte, 
      tuum sanctum Genitórem:
      Virgo prius ac postérius, 
      Gabrielis ab ore sumens illud Ave, 
      peccatórum miserére.`
    },
  },
  {
    id: 'ave-maris-stella',
    title: 'Ave Maris Stella',
    categoryId: 'oraciones',
    singleColumn: false,
    content: {
      español: `Salve, Estrella del mar,
      Santa Madre de Dios,
      y siempre Virgen,
      feliz Puerta del cielo.
      
      Tú que has recibido el saludo de Gabriel,
      y has cambiado
      el nombre de Eva,
      establécenos en la paz.
      
      Rompe las ataduras de los pecadores,
      da luz a los ciegos,
      aleja de nosotros los males,
      y alcánzanos todos los bienes.
      
      Muestra que eres Madre, 
      reciba nuestras súplicas por medio de Ti, 
      Aquel que, naciendo por nosotros, 
      aceptó ser Hijo tuyo.

¡Oh, Virgen incomparable!
¡Amable como ninguna! 
Haz que, libres de nuestras culpas, 
permanezcamos humildes y castos.

Danos una vida limpia, 
prepáranos un camino seguro, 
para que, viendo a Jesús, 
nos alegremos eternamente contigo.

Damos alabanza a Dios Padre, 
gloria a Cristo Soberano
y también al Santo Espíritu, 
a los Tres un mismo honor. 
Amén.`,
      latin: `Ave maris stella, 
      Dei Mater alma, 
      atque semper Virgo, 
      felix cæli porta.

Sumens illud Ave 
Gabrielis ore, 
funda nos in pace, 
mutans Hevæ nomen.

Solve vincla reis, 
profer lumen cæcis, 
mala nostra pelle, 
bona cuncta posce.

Monstra te esse matrem, 
sumat per te preces qui, 
pro nobis natus, 
tulit esse tuus.

Virgo singuláris, 
inter omnes mitis, 
nos culpis solútos, 
mites fac et castos.

Vitam præsta puram, 
iter para tutum: 
ut vidéntes Iesum, 
semper collætémur.

Sit laus Deo Patri, 
summo Christo decus, 
Spirítui Sancto, 
tribus honor unus. 
Amen.`
    },
  },
  {
    id: 'adoro-te-devote',
    title: 'Adoro te devote',
    categoryId: 'oraciones',
    singleColumn: false,
    content: {
      español: `Te adoro con devoción, Dios escondido, oculto verdadera-mente bajo estas apariencias. A Ti se somete mi corazón por completo, y se rinde totalmente al contemplarte.

Al juzgar de Ti, se equivocan la vista, el tacto, el gusto; pero basta el oído para creer con firmeza; creo todo lo que ha dicho el Hijo de Dios: nada es más verdadero que esta palabra de verdad.

En la Cruz se escondía sólo la Divinidad, pero aquí se esconde también la Humanidad; creo y confieso ambas cosas, y pido lo que pidió el ladrón arrepentido.

No veo las llagas como las vio Tomás pero confieso que eres mi Dios: haz que yo crea más y más en Ti, que en Ti espere y que te ame.

¡Oh memorial de la muerte del Señor! Pan vivo que das la vida al hombre: concede a mi alma que de Ti viva, y que siempre saboree tu dulzura.

Señor Jesús, bondadoso Pelícano, límpiame a mi, inmundo, con tu sangre, de la que una sola gota puede liberar de todos los crímenes al mundo entero.

Jesús, a quien ahora veo oculto, te ruego que se cumpla lo que tanto ansío: que al mirar tu rostro cara a cara, sea yo feliz viendo tu gloria. 
Amén.
`,
      latin: `Adóro te devóte, latens Déitas, quæ sub his figúris vere látitas; tibi se cor meum totum súbiicit, quia, te contémplans, totum déficit.

Sed audítu solo tuto créditur; visus, tactus, gustus in te fállitur, credo quidquid dixit Dei Filius: nil hoc verbo veritátis vérius.

In cruce latébat sola Déitas, at hic latet simul et humánitas; ambo tamen credens atque cónfitens, peto quod petívit latro pænitens.

Plagas, sicut Thomas, non intúeor, Deum tamen meum te confiteor; fac me tibi semper magis crédere, in te spem habére, te diligere.

O memoriále mortis Dómini, Panis vivus, vitam præstans hómini: præsta meæ menti de te vivere, et te illi semper dulce sápere.

Pie pellicáne, Iesu Dómine, me immúndum munda tuo fácere totum mundum quit ad sánguine: cuius una stilla salvum omni scélere.

Iesu, quem velátum nunc aspício, oro, fiat illud quod tam sítio: ut te reveláta cernens fácie, visu sim beátus tuae gloriæ. 
Amen.`
    },
  },
];
