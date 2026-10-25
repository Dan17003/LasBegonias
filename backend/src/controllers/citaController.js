import { Op } from "sequelize";
import { Atencion, Cita, Notificacion, Odontologo, Paciente, sequelize } from "../models/index.js";
import {
  crearConfirmacionCita,
  crearNotificacionCita,
  obtenerFechaLocalISO,
} from "../services/notificacionService.js";
import {
  generarTokenRespuesta,
  registrarRespuestaPaciente,
} from "../services/respuestaCitaService.js";
import { esEmailValido } from "../utils/email.js";

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const horaEnSegundos = (hora) => {
  const [horas, minutos, segundos = "0"] = hora.split(":");
  return Number(horas) * 3600 + Number(minutos) * 60 + Number(segundos);
};

const normalizarHora = (hora) => (hora.length === 5 ? `${hora}:00` : hora);

export const obtenerHoraFinCita = (horaInicio, horaFin) => {
  if (typeof horaInicio !== "string" || !FORMATO_HORA.test(horaInicio)) return null;
  const inicio = horaEnSegundos(horaInicio);
  if (horaFin) {
    if (
      typeof horaFin !== "string" ||
      !FORMATO_HORA.test(horaFin) ||
      horaEnSegundos(horaFin) <= inicio
    ) return null;
    return normalizarHora(horaFin);
  }
  const fin = inicio + 3600;
  if (fin >= 24 * 3600) return null;
  return `${String(Math.floor(fin / 3600)).padStart(2, "0")}:${String(Math.floor((fin % 3600) / 60)).padStart(2, "0")}:00`;
};

const buscarCitaMismoHorario = ({ fecha, horaInicio, odontologoId, doctor, excluirId, transaction }) =>
  Cita.findOne({
    where: {
      fecha,
      hora_inicio: normalizarHora(horaInicio),
      estado: { [Op.ne]: "Cancelada" },
      ...(excluirId ? { id: { [Op.ne]: excluirId } } : {}),
      [Op.or]: [
        ...(odontologoId ? [{ odontologo_id: odontologoId }] : []),
        { doctor },
      ],
    },
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });

const bloquearOdontologo = (odontologoId, transaction) => {
  if (!odontologoId) return Promise.resolve();
  return Odontologo.findByPk(odontologoId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
};

export const crearCita = async (req, res) => {
  try {
    const paciente = await Paciente.findByPk(req.body.paciente_id);

    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    if (!esEmailValido(paciente.email)) {
      return res.status(400).json({
        error: "El paciente debe tener un email valido para enviar la cita.",
      });
    }

    const datos = { ...req.body };
    delete datos.id;
    const rol = req.user?.rol?.toLowerCase();
    let odontologo;
    if (rol === "odontologo") {
      odontologo = await Odontologo.findOne({ where: { usuario_id: req.user.id } });
      if (!odontologo) return res.status(400).json({ error: "El usuario no tiene perfil odontológico." });
      datos.odontologo_id = odontologo.id;
      datos.doctor = odontologo.nombre;
    } else if (datos.odontologo_id) {
      odontologo = await Odontologo.findByPk(datos.odontologo_id);
      if (!odontologo) return res.status(400).json({ error: "Odontólogo no encontrado." });
      datos.doctor = odontologo.nombre;
    } else if (datos.doctor) {
      odontologo = await Odontologo.findOne({ where: { nombre: datos.doctor } });
      if (odontologo) datos.odontologo_id = odontologo.id;
    }

    const horaFin = obtenerHoraFinCita(datos.hora_inicio, datos.hora_fin);
    if (!horaFin) {
      return res.status(400).json({ error: "Indica una hora de inicio válida y una hora de fin posterior, si corresponde." });
    }
    datos.hora_inicio = normalizarHora(datos.hora_inicio);
    datos.hora_fin = horaFin;

    let atencionOrigen = null;
    if (req.body.atencion_origen_id !== undefined && req.body.atencion_origen_id !== null && req.body.atencion_origen_id !== "") {
      if (!/^\d+$/.test(String(req.body.atencion_origen_id))) {
        return res.status(400).json({ error: "La atención de seguimiento no es válida." });
      }
      atencionOrigen = await Atencion.findOne({
        where: {
          id: Number(req.body.atencion_origen_id),
          paciente_id: paciente.id,
          ...(odontologo ? { odontologo_id: odontologo.id } : {}),
        },
      });
      if (!odontologo) {
        return res.status(400).json({ error: "Selecciona al odontólogo responsable de la atención de seguimiento." });
      }
      if (!atencionOrigen) return res.status(400).json({ error: "La atención de seguimiento no pertenece a este paciente u odontólogo." });
      if (atencionOrigen.proxima_cita_id) {
        return res.status(409).json({ error: "Esta atención ya tiene una cita de seguimiento vinculada." });
      }
    }
    const resultado = await sequelize.transaction(async (transaction) => {
      await bloquearOdontologo(datos.odontologo_id, transaction);
      const citaExistente = await buscarCitaMismoHorario({
        fecha: datos.fecha,
        horaInicio: datos.hora_inicio,
        odontologoId: datos.odontologo_id,
        doctor: datos.doctor,
        transaction,
      });
      if (citaExistente) return { conflicto: true };
      const created = await Cita.create({
        ...datos,
        atencion_origen_id: atencionOrigen?.id || null,
        token_respuesta: generarTokenRespuesta(),
      }, { transaction });
      if (atencionOrigen) await atencionOrigen.update({ proxima_cita_id: created.id }, { transaction });
      return { cita: created };
    });
    if (resultado.conflicto) {
      return res.status(409).json({ error: "Ese odontólogo ya tiene una cita en la fecha y hora seleccionadas." });
    }
    const cita = resultado.cita;
    const citaConPaciente = await Cita.findByPk(cita.id, {
      include: [{ model: Paciente }],
    });

    await crearConfirmacionCita(citaConPaciente);

    if (citaConPaciente?.fecha === obtenerFechaLocalISO()) {
      await crearNotificacionCita(citaConPaciente, { enviarEmail: true });
    }

    res.status(201).json(citaConPaciente || cita);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Esta atención ya tiene una cita de seguimiento vinculada." });
    }
    res.status(400).json({ error: error.message });
  }
};

export const listarCitas = async (req, res) => {
  try {
    const where = {};
    if (req.user?.rol?.toLowerCase() === "odontologo") {
      const odontologo = await Odontologo.findOne({ where: { usuario_id: req.user.id } });
      if (!odontologo) return res.json([]);
      where[Op.or] = [
        { odontologo_id: odontologo.id },
        { doctor: odontologo.nombre },
      ];
    }
    const citas = await Cita.findAll({
      where,
      include: [{ model: Paciente }],
      order: [["fecha", "ASC"], ["hora_inicio", "ASC"]],
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const aprobarSolicitudCita = async (req, res) => {
  const citaId = Number(req.params.id);
  if (!Number.isSafeInteger(citaId) || citaId < 1) {
    return res.status(400).json({ error: "El identificador de la cita no es válido." });
  }

  try {
    const resultado = await sequelize.transaction(async (transaction) => {
      const solicitud = await Cita.findByPk(citaId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!solicitud) return { estado: "no-encontrada" };
      if (!["Solicitud de cita", "Solicitud de reprogramación"].includes(solicitud.estado)) {
        return { estado: "conflicto" };
      }

      await bloquearOdontologo(solicitud.odontologo_id, transaction);
      const citaExistente = await buscarCitaMismoHorario({
        fecha: solicitud.fecha,
        horaInicio: solicitud.hora_inicio,
        odontologoId: solicitud.odontologo_id,
        doctor: solicitud.doctor,
        excluirId: solicitud.id,
        transaction,
      });
      if (citaExistente) return { estado: "horario-ocupado" };

      await solicitud.update({
        estado: "Confirmada",
        token_respuesta: solicitud.token_respuesta || generarTokenRespuesta(),
      }, { transaction });
      await Notificacion.create({
        titulo: "Cita confirmada por la clínica",
        mensaje: `Tu cita para el ${String(solicitud.fecha).slice(0, 10)} a las ${String(solicitud.hora_inicio).slice(0, 5)} fue confirmada.`,
        tipo: "cita_confirmada_por_recepcion",
        canal: "app",
        paciente_id: solicitud.paciente_id,
        cita_id: solicitud.id,
        fecha_programada: solicitud.fecha,
      }, { transaction });

      return { estado: "aprobada", cita: solicitud };
    });

    if (resultado.estado === "no-encontrada") {
      return res.status(404).json({ error: "Cita no encontrada." });
    }
    if (resultado.estado === "conflicto") {
      return res.status(409).json({ error: "La solicitud ya fue atendida o no está pendiente." });
    }
    if (resultado.estado === "horario-ocupado") {
      return res.status(409).json({ error: "Ese odontólogo ya tiene una cita en la fecha y hora seleccionadas." });
    }
    res.json({ cita: resultado.cita, mensaje: "La solicitud fue aprobada y la cita quedó confirmada." });
  } catch (error) {
    console.error("Appointment request approval failed:", error);
    res.status(500).json({ error: "No se pudo aprobar la solicitud de cita." });
  }
};

export const actualizarCita = async (req, res) => {
  try {
    const cita = await Cita.findByPk(req.params.id);
    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }
    if (req.user?.rol?.toLowerCase() === "odontologo") {
      const odontologo = await Odontologo.findOne({ where: { usuario_id: req.user.id } });
      if (!odontologo || (cita.odontologo_id !== odontologo.id && cita.doctor !== odontologo.nombre)) {
        return res.status(403).json({ error: "No puedes modificar esta cita." });
      }
      if (
        ["Solicitud de cita", "Solicitud de reprogramación"].includes(cita.estado) &&
        req.body.estado === "Confirmada"
      ) {
        return res.status(403).json({ error: "La solicitud debe ser aprobada por recepción." });
      }
    }
    const datos = { ...req.body };
    delete datos.id;
    delete datos.atencion_origen_id;
    if (req.user?.rol?.toLowerCase() === "odontologo") {
      const odontologo = await Odontologo.findOne({ where: { usuario_id: req.user.id } });
      datos.odontologo_id = odontologo.id;
      datos.doctor = odontologo.nombre;
    }
    if (datos.odontologo_id) {
      const odontologo = await Odontologo.findByPk(datos.odontologo_id);
      if (!odontologo) return res.status(400).json({ error: "Odontólogo no encontrado." });
      datos.doctor = odontologo.nombre;
    }
    const fecha = datos.fecha || cita.fecha;
    const horaInicio = datos.hora_inicio || cita.hora_inicio;
    const horaFin = obtenerHoraFinCita(
      horaInicio,
      datos.hora_fin || (datos.hora_inicio ? "" : cita.hora_fin),
    );
    if (!horaFin) {
      return res.status(400).json({ error: "Indica una hora de inicio válida y una hora de fin posterior, si corresponde." });
    }
    const odontologoId = datos.odontologo_id ?? cita.odontologo_id;
    const doctor = datos.doctor || cita.doctor;
    datos.fecha = fecha;
    datos.hora_inicio = normalizarHora(horaInicio);
    datos.hora_fin = horaFin;
    datos.odontologo_id = odontologoId;
    datos.doctor = doctor;
    const resultado = await sequelize.transaction(async (transaction) => {
      await bloquearOdontologo(odontologoId, transaction);
      const citaExistente = await buscarCitaMismoHorario({
        fecha,
        horaInicio,
        odontologoId,
        doctor,
        excluirId: cita.id,
        transaction,
      });
      if (citaExistente) return false;
      await cita.update(datos, { transaction });
      return true;
    });
    if (!resultado) {
      return res.status(409).json({ error: "Ese odontólogo ya tiene una cita en la fecha y hora seleccionadas." });
    }
    const citaConPaciente = await Cita.findByPk(cita.id, {
      include: [{ model: Paciente }],
    });

    if (citaConPaciente?.fecha === obtenerFechaLocalISO()) {
      await crearNotificacionCita(citaConPaciente, { enviarEmail: true });
    }

    res.json(citaConPaciente || cita);
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
    if (req.user?.rol?.toLowerCase() === "odontologo") {
      const odontologo = await Odontologo.findOne({ where: { usuario_id: req.user.id } });
      if (!odontologo || (cita.odontologo_id !== odontologo.id && cita.doctor !== odontologo.nombre)) {
        return res.status(403).json({ error: "No puedes eliminar esta cita." });
      }
    }
    await cita.destroy();
    res.json({ message: "Cita eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const responderCita = async (req, res) => {
  try {
    const resultado = await registrarRespuestaPaciente({
      citaId: req.params.id,
      token: req.query.token,
      accion: req.query.accion,
    });

    res.status(resultado.status).send(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Respuesta de cita</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
            main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
            section { width: 100%; max-width: 460px; background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }
            h1 { margin: 0 0 10px; font-size: 22px; }
            p { margin: 0; color: #475569; line-height: 1.5; }
          </style>
        </head>
        <body>
          <main>
            <section>
              <h1>Clinica Las Begonias</h1>
              <p>${resultado.mensaje}</p>
            </section>
          </main>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send("No se pudo procesar la respuesta.");
  }
};
