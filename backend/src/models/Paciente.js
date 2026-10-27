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
      validate: {
        isEmail: true,
      },
    },

    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
    },

    sexo: {
      type: DataTypes.STRING,
    },
    direccion: {
      type: DataTypes.STRING,
    },
    distrito: {
      type: DataTypes.STRING,
    },
    ocupacion: {
      type: DataTypes.STRING,
    },
    estado_civil: {
      type: DataTypes.STRING,
    },
    contacto_emergencia: {
      type: DataTypes.STRING,
    },
    telefono_emergencia: {
      type: DataTypes.STRING,
    },
    parentesco_emergencia: {
      type: DataTypes.STRING,
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "pacientes",
    timestamps: false,
  }
);

export default Paciente;
