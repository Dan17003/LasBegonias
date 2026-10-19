import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const AtencionDiagnostico = sequelize.define("AtencionDiagnostico", {
  atencion_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  diagnostico_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
}, {
  tableName: "atenciones_diagnosticos",
  timestamps: false,
  noPrimaryKey: true,
  indexes: [{ unique: true, fields: ["atencion_id", "diagnostico_id"] }],
});

export default AtencionDiagnostico;
