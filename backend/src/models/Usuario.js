import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Usuario = sequelize.define("Usuario", {
  nombre: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    unique: true,
  },
  password: DataTypes.STRING,
  rol: DataTypes.STRING,
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  permisos: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
}, {
  tableName: "usuarios",   
  timestamps: false        
});

export default Usuario;