import { Cita, Paciente } from "../models/index.js";

export const crearCita = async (req, res) => {
  try {
    const cita = await Cita.create(req.body);
    res.status(201).json(cita);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const listarCitas = async (req, res) => {
  try {
    const citas = await Cita.findAll({
      include: [{ model: Paciente }],
      order: [["fecha", "ASC"], ["hora_inicio", "ASC"]],
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarCita = async (req, res) => {
  try {
    const cita = await Cita.findByPk(req.params.id);
    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }
    await cita.update(req.body);
    res.json(cita);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const eliminarCita = async (req, res) => {
  try {
    const cita = await Cita.findByPk(req.params.id);
    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }
    await cita.destroy();
    res.json({ message: "Cita eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
