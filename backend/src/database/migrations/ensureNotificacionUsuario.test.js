import test from "node:test";
import assert from "node:assert/strict";
import { ensureNotificacionUsuario } from "./ensureNotificacionUsuario.js";

test("adds nullable notification recipient column and index once", async () => {
  let columnAdded;
  let indexAdded;
  let hasRecipientColumn = false;
  const queryInterface = {
    describeTable: async () => hasRecipientColumn ? { usuario_id: {} } : {},
    addColumn: async (table, column, definition) => {
      columnAdded = { table, column, definition };
      hasRecipientColumn = true;
    },
    addIndex: async (table, columns) => {
      indexAdded = { table, columns };
    },
  };

  assert.equal(await ensureNotificacionUsuario(queryInterface), true);
  assert.equal(columnAdded.table, "notificaciones");
  assert.equal(columnAdded.column, "usuario_id");
  assert.equal(columnAdded.definition.allowNull, true);
  assert.equal(columnAdded.definition.references.model, "usuarios");
  assert.deepEqual(indexAdded, { table: "notificaciones", columns: ["usuario_id"] });
  assert.equal(await ensureNotificacionUsuario(queryInterface), false);
});
