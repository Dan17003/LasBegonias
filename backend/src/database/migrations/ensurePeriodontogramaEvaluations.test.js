import assert from "node:assert/strict";
import test from "node:test";
import { ensurePeriodontogramaEvaluations } from "./ensurePeriodontogramaEvaluations.js";

test("amplía el esquema periodontal de forma idempotente y reemplaza el índice legado", async () => {
  const columns = {
    paciente_id: {},
    odontologo_id: {},
    pieza: {},
    sitio: {},
    profundidad_sondaje: { allowNull: false },
    nivel_insercion: {},
    sangrado: {},
    movilidad: {},
    furcacion: {},
    notas: {},
  };
  const indexes = [{
    name: "periodontograma_mediciones_paciente_id_pieza_sitio",
    unique: true,
    fields: ["paciente_id", "pieza", "sitio"],
  }];
  const queryInterface = {
    addColumnCalls: 0,
    addIndexCalls: 0,
    changeColumnCalls: 0,
    async describeTable() { return columns; },
    async addColumn(table, name, definition) {
      assert.equal(table, "periodontograma_mediciones");
      columns[name] = definition;
      this.addColumnCalls += 1;
    },
    async changeColumn(table, name, definition) {
      assert.equal(table, "periodontograma_mediciones");
      columns[name] = { ...definition };
      this.changeColumnCalls += 1;
    },
    async showIndex() { return [...indexes]; },
    async removeIndex(table, name) {
      assert.equal(table, "periodontograma_mediciones");
      const index = indexes.findIndex((item) => item.name === name);
      indexes.splice(index, 1);
    },
    async addIndex(table, fields, options) {
      assert.equal(table, "periodontograma_mediciones");
      indexes.push({ name: options.name, unique: options.unique, fields });
      this.addIndexCalls += 1;
    },
  };

  await ensurePeriodontogramaEvaluations(queryInterface);
  await ensurePeriodontogramaEvaluations(queryInterface);

  assert.deepEqual(
    ["evaluacion_id", "fecha_evaluacion", "margen_gingival", "placa", "supuracion"].filter((field) => !columns[field]),
    [],
  );
  assert.equal(indexes.some((index) => index.name === "periodontograma_mediciones_paciente_id_pieza_sitio"), false);
  assert.deepEqual(indexes.find((index) => index.unique)?.fields, ["evaluacion_id", "pieza", "sitio"]);
  assert.equal(queryInterface.addColumnCalls, 5);
  assert.equal(queryInterface.addIndexCalls, 1);
  assert.equal(queryInterface.changeColumnCalls, 1);
  assert.equal(columns.profundidad_sondaje.allowNull, true);
});
