import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Pago = sequelize.define(
  "Pago",
  {
    paciente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    presupuesto_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    tipo_pago: {
      type: DataTypes.ENUM("pago_total", "pago_parcial", "adelanto"),
      defaultValue: "pago_total",
    },

    metodo: {
      type: DataTypes.ENUM("efectivo", "tarjeta", "transferencia", "cheque"),
      defaultValue: "efectivo",
    },

    doctor: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.TEXT,
    },

    numero_comprobante: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "pagos",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Pago;
