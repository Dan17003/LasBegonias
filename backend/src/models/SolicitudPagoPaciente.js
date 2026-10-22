import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const SolicitudPagoPaciente = sequelize.define("SolicitudPagoPaciente", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false },
  presupuesto_id: { type: DataTypes.INTEGER, allowNull: true },
  monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  fecha_declarada: { type: DataTypes.DATEONLY, allowNull: false },
  metodo: {
    type: DataTypes.ENUM("efectivo", "tarjeta", "transferencia", "cheque"),
    allowNull: false,
  },
  referencia: { type: DataTypes.STRING(160), allowNull: true },
  estado: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "Pendiente de verificación" },
}, {
  tableName: "solicitudes_pago_paciente",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: "actualizado_en",
});

export default SolicitudPagoPaciente;
