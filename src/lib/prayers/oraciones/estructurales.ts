import type { Prayer } from '@/lib/types';

export const estructurales: Prayer = {
  id: 'estructurales',
  categoryId: 'oraciones',
  title: 'Oraciones estructurales',
  prayers: [
    {
      id: 'padre-nuestro',
      title: 'Padre Nuestro',
      categoryId: 'oraciones',
      imageUrl: '/images/resurrection.jpeg',
      content: {
        español:`Padre Nuestro, que estás en el cielo, santificado sea Tu Nombre; venga a nosotros Tu Reino; hágase Tu Voluntad en la tierra como en el Cielo.
Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal.
Amén.`,
        latin: `Pater Noster, qui es in caelis, sanctificetur Nomen Tuum; adveniat Regnum Tuum; fiat voluntas Tua, sicut in caelo et in terra.
Panem nostrum quotidianum da nobis hodie; et dimitte nobis debita nostra sicut et nos dimittimus debitoribus nostris; et ne nos inducas in tentationem, sed libera nos a malo.
Amen.`}
    },
    {
      id: 'ave-maria',
      title: 'Ave María',
      categoryId: 'oraciones',
      imageUrl: '/images/immaculate-conception.jpeg',
      content: {
        español: `Dios te salve, María, llena eres de gracia, el Señor es contigo, bendita tú eres entre todas las mujeres y bendito es el fruto de tu vientre, Jesús.
Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte.
Amén.`,
        latin: `Ave Maria, gratia plena, Dominus tecum; benedicta tu in mulieribus, et benedictus fructus ventris tui, Jesus.
Santa Maria, Mater Dei, ora pro nobis peccatoribus, nunc et in hora mortis nostrae.
Amen.`}
    },
    {
      id: 'gloria',
      title: 'Gloria',
      categoryId: 'oraciones',
      imageUrl: '/images/resurrection.jpeg',
      content: {
        español: `Gloria al Padre, al Hijo y al Espíritu Santo.
Como era en el principio, ahora y siempre, por los siglos de los siglos.
Amén.`,
        latin: `Gloria Patri, et Filio, et Spiritui Sancto.
Sicut erat in principio, nunc et semper, et in saecula saeculorum.
Amen.`}
    },
    {
      id: 'credo',
      title: 'Credo',
      categoryId: 'oraciones',
      imageUrl: '/images/resurrection.jpeg',
      content: {
        español: `Creo en Dios Padre Todopoderoso, Creador del cielo y de la tierra.
Creo en Jesucristo su Único Hijo Nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato; fue crucificado, muerto y sepultado; descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los Cielos, y está sentado a la derecha de Dios Padre Todopoderoso, desde allí ha de venir a juzgar a los vivos y muertos.
Creo en el Espíritu Santo, en la Santa Iglesia Católica, en la Comunión de los santos, en el perdón de los pecados, la resurrección de la carne, y la vida eterna.
Amén.`,
        latin: `Credo in unum Deum Patrem omnipotentem, creatorem caeli et terrae.
Et in unum Dominum nostrum Jesum Christum Filium Dei unicum, qui conceptus est de Spiritu Sancto, natus est de Maria Virgine, passus est sub Pontio Pilato; crucifixus est, mortuus est et sepultus est; descendit in infernos, al tertio die resurrexit a mortuis, ascendit in caelos, et sedet a dextris Dei Patris omnipotentis, unde venturus est iudicare vivos et mortuos.
Credo in Spiritum Sanctum, in Ecclesiam catholicam, in communione sanctorum, in remissione peccatorum, in resurrectionem carnis, et in vitam aeternam.
Amen.`}
    },
  ]
};
