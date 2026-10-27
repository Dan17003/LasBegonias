import { Op } from "sequelize";
import bcrypt from "bcrypt";
import {
  Cita,
  DocumentoClinico,
  AntecedenteOdontologico,
  HistoriaAlergia,
  HistoriaAntecedenteCambio,
  HistoriaClinicaPerfil,
  HistoriaDiagnostico,
  HistoriaMedicamento,
  Notificacion,
  Atencion,
  Odontologo,
  Paciente,
  Pago,
  PlanTratamiento,
  ProcedimientoRealizado,
  Presupuesto,
  PresupuestoDetalle,
  Servicio,
  Usuario,
  sequelize,
} from "../models/index.js";
import { AiServiceError, responderConsultaPaciente } from "../services/odontologoAiService.js";
import { notificarPersonal } from "../services/notificacionPersonalService.js";

const CAMPOS_EDITABLES = [
  "nombres", "apellidos", "telefono", "email", "fecha_nacimiento", "sexo",
  "direccion", "distrito", "ocupacion", "estado_civil", "contacto_emergencia",
  "telefono_emergencia", "parentesco_emergencia",
];
const SERVICIOS_AUTOGESTIONABLES = new Set([
  "consulta",
  "consulta general",
  "consulta inicial",
  "limpieza",
  "limpieza dental",
  "profilaxis dental",
]);
const CAMPOS_PERFIL_PUBLICOS = [
  "id", "dni", "nombres", "apellidos", "telefono", "email", "fecha_nacimiento", "sexo",
  "direccion", "distrito", "ocupacion", "estado_civil", "contacto_emergencia",
  "telefono_emergencia", "parentesco_emergencia",
];
const horaLocal = () => {
  const fecha = new Date();
  return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
};
const fechaLocal = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};

const obtenerPacienteActual = (req) =>
  Paciente.findOne({ where: { usuario_id: req.user.id } });

const serializarPerfilPaciente = (paciente) =>
  Object.fromEntries(CAMPOS_PERFIL_PUBLICOS.map((campo) => [campo, paciente[campo]]));

const fechaISOValida = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const normalizarNombreServicio = (nombre) =>
  String(nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");

export const esServicioPacienteAutogestionable = (servicio) =>
  SERVICIOS_AUTOGESTIONABLES.has(normalizarNombreServicio(servicio?.nombre));

export const listarDisponibilidadPaciente = async (req, res) => {
  try {
    const fecha = req.query.fecha;
    const odontologoId = req.query.odontologo_id;
    if (!fechaISOValida(fecha) || fecha < fechaLocal()) {
      return res.status(400).json({ error: "Selecciona una fecha válida a partir de hoy." });
    }
    if (odontologoId && !/^\d+$/.test(String(odontologoId))) {
      return res.status(400).json({ error: "El odontólogo seleccionado no es válido." });
    }
    const slots = await obtenerDisponibilidad(fecha, odontologoId ? Number(odontologoId) : null);
    res.set("Cache-Control", "private, no-store");
    res.json({ fecha, slots });
  } catch (error) {
    console.error("Patient appointment availability read failed:", error);
    res.status(500).json({ error: "No se pudo consultar la disponibilidad." });
  }
};

const obtenerFin = (hora) => {
  const [horas, minutos] = hora.split(":").map(Number);
  const total = horas * 60 + minutos + 60;
  if (total >= 24 * 60) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00`;
};

const minutosDesdeHora = (hora) => {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
};

const minutosDesdeHoraTurno = (hora, meridiano) => {
  const [horasTexto, minutosTexto] = hora.split(":");
  let horas = Number(horasTexto);
  const minutos = Number(minutosTexto);
  if (horas < 1 || horas > 12 || minutos > 59) return null;
  if (meridiano.toUpperCase() === "PM" && horas !== 12) horas += 12;
  if (meridiano.toUpperCase() === "AM" && horas === 12) horas = 0;
  return horas * 60 + minutos;
};

const obtenerRangoTurno = (odontologo, fecha) => {
  const turno = String(odontologo.turno || "").trim();
  const esTurnoSabado = /^s[aá]bados?\b/i.test(turno);
  const diaSemana = new Date(`${fecha}T12:00:00.000Z`).getUTCDay();
  if (esTurnoSabado && diaSemana !== 6) return null;

  const horario = turno.match(/(\d{1,2}:\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);
  if (!horario) return null;
  const inicio = minutosDesdeHoraTurno(horario[1], horario[2]);
  const fin = minutosDesdeHoraTurno(horario[3], horario[4]);
  if (inicio === null || fin === null || fin <= inicio) return null;
  return { inicio, fin };
};

const obtenerDisponibilidad = async (fecha, odontologoId = null) => {
  const whereOdontologo = { disponible: true, ...(odontologoId ? { id: odontologoId } : {}) };
  const odontologos = await Odontologo.findAll({
    where: whereOdontologo,
    attributes: ["id", "nombre", "turno"],
    order: [["nombre", "ASC"]],
  });
  if (odontologos.length === 0) return [];

  const citas = await Cita.findAll({
    where: {
      fecha,
      [Op.or]: [
        { odontologo_id: odontologos.map((odontologo) => odontologo.id) },
        { doctor: odontologos.map((odontologo) => odontologo.nombre) },
      ],
      estado: { [Op.notIn]: ["Cancelada", "Atendida"] },
    },
    attributes: ["odontologo_id", "doctor", "hora_inicio", "hora_fin"],
  });
  const ahora = fecha === fechaLocal() ? minutosDesdeHora(horaLocal()) : -1;
  const slotsPorHora = new Map();

  for (const odontologo of odontologos) {
    const rango = obtenerRangoTurno(odontologo, fecha);
    if (!rango) continue;
    for (let inicio = rango.inicio; inicio + 60 <= rango.fin; inicio += 60) {
      if (inicio <= ahora) continue;
      const fin = inicio + 60;
      const ocupado = citas.some((cita) => {
        if (cita.odontologo_id !== odontologo.id && cita.doctor !== odontologo.nombre) return false;
        const citaInicio = minutosDesdeHora(String(cita.hora_inicio).slice(0, 5));
        const citaFin = minutosDesdeHora(String(cita.hora_fin).slice(0, 5));
        return inicio < citaFin && fin > citaInicio;
      });
      if (ocupado) continue;

      const horaInicio = `${String(Math.floor(inicio / 60)).padStart(2, "0")}:${String(inicio % 60).padStart(2, "0")}`;
      if (!slotsPorHora.has(horaInicio)) slotsPorHora.set(horaInicio, []);
      slotsPorHora.get(horaInicio).push({ id: odontologo.id, nombre: odontologo.nombre });
    }
  }

  return [...slotsPorHora.entries()]
    .sort(([horaA], [horaB]) => horaA.localeCompare(horaB))
    .map(([hora_inicio, disponibles]) => ({ hora_inicio, odontologos: disponibles }));
};

const crearNotificacionPaciente = (pacienteId, titulo, mensaje, citaId = null) =>
  Notificacion.create({
    paciente_id: pacienteId,
    cita_id: citaId,
    titulo,
    mensaje,
    tipo: "portal_paciente",
    canal: "app",
  });

export const obtenerPerfilPaciente = async (req, res) => {
  try {
    const [paciente, usuario] = await Promise.all([
      obtenerPacienteActual(req),
      Usuario.findByPk(req.user.id, { attributes: ["email"] }),
    ]);
    if (!paciente || !usuario) {
      return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    }
    res.set("Cache-Control", "private, no-store");
    res.json({ paciente: serializarPerfilPaciente(paciente), emailAcceso: usuario.email });
  } catch (error) {
    console.error("Patient profile read failed:", error);
    res.status(500).json({ error: "No se pudo cargar el perfil." });
  }
};

export const actualizarPerfilPaciente = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) return res.status(404).json({ error: "No se encontró la cuenta del paciente." });

    const cambios = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (Object.hasOwn(req.body, campo)) {
        const valor = req.body[campo];
        cambios[campo] = valor === null || String(valor).trim() === "" ? null : String(valor).trim();
      }
    }
    if (cambios.nombres !== undefined && !cambios.nombres) {
      return res.status(400).json({ error: "Los nombres son obligatorios." });
    }
    if (cambios.email !== undefined) {
      cambios.email = String(cambios.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cambios.email)) {
        return res.status(400).json({ error: "Ingresa un correo electrónico válido." });
      }
    }

    await sequelize.transaction(async (transaction) => {
      if (cambios.email && cambios.email !== String(usuario.email || "").toLowerCase()) {
        const usuarioConCorreo = await Usuario.findOne({
          where: { email: cambios.email },
          transaction,
        });
        if (usuarioConCorreo && usuarioConCorreo.id !== usuario.id) {
          const error = new Error("Ese correo electrónico ya está asociado a otra cuenta.");
          error.status = 409;
          throw error;
        }
      }

      await paciente.update(cambios, { transaction });
      await usuario.update({
        ...(cambios.email !== undefined ? { email: cambios.email } : {}),
        ...(cambios.nombres !== undefined || cambios.apellidos !== undefined
          ? { nombre: `${cambios.nombres ?? paciente.nombres} ${cambios.apellidos ?? paciente.apellidos ?? ""}`.trim() }
          : {}),
      }, { transaction });
    });
    res.set("Cache-Control", "private, no-store");
    res.json({
      paciente: serializarPerfilPaciente(paciente),
      emailAcceso: cambios.email ?? usuario.email,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError" || error.status === 409) {
      return res.status(409).json({ error: "Ese correo electrónico ya está asociado a otra cuenta." });
    }
    console.error("Patient profile update failed:", error);
    res.status(error.name === "SequelizeValidationError" ? 400 : 500).json({
      error: error.name === "SequelizeValidationError"
        ? "Verifique los datos ingresados."
        : "No se pudo actualizar el perfil.",
    });
  }
};

export const cambiarContrasenaPaciente = async (req, res) => {
  try {
    const { contrasenaActual, nuevaContrasena } = req.body || {};
    if (typeof contrasenaActual !== "string" || !contrasenaActual ||
      typeof nuevaContrasena !== "string" || nuevaContrasena.length < 8) {
      return res.status(400).json({ error: "Ingresa tu contraseña actual y una nueva contraseña de al menos 8 caracteres." });
    }

    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) return res.status(404).json({ error: "No se encontró la cuenta del paciente." });
    const coincide = await bcrypt.compare(contrasenaActual, usuario.password);
    if (!coincide) return res.status(400).json({ error: "La contraseña actual es incorrecta." });
    if (await bcrypt.compare(nuevaContrasena, usuario.password)) {
      return res.status(400).json({ error: "La nueva contraseña debe ser distinta a la actual." });
    }

    usuario.password = await bcrypt.hash(nuevaContrasena, 10);
    await usuario.save();
    res.json({ message: "La contraseña se actualizó correctamente." });
  } catch (error) {
    console.error("Patient password update failed:", error);
    res.status(500).json({ error: "No se pudo actualizar la contraseña." });
  }
};

export const listarCitasPaciente = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const citas = await Cita.findAll({
      where: { paciente_id: paciente.id },
      attributes: ["id", "odontologo_id", "fecha", "hora_inicio", "hora_fin", "doctor", "motivo", "servicio", "estado", "consultorio"],
      order: [["fecha", "DESC"], ["hora_inicio", "DESC"]],
    });
    res.set("Cache-Control", "private, no-store");
    res.json(citas);
  } catch (error) {
    console.error("Patient appointments read failed:", error);
    res.status(500).json({ error: "No se pudieron cargar las citas." });
  }
};

export const solicitarCitaPaciente = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const { fecha, hora_inicio: horaInicio, servicio_id: servicioId, odontologo_id: odontologoId } = req.body;
    if (!fechaISOValida(fecha) || fecha < fechaLocal() ||
      typeof horaInicio !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio)) {
      return res.status(400).json({ error: "Selecciona una fecha futura y una hora válida." });
    }
    const horaFin = obtenerFin(horaInicio);
    if (!horaFin) return res.status(400).json({ error: "La hora solicitada no es válida." });

    const servicio = await Servicio.findOne({ where: { id: servicioId, activo: true } });
    if (!servicio || !esServicioPacienteAutogestionable(servicio)) {
      return res.status(400).json({ error: "Solo puedes solicitar una cita para consulta o limpieza dental. Los demás tratamientos los agenda recepción después de la evaluación odontológica." });
    }

    const slots = await obtenerDisponibilidad(fecha, odontologoId || null);
    const slot = slots.find((opcion) => opcion.hora_inicio === horaInicio);
    if (!slot) return res.status(409).json({ error: "Ese horario ya no está disponible. Elige otro horario." });
    const odontologo = slot.odontologos[0];

    const cita = await Cita.create({
      paciente_id: paciente.id,
      odontologo_id: odontologo?.id || null,
      fecha,
      hora_inicio: `${horaInicio}:00`,
      hora_fin: horaFin,
      doctor: odontologo.nombre,
      motivo: servicio.nombre,
      servicio: servicio.nombre,
      estado: "Solicitud de cita",
    });
    await crearNotificacionPaciente(
      paciente.id,
      "Solicitud de cita recibida",
      `Recibimos tu solicitud para el ${fecha} a las ${horaInicio}. La clínica debe confirmar la disponibilidad.`,
      cita.id,
    );
    await notificarPersonal({
      titulo: "Nueva solicitud de cita",
      mensaje: `${paciente.nombres} ${paciente.apellidos || ""} solicitó ${servicio.nombre} para el ${fecha} a las ${horaInicio}.`,
      tipo: "solicitud_cita_paciente",
      pacienteId: paciente.id,
      citaId: cita.id,
      roles: ["recepcionista", "admin"],
      odontologoId: odontologo?.id,
    });
    res.status(201).json({
      cita,
      mensaje: "Solicitud enviada. La fecha y hora quedan pendientes de confirmación por la clínica.",
    });
  } catch (error) {
    console.error("Patient appointment request failed:", error);
    res.status(500).json({ error: "No se pudo enviar la solicitud de cita." });
  }
};

export const actualizarCitaPaciente = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const cita = await Cita.findOne({ where: { id: req.params.id, paciente_id: paciente.id } });
    if (!cita) return res.status(404).json({ error: "Cita no encontrada." });
    if (["Atendida", "Cancelada"].includes(cita.estado)) {
      return res.status(409).json({ error: "Esta cita ya no se puede modificar." });
    }

    const { accion, fecha, hora_inicio: horaInicio } = req.body;
    if (accion === "cancelar") {
      await cita.update({ estado: "Cancelada" });
      await crearNotificacionPaciente(paciente.id, "Cita cancelada", `Tu cita del ${cita.fecha} fue cancelada.`, cita.id);
      await notificarPersonal({
        titulo: "Cita cancelada por paciente",
        mensaje: `${paciente.nombres} ${paciente.apellidos || ""} canceló la cita del ${cita.fecha} a las ${String(cita.hora_inicio).slice(0, 5)}.`,
        tipo: "cita_cancelada_paciente",
        pacienteId: paciente.id,
        citaId: cita.id,
        roles: ["recepcionista", "admin"],
        odontologoId: cita.odontologo_id,
      });
      return res.json({ cita, mensaje: "La cita se canceló." });
    }
    if (accion !== "reprogramar" || !fechaISOValida(fecha) ||
      typeof horaInicio !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio)) {
      return res.status(400).json({ error: "Indica si deseas cancelar o proporciona una nueva fecha y hora válidas." });
    }
    const horaFin = obtenerFin(horaInicio);
    if (!horaFin || fecha < fechaLocal()) {
      return res.status(400).json({ error: "La nueva fecha u hora no es válida." });
    }
    const slot = (await obtenerDisponibilidad(fecha, cita.odontologo_id || null))
      .find((opcion) => opcion.hora_inicio === horaInicio);
    if (!slot) return res.status(409).json({ error: "Ese horario no está disponible. Elige otra fecha u hora." });
    await cita.update({
      fecha,
      hora_inicio: `${horaInicio}:00`,
      hora_fin: horaFin,
      estado: "Solicitud de reprogramación",
    });
    await crearNotificacionPaciente(
      paciente.id,
      "Solicitud de reprogramación recibida",
      `Tu solicitud para el ${fecha} a las ${horaInicio} está pendiente de confirmación por la clínica.`,
      cita.id,
    );
    await notificarPersonal({
      titulo: "Solicitud de reprogramación",
      mensaje: `${paciente.nombres} ${paciente.apellidos || ""} solicitó cambiar su cita al ${fecha} a las ${horaInicio}.`,
      tipo: "reprogramacion_cita_paciente",
      pacienteId: paciente.id,
      citaId: cita.id,
      roles: ["recepcionista", "admin"],
      odontologoId: cita.odontologo_id,
    });
    res.json({ cita, mensaje: "La reprogramación quedó pendiente de confirmación por la clínica." });
  } catch (error) {
    console.error("Patient appointment update failed:", error);
    res.status(500).json({ error: "No se pudo actualizar la cita." });
  }
};

export const obtenerCatalogoPaciente = async (_req, res) => {
  try {
    const [servicios, odontologos] = await Promise.all([
      Servicio.findAll({
        where: { activo: true },
        attributes: ["id", "nombre", "categoria", "subcategoria", "precio", "moneda"],
        order: [["categoria", "ASC"], ["nombre", "ASC"]],
      }).then((servicios) => servicios.filter(esServicioPacienteAutogestionable)),
      Odontologo.findAll({
        where: { disponible: true },
        attributes: ["id", "nombre", "especialidad", "turno"],
        order: [["nombre", "ASC"]],
      }),
    ]);
    res.set("Cache-Control", "private, no-store");
    res.json({ servicios, odontologos });
  } catch (error) {
    console.error("Patient catalog read failed:", error);
    res.status(500).json({ error: "No se pudo cargar el catálogo." });
  }
};

export const listarNotificacionesPaciente = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const notificaciones = await Notificacion.findAll({
      where: { paciente_id: paciente.id, usuario_id: null },
      attributes: ["id", "titulo", "mensaje", "tipo", "leida", "creado_en", "cita_id"],
      order: [["creado_en", "DESC"]],
      limit: 100,
    });
    res.set("Cache-Control", "private, no-store");
    res.json(notificaciones);
  } catch (error) {
    console.error("Patient notifications read failed:", error);
    res.status(500).json({ error: "No se pudieron cargar las notificaciones." });
  }
};

export const marcarNotificacionPacienteLeida = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const [actualizadas] = await Notificacion.update(
      { leida: true },
      { where: { id: req.params.id, paciente_id: paciente.id, usuario_id: null, leida: false } },
    );
    if (!actualizadas) return res.status(404).json({ error: "Notificación no encontrada." });
    res.json({ message: "Notificación marcada como leída." });
  } catch (error) {
    console.error("Patient notification update failed:", error);
    res.status(500).json({ error: "No se pudo actualizar la notificación." });
  }
};

export const listarFinanzasPaciente = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const [presupuestos, pagos] = await Promise.all([
      Presupuesto.findAll({
        where: { paciente_id: paciente.id },
        attributes: ["id", "descripcion", "monto", "fecha_vigencia", "doctor", "titulo", "estado", "created_at"],
        include: [{
          model: PresupuestoDetalle,
          attributes: ["id", "servicio_nombre", "categoria", "subcategoria", "cantidad", "moneda", "precio_unitario", "descuento_pct", "subtotal"],
        }],
        order: [["created_at", "DESC"]],
      }),
      Pago.findAll({
        where: { paciente_id: paciente.id },
        attributes: ["id", "presupuesto_id", "monto", "tipo_pago", "metodo", "created_at"],
        order: [["created_at", "DESC"]],
      }),
    ]);
    res.set("Cache-Control", "private, no-store");
    res.json({ presupuestos, pagos });
  } catch (error) {
    console.error("Patient finances read failed:", error);
    res.status(500).json({ error: "No se pudo cargar la información financiera." });
  }
};

export const responderPreguntaPaciente = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const pregunta = typeof req.body?.mensaje === "string" ? req.body.mensaje.trim() : "";
    if (!pregunta) return res.status(400).json({ error: "Escribe una pregunta." });
    if (pregunta.length > 500) return res.status(400).json({ error: "La pregunta no puede superar los 500 caracteres." });
    const catalogo = await Servicio.findAll({
      where: { activo: true },
      attributes: ["nombre", "categoria", "precio", "moneda"],
      order: [["categoria", "ASC"], ["nombre", "ASC"]],
      limit: 100,
    });
    const respuesta = await responderConsultaPaciente({
      catalogo: catalogo.map(({ nombre, categoria, precio, moneda }) => ({
        nombre: String(nombre || "").slice(0, 160),
        categoria: String(categoria || "").slice(0, 100),
        precio: String(precio ?? ""),
        moneda: String(moneda || "PEN").slice(0, 3),
      })),
      message: pregunta,
    });
    res.set("Cache-Control", "private, no-store");
    res.json({ respuesta });
  } catch (error) {
    if (error instanceof AiServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Patient assistant request failed", { status: 500 });
    res.status(500).json({ error: "El asistente no está disponible en este momento." });
  }
};

export const marcarTodasNotificacionesPacienteLeidas = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    await Notificacion.update(
      { leida: true },
      { where: { paciente_id: paciente.id, usuario_id: null, leida: false } },
    );
    res.json({ message: "Notificaciones marcadas como leídas." });
  } catch (error) {
    console.error("Patient notification update failed:", error);
    res.status(500).json({ error: "No se pudieron actualizar las notificaciones." });
  }
};

export const listarDocumentosAutorizadosPaciente = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const documentos = await DocumentoClinico.findAll({
      where: { paciente_id: paciente.id, visible_para_paciente: true },
      attributes: ["id", "tipo", "nombre", "mime_type", "tamano", "descripcion", "fecha_documento", "creado_en"],
      order: [["creado_en", "DESC"]],
    });
    res.set("Cache-Control", "private, no-store");
    res.json(documentos);
  } catch (error) {
    console.error("Patient documents read failed:", error);
    res.status(500).json({ error: "No se pudieron cargar los documentos autorizados." });
  }
};

export const obtenerExpedientePaciente = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });

    const [perfil, alergias, medicamentos, antecedentesOdontologicos, atenciones, planes, documentos, historial] = await Promise.all([
      HistoriaClinicaPerfil.findOne({ where: { paciente_id: paciente.id } }),
      HistoriaAlergia.findAll({
        where: { paciente_id: paciente.id },
        attributes: ["sustancia", "reaccion", "severidad"],
        order: [["creado_en", "DESC"]],
      }),
      HistoriaMedicamento.findAll({
        where: { paciente_id: paciente.id, activo: true },
        attributes: ["nombre", "dosis", "frecuencia", "via", "indicaciones"],
        order: [["creado_en", "DESC"]],
      }),
      AntecedenteOdontologico.findAll({
        where: { paciente_id: paciente.id },
        attributes: ["tipo", "descripcion", "fecha"],
        order: [["creado_en", "DESC"]],
      }),
      Atencion.findAll({
        where: { paciente_id: paciente.id },
        attributes: [
          "id", "fecha", "motivo_consulta", "diagnostico", "procedimiento",
          "evolucion", "evolucion_visible_para_paciente", "indicaciones",
        ],
        include: [
          { model: Odontologo, attributes: ["nombre", "especialidad"] },
          { model: HistoriaDiagnostico, as: "diagnosticos", attributes: ["descripcion", "pieza"], through: { attributes: [] } },
          { model: ProcedimientoRealizado, as: "procedimientos", attributes: ["descripcion", "pieza"] },
        ],
        order: [["fecha", "DESC"], ["id", "DESC"]],
      }),
      PlanTratamiento.findAll({
        where: { paciente_id: paciente.id },
        attributes: ["id", "titulo", "descripcion", "estado", "prioridad", "fecha_inicio", "fecha_prevista", "fecha_fin"],
        include: [
          { model: HistoriaDiagnostico, as: "diagnostico", attributes: ["descripcion", "pieza"] },
          { model: ProcedimientoRealizado, as: "procedimientosRealizados", attributes: ["id", "descripcion", "fecha"] },
          { model: Atencion, as: "atencion", attributes: ["indicaciones"] },
        ],
        order: [["creado_en", "DESC"]],
      }),
      DocumentoClinico.findAll({
        where: { paciente_id: paciente.id, visible_para_paciente: true },
        attributes: ["id", "tipo", "nombre", "descripcion", "fecha_documento", "creado_en"],
        order: [["creado_en", "DESC"]],
      }),
      HistoriaAntecedenteCambio.findAll({
        where: { paciente_id: paciente.id },
        attributes: ["id", "rol", "campos_modificados", "antes", "despues", "confirmado_en", "creado_en"],
        order: [["creado_en", "DESC"]],
        limit: 20,
      }),
    ]);

    const antecedentesClinicos = { ...(perfil?.antecedentes_medicos || {}) };
    const declaracionAnterior = antecedentesClinicos.declaracion_paciente || {};
    delete antecedentesClinicos.declaracion_paciente;
    const condiciones = Object.entries(antecedentesClinicos)
      .filter(([campo, valor]) => !["Alergias", "alergias_cuales"].includes(campo) && typeof valor === "string" && valor.trim())
      .map(([campo, valor]) => `${campo}: ${valor}`);
    const alergiasRegistradas = alergias.map(({ sustancia, reaccion }) =>
      reaccion ? `${sustancia} (${reaccion})` : sustancia,
    );
    if (antecedentesClinicos.Alergias === "Sí" && antecedentesClinicos.alergias_cuales) {
      alergiasRegistradas.push(antecedentesClinicos.alergias_cuales);
    }
    const antecedentes = {
      enfermedades: condiciones.join("\n") || declaracionAnterior.enfermedades || "",
      alergias: alergiasRegistradas.join("\n") || declaracionAnterior.alergias || "",
      medicamentos_actuales: medicamentos.map(({ nombre, dosis, frecuencia, via }) =>
        [nombre, dosis, frecuencia, via].filter(Boolean).join(" · "),
      ).join("\n") || declaracionAnterior.medicamentos_actuales || "",
      antecedentes_familiares: declaracionAnterior.antecedentes_familiares || "",
      antecedentes_odontologicos: antecedentesOdontologicos.map(({ tipo, descripcion, fecha }) =>
        [tipo, descripcion, fecha].filter(Boolean).join(" · "),
      ).join("\n") || declaracionAnterior.antecedentes_odontologicos || "",
      habitos: declaracionAnterior.habitos || "",
      consentimiento_veracidad: declaracionAnterior.consentimiento_veracidad || null,
    };
    res.set("Cache-Control", "private, no-store");
    res.json({
      resumen: {
        ultimaAtencion: atenciones[0]?.fecha || null,
        totalAtenciones: atenciones.length,
        totalDocumentos: documentos.length,
        antecedentesPendientes: !antecedentes.consentimiento_veracidad?.aceptado,
      },
      antecedentes,
      historialAntecedentes: historial,
      atenciones: atenciones.map((atencion) => ({
        id: atencion.id,
        fecha: atencion.fecha,
        motivo: atencion.motivo_consulta,
        odontologo: atencion.Odontologo?.nombre || null,
        diagnosticos: (atencion.diagnosticos || []).map(({ descripcion, pieza }) => ({ descripcion, pieza })),
        procedimientos: (atencion.procedimientos || []).map(({ descripcion, pieza }) => ({ descripcion, pieza })),
        diagnosticoHistorico: atencion.diagnostico || null,
        procedimientoHistorico: atencion.procedimiento || null,
        evolucion: atencion.evolucion_visible_para_paciente ? atencion.evolucion : null,
        indicaciones: atencion.indicaciones || null,
      })),
      tratamientos: planes.map((plan) => ({
        id: plan.id,
        titulo: plan.titulo,
        descripcion: plan.descripcion,
        estado: plan.estado,
        prioridad: plan.prioridad,
        fechaInicio: plan.fecha_inicio,
        fechaPrevista: plan.fecha_prevista,
        fechaFin: plan.fecha_fin,
        diagnostico: plan.diagnostico?.descripcion || null,
        indicaciones: plan.atencion?.indicaciones || null,
        procedimientos: (plan.procedimientosRealizados || []).map(({ id, descripcion, fecha }) => ({ id, descripcion, fecha })),
      })),
      documentos,
    });
  } catch (error) {
    console.error("Patient clinical record read failed:", error);
    res.status(500).json({ error: "No se pudo cargar el expediente clínico." });
  }
};

export const otorgarConsentimientoAntecedentesPaciente = async (req, res) => {
  if (req.body?.aceptado !== true) {
    return res.status(400).json({ error: "Debes confirmar que leíste tus antecedentes y declaras que son veraces." });
  }
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });

    const resultado = await sequelize.transaction(async (transaction) => {
      let perfil = await HistoriaClinicaPerfil.findOne({
        where: { paciente_id: paciente.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const antecedentesMedicos = perfil?.antecedentes_medicos || {};
      const anterior = antecedentesMedicos.declaracion_paciente || {};
      if (anterior.consentimiento_veracidad?.aceptado) {
        return { antecedentes: { ...anterior }, cambio: null };
      }
      const confirmadoEn = new Date();
      const consentimiento = {
        aceptado: true,
        version: 1,
        texto: "Confirmo que he leído los antecedentes clínicos que aparecen aquí y declaro que la información que consta es veraz según mi conocimiento.",
        aceptado_en: confirmadoEn.toISOString(),
      };
      const nuevaDeclaracion = {
        ...anterior,
        consentimiento_veracidad: consentimiento,
      };

      if (perfil) {
        await perfil.update({
          antecedentes_medicos: {
            ...antecedentesMedicos,
            declaracion_paciente: nuevaDeclaracion,
          },
        }, { transaction });
      } else {
        perfil = await HistoriaClinicaPerfil.create({
          paciente_id: paciente.id,
          antecedentes_medicos: { declaracion_paciente: nuevaDeclaracion },
          creado_por: null,
          actualizado_por: null,
        }, { transaction });
      }

      const cambio = await HistoriaAntecedenteCambio.create({
        paciente_id: paciente.id,
        usuario_id: req.user.id,
        rol: req.user.rol,
        campos_modificados: ["consentimiento_veracidad"],
        antes: { consentimiento_veracidad: "Pendiente" },
        despues: { consentimiento_veracidad: "Aceptado" },
        confirmado_en: confirmadoEn,
      }, { transaction });
      return { antecedentes: nuevaDeclaracion, cambio };
    });

    res.set("Cache-Control", "private, no-store");
    res.json({ antecedentes: resultado.antecedentes, cambio: resultado.cambio });
  } catch (error) {
    console.error("Patient clinical antecedent consent failed:", error);
    res.status(500).json({ error: "No se pudo registrar tu consentimiento." });
  }
};
