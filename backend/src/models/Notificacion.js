import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Notificacion = sequelize.define(
  "Notificacion",
  {
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    tipo: {
      type: DataTypes.STRING,
      defaultValue: "sistema",
    },

    canal: {
      type: DataTypes.STRING,
      defaultValue: "app",
    },

    leida: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    enviada_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    fecha_programada: {
      type: DataTypes.DATEONLY,
    },

    fecha_envio_email: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "notificaciones",
    timestamps: true,
    createdAt: "creado_en",
    updatedAt: "actualizado_en",
  }
);

export default Notificacion;
