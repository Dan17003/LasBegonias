import { DataTypes } from "sequelize";

export const ensureConsentimientoEstado = async (queryInterface) => {
  const table = await queryInterface.describeTable("consentimientos_clinicos");
  if (table.estado) return false;

  await queryInterface.addColumn("consentimientos_clinicos", "estado", {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Pendiente",
  });
  return true;
};
