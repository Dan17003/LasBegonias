import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const PeriodontogramaEvaluacion = sequelize.define("PeriodontogramaEvaluacion", {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  paciente_id: { type: DataTypes.INTEGER, allowNull: false },
  odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  evaluacion_origen_id: { type: DataTypes.UUID, allowNull: true },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  estado: { type: DataTypes.STRING, allowNull: false, defaultValue: "borrador" },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  motivo_correccion: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: "periodontograma_evaluaciones",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: "actualizado_en",
});

export default PeriodontogramaEvaluacion;