import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Odontologo = sequelize.define(
  "Odontologo",
  {
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
  },
  {
    tableName: "odontologos",
    timestamps: false,
  }
);

export default Odontologo;
