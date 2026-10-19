import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const OdontogramaPieza = sequelize.define(
  "OdontogramaPieza",
  {
    paciente_id: { type: DataTypes.INTEGER, allowNull: false },
    pieza: { type: DataTypes.STRING, allowNull: false },
    estado: { type: DataTypes.STRING, allowNull: false, defaultValue: "sana" },
    notas: DataTypes.TEXT,
    actualizado_por: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "odontograma_piezas",
    timestamps: true,
    createdAt: "creado_en",
    updatedAt: "actualizado_en",
    indexes: [{ unique: true, fields: ["paciente_id", "pieza"] }],
  }
);

export default OdontogramaPieza;
