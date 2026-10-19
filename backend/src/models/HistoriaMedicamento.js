import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const HistoriaMedicamento = sequelize.define("HistoriaMedicamento", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false }, odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING, allowNull: false }, dosis: DataTypes.STRING, frecuencia: DataTypes.STRING,
  via: DataTypes.STRING, indicaciones: DataTypes.TEXT, activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "historia_medicamentos", timestamps: true, createdAt: "creado_en", updatedAt: "actualizado_en" });
export default HistoriaMedicamento;
