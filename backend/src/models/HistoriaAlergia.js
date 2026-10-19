import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const HistoriaAlergia = sequelize.define("HistoriaAlergia", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false }, odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  sustancia: { type: DataTypes.STRING, allowNull: false }, reaccion: DataTypes.TEXT, severidad: { type: DataTypes.STRING, defaultValue: "desconocida" },
}, { tableName: "historia_alergias", timestamps: true, createdAt: "creado_en", updatedAt: "actualizado_en" });
export default HistoriaAlergia;
