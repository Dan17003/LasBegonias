import { Op } from "sequelize";
import {
  Cita,
  DocumentoClinico,
  Notificacion,
  Odontologo,
  Paciente,
  Pago,
  Presupuesto,
  PresupuestoDetalle,
  Servicio,
  Usuario,
} from "../models/index.js";

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
    if (cambios.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cambios.email)) {
      return res.status(400).json({ error: "Ingrese un correo de contacto válido." });
    }

    await paciente.update(cambios);
    res.set("Cache-Control", "private, no-store");
    res.json({ paciente: serializarPerfilPaciente(paciente) });
  } catch (error) {
    console.error("Patient profile update failed:", error);
    res.status(error.name === "SequelizeValidationError" ? 400 : 500).json({
      error: error.name === "SequelizeValidationError"
        ? "Verifique los datos ingresados."
        : "No se pudo actualizar el perfil.",
    });
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
      where: { paciente_id: paciente.id },
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
      { where: { id: req.params.id, paciente_id: paciente.id, leida: false } },
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
    const pregunta = typeof req.body.mensaje === "string" ? req.body.mensaje.trim().slice(0, 500) : "";
    if (!pregunta) return res.status(400).json({ error: "Escribe una pregunta." });
    const catalogo = await Servicio.findAll({
      where: { activo: true },
      attributes: ["nombre", "categoria", "precio", "moneda"],
      order: [["categoria", "ASC"], ["nombre", "ASC"]],
    });
    const normalizada = pregunta.toLocaleLowerCase("es");
    let respuesta;
    if (/(horario|hora|abren|abierto|cierran)/.test(normalizada)) {
      respuesta = "No tengo un horario de atención confirmado en el sistema. Comunícate con recepción para verificarlo.";
    } else if (/(precio|cuesta|costo|tarifa)/.test(normalizada)) {
      const servicios = catalogo.filter((servicio) =>
        normalizada.includes(servicio.nombre.toLocaleLowerCase("es")) ||
        normalizada.includes(servicio.categoria.toLocaleLowerCase("es"))
      );
      respuesta = servicios.length
        ? servicios.slice(0, 8).map((servicio) => `${servicio.nombre}: ${servicio.moneda} ${servicio.precio}`).join("\n")
        : `Hay ${catalogo.length} servicios en el catálogo. Indica el nombre o categoría del servicio para consultar el precio registrado.`;
    } else if (/(servicio|tratamiento|limpieza|consulta|implante|ortodoncia)/.test(normalizada)) {
      respuesta = catalogo.length
        ? `Servicios disponibles: ${catalogo.slice(0, 12).map(({ nombre }) => nombre).join(", ")}${catalogo.length > 12 ? " y otros." : "."}`
        : "No hay servicios publicados en este momento. Comunícate con recepción.";
    } else if (/(cita|reserv|reprogram|cancel)/.test(normalizada)) {
      respuesta = "Puedes enviar una solicitud de cita o reprogramación desde la sección Citas. La fecha y hora quedan pendientes de confirmación por la clínica.";
    } else {
      respuesta = "Puedo orientarte sobre servicios y precios publicados, citas y cómo contactar con la clínica. Para dudas clínicas o información que no esté publicada, consulta directamente con el equipo odontológico.";
    }
    res.json({ respuesta });
  } catch (error) {
    console.error("Patient assistant request failed:", error);
    res.status(500).json({ error: "El asistente no está disponible en este momento." });
  }
};

export const marcarTodasNotificacionesPacienteLeidas = async (req, res) => {
  try {
    const paciente = await obtenerPacienteActual(req);
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    await Notificacion.update(
      { leida: true },
      { where: { paciente_id: paciente.id, leida: false } },
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
