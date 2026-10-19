import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const ProcedimientoRealizado = sequelize.define("ProcedimientoRealizado", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false }, odontologo_id: { type: DataTypes.INTEGER, allowNull: false }, atencion_id: DataTypes.INTEGER, plan_tratamiento_id: DataTypes.INTEGER,
  pieza: DataTypes.STRING, codigo: DataTypes.STRING, descripcion: { type: DataTypes.TEXT, allowNull: false }, fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, observaciones: DataTypes.TEXT,
}, { tableName: "procedimientos_realizados", timestamps: true, createdAt: "creado_en", updatedAt: "actualizado_en" });
export default ProcedimientoRealizado;
