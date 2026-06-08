import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Presupuesto = sequelize.define(
  "Presupuesto",
  {
    paciente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    fecha_vigencia: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    doctor: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    estado: {
      type: DataTypes.STRING,
      defaultValue: "Activo",
    },
  },
  {
    tableName: "presupuestos",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Presupuesto;
