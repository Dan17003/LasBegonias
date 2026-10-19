import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const PeriodontogramaMedicion = sequelize.define("PeriodontogramaMedicion", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false }, odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  atencion_id: { type: DataTypes.INTEGER, allowNull: true },
  evaluacion_id: { type: DataTypes.UUID, allowNull: true }, fecha_evaluacion: { type: DataTypes.DATEONLY, allowNull: true },
  pieza: { type: DataTypes.STRING, allowNull: false }, sitio: { type: DataTypes.ENUM("vestibular_mesial", "vestibular_central", "vestibular_distal", "lingual_mesial", "lingual_central", "lingual_distal"), allowNull: false },
  profundidad_sondaje: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
  margen_gingival: DataTypes.DECIMAL(4, 1),
  nivel_insercion: DataTypes.DECIMAL(4, 1),
  sangrado: { type: DataTypes.BOOLEAN, allowNull: true },
  placa: DataTypes.BOOLEAN,
  supuracion: DataTypes.BOOLEAN,
  movilidad: DataTypes.INTEGER,
  furcacion: DataTypes.STRING,
  notas: DataTypes.TEXT,
}, {
  tableName: "periodontograma_mediciones",
  timestamps: true,
  createdAt: "creado_en",
  updatedAt: "actualizado_en",
});
export default PeriodontogramaMedicion;
