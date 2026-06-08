import { Odontologo } from "../models/index.js";
import { normalizarOdontologo } from "../utils/texto.js";

export const listarOdontologos = async (_req, res) => {
  try {
    const odontologos = await Odontologo.findAll({ order: [["id", "ASC"]] });
    res.json(odontologos.map(normalizarOdontologo));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearOdontologo = async (req, res) => {
  try {
    const { nombre, especialidad, turno, disponible } = req.body;

    if (!nombre || !especialidad || !turno) {
      return res.status(400).json({ error: "Nombre, especialidad y turno son obligatorios" });
    }

    const odontologo = await Odontologo.create({
      nombre: normalizarOdontologo({ nombre }).nombre,
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

    const { nombre, especialidad, turno, disponible } = req.body;
    const datos = {};

    if (nombre !== undefined) datos.nombre = normalizarOdontologo({ nombre }).nombre;
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
