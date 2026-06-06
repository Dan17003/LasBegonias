import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Cita = sequelize.define(
  "Cita",
  {
    fecha: DataTypes.DATEONLY,
    hora: DataTypes.TIME,
    estado: DataTypes.STRING,
  },
  {
    tableName: "citas",
    timestamps: false,
  }
);

export default Cita;