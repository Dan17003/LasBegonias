import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ServicioSolicitado = sequelize.define("ServicioSolicitado", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false },
  odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  cita_id: { type: DataTypes.INTEGER, allowNull: true },
  servicio_id: { type: DataTypes.INTEGER, allowNull: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  categoria: { type: DataTypes.STRING(100), allowNull: true },
  subcategoria: { type: DataTypes.STRING(100), allowNull: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "PEN" },
  comentario: { type: DataTypes.TEXT, allowNull: true },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pendiente" },
  presupuesto_detalle_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: "servicios_solicitados",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: "actualizado_en",
});

export default ServicioSolicitado;
