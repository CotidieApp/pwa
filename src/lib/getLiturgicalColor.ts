// src/lib/getLiturgicalColor.ts
export function getLiturgicalColor(saint: { title?: string; type?: string; name?: string }) {
  if (!saint) return "hsl(var(--card))"; // Color de la tarjeta por defecto

  const title = saint.title?.toLowerCase() || "";
  const type = saint.type?.toLowerCase() || "";
  const name = saint.name?.toLowerCase() || "";

  // Colores litúrgicos con tonos más sobrios
  const colors = {
    gold: "#B8860B",      // Dorado oscuro para Solemnidades/Fiestas del Señor
    red: "#8B0000",       // Rojo oscuro para mártires y apóstoles
    white: "#F8F9FA",     // Blanco/Plata para Pascua, Navidad, Vírgenes, Santos no mártires
    purple: "#5A2A69",    // Morado para Adviento/Cuaresma
    green: "#225722",     // Verde bosque oscuro para Tiempo Ordinario
    blue: "#3A5F7A",      // Azul apagado para fiestas marianas
    default: "hsl(var(--card))",
  };

  // 1. Solemnidades y Fiestas del Señor
  if (title.includes("solemnidad") || name.includes("señor") || name.includes("cristo rey")) {
    return colors.gold;
  }
  if (title.includes("fiesta del señor")) {
      return colors.gold;
  }
  if (title.includes("fiesta") && !(type.includes("marian") || type.includes("apostle"))) {
    return colors.white; 
  }

  // 2. Mártires, Apóstoles y Evangelistas
  if (type.includes("martyr") || type.includes("mártir") || name.toLowerCase().includes("mártir") || type.includes("apostle") || type.includes("evangelist")) {
    return colors.red;
  }
  
  // 3. Fiestas Marianas
  if (type.includes("marian")) {
    return colors.blue;
  }

  // 4. Vírgenes (no mártires)
  // El usuario solicitó explícitamente verde para vírgenes no marianas.
  // Nota: Santa Escolástica (y otras vírgenes) aparecían en azul porque se clasificaban erróneamente en la lógica anterior o por defecto.
  if (type.includes("virgin") || type.includes("virgen")) {
    // Excepción: Si es mártir, debe ser rojo (ya cubierto arriba, pero reforzamos por si acaso el orden importa)
    if (type.includes("martyr") || type.includes("mártir")) {
        return colors.red;
    }
    return colors.green;
  }
  
  // 5. Papas y Obispos
  if (type.includes("pope") || type.includes("papa")) {
    return colors.purple;
  }

  // 5. Memorias y Tiempo Ordinario
  if (title.includes("memoria")) {
    // Si es un tipo que normalmente sería blanco (doctor, obispo, confesor, etc.) pero es una memoria, usa verde.
    if (type.includes("doctor") || type.includes("confessor") || type.includes("abbot") || type.includes("bishop") || type.includes("priest") || type.includes("religious")) {
       return colors.green;
    }
     // Las memorias de mártires o vírgenes ya están cubiertas arriba.
  }
  
  // Color por defecto para Tiempo Ordinario
  return colors.green;
}
