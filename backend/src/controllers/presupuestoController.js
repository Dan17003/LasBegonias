import { Presupuesto, Paciente } from "../models/index.js";

export const crearPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.create(req.body);
    res.status(201).json(presupuesto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const listarPresupuestos = async (req, res) => {
  try {
    const presupuestos = await Presupuesto.findAll({
      include: [
        {
          model: Paciente,
          attributes: ["id", "nombres", "apellidos"],
        },
      ],
    });
    res.json(presupuestos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.findByPk(req.params.id, {
      include: [
        {
          model: Paciente,
          attributes: ["id", "nombres", "apellidos"],
        },
      ],
    });
    if (!presupuesto) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }
    res.json(presupuesto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.findByPk(req.params.id);
    if (!presupuesto) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }
    await presupuesto.update(req.body);
    res.json(presupuesto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const eliminarPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.findByPk(req.params.id);
    if (!presupuesto) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }
    await presupuesto.destroy();
    res.json({ mensaje: "Presupuesto eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
