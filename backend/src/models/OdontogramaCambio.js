import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const OdontogramaCambio = sequelize.define("OdontogramaCambio", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false },
  atencion_id: { type: DataTypes.INTEGER, allowNull: true },
  odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  pieza: { type: DataTypes.STRING, allowNull: false },
  estado_anterior: DataTypes.STRING,
  notas_anteriores: DataTypes.TEXT,
  estado_nuevo: { type: DataTypes.STRING, allowNull: false },
  notas_nuevas: DataTypes.TEXT,
}, {
  tableName: "odontograma_cambios",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: false,
});

export default OdontogramaCambio;
