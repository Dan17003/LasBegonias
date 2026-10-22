import { DataTypes } from "sequelize";

export const ensureDocumentoPacienteVisibility = async (queryInterface) => {
  const table = await queryInterface.describeTable("documentos_clinicos");
  if (table.visible_para_paciente) return false;

  await queryInterface.addColumn("documentos_clinicos", "visible_para_paciente", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
  return true;
};
