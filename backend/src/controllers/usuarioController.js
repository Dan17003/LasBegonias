import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { Usuario, sequelize } from "../models/index.js";

const ROLES_STAFF = ["admin", "recepcionista", "odontologo"];

const esRolStaff = (rol) => ROLES_STAFF.includes(rol?.toLowerCase());

const whereStaff = {
  [Op.and]: sequelize.where(
    sequelize.fn("lower", sequelize.col("rol")),
    { [Op.in]: ROLES_STAFF }
  ),
};

const PERMISOS_POR_ROL = {
  admin: ["inicio", "usuarios", "doctores", "reportes"],
  recepcionista: ["inicio", "pacientes", "agenda", "finanzas"],
  odontologo: ["inicio", "agenda"],
};

const sinPassword = (usuario) => {
  const data = usuario.toJSON();
  delete data.password;
  return data;
};

export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      where: whereStaff,
      order: [["id", "ASC"]],
    });
    res.json(usuarios.map(sinPassword));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol, permisos, activo } = req.body;

    if (!email || !password || !rol) {
      return res.status(400).json({ error: "Email, contraseña y rol son obligatorios" });
    }

    const rolNormalizado = rol.toLowerCase();

    if (!ROLES_STAFF.includes(rolNormalizado)) {
      return res.status(400).json({ error: "Rol no válido" });
    }

    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    const hash = await bcrypt.hash(password, 10);
    const permisosFinales = permisos?.length ? permisos : PERMISOS_POR_ROL[rolNormalizado];

    const usuario = await Usuario.create({
      nombre: nombre || email.split("@")[0],
      email,
      password: hash,
      rol: rolNormalizado,
      permisos: permisosFinales,
      activo: activo !== false,
    });

    res.status(201).json({
      message: "Usuario creado correctamente",
      user: sinPassword(usuario),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario || !esRolStaff(usuario.rol)) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const { nombre, email, password, rol, permisos, activo } = req.body;
    const datos = {};

    if (nombre !== undefined) datos.nombre = nombre;
    if (email !== undefined) {
      const duplicado = await Usuario.findOne({ where: { email } });
      if (duplicado && duplicado.id !== usuario.id) {
        return res.status(400).json({ error: "El correo ya está en uso" });
      }
      datos.email = email;
    }
    if (rol !== undefined) {
      const rolNormalizado = rol.toLowerCase();
      if (!ROLES_STAFF.includes(rolNormalizado)) {
        return res.status(400).json({ error: "Rol no válido" });
      }
      datos.rol = rolNormalizado;
    }
    if (permisos !== undefined) datos.permisos = permisos;
    if (activo !== undefined) datos.activo = activo;
    if (password) datos.password = await bcrypt.hash(password, 10);

    await usuario.update(datos);
    res.json({ message: "Usuario actualizado", user: sinPassword(usuario) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario || !esRolStaff(usuario.rol)) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (req.user?.id === usuario.id) {
      return res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
    }

    await usuario.destroy();
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerPermisosDisponibles = async (_req, res) => {
  res.json({
    permisos: [
      { id: "inicio", label: "Inicio" },
      { id: "pacientes", label: "Pacientes" },
      { id: "agenda", label: "Agenda" },
      { id: "finanzas", label: "Finanzas" },
      { id: "doctores", label: "Doctores" },
      { id: "usuarios", label: "Usuarios" },
      { id: "reportes", label: "Reportes" },
    ],
    roles: [
      { id: "admin", label: "Administrador" },
      { id: "recepcionista", label: "Recepcionista" },
      { id: "odontologo", label: "Odontólogo" },
    ],
    permisosPorRol: PERMISOS_POR_ROL,
  });
};
