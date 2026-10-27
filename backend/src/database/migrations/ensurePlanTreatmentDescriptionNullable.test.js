import test from "node:test";
import assert from "node:assert/strict";
import { ensurePlanTreatmentDescriptionNullable } from "./ensurePlanTreatmentDescriptionNullable.js";

test("makes treatment plan description optional for existing installations", async () => {
  const changes = [];
  let nullable = false;
  const queryInterface = {
    describeTable: async () => ({
      descripcion: { allowNull: nullable },
    }),
    changeColumn: async (table, column, definition) => {
      changes.push({ table, column, definition });
      nullable = definition.allowNull;
    },
  };

  assert.equal(await ensurePlanTreatmentDescriptionNullable(queryInterface), true);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].table, "planes_tratamiento");
  assert.equal(changes[0].column, "descripcion");
  assert.equal(changes[0].definition.allowNull, true);
  assert.equal(await ensurePlanTreatmentDescriptionNullable(queryInterface), false);
  assert.equal(changes.length, 1);
});
