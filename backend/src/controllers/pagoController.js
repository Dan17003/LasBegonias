import { Pago, Paciente, Presupuesto } from "../models/index.js";

export const crearPago = async (req, res) => {
  try {
    const { paciente_id, presupuesto_id } = req.body;

    if (presupuesto_id) {
      const presupuesto = await Presupuesto.findByPk(presupuesto_id);
      if (!presupuesto) {
        return res.status(404).json({ error: "Presupuesto no encontrado" });
      }
      if (presupuesto.paciente_id !== Number(paciente_id)) {
        return res.status(400).json({
          error: "El presupuesto no pertenece al paciente seleccionado",
        });
      }
    }

    const pago = await Pago.create(req.body);
    res.status(201).json(pago);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const listarPagos = async (req, res) => {
  try {
    const pagos = await Pago.findAll({
      include: [
        {
          model: Paciente,
          attributes: ["id", "nombres", "apellidos"],
        },
        {
          model: Presupuesto,
          attributes: ["id", "descripcion", "monto"],
        },
      ],
      order: [["created_at", "DESC"]],
    });
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerPago = async (req, res) => {
  try {
    const pago = await Pago.findByPk(req.params.id, {
      include: [
        {
          model: Paciente,
          attributes: ["id", "nombres", "apellidos"],
        },
      ],
    });
    if (!pago) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }
    res.json(pago);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPago = async (req, res) => {
  try {
    const pago = await Pago.findByPk(req.params.id);
    if (!pago) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const { paciente_id, presupuesto_id } = req.body;

    if (presupuesto_id) {
      const presupuesto = await Presupuesto.findByPk(presupuesto_id);
      if (!presupuesto) {
        return res.status(404).json({ error: "Presupuesto no encontrado" });
      }
      if (presupuesto.paciente_id !== Number(paciente_id ?? pago.paciente_id)) {
        return res.status(400).json({
          error: "El presupuesto no pertenece al paciente seleccionado",
        });
      }
    }

    await pago.update(req.body);
    res.json(pago);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const eliminarPago = async (req, res) => {
  try {
    const pago = await Pago.findByPk(req.params.id);
    if (!pago) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }
    await pago.destroy();
    res.json({ message: "Pago eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerPagosPorPaciente = async (req, res) => {
  try {
    const pagos = await Pago.findAll({
      where: { paciente_id: req.params.paciente_id },
      order: [["created_at", "DESC"]],
    });
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
