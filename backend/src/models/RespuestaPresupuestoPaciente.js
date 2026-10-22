import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const RespuestaPresupuestoPaciente = sequelize.define("RespuestaPresupuestoPaciente", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false },
  presupuesto_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  respuesta: { type: DataTypes.ENUM("Aceptado", "Rechazado"), allowNull: false },
}, {
  tableName: "respuestas_presupuesto_paciente",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: false,
});

export default RespuestaPresupuestoPaciente;
