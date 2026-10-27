import { DataTypes } from "sequelize";

export const ensureAtencionPatientVisibility = async (queryInterface) => {
  const table = await queryInterface.describeTable("atenciones");
  if (table.evolucion_visible_para_paciente) return false;

  await queryInterface.addColumn("atenciones", "evolucion_visible_para_paciente", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
  return true;
};
