export function getLiturgicalColor(saint: { title?: string; type?: string; name?: string }) {
  if (!saint) return "hsl(var(--card))"; // Color de la tarjeta por defecto

  const title = saint.title?.toLowerCase() || "";
  const type = saint.type?.toLowerCase() || "";
  const name = saint.name?.toLowerCase() || "";

  // Colores litúrgicos oficiales
  const colors = {
    gold: "#B8860B",      // Solemnidades, Fiestas del Señor
    red: "#8B0000",       // Pasión, Mártires, Apóstoles, Evangelistas, Pentecostés
    white: "#F8F9FA",     // Navidad, Pascua, Santos (no mártires), Doctores, Vírgenes
    purple: "#5A2A69",    // Adviento, Cuaresma, Misas de Difuntos
    green: "#225722",     // Tiempo Ordinario
    blue: "#3A5F7A",      // Privilegio hispano para Inmaculada y fiestas marianas
    rose: "#D470A2",      // Gaudete (Adviento 3) y Laetare (Cuaresma 4) - Opcional
  };

  // 1. Solemnidades y Fiestas del Señor (Blanco/Dorado)
  if (title.includes("solemnidad") || name.includes("señor") || name.includes("cristo rey") || title.includes("fiesta del señor")) {
    // Excepción: Viernes Santo (Pasión) es Rojo, aunque sea "del Señor"
    if (name.includes("pasión") || name.includes("viernes santo") || name.includes("cruz")) {
      return colors.red;
    }
    return colors.gold;
  }

  // 2. Tiempos Penitenciales: Adviento y Cuaresma (Morado)
  if (type.includes("advent") || type.includes("lent") || title.includes("ceniza")) {
    // Excepción: Domingo de Ramos (Rojo)
    if (name.includes("ramos") || name.includes("palm")) {
      return colors.red;
    }
    return colors.purple;
  }

  // 3. Pasión, Espíritu Santo y Mártires (Rojo)
  if (
    name.includes("viernes santo") || 
    name.includes("pentecostés") || 
    name.includes("espíritu santo") ||
    name.includes("pasión") ||
    type.includes("martyr") || type.includes("mártir") || name.includes("mártir") ||
    type.includes("apostle") || type.includes("apóstol") ||
    type.includes("evangelist") || type.includes("evangelista")
  ) {
    // Excepción: San Juan Evangelista es Blanco (no mártir) tradicionalmente, pero litúrgicamente se usa blanco.
    // Si el dato dice "Apóstol y Evangelista", la regla general es Rojo, pero Juan es excepción.
    if (name.includes("juan") && name.includes("evangelista")) {
      return colors.white;
    }
    return colors.red;
  }

  // 4. Fiestas Marianas (Blanco o Azul hispano)
  if (type.includes("marian") || name.includes("virgen") || name.includes("inmaculada") || name.includes("asunción") || name.includes("madre de dios")) {
    return colors.blue; 
  }

  // 5. Vírgenes (no mártires) -> Verde (Petición explícita usuario)
  if (type.includes("virgin") || type.includes("virgen")) {
    return colors.green;
  }

  // 6. Santos no mártires (Blanco)
  // Confesores, Doctores, Papas, Religiosos, Obispos
  if (
    type.includes("confessor") || 
    type.includes("doctor") || 
    type.includes("pope") || type.includes("papa") || 
    type.includes("bishop") || type.includes("obispo") ||
    type.includes("religious") || type.includes("religioso") ||
    type.includes("abbot") || type.includes("abad") ||
    title.includes("fiesta") || title.includes("memoria")
  ) {
    return colors.white;
  }
  
  // 7. Tiempo Ordinario / Feria (Verde)
  return colors.green;
}
