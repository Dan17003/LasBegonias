import { DataTypes } from "sequelize";

const CAMPOS = {
  direccion: { type: DataTypes.STRING, allowNull: true },
  distrito: { type: DataTypes.STRING, allowNull: true },
  ocupacion: { type: DataTypes.STRING, allowNull: true },
  estado_civil: { type: DataTypes.STRING, allowNull: true },
  contacto_emergencia: { type: DataTypes.STRING, allowNull: true },
  telefono_emergencia: { type: DataTypes.STRING, allowNull: true },
  parentesco_emergencia: { type: DataTypes.STRING, allowNull: true },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
};

export const ensurePacientePerfilCampos = async (queryInterface) => {
  const table = await queryInterface.describeTable("pacientes");
  let agrego = false;

  for (const [campo, definicion] of Object.entries(CAMPOS)) {
    if (table[campo]) continue;
    await queryInterface.addColumn("pacientes", campo, definicion);
    agrego = true;
  }

  return agrego;
};
