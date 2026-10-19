import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const HistoriaDiagnostico = sequelize.define("HistoriaDiagnostico", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false }, odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  codigo: DataTypes.STRING, descripcion: { type: DataTypes.TEXT, allowNull: false }, tipo: { type: DataTypes.STRING, defaultValue: "clinico" }, estado: { type: DataTypes.STRING, defaultValue: "activo" }, pieza: DataTypes.STRING, notas: DataTypes.TEXT,
}, { tableName: "historia_diagnosticos", timestamps: true, createdAt: "creado_en", updatedAt: "actualizado_en" });
export default HistoriaDiagnostico;
