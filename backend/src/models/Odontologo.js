import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Odontologo = sequelize.define(
  "Odontologo",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    especialidad: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    turno: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    disponible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    colegiatura: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "odontologos",
    timestamps: false,
  }
);

export default Odontologo;
