import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Cita = sequelize.define(
  "Cita",
  {
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    hora_inicio: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    hora_fin: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    doctor: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    motivo: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    servicio: {
      type: DataTypes.STRING,
    },

    consultorio: {
      type: DataTypes.STRING,
    },

    nota_cita: {
      type: DataTypes.TEXT,
    },

    estado: {
      type: DataTypes.STRING,
      defaultValue: "Programada",
    },
  },
  {
    tableName: "citas",
    timestamps: false,
  }
);

export default Cita;