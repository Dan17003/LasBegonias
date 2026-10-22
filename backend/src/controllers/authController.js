import { sequelize, Usuario, Paciente } from "../models/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { obtenerJwtSecret } from "../config/security.js";
import { esEmailValido } from "../utils/email.js";

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
    const telefono = String(req.body.telefono || "").trim();

    if (!esEmailValido(email) || typeof password !== "string" || password.length < 8 ||
      !dni || !nombres) {
      return res.status(400).json({ error: "Ingrese email válido, contraseña de al menos 8 caracteres, DNI y nombres." });
    }

    if (await Usuario.findOne({ where: { email } })) {
      return res.status(409).json({ error: "El correo ya está registrado." });
    }

    const fichaExistente = await Paciente.findOne({ where: { dni } });
    if (fichaExistente?.usuario_id) {
      return res.status(409).json({ error: "Esta ficha ya tiene una cuenta vinculada." });
    }
    if (fichaExistente && fichaExistente.email?.trim().toLowerCase() !== email) {
      return res.status(409).json({ error: "El DNI existe, pero el correo no coincide con la ficha. Contacte a la clínica para verificar su identidad." });
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
          telefono: telefono || null,
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
