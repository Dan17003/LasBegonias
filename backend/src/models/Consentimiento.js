import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const Consentimiento = sequelize.define("Consentimiento", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false }, odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING, allowNull: false }, estado: { type: DataTypes.STRING, allowNull: false, defaultValue: "Pendiente" }, firmado_en: DataTypes.DATE, observaciones: DataTypes.TEXT,
}, { tableName: "consentimientos_clinicos", timestamps: true, createdAt: "creado_en", updatedAt: "actualizado_en" });
export default Consentimiento;
