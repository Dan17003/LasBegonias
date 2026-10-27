import { DataTypes } from "sequelize";

export const ensureNotificacionUsuario = async (queryInterface) => {
  const table = await queryInterface.describeTable("notificaciones");
  if (table.usuario_id) return false;

  await queryInterface.addColumn("notificaciones", "usuario_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "usuarios",
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  await queryInterface.addIndex("notificaciones", ["usuario_id"]);
  return true;
};
