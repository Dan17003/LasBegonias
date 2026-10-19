export const SITIOS_PERIODONTALES = [
  "vestibular_mesial",
  "vestibular_central",
  "vestibular_distal",
  "lingual_mesial",
  "lingual_central",
  "lingual_distal",
];

const RANGOS = {
  profundidad_sondaje: { min: 0, max: 12 },
  margen_gingival: { min: -10, max: 15 },
};
const GRADOS_MOVILIDAD = new Set([0, 1, 2, 3]);
const GRADOS_FURCACION = new Set(["0", "I", "II", "III"]);
const CAMPOS_BOOLEANOS = ["sangrado", "placa", "supuracion"];

const parsearMedida = (value, field) => {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  const text = typeof value === "number" ? String(value) : value;
  if (typeof text !== "string" || !/^-?\d+(?:\.\d)?$/.test(text)) {
    return { error: `${field} debe ser un número con un máximo de un decimal.` };
  }
  const number = Number(text);
  const { min, max } = RANGOS[field];
  if (!Number.isFinite(number) || number < min || number > max) {
    return { error: `${field} debe estar entre ${min} y ${max} mm.` };
  }
  return { value: number };
};

const parsearBooleano = (value, field) => {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "boolean") return { error: `${field} debe indicarse como sí o no.` };
  return { value };
};

const parsearMovilidad = (value) => {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "number" && (typeof value !== "string" || !/^[0-3]$/.test(value))) {
    return { error: "La movilidad debe ser grado 0, I, II o III." };
  }
  const number = Number(value);
  if (!Number.isInteger(number) || !GRADOS_MOVILIDAD.has(number)) {
    return { error: "La movilidad debe ser grado 0, I, II o III." };
  }
  return { value: number };
};

const parsearFurcacion = (value) => {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "string" && typeof value !== "number") {
    return { error: "La furcación debe ser grado 0, I, II o III." };
  }
  const grade = String(value).toUpperCase();
  if (!GRADOS_FURCACION.has(grade)) return { error: "La furcación debe ser grado 0, I, II o III." };
  return { value: grade };
};

export const calcularNivelInsercionClinica = (profundidad, margenGingival) => {
  if (profundidad === null || margenGingival === null) return null;
  // Margen positivo = recesión apical; el NIC es sondaje más margen.
  const nic = profundidad + margenGingival;
  return nic >= 0 && nic <= 25 ? Math.round(nic * 10) / 10 : null;
};

const validarPiezaFdi = (value) => {
  const pieza = String(value ?? "");
  return /^[1-4][1-8]$/.test(pieza) || /^[5-8][1-5]$/.test(pieza);
};

export const validarMedicionPeriodontal = (input, { permitirTemporal = false } = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Cada medición periodontal debe ser un objeto válido." };
  }
  if (!validarPiezaFdi(input.pieza) || (!permitirTemporal && Number(String(input.pieza)[0]) >= 5)) {
    return { error: "La pieza debe usar nomenclatura FDI permanente (11–48)." };
  }
  if (!SITIOS_PERIODONTALES.includes(input.sitio)) {
    return { error: "Selecciona uno de los seis sitios periodontales válidos." };
  }

  const profundidad = parsearMedida(input.profundidad_sondaje, "profundidad_sondaje");
  if (profundidad.error) return { error: profundidad.error };
  const margen = parsearMedida(input.margen_gingival, "margen_gingival");
  if (margen.error) return { error: margen.error };
  const medicion = {
    pieza: String(input.pieza),
    sitio: input.sitio,
    profundidad_sondaje: profundidad.value,
    margen_gingival: margen.value,
    nivel_insercion: calcularNivelInsercionClinica(profundidad.value, margen.value),
    movilidad: null,
    furcacion: null,
    notas: null,
  };
  if (input.notas !== undefined && input.notas !== null && typeof input.notas !== "string") {
    return { error: "Las observaciones deben ser texto." };
  }
  medicion.notas = typeof input.notas === "string" ? input.notas.trim().slice(0, 2000) || null : null;

  for (const field of CAMPOS_BOOLEANOS) {
    const parsed = parsearBooleano(input[field], field);
    if (parsed.error) return { error: parsed.error };
    medicion[field] = parsed.value;
  }
  const movilidad = parsearMovilidad(input.movilidad);
  if (movilidad.error) return { error: movilidad.error };
  medicion.movilidad = movilidad.value;

  const furcacion = parsearFurcacion(input.furcacion);
  if (furcacion.error) return { error: furcacion.error };
  if (furcacion.value && !furcacionEsAplicable(medicion.pieza)) {
    return { error: "Registra furcación solo cuando la pieza multirradicular haya sido confirmada clínicamente." };
  }
  medicion.furcacion = furcacion.value;
  if (
    medicion.profundidad_sondaje === null &&
    medicion.margen_gingival === null &&
    medicion.sangrado === null &&
    medicion.placa === null &&
    medicion.supuracion === null &&
    medicion.movilidad === null &&
    medicion.furcacion === null &&
    medicion.notas === null
  ) {
    return { error: "Registra al menos un hallazgo o dato clínico para el sitio." };
  }
  return { value: medicion };
};

export const furcacionEsAplicable = (pieza) => {
  const [cuadrante, diente] = String(pieza).split("").map(Number);
  const denticionTemporal = cuadrante >= 5;
  return denticionTemporal ? diente >= 4 : diente >= 6 && diente <= 7;
};

export const validarLotePeriodontal = (measurements) => {
  if (!Array.isArray(measurements) || measurements.length === 0 || measurements.length > 192) {
    return { error: "La evaluación debe contener entre 1 y 192 sitios medidos." };
  }
  const normalized = [];
  const keys = new Set();
  for (const input of measurements) {
    const result = validarMedicionPeriodontal(input);
    if (result.error) return result;
    const key = `${result.value.pieza}:${result.value.sitio}`;
    if (keys.has(key)) return { error: `El sitio ${key.replace(":", " / ")} aparece más de una vez en la evaluación.` };
    keys.add(key);
    normalized.push(result.value);
  }
  return { value: normalized };
};

export const validarFechaEvaluacionPeriodontal = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: "La fecha de evaluación debe tener el formato AAAA-MM-DD." };
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { error: "La fecha de evaluación no es válida." };
  }
  if (value > new Date().toISOString().slice(0, 10)) {
    return { error: "La fecha de evaluación no puede ser futura." };
  }
  return { value };
};
