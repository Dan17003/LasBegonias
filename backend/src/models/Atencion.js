import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Atencion = sequelize.define(
  "Atencion",
  {
    paciente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    odontologo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cita_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    proxima_cita_id: { type: DataTypes.INTEGER, allowNull: true },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    hora: DataTypes.TIME,
    motivo_consulta: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    antecedentes: DataTypes.TEXT,
    evaluacion: DataTypes.TEXT,
    hallazgos: DataTypes.TEXT,
    diagnostico: DataTypes.TEXT,
    procedimiento: DataTypes.TEXT,
    tratamiento: DataTypes.TEXT,
    evolucion: DataTypes.TEXT,
    indicaciones: DataTypes.TEXT,
    proxima_cita: DataTypes.DATEONLY,
    observaciones: DataTypes.TEXT,
  },
  {
    tableName: "atenciones",
    timestamps: true,
    createdAt: "creado_en",
    updatedAt: "actualizado_en",
  }
);

export default Atencion;
