import { Usuario, Paciente } from "../models/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = "secreto"; // luego lo pasas a .env

// ==========================
// 🔐 LOGIN GENERAL
// ==========================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Usuario.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: "No existe" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Incorrecto" });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login correcto",
      token,
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ==========================
// 🧍 REGISTRO PACIENTE
// ==========================
export const registerPaciente = async (req, res) => {
  try {
    const { email, password, dni, nombres, telefono } = req.body;

    const existePaciente = await Paciente.findOne({ where: { dni } });
    if (existePaciente) {
      return res.status(400).json({ error: "DNI ya registrado" });
    }

    const hash = await bcrypt.hash(password, 10);

    const usuario = await Usuario.create({
      email,
      password: hash,
      rol: "paciente",
    });

    const paciente = await Paciente.create({
      dni,
      nombres,
      telefono,
      usuario_id: usuario.id,
    });

    res.json({
      message: "Paciente registrado",
      usuario,
      paciente,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ==========================
// 👨‍💼 CREAR USUARIOS (ADMIN)
// recepcionista / odontologo / admin
// ==========================
export const crearUsuario = async (req, res) => {
  try {
    const { email, password, rol } = req.body;

    const existe = await Usuario.findOne({ where: { email } });

    if (existe) {
      return res.status(400).json({ error: "Usuario ya existe" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await Usuario.create({
      email,
      password: hash,
      rol,
    });

    res.json({
      message: "Usuario creado correctamente",
      user,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};