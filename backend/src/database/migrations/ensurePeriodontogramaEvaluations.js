import { DataTypes } from "sequelize";

const COLUMNAS = {
  evaluacion_id: { type: DataTypes.UUID, allowNull: true },
  fecha_evaluacion: { type: DataTypes.DATEONLY, allowNull: true },
  margen_gingival: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
  placa: { type: DataTypes.BOOLEAN, allowNull: true },
  supuracion: { type: DataTypes.BOOLEAN, allowNull: true },
};

const claveIndice = (index) => (index.fields || [])
  .map((field) => typeof field === "string" ? field : field.attribute || field.name || field.field)
  .filter(Boolean)
  .sort()
  .join(",");

export const ensurePeriodontogramaEvaluations = async (queryInterface) => {
  const tableName = "periodontograma_mediciones";
  const table = await queryInterface.describeTable(tableName);
  for (const [column, definition] of Object.entries(COLUMNAS)) {
    if (!table[column]) await queryInterface.addColumn(tableName, column, definition);
  }
  if (table.profundidad_sondaje?.allowNull === false) {
    await queryInterface.changeColumn(tableName, "profundidad_sondaje", {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true,
    });
  }

  const indexes = await queryInterface.showIndex(tableName);
  const legacyUniqueIndex = indexes.find((index) =>
    index.unique && claveIndice(index) === "paciente_id,pieza,sitio",
  );
  if (legacyUniqueIndex) await queryInterface.removeIndex(tableName, legacyUniqueIndex.name);

  const evaluationIndex = indexes.find((index) =>
    index.unique && claveIndice(index) === "evaluacion_id,pieza,sitio",
  );
  if (!evaluationIndex) {
    await queryInterface.addIndex(tableName, ["evaluacion_id", "pieza", "sitio"], {
      unique: true,
      name: "periodontograma_evaluacion_pieza_sitio_uq",
    });
  }
};
