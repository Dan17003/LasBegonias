import { DataTypes } from "sequelize";

export const ensurePlanTreatmentDescriptionNullable = async (queryInterface) => {
  const table = await queryInterface.describeTable("planes_tratamiento");
  if (!table.descripcion || table.descripcion.allowNull) return false;

  await queryInterface.changeColumn("planes_tratamiento", "descripcion", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  return true;
};
