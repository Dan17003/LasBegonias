import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const HistoriaClinicaPerfil = sequelize.define("HistoriaClinicaPerfil", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  motivo: { type: DataTypes.TEXT, allowNull: true },
  motivo_tipo: DataTypes.STRING,
  motivo_descripcion: DataTypes.TEXT,
  antecedentes_medicos: { type: DataTypes.JSONB, defaultValue: {} },
  antecedentes_medicos_otros: DataTypes.TEXT,
  embarazo: DataTypes.STRING,
  examen_extraoral: { type: DataTypes.JSONB, defaultValue: {} },
  examen_intraoral: { type: DataTypes.JSONB, defaultValue: {} },
  antecedentes: { type: DataTypes.TEXT },
  examenes: { type: DataTypes.TEXT },
  creado_por: { type: DataTypes.INTEGER, allowNull: true },
  actualizado_por: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: "historias_clinicas_perfiles", timestamps: true, createdAt: "creado_en", updatedAt: "actualizado_en" });
export default HistoriaClinicaPerfil;
