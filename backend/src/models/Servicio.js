import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Servicio = sequelize.define("Servicio", {
  nombre: { type: DataTypes.STRING(160), allowNull: false },
  categoria: { type: DataTypes.STRING(100), allowNull: false },
  subcategoria: { type: DataTypes.STRING(100), allowNull: false },
  precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
  moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "PEN" },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  creado_por: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: "servicios",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: "actualizado_en",
  indexes: [{ unique: true, fields: ["nombre", "categoria", "subcategoria"] }],
});

export default Servicio;
