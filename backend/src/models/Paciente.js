import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Paciente = sequelize.define(
  "Paciente",
  {
    dni: {
      type: DataTypes.STRING,
      unique: true,
    },

    nombres: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    apellidos: {
      type: DataTypes.STRING,
    },

    telefono: {
      type: DataTypes.STRING,
    },

    email: {
      type: DataTypes.STRING,
    },

    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
    },

    sexo: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "pacientes",
    timestamps: false,
  }
);

export default Paciente;