import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const PlanTratamiento = sequelize.define("PlanTratamiento", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false }, odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  atencion_id: { type: DataTypes.INTEGER, allowNull: true },
  diagnostico_id: DataTypes.INTEGER,
  titulo: { type: DataTypes.STRING, allowNull: false }, descripcion: { type: DataTypes.TEXT, allowNull: true }, estado: { type: DataTypes.STRING, defaultValue: "propuesto" }, prioridad: { type: DataTypes.STRING, defaultValue: "media" }, fecha_inicio: DataTypes.DATEONLY, fecha_prevista: DataTypes.DATEONLY, fecha_fin: DataTypes.DATEONLY,
}, { tableName: "planes_tratamiento", timestamps: true, createdAt: "creado_en", updatedAt: "actualizado_en" });
export default PlanTratamiento;
