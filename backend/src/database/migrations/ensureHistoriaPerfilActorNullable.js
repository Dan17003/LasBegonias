import { DataTypes } from "sequelize";

export const ensureHistoriaPerfilActorNullable = async (queryInterface) => {
  const table = await queryInterface.describeTable("historias_clinicas_perfiles");
  for (const column of ["creado_por", "actualizado_por"]) {
    if (table[column] && !table[column].allowNull) {
      await queryInterface.changeColumn("historias_clinicas_perfiles", column, {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }
  }
};
