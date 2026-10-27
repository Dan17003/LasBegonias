import test from "node:test";
import assert from "node:assert/strict";
import { ensureAtencionPatientVisibility } from "./ensureAtencionPatientVisibility.js";

test("adds patient evolution visibility once and defaults existing attentions to private", async () => {
  let columnAdded;
  let hasColumn = false;
  const queryInterface = {
    describeTable: async () => hasColumn ? { evolucion_visible_para_paciente: {} } : {},
    addColumn: async (table, column, definition) => {
      columnAdded = { table, column, definition };
      hasColumn = true;
    },
  };

  assert.equal(await ensureAtencionPatientVisibility(queryInterface), true);
  assert.equal(columnAdded.table, "atenciones");
  assert.equal(columnAdded.definition.defaultValue, false);
  assert.equal(columnAdded.definition.allowNull, false);
  assert.equal(await ensureAtencionPatientVisibility(queryInterface), false);
});
