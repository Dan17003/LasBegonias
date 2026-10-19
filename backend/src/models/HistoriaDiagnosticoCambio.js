import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const HistoriaDiagnosticoCambio = sequelize.define("HistoriaDiagnosticoCambio", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false },
  diagnostico_id: { type: DataTypes.INTEGER, allowNull: false },
  odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  estado_anterior: { type: DataTypes.STRING, allowNull: false },
  estado_nuevo: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: "historia_diagnostico_cambios",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: false,
});

export default HistoriaDiagnosticoCambio;
