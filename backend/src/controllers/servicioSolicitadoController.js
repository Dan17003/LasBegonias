import { Op } from "sequelize";
import { Cita, Odontologo, Paciente, Presupuesto, PresupuestoDetalle, Servicio, ServicioSolicitado } from "../models/index.js";
import { validarAccesoPaciente } from "./historiaController.js";

const esOdontologo = (req) => req.user?.rol?.toLowerCase() === "odontologo";
const idValido = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;

const validarRelacion = async (req, res) => {
  if (!esOdontologo(req)) {
    res.status(403).json({ error: "Solo un odontólogo puede gestionar solicitudes de servicios." });
    return null;
  }
  if (!idValido(req.params.id)) {
    res.status(400).json({ error: "Paciente no válido." });
    return null;
  }
  const acceso = await validarAccesoPaciente(req, Number(req.params.id));
  if (!acceso.odontologo) {
    res.status(403).json({ error: "No tienes acceso a este paciente." });
    return null;
  }
  if (!acceso.paciente) {
    res.status(404).json({ error: "Paciente no encontrado." });
    return null;
  }
  return acceso;
};

export const listarServiciosSolicitados = async (req, res) => {
  try {
    const acceso = await validarRelacion(req, res);
    if (!acceso) return;
    const solicitudes = await ServicioSolicitado.findAll({
      where: { paciente_id: acceso.paciente.id, odontologo_id: acceso.odontologo.id },
      attributes: [
        "id", "paciente_id", "odontologo_id", "cita_id", "servicio_id", "nombre", "cantidad",
        "comentario", "precio_unitario", "estado",
      ],
      include: [
        { model: Paciente, attributes: ["id", "nombres", "apellidos"] },
        { model: Odontologo, attributes: ["id", "nombre"] },
        { model: Cita, attributes: ["id", "fecha", "hora_inicio", "motivo"] },
      ],
      order: [["creado_en", "DESC"]],
    });
    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearServicioSolicitado = async (req, res) => {
  try {
    const acceso = await validarRelacion(req, res);
    if (!acceso) return;
    const cantidad = Number(req.body.cantidad);
    if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 10000) {
      return res.status(400).json({ error: "La cantidad debe ser un entero positivo." });
    }

    let servicio = null;
    if (req.body.servicio_id !== undefined && req.body.servicio_id !== null) {
      if (!idValido(req.body.servicio_id)) return res.status(400).json({ error: "servicio_id no válido." });
      servicio = await Servicio.findOne({ where: { id: Number(req.body.servicio_id), activo: true } });
      if (!servicio) return res.status(400).json({ error: "El servicio no existe o está deshabilitado." });
    } else if (typeof req.body.nombre !== "string" || !req.body.nombre.trim() || req.body.nombre.trim().length > 200) {
      return res.status(400).json({ error: "Especifica el nombre del servicio solicitado." });
    }
    if (req.body.comentario != null && (typeof req.body.comentario !== "string" || req.body.comentario.length > 2000)) {
      return res.status(400).json({ error: "El comentario no es válido." });
    }

    let cita = null;
    if (req.body.cita_id !== undefined && req.body.cita_id !== null && req.body.cita_id !== "") {
      if (!idValido(req.body.cita_id)) return res.status(400).json({ error: "cita_id no válido." });
      cita = await Cita.findOne({
        where: {
          id: Number(req.body.cita_id),
          paciente_id: acceso.paciente.id,
          [Op.or]: [
            { odontologo_id: acceso.odontologo.id },
            { doctor: acceso.odontologo.nombre },
          ],
        },
      });
      if (!cita) return res.status(400).json({ error: "La cita debe pertenecer a este paciente y odontólogo." });

      const presupuestos = await Presupuesto.findAll({ where: { cita_id: cita.id }, attributes: ["id"] });
      const presupuestoIds = presupuestos.map((presupuesto) => presupuesto.id);
      const servicioDuplicadoEnPresupuesto = presupuestoIds.length
        ? await PresupuestoDetalle.findOne({
          where: servicio
            ? { presupuesto_id: presupuestoIds, servicio_id: servicio.id }
            : { presupuesto_id: presupuestoIds, servicio_nombre: { [Op.iLike]: req.body.nombre.trim() } },
        })
        : null;
      const solicitudExistente = await ServicioSolicitado.findOne({
        where: servicio
          ? { cita_id: cita.id, servicio_id: servicio.id, estado: "pendiente" }
          : { cita_id: cita.id, servicio_id: null, nombre: { [Op.iLike]: req.body.nombre.trim() }, estado: "pendiente" },
      });
      if (servicioDuplicadoEnPresupuesto || solicitudExistente) {
        return res.status(409).json({ error: "Este servicio ya tiene una solicitud o presupuesto para esta cita." });
      }
    }

    const solicitud = await ServicioSolicitado.create({
      paciente_id: acceso.paciente.id,
      odontologo_id: acceso.odontologo.id,
      cita_id: cita?.id ?? null,
      servicio_id: servicio?.id ?? null,
      nombre: servicio?.nombre ?? req.body.nombre.trim(),
      categoria: servicio?.categoria ?? null,
      subcategoria: servicio?.subcategoria ?? null,
      precio_unitario: servicio?.precio ?? null,
      moneda: "PEN",
      cantidad,
      comentario: req.body.comentario?.trim() || null,
      estado: "pendiente",
    });
    const solicitudCompleta = await ServicioSolicitado.findByPk(solicitud.id, {
      attributes: [
        "id", "paciente_id", "odontologo_id", "cita_id", "servicio_id", "nombre", "cantidad",
        "comentario", "precio_unitario", "estado",
      ],
      include: [
        { model: Paciente, attributes: ["id", "nombres", "apellidos"] },
        { model: Odontologo, attributes: ["id", "nombre"] },
        { model: Cita, attributes: ["id", "fecha", "hora_inicio", "motivo"] },
      ],
    });
    res.status(201).json(solicitudCompleta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const retirarServicioSolicitado = async (req, res) => {
  try {
    const acceso = await validarRelacion(req, res);
    if (!acceso) return;
    if (!idValido(req.params.solicitudId)) return res.status(400).json({ error: "Solicitud no válida." });
    const solicitud = await ServicioSolicitado.findOne({
      where: {
        id: Number(req.params.solicitudId),
        paciente_id: acceso.paciente.id,
        odontologo_id: acceso.odontologo.id,
        estado: "pendiente",
      },
    });
    if (!solicitud) return res.status(404).json({ error: "Solicitud pendiente no encontrada." });
    await solicitud.destroy();
    res.json({ mensaje: "Solicitud retirada." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
