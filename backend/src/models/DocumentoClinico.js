import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
const DocumentoClinico = sequelize.define("DocumentoClinico", {
  paciente_id: { type: DataTypes.INTEGER, allowNull: false }, odontologo_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING, allowNull: false }, nombre: { type: DataTypes.STRING, allowNull: false }, url: DataTypes.STRING, mime_type: DataTypes.STRING, tamano: DataTypes.INTEGER, descripcion: DataTypes.TEXT, fecha_documento: DataTypes.DATEONLY,
  visible_para_paciente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: "documentos_clinicos", timestamps: true, createdAt: "creado_en", updatedAt: "actualizado_en" });
export default DocumentoClinico;
