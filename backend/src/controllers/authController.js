import { sequelize, Usuario, Paciente } from "../models/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { obtenerJwtSecret } from "../config/security.js";
import { esEmailValido } from "../utils/email.js";
import crypto from "node:crypto";
import { Op } from "sequelize";
import { PasswordResetToken } from "../models/index.js";
import { enviarCorreo, estaConfiguradoCorreo } from "../services/emailService.js";

const RESPUESTA_RECUPERACION =
  "Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer la contraseña.";

const hashTokenRecuperacion = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const obtenerUrlRestablecimiento = (token) => {
  const esProduccion = process.env.NODE_ENV === "production";
  const configurada = process.env.PUBLIC_FRONTEND_URL ||
    (!esProduccion ? "http://localhost:5173" : "");
  if (!configurada) throw new Error("PUBLIC_FRONTEND_URL is not configured.");
  const url = new URL(configurada);
  const localHttp = url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname) &&
    !esProduccion;
  if ((!localHttp && url.protocol !== "https:") || url.username || url.password) {
    throw new Error("PUBLIC_FRONTEND_URL must be HTTPS outside local development.");
  }
  url.searchParams.set("resetToken", token);
  url.hash = "";
  return url.toString();
};

const PERMISOS_POR_ROL = {
  admin: ["inicio", "usuarios", "doctores", "reportes"],
  recepcionista: ["inicio", "pacientes", "agenda", "finanzas"],
  odontologo: ["inicio", "agenda", "perfil", "mis-pacientes"],
  paciente: ["perfil-paciente", "citas-paciente", "documentos-paciente", "finanzas-paciente", "chat-paciente"],
}; 

// ==========================
// 🔐 LOGIN GENERAL
// ==========================
export const login = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const { password } = req.body;

    const user = await Usuario.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: "No existe" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Incorrecto" });
    }

    if (user.activo === false) {
      return res.status(403).json({ error: "Tu cuenta está suspendida. Contacta al administrador." });
    }

    const rolNormalizado = user.rol?.toLowerCase();
    const permisosPersonalizados = Array.isArray(user.permisos) && user.permisos.length > 0
      ? user.permisos
      : null;
    const permisosBase = permisosPersonalizados || PERMISOS_POR_ROL[rolNormalizado] || [];
    const permisos = rolNormalizado === "odontologo"
      ? [...new Set([...permisosBase, "perfil"])]
      : permisosBase;

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      obtenerJwtSecret(),
      { expiresIn: "1d", algorithm: "HS256" }
    );

    res.json({
      message: "Login correcto",
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        permisos,
      },
    });

  } catch (error) {
    console.error("Login failed");
    res.status(500).json({ error: "No se pudo iniciar sesión en este momento." });
  }
};

export const solicitarRestablecimientoContrasena = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  let usuarioId;
  if (!esEmailValido(email)) {
    return res.status(400).json({ error: "Ingresa un correo electrónico válido." });
  }
  if (!estaConfiguradoCorreo()) {
    return res.status(503).json({
      error: "La recuperación por correo no está disponible ahora. Contacta a recepción para recuperar el acceso.",
    });
  }

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario || usuario.activo === false) {
      return res.json({ message: RESPUESTA_RECUPERACION });
    }
    usuarioId = usuario.id;

    const tokenExistente = await PasswordResetToken.findOne({
      where: { usuario_id: usuario.id },
    });
    if (tokenExistente && Date.now() - new Date(tokenExistente.created_at).getTime() < 60_000) {
      return res.json({ message: RESPUESTA_RECUPERACION });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await PasswordResetToken.destroy({ where: { usuario_id: usuario.id } });
    await PasswordResetToken.create({
      usuario_id: usuario.id,
      token_hash: hashTokenRecuperacion(token),
      expires_at: expiresAt,
      created_at: new Date(),
    });

    const resetUrl = obtenerUrlRestablecimiento(token);
    const resultadoCorreo = await enviarCorreo({
      to: usuario.email,
      subject: "Restablece tu contraseña - Clínica Las Begonias",
      text: `Recibimos una solicitud para restablecer la contraseña de tu cuenta. Abre este enlace en los próximos 15 minutos:\n\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este correo.`,
      html: `<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p><p><a href="${resetUrl}">Crear una nueva contraseña</a></p><p>El enlace vence en 15 minutos. Si no solicitaste este cambio, ignora este correo.</p>`,
    });
    if (!resultadoCorreo.enviado) {
      await PasswordResetToken.destroy({ where: { usuario_id: usuario.id } });
    }
    res.json({ message: RESPUESTA_RECUPERACION });
  } catch (error) {
    console.error("Password reset email request failed", { operation: "send-or-create-reset-token" });
    if (usuarioId) {
      await PasswordResetToken.destroy({ where: { usuario_id: usuarioId } }).catch(() => {
        console.error("Password reset token cleanup failed", { operation: "remove-unsent-token" });
      });
    }
    res.json({ message: RESPUESTA_RECUPERACION });
  }
};

export const restablecerContrasena = async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const nuevaContrasena = req.body?.nuevaContrasena;
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ error: "El enlace para restablecer la contraseña no es válido o ya venció." });
  }
  if (typeof nuevaContrasena !== "string" || nuevaContrasena.length < 8) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
  }

  try {
    const resultado = await sequelize.transaction(async (transaction) => {
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token_hash: hashTokenRecuperacion(token),
          expires_at: { [Op.gt]: new Date() },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!resetToken) return false;

      const usuario = await Usuario.findByPk(resetToken.usuario_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!usuario || usuario.activo === false) return false;

      usuario.password = await bcrypt.hash(nuevaContrasena, 10);
      await usuario.save({ transaction });
      await resetToken.destroy({ transaction });
      return true;
    });

    if (!resultado) {
      return res.status(400).json({ error: "El enlace para restablecer la contraseña no es válido o ya venció." });
    }
    res.json({ message: "Tu contraseña se restableció correctamente. Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Password reset failed", { operation: "update-password" });
    res.status(500).json({ error: "No se pudo restablecer la contraseña. Solicita un nuevo enlace." });
  }
};

// ==========================
// 🧍 REGISTRO PACIENTE
// ==========================
export const registerPaciente = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;
    const dni = String(req.body.dni || "").trim();
    const nombres = String(req.body.nombres || "").trim();
    const apellidos = String(req.body.apellidos || "").trim();

    if (!esEmailValido(email) || typeof password !== "string" || password.length < 8 ||
      !dni || !nombres) {
      return res.status(400).json({ error: "Ingrese email válido, contraseña de al menos 8 caracteres, DNI y nombres." });
    }

    if (await Usuario.findOne({ where: { email } })) {
      return res.status(409).json({ error: "El correo ya está registrado." });
    }

    const fichaExistente = await Paciente.findOne({ where: { dni } });
    if (fichaExistente?.usuario_id) {
      const cuentaVinculada = await Usuario.findByPk(fichaExistente.usuario_id, {
        attributes: ["id", "rol", "activo"],
      });
      if (!cuentaVinculada) {
        return res.status(409).json({ error: "La ficha requiere una revisión de recepción antes de crear el acceso." });
      }
      return res.status(409).json({
        error: "Este DNI ya está vinculado a una cuenta. Inicia sesión con el correo asociado; si no reconoces la cuenta o no puedes acceder, contacta a recepción en clinica.beg.2026@gmail.com para verificar tus datos.",
      });
    }
    if (fichaExistente && fichaExistente.email?.trim().toLowerCase() !== email) {
      return res.status(409).json({
        error: "El correo no coincide con el registrado en tu ficha. No se creó la cuenta. Contacta a recepción en clinica.beg.2026@gmail.com para verificar y actualizar tu correo; luego podrás volver a registrarte.",
      });
    }

    const hash = await bcrypt.hash(password, 10);
    await sequelize.transaction(async (transaction) => {
      const usuario = await Usuario.create({
        nombre: `${nombres} ${apellidos}`.trim(),
        email,
        password: hash,
        rol: "paciente",
        activo: true,
        permisos: PERMISOS_POR_ROL.paciente,
      }, { transaction });

      if (fichaExistente) {
        await fichaExistente.update({ usuario_id: usuario.id }, { transaction });
      } else {
        await Paciente.create({
          dni,
          nombres,
          apellidos: apellidos || null,
          email,
          usuario_id: usuario.id,
        }, { transaction });
      }
    });

    res.status(201).json({ message: "Cuenta creada correctamente. Ya puedes iniciar sesión." });

  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "El correo o el DNI ya están registrados." });
    }
    console.error("Patient registration failed:", error);
    res.status(500).json({ error: "No se pudo crear la cuenta del paciente." });
  }
};
