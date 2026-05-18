import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Usuario = sequelize.define("Usuario", {
  email: {
    type: DataTypes.STRING,
    unique: true,
  },
  password: DataTypes.STRING,
  rol: DataTypes.STRING,
}, {
  tableName: "usuarios",   
  timestamps: false        
});

export default Usuario;