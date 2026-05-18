import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const Paciente = sequelize.define("Paciente", {
  dni: { type: DataTypes.STRING, unique: true },
  nombres: DataTypes.STRING,
  telefono: DataTypes.STRING,
}, {
  tableName: "pacientes",   
  timestamps: false
});
export default Paciente;