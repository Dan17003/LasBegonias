import assert from "node:assert/strict";
import test from "node:test";
import { ensureAtencionClinicalLinks } from "./ensureAtencionClinicalLinks.js";

test("añade relaciones clínicas faltantes y crea la unión diagnósticos-atenciones una sola vez", async () => {
  const tables = new Set([
    "historia_diagnosticos",
    "planes_tratamiento",
    "procedimientos_realizados",
    "atenciones",
    "citas",
    "periodontograma_mediciones",
  ]);
  const columns = Object.fromEntries([...tables].map((table) => [table, {}]));
  const indexes = Object.fromEntries([...tables].map((table) => [table, []]));
  const addedColumns = [];
  const createdTables = [];
  const queryInterface = {
    async describeTable(table) { return columns[table]; },
    async addColumn(table, name, definition) { columns[table][name] = definition; addedColumns.push(`${table}.${name}`); },
    async showAllTables() { return [...tables]; },
    async createTable(name, definition) { tables.add(name); columns[name] = definition; indexes[name] = []; createdTables.push(name); },
    async showIndex(table) { return indexes[table] || []; },
    async addIndex(table, fields, options) { indexes[table].push({ fields, unique: options.unique }); },
  };

  await ensureAtencionClinicalLinks(queryInterface);
  await ensureAtencionClinicalLinks(queryInterface);

  assert.deepEqual(addedColumns.sort(), [
    "atenciones.proxima_cita_id",
    "citas.atencion_origen_id",
    "historia_diagnosticos.pieza",
    "planes_tratamiento.diagnostico_id",
    "planes_tratamiento.fecha_prevista",
    "planes_tratamiento.atencion_id",
    "periodontograma_mediciones.atencion_id",
    "procedimientos_realizados.plan_tratamiento_id",
  ].sort());
  assert.deepEqual(createdTables.sort(), ["atenciones_diagnosticos", "historia_diagnostico_cambios", "odontograma_cambios"].sort());
  assert.equal(indexes.atenciones_diagnosticos.length, 1);
  assert.equal(indexes.atenciones.length, 1);
  assert.equal(indexes.citas.length, 1);
  assert.equal(indexes.periodontograma_mediciones.length, 1);
  assert.equal(indexes.odontograma_cambios.length, 2);
});
