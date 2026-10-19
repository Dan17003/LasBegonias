import assert from "node:assert/strict";
import test from "node:test";
import {
  calcularNivelInsercionClinica,
  furcacionEsAplicable,
  validarFechaEvaluacionPeriodontal,
  validarLotePeriodontal,
  validarMedicionPeriodontal,
} from "./periodontogramaService.js";

const sitio = (overrides = {}) => ({
  pieza: "16",
  sitio: "vestibular_mesial",
  profundidad_sondaje: "4.0",
  margen_gingival: "2.0",
  sangrado: true,
  placa: false,
  supuracion: false,
  movilidad: "0",
  furcacion: "I",
  notas: "",
  ...overrides,
});

test("calcula NIC con margen recesivo y coronal y omite datos faltantes o inconsistentes", () => {
  assert.equal(calcularNivelInsercionClinica(4, 2), 6);
  assert.equal(calcularNivelInsercionClinica(4, -2), 2);
  assert.equal(calcularNivelInsercionClinica(4, null), null);
  assert.equal(calcularNivelInsercionClinica(4, -5), null);
});

test("valida piezas permanentes y rangos sin conversiones permisivas", () => {
  assert.equal(validarMedicionPeriodontal(sitio({ pieza: "17" })).error, undefined);
  assert.match(validarMedicionPeriodontal(sitio({ pieza: "19" })).error, /FDI/);
  assert.match(validarMedicionPeriodontal(sitio({ pieza: "55" })).error, /permanente/);
  assert.match(validarMedicionPeriodontal(sitio({ profundidad_sondaje: "4.25" })).error, /decimal/);
  assert.match(validarMedicionPeriodontal(sitio({ sangrado: "false" })).error, /sí o no/);
  assert.match(validarMedicionPeriodontal(sitio({ movilidad: true })).error, /movilidad/);
  assert.equal(validarMedicionPeriodontal(sitio({ margen_gingival: "-2.0" })).value.nivel_insercion, 2);
});

test("acepta hallazgos parciales sin medición y rechaza sitios vacíos", () => {
  const parcial = validarMedicionPeriodontal(sitio({
    profundidad_sondaje: "",
    margen_gingival: null,
    sangrado: true,
    placa: null,
    supuracion: null,
    movilidad: null,
    furcacion: null,
    notas: "",
  }));
  assert.equal(parcial.error, undefined);
  assert.equal(parcial.value.profundidad_sondaje, null);
  assert.equal(parcial.value.nivel_insercion, null);
  assert.match(validarMedicionPeriodontal(sitio({
    profundidad_sondaje: null,
    margen_gingival: null,
    sangrado: null,
    placa: null,
    supuracion: null,
    movilidad: null,
    furcacion: null,
  })).error, /al menos un hallazgo/);
});

test("solo admite furcación en piezas multirradiculares habituales", () => {
  assert.equal(furcacionEsAplicable("16"), true);
  assert.equal(furcacionEsAplicable("55"), true);
  assert.equal(furcacionEsAplicable("14"), false);
  assert.equal(validarMedicionPeriodontal(sitio({ pieza: "55" }), { permitirTemporal: true }).error, undefined);
  assert.match(validarMedicionPeriodontal(sitio({ pieza: "14", furcacion: "I" })).error, /furcación/);
});

test("acepta varios sitios de una pieza y rechaza duplicados dentro de la evaluación", () => {
  const result = validarLotePeriodontal([
    sitio({ sitio: "vestibular_mesial" }),
    sitio({ sitio: "vestibular_central" }),
    sitio({ sitio: "lingual_distal" }),
  ]);
  assert.equal(result.value.length, 3);
  assert.match(validarLotePeriodontal([sitio(), sitio()]).error, /aparece más de una vez/);
  assert.equal(validarLotePeriodontal([sitio({ profundidad_sondaje: null })]).value.length, 1);
});

test("valida fechas ISO de evaluación y rechaza fechas inválidas o futuras", () => {
  assert.equal(validarFechaEvaluacionPeriodontal("2020-02-30").error !== undefined, true);
  assert.equal(validarFechaEvaluacionPeriodontal("2999-01-01").error !== undefined, true);
  assert.equal(validarFechaEvaluacionPeriodontal("2020-02-29").value, "2020-02-29");
});
