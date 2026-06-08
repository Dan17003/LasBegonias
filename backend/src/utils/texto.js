export const corregirEncoding = (texto) => {
  if (!texto || typeof texto !== "string") return texto;

  return texto
    .replace(/Ma\uFFFDana/gi, "Mañana")
    .replace(/Maana/gi, "Mañana")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã'/g, "Ñ")
    .replace(/Ã/g, "Á");
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
