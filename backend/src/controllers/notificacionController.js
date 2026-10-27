import { Notificacion, Paciente, Cita } from "../models/index.js";

export const listarNotificaciones = async (req, res) => {
  try {
    const notificaciones = await Notificacion.findAll({
      where: { usuario_id: req.user.id },
      include: [
        { model: Paciente, attributes: ["id", "nombres", "apellidos", "email"] },
        { model: Cita },
      ],
      order: [["creado_en", "DESC"]],
      limit: 100,
    });

    res.json(notificaciones);
  } catch (error) {
    console.error("Staff notifications read failed:", error);
    res.status(500).json({ error: "No se pudieron cargar las notificaciones." });
  }
};

export const marcarNotificacionLeida = async (req, res) => {
  try {
    const notificacion = await Notificacion.findOne({
      where: { id: req.params.id, usuario_id: req.user.id },
    });

    if (!notificacion) {
      return res.status(404).json({ error: "Notificacion no encontrada" });
    }

    await notificacion.update({ leida: true });
    res.json(notificacion);
  } catch (error) {
    console.error("Staff notification update failed:", error);
    res.status(500).json({ error: "No se pudo actualizar la notificación." });
  }
};

export const marcarTodasLeidas = async (req, res) => {
  try {
    await Notificacion.update(
      { leida: true },
      { where: { leida: false, usuario_id: req.user.id } },
    );
    res.json({ message: "Notificaciones marcadas como leidas" });
  } catch (error) {
    console.error("Staff notification update failed:", error);
    res.status(500).json({ error: "No se pudieron actualizar las notificaciones." });
  }
};
