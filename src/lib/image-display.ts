// lib/image-display.ts
// ===============================================================
// CONTROL CENTRAL DE ENCUADRE DE IMÁGENES
// ===============================================================
// 🔧 Solo tú puedes editar esto. Los usuarios no ven estos valores.
// Cambia "center" por "top" o "bottom" cuando necesites ajustar el
// encuadre de una imagen en la app.
// ===============================================================

export type ImageDisplay = "top" | "center" | "bottom" | "extra";

export const toObjectPosition = (pref?: ImageDisplay): string => {
  switch (pref) {
    case "top":
      return "50% 15%";
    case "bottom":
      return "50% 85%";
    case "extra":
      return "40% 50%";
    case "center":
    default:
      return "50% 50%";
  }
};

// ===============================================================
// 1️⃣ ORACIONES (desde initialPrayers)
// ===============================================================
export const prayerImagePreference: Record<string, ImageDisplay> = {
  sanjosemaria: "center",
  sanjuanpabloii: "center",
  sanbenjamin: "center",
  sanjuanbautista: "center",
  sanpedro: "top",
  sancarloacutis: "center",
  santateresadelosandes: "center",
  sanalbertohurtado: "center",
  beatoalvaro: "center",
  sanfranciscodesales: "center",
  sanagustindehipona: "center",
  santotomasdeaquino: "center",
  "ofrecimiento-obras": "center",
  "oracion-manana": "center",
  "santa-misa": "center",
  "visita-santisimo": "center",
  "angelus-regina-coeli": "center",
  "santo-rosario": "center",
  "lectura-espiritual-container": "center",
  "oracion-tarde": "center",
  "examen-conciencia": "center",
  cartas: "center",
  "aves-marias-pureza": "center",
  "acordaos-oracion": "center",
  "simbolo-quicumque": "center",
  "salmo-ii": "center",
  "adoro-te-devote": "center",
  "salve-regina": "center",
  preces: "center",
  "via-crucis": "center",
  "oraciones-varias-predeterminadas-1": "center",
  "oraciones-varias-predeterminadas-2": "center",
  "oraciones-varias-predeterminadas-3": "center",
  "oraciones-varias-predeterminadas-4": "center",
  "oraciones-varias-predeterminadas-5": "center",
  "oraciones-varias-predeterminadas-6": "center",
  "oraciones-varias-predeterminadas-7": "center",
};

// ===============================================================
// 2️⃣ PLACEHOLDERS (desde placeholder-images.json)
// ===============================================================
export const placeholderImagePreference: Record<string, ImageDisplay> = {
  "home-sacred-heart": "top",
  "home-immaculate-heart": "top",
  "home-immaculate-conception": "top",
  "home-christ": "top",
  "saintoftheday-0": "top",
  "saintoftheday-1": "extra",
  "saintoftheday-2": "extra",
  "saintoftheday-3": "top",
  "saintoftheday-4": "center",
  "saintoftheday-5": "top",
  "saintoftheday-6": "top",
  "sanalbertohurtado-image": "center",
  "sanfranciscodesales-image": "center",
  "sanagustindehipona-image": "center",
  "santotomasdeaquino-image": "center",
  "nativity-image": "top",
  "christmas-image": "top",
};

// ===============================================================
// FUNCIÓN GENERAL PARA DECIDIR ENCUADRE SEGÚN ID
// ===============================================================
export const getImageObjectPosition = (id?: string): string => {
  if (!id) return toObjectPosition("center");
  const prayerPref = prayerImagePreference[id];
  const placeholderPref = placeholderImagePreference[id];
  return toObjectPosition(prayerPref || placeholderPref || "center");
};
