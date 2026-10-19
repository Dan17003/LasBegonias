export const corregirEncoding = (texto) => {
  if (!texto || typeof texto !== "string") return texto;

  return texto
    .replace(/Ma\uFFFDana/gi, "Mañana")
    .replace(/Maana/gi, "Mañana")
    .replace(/\u00C3\u00B1/g, "ñ")
    .replace(/\u00C3\u00A1/g, "á")
    .replace(/\u00C3\u00A9/g, "é")
    .replace(/\u00C3\u00AD/g, "í")
    .replace(/\u00C3\u00B3/g, "ó")
    .replace(/\u00C3\u00BA/g, "ú")
    .replace(/\u00C3'/g, "Ñ")
    .replace(/\u00C3/g, "Á");
};

export const normalizarOdontologo = (odontologo) => {
  const data = odontologo.toJSON ? odontologo.toJSON() : { ...odontologo };
  return {
    ...data,
    nombre: corregirEncoding(data.nombre),
    especialidad: corregirEncoding(data.especialidad),
    turno: corregirEncoding(data.turno),
  };
};
