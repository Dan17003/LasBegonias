import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const AntecedenteOdontologico = sequelize.define("AntecedenteOdontologico", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false }, odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING, allowNull: false }, descripcion: { type: DataTypes.TEXT, allowNull: false }, fecha: DataTypes.DATEONLY,
}, { tableName: "antecedentes_odontologicos", timestamps: true, createdAt: "creado_en", updatedAt: "actualizado_en" });
export default AntecedenteOdontologico;
