import bcrypt from "bcrypt";
import { Odontologo, Usuario } from "../models/index.js";
import { normalizarOdontologo } from "../utils/texto.js";

export const listarOdontologos = async (req, res) => {
  try {
    const where = req.user?.rol?.toLowerCase() === "odontologo"
      ? { usuario_id: req.user.id }
      : undefined;
    const odontologos = await Odontologo.findAll({
      where,
      include: [{ model: Usuario, attributes: ["id", "nombre", "email", "activo", "rol"] }],
      order: [["id", "ASC"]],
    });
    res.json(odontologos.map((odontologo) => ({
      ...normalizarOdontologo(odontologo),
      usuario: odontologo.Usuario,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerPerfil = async (usuarioId) => {
  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario) return null;

  const odontologo = await Odontologo.findOne({ where: { usuario_id: usuarioId } });
  if (!odontologo) return { usuario, odontologo: null };

  return { usuario, odontologo };
};

export const obtenerPerfilOdontologo = async (req, res) => {
  try {
    const perfil = await obtenerPerfil(req.user.id);
    if (!perfil) return res.status(404).json({ error: "Usuario no encontrado" });
    if (!perfil.odontologo) return res.status(404).json({ error: "Tu usuario aún no tiene un perfil odontológico. Solicita al administrador que lo configure." });

    res.json({
      usuario: {
        id: perfil.usuario.id,
        nombre: perfil.usuario.nombre,
        email: perfil.usuario.email,
        rol: perfil.usuario.rol,
      },
      odontologo: normalizarOdontologo(perfil.odontologo),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPerfilOdontologo = async (req, res) => {
  try {
    const perfil = await obtenerPerfil(req.user.id);
    if (!perfil) return res.status(404).json({ error: "Usuario no encontrado" });
    if (!perfil.odontologo) return res.status(404).json({ error: "Tu usuario aún no tiene un perfil odontológico. Solicita al administrador que lo configure." });

    const { nombre, email, password, especialidad, turno, telefono, colegiatura, descripcion, disponible } = req.body;
    const datosUsuario = {};
    const datosOdontologo = {};

    if (nombre !== undefined) {
      if (!String(nombre).trim()) return res.status(400).json({ error: "El nombre es obligatorio" });
      datosUsuario.nombre = String(nombre).trim();
      datosOdontologo.nombre = String(nombre).trim();
    }
    if (email !== undefined) {
      const emailNormalizado = String(email).trim().toLowerCase();
      const duplicado = await Usuario.findOne({ where: { email: emailNormalizado } });
      if (duplicado && duplicado.id !== perfil.usuario.id) {
        return res.status(400).json({ error: "El correo ya está en uso" });
      }
      datosUsuario.email = emailNormalizado;
    }
    if (password) datosUsuario.password = await bcrypt.hash(password, 10);
    if (especialidad !== undefined) datosOdontologo.especialidad = String(especialidad).trim();
    if (turno !== undefined) datosOdontologo.turno = String(turno).trim();
    if (telefono !== undefined) datosOdontologo.telefono = String(telefono).trim();
    if (colegiatura !== undefined) datosOdontologo.colegiatura = String(colegiatura).trim();
    if (descripcion !== undefined) datosOdontologo.descripcion = String(descripcion).trim();
    if (disponible !== undefined) datosOdontologo.disponible = Boolean(disponible);

    await perfil.usuario.update(datosUsuario);
    await perfil.odontologo.update(datosOdontologo);

    res.json({
      message: "Perfil actualizado correctamente",
      usuario: {
        id: perfil.usuario.id,
        nombre: perfil.usuario.nombre,
        email: perfil.usuario.email,
        rol: perfil.usuario.rol,
      },
      odontologo: normalizarOdontologo(perfil.odontologo),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const crearOdontologo = async (req, res) => {
  try {
    const { usuario_id, especialidad, turno, disponible } = req.body;

    if (!usuario_id || !especialidad || !turno) {
      return res.status(400).json({ error: "Usuario, especialidad y turno son obligatorios" });
    }

    const usuario = await Usuario.findByPk(usuario_id);
    if (!usuario || usuario.rol?.toLowerCase() !== "odontologo") {
      return res.status(400).json({ error: "Debes seleccionar un usuario con rol odontólogo." });
    }
    const perfilExistente = await Odontologo.findOne({ where: { usuario_id } });
    if (perfilExistente) {
      return res.status(409).json({ error: "Este usuario ya tiene un perfil odontológico." });
    }

    const odontologo = await Odontologo.create({
      usuario_id,
      nombre: normalizarOdontologo({ nombre: usuario.nombre }).nombre,
      especialidad: normalizarOdontologo({ especialidad }).especialidad,
      turno: normalizarOdontologo({ turno }).turno,
      disponible: disponible !== false,
    });

    res.status(201).json(normalizarOdontologo(odontologo));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarOdontologo = async (req, res) => {
  try {
    const odontologo = await Odontologo.findByPk(req.params.id);

    if (!odontologo) {
      return res.status(404).json({ error: "Odontólogo no encontrado" });
    }

    const { usuario_id, especialidad, turno, disponible } = req.body;
    const datos = {};

    if (usuario_id !== undefined && usuario_id !== odontologo.usuario_id) {
      const usuario = await Usuario.findByPk(usuario_id);
      if (!usuario || usuario.rol?.toLowerCase() !== "odontologo") {
        return res.status(400).json({ error: "Debes seleccionar un usuario con rol odontólogo." });
      }
      const perfilExistente = await Odontologo.findOne({ where: { usuario_id } });
      if (perfilExistente && perfilExistente.id !== odontologo.id) {
        return res.status(409).json({ error: "Este usuario ya tiene un perfil odontológico." });
      }
      datos.usuario_id = usuario.id;
      datos.nombre = usuario.nombre;
    }
    if (especialidad !== undefined) datos.especialidad = normalizarOdontologo({ especialidad }).especialidad;
    if (turno !== undefined) datos.turno = normalizarOdontologo({ turno }).turno;
    if (disponible !== undefined) datos.disponible = disponible;

    await odontologo.update(datos);
    res.json(normalizarOdontologo(odontologo));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarOdontologo = async (req, res) => {
  try {
    const odontologo = await Odontologo.findByPk(req.params.id);

    if (!odontologo) {
      return res.status(404).json({ error: "Odontólogo no encontrado" });
    }

    await odontologo.destroy();
    res.json({ message: "Odontólogo eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
