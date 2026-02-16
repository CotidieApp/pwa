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
      content: `Padre Nuestro, que estás en el cielo, santificado sea Tu Nombre; venga a nosotros Tu Reino; hágase Tu Voluntad en la tierra como en el Cielo.
Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal.
Amén.`
    },
    {
      id: 'ave-maria',
      title: 'Ave María',
      categoryId: 'oraciones',
      content: `Dios te salve, María, llena eres de gracia, el Señor es contigo, bendita tú eres entre todas las mujeres y bendito es el fruto de tu vientre, Jesús.
Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte.
Amén.`
    },
    {
      id: 'gloria',
      title: 'Gloria',
      categoryId: 'oraciones',
      content: `Gloria al Padre, al Hijo y al Espíritu Santo.
Como era en el principio, ahora y siempre, por los siglos de los siglos.
Amén.`
    },
    {
      id: 'credo',
      title: 'Credo',
      categoryId: 'oraciones',
      content: `Creo en Dios Padre Todopoderoso, Creador del cielo y de la tierra.
Creo en Jesucristo su Único Hijo Nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Vírgen, padeció bajo el poder de Poncio Pilato; fue crucificado, muerto y sepultado; descendió a los infernos, al tercer día resucitó de entre los muertos, subió a los Cielos, y está sentado a la derecha de Dios Padre Todopoderoso, desde allí ha de venir a juzgar a los vivos y muertos. 
Creo en el Espíritu Santo, en la Santa Iglesia Católica, en la Comunión de los santos, en el perdón de los pecados, la resurrección de la carne, y la vida eterna. 
Amén.`
    },
  ]
};
