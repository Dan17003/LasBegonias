import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const PresupuestoDetalle = sequelize.define("PresupuestoDetalle", {
  presupuesto_id: { type: DataTypes.INTEGER, allowNull: false },
  servicio_id: { type: DataTypes.INTEGER, allowNull: true },
  solicitud_id: { type: DataTypes.INTEGER, allowNull: true },
  servicio_nombre: { type: DataTypes.STRING(200), allowNull: false },
  categoria: { type: DataTypes.STRING(100), allowNull: true },
  subcategoria: { type: DataTypes.STRING(100), allowNull: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "PEN" },
  precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  descuento_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  comentario: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: "presupuesto_detalles",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: "actualizado_en",
});

export default PresupuestoDetalle;
