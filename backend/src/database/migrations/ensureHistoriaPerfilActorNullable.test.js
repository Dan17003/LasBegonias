import test from "node:test";
import assert from "node:assert/strict";
import { ensureHistoriaPerfilActorNullable } from "./ensureHistoriaPerfilActorNullable.js";

test("makes history profile actor columns nullable for patient-created declarations", async () => {
  const changedColumns = [];
  const queryInterface = {
    describeTable: async () => ({
      creado_por: { allowNull: false },
      actualizado_por: { allowNull: false },
    }),
    changeColumn: async (table, column, definition) => changedColumns.push({ table, column, definition }),
  };

  await ensureHistoriaPerfilActorNullable(queryInterface);

  assert.deepEqual(changedColumns.map(({ column }) => column), ["creado_por", "actualizado_por"]);
  assert.ok(changedColumns.every(({ table, definition }) =>
    table === "historias_clinicas_perfiles" && definition.allowNull && definition.type.key === "INTEGER",
  ));
});
