import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const HistoriaAntecedenteCambio = sequelize.define("HistoriaAntecedenteCambio", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  rol: { type: DataTypes.STRING, allowNull: false },
  campos_modificados: { type: DataTypes.JSONB, allowNull: false },
  antes: { type: DataTypes.JSONB, allowNull: false },
  despues: { type: DataTypes.JSONB, allowNull: false },
  confirmado_en: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: "historia_antecedente_cambios",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: false,
});

export default HistoriaAntecedenteCambio;
