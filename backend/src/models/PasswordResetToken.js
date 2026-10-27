import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const PasswordResetToken = sequelize.define("PasswordResetToken", {
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  token_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "password_reset_tokens",
  timestamps: false,
});

export default PasswordResetToken;
