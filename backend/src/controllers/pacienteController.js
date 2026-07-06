import { Paciente } from "../models/index.js";
import { esEmailValido } from "../utils/email.js";

export const crearPaciente = async (req, res) => {
  try {
    if (!esEmailValido(req.body.email)) {
      return res.status(400).json({ error: "Ingrese un email valido." });
    }

    const paciente = await Paciente.create(req.body);
    res.status(201).json(paciente);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const listarPacientes = async (req, res) => {
  try {
    const pacientes = await Paciente.findAll();
    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPaciente = async (req, res) => {
  try {
    if (!esEmailValido(req.body.email)) {
      return res.status(400).json({ error: "Ingrese un email valido." });
    }

    const paciente = await Paciente.findByPk(req.params.id);

    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    await paciente.update(req.body);
    res.json(paciente);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const eliminarPaciente = async (req, res) => {
  try {
    const paciente = await Paciente.findByPk(req.params.id);

    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    await paciente.destroy();
    res.json({ message: "Paciente eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
