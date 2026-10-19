import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Presupuesto = sequelize.define(
  "Presupuesto",
  {
    paciente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cita_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    origen: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "recepcion",
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
      allowNull: true,
    },

    doctor: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    titulo: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    nota_interna: {
      type: DataTypes.TEXT,
      allowNull: true,
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
