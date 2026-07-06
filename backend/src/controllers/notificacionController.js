import { Notificacion, Paciente, Cita } from "../models/index.js";

export const listarNotificaciones = async (req, res) => {
  try {
    const notificaciones = await Notificacion.findAll({
      include: [
        { model: Paciente, attributes: ["id", "nombres", "apellidos", "email"] },
        { model: Cita },
      ],
      order: [["creado_en", "DESC"]],
      limit: 100,
    });

    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const marcarNotificacionLeida = async (req, res) => {
  try {
    const notificacion = await Notificacion.findByPk(req.params.id);

    if (!notificacion) {
      return res.status(404).json({ error: "Notificacion no encontrada" });
    }

    await notificacion.update({ leida: true });
    res.json(notificacion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const marcarTodasLeidas = async (req, res) => {
  try {
    await Notificacion.update({ leida: true }, { where: { leida: false } });
    res.json({ message: "Notificaciones marcadas como leidas" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
