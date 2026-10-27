import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import {
  PasswordResetToken,
  Usuario,
  sequelize,
} from "../models/index.js";
import {
  restablecerContrasena,
  solicitarRestablecimientoContrasena,
} from "./authController.js";

const crearRespuesta = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("password reset request returns a generic response for an unknown email", async () => {
  const originalUserFindOne = Usuario.findOne;
  const originalSmtp = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
  };
  Usuario.findOne = async () => null;
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "sender@example.test";
  process.env.SMTP_PASS = "test-password";

  try {
    const res = crearRespuesta();
    await solicitarRestablecimientoContrasena({ body: { email: "unknown@example.test" } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /Si existe una cuenta/);
  } finally {
    Usuario.findOne = originalUserFindOne;
    for (const [name, value] of Object.entries(originalSmtp)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("password reset consumes a valid token and stores a bcrypt hash", async () => {
  const originalTransaction = sequelize.transaction;
  const originalTokenFindOne = PasswordResetToken.findOne;
  const originalUserFindByPk = Usuario.findByPk;
  const token = "a".repeat(64);
  const priorPassword = await bcrypt.hash("old-password", 4);
  let savedPassword;
  let consumed = false;
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });
  PasswordResetToken.findOne = async (options) => {
    assert.ok(options.where.expires_at);
    assert.equal(options.lock, "UPDATE");
    return { usuario_id: 9, destroy: async () => { consumed = true; } };
  };
  Usuario.findByPk = async (_id, options) => {
    assert.equal(options.lock, "UPDATE");
    return {
      password: priorPassword,
      activo: true,
      save: async function save() { savedPassword = this.password; },
    };
  };

  try {
    const res = crearRespuesta();
    await restablecerContrasena({ body: { token, nuevaContrasena: "new-password-123" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(consumed, true);
    assert.notEqual(savedPassword, "new-password-123");
    assert.equal(await bcrypt.compare("new-password-123", savedPassword), true);
  } finally {
    sequelize.transaction = originalTransaction;
    PasswordResetToken.findOne = originalTokenFindOne;
    Usuario.findByPk = originalUserFindByPk;
  }
});
