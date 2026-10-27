import { Op } from "sequelize";
import {
  Atencion, Cita, Odontologo, OdontogramaPieza, Paciente, HistoriaClinicaPerfil,
  HistoriaMedicamento, HistoriaAlergia, AntecedenteOdontologico,
  HistoriaDiagnostico, HistoriaDiagnosticoCambio, AtencionDiagnostico, PlanTratamiento, ProcedimientoRealizado, Consentimiento,
  OdontogramaCambio, PeriodontogramaMedicion,
} from "../models/index.js";

const ESTADOS_PIEZA = ["sana", "caries", "tratamiento", "ausente", "corona", "protesis", "observacion"];

const esOdontologo = (req) => req.user?.rol?.toLowerCase() === "odontologo";

const obtenerOdontologoAutenticado = async (req) => {
  if (!esOdontologo(req)) return null;
  return Odontologo.findOne({ where: { usuario_id: req.user.id } });
};

const tieneRelacionConPaciente = async (req, pacienteId) => {
  const odontologo = await obtenerOdontologoAutenticado(req);
  if (!odontologo) return null;

  const relacion = await Cita.findOne({
    where: { paciente_id: pacienteId, odontologo_id: odontologo.id },
  });

  if (relacion) return odontologo;

  const atencion = await Atencion.findOne({
    where: { paciente_id: pacienteId, odontologo_id: odontologo.id },
  });
  return atencion ? odontologo : null;
};

export const validarAccesoPaciente = async (req, pacienteId) => {
  if (!esOdontologo(req)) return { paciente: null, odontologo: null };
  const odontologo = await tieneRelacionConPaciente(req, pacienteId);
  if (!odontologo) return { paciente: null, odontologo: null };
  const paciente = await Paciente.findByPk(pacienteId);
  return { paciente, odontologo };
};

const recursos = {
  medicamentos: { model: HistoriaMedicamento, required: ["nombre"], allowed: ["nombre", "dosis", "frecuencia", "via", "indicaciones", "activo"] },
  alergias: { model: HistoriaAlergia, required: ["sustancia"], allowed: ["sustancia", "reaccion", "severidad"], enums: { severidad: ["desconocida", "leve", "moderada", "grave"] } },
  "antecedentes-odontologicos": { model: AntecedenteOdontologico, required: ["tipo", "descripcion"], allowed: ["tipo", "descripcion", "fecha"] },
  diagnosticos: { model: HistoriaDiagnostico, required: ["descripcion"], allowed: ["codigo", "descripcion", "tipo", "estado", "pieza", "notas"], enums: { estado: ["activo", "resuelto", "suspendido"] } },
  "planes-tratamiento": { model: PlanTratamiento, required: ["titulo"], allowed: ["titulo", "descripcion", "estado", "prioridad", "fecha_inicio", "fecha_prevista", "fecha_fin", "diagnostico_id"], enums: { estado: ["propuesto", "en_curso", "completado", "cancelado"], prioridad: ["baja", "media", "alta"] } },
  procedimientos: { model: ProcedimientoRealizado, required: ["descripcion"], allowed: ["atencion_id", "plan_tratamiento_id", "pieza", "codigo", "descripcion", "fecha", "observaciones"] },
  consentimientos: { model: Consentimiento, required: ["tipo", "estado"], allowed: ["tipo", "estado", "firmado_en", "observaciones"], enums: { estado: ["Pendiente", "Firmado", "Rechazado"] } },
};

const validarIdPaciente = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const textoOpcionalValido = (value, maxLength) =>
  value === undefined || value === null || (typeof value === "string" && value.length <= maxLength);
const fechaISOValida = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const fechaAtencionValida = (value) => {
  if (typeof value !== "string" || !fechaISOValida(value.slice(0, 10))) return false;
  if (value.length === 10) return true;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value));
};
const validarDatos = (config, body) => {
  for (const field of config.required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") return `El campo ${field} es obligatorio.`;
  }
  for (const [field, values] of Object.entries(config.enums || {})) {
    if (body[field] !== undefined && !values.includes(body[field])) return `Valor no válido para ${field}.`;
  }
  return null;
};

export const listarHistoriaRecurso = async (req, res) => {
  try {
    const config = recursos[req.params.recurso];
    if (!config || !validarIdPaciente(req.params.id)) return res.status(400).json({ error: "Recurso o paciente no válido." });
    const { paciente, odontologo } = await validarAccesoPaciente(req, Number(req.params.id));
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    const includes = req.params.recurso === "planes-tratamiento"
      ? [
        { model: HistoriaDiagnostico, as: "diagnostico", attributes: ["id", "descripcion", "codigo", "pieza", "estado"] },
        { model: ProcedimientoRealizado, as: "procedimientosRealizados", attributes: ["id", "descripcion", "fecha"], include: [{ model: Atencion, as: "atencion", attributes: ["id", "fecha"] }] },
        { model: Odontologo, attributes: ["id", "nombre"] },
      ]
      : req.params.recurso === "diagnosticos"
        ? [
          { model: Atencion, as: "atenciones", attributes: ["id", "fecha"], through: { attributes: [] } },
          { model: HistoriaDiagnosticoCambio, as: "cambiosEstado", attributes: ["id", "estado_anterior", "estado_nuevo", "creado_en"], include: [{ model: Odontologo, as: "odontologoResponsable", attributes: ["id", "nombre"] }] },
          { model: Odontologo, attributes: ["id", "nombre"] },
        ]
        : [];
    const rows = await config.model.findAll({
      where: { paciente_id: paciente.id },
      include: includes,
      order: [["creado_en", "DESC"]],
    });
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const crearHistoriaRecurso = async (req, res) => {
  try {
    const config = recursos[req.params.recurso];
    if (!config || !validarIdPaciente(req.params.id)) return res.status(400).json({ error: "Recurso o paciente no válido." });
    const { paciente, odontologo } = await validarAccesoPaciente(req, Number(req.params.id));
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    const errorValidacion = validarDatos(config, req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });
    if (req.params.recurso === "planes-tratamiento" && req.body.estado === "completado") {
      return res.status(400).json({ error: "Registra el procedimiento realizado desde una atención para completar un plan." });
    }
    if (req.body.atencion_id !== undefined) {
      if (!validarIdPaciente(req.body.atencion_id)) return res.status(400).json({ error: "atencion_id no válido." });
      const atencion = await Atencion.findOne({ where: { id: Number(req.body.atencion_id), paciente_id: paciente.id, odontologo_id: odontologo.id } });
      if (!atencion) return res.status(400).json({ error: "La atención no pertenece a este paciente u odontólogo." });
    }
    if (req.body.diagnostico_id !== undefined && req.body.diagnostico_id !== null && req.body.diagnostico_id !== "") {
      const diagnostico = await HistoriaDiagnostico.findOne({
        where: { id: req.body.diagnostico_id, paciente_id: paciente.id },
      });
      if (!diagnostico) return res.status(400).json({ error: "El diagnóstico no pertenece a este paciente." });
    }
    if (req.params.recurso === "procedimientos" && req.body.plan_tratamiento_id !== undefined && req.body.plan_tratamiento_id !== null) {
      const plan = await PlanTratamiento.findOne({
        where: { id: req.body.plan_tratamiento_id, paciente_id: paciente.id },
      });
      if (!plan) return res.status(400).json({ error: "El plan vinculado no pertenece a este paciente." });
    }
    const datos = Object.fromEntries(config.allowed.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
    Object.assign(datos, { paciente_id: paciente.id, odontologo_id: odontologo.id });
    const row = await config.model.create(datos);
    res.status(201).json(row);
  } catch (error) { res.status(400).json({ error: error.message }); }
};

export const actualizarHistoriaRecurso = async (req, res) => {
  try {
    const config = recursos[req.params.recurso];
    if (!config || !validarIdPaciente(req.params.id) || !validarIdPaciente(req.params.recursoId)) return res.status(400).json({ error: "Identificador no válido." });
    const { paciente, odontologo } = await validarAccesoPaciente(req, Number(req.params.id));
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    const row = await config.model.findOne({ where: { id: Number(req.params.recursoId), paciente_id: paciente.id } });
    if (!row) return res.status(404).json({ error: "Registro no encontrado." });
    const errorValidacion = validarDatos({ ...config, required: [] }, req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });
    const datos = Object.fromEntries(config.allowed.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
    if (datos.diagnostico_id !== undefined && datos.diagnostico_id !== null && datos.diagnostico_id !== "") {
      const diagnostico = await HistoriaDiagnostico.findOne({
        where: { id: datos.diagnostico_id, paciente_id: paciente.id },
      });
      if (!diagnostico) return res.status(400).json({ error: "El diagnóstico no pertenece a este paciente." });
    }
    if (datos.atencion_id !== undefined && datos.atencion_id !== null) {
      const atencion = await Atencion.findOne({
        where: { id: datos.atencion_id, paciente_id: paciente.id, odontologo_id: odontologo.id },
      });
      if (!atencion) return res.status(400).json({ error: "La atención vinculada no pertenece a este paciente u odontólogo." });
    }
    if (datos.plan_tratamiento_id !== undefined && datos.plan_tratamiento_id !== null) {
      const plan = await PlanTratamiento.findOne({
        where: { id: datos.plan_tratamiento_id, paciente_id: paciente.id },
      });
      if (!plan) return res.status(400).json({ error: "El plan vinculado no pertenece a este paciente." });
    }
    if (req.params.recurso === "planes-tratamiento" && datos.estado === "completado") {
      const procedimiento = await ProcedimientoRealizado.findOne({
        where: { plan_tratamiento_id: row.id, paciente_id: paciente.id },
      });
      if (!procedimiento) return res.status(400).json({ error: "Registra al menos un procedimiento realizado desde una atención antes de completar este plan." });
      datos.fecha_fin = datos.fecha_fin || new Date().toISOString().slice(0, 10);
    }
    const transaction = await config.model.sequelize.transaction();
    try {
      const estadoAnterior = row.estado;
      await row.update(datos, { transaction });
      if (req.params.recurso === "diagnosticos" && datos.estado && datos.estado !== estadoAnterior) {
        await HistoriaDiagnosticoCambio.create({
          paciente_id: paciente.id,
          diagnostico_id: row.id,
          odontologo_id: odontologo.id,
          estado_anterior: estadoAnterior || "desconocido",
          estado_nuevo: datos.estado,
        }, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    res.json(row);
  } catch (error) { res.status(400).json({ error: error.message }); }
};

export const eliminarHistoriaRecurso = async (_req, res) => {
  res.status(403).json({ error: "Los registros de historia clínica no se pueden eliminar." });
};

export const obtenerPerfilHistoria = async (req, res) => {
  try {
    const { paciente, odontologo } = await validarAccesoPaciente(req, Number(req.params.id));
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    const perfil = await HistoriaClinicaPerfil.findOne({ where: { paciente_id: paciente.id } });
    res.json(perfil || null);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const guardarPerfilHistoria = async (req, res) => {
  try {
    const { paciente, odontologo } = await validarAccesoPaciente(req, Number(req.params.id));
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    const camposPerfil = [
      "motivo", "motivo_tipo", "motivo_descripcion", "antecedentes", "antecedentes_medicos",
      "antecedentes_medicos_otros", "embarazo", "examenes", "examen_extraoral", "examen_intraoral",
    ];
    const datos = camposPerfil.reduce((out, key) => {
      if (req.body[key] !== undefined) out[key] = req.body[key];
      return out;
    }, {});
    let perfil = await HistoriaClinicaPerfil.findOne({ where: { paciente_id: paciente.id } });
    if (perfil) {
      if (datos.antecedentes_medicos && typeof datos.antecedentes_medicos === "object") {
        datos.antecedentes_medicos = {
          ...datos.antecedentes_medicos,
          ...(perfil.antecedentes_medicos?.declaracion_paciente
            ? { declaracion_paciente: perfil.antecedentes_medicos.declaracion_paciente }
            : {}),
        };
      }
      await perfil.update({ ...datos, actualizado_por: odontologo.id });
    }
    else perfil = await HistoriaClinicaPerfil.create({ ...datos, paciente_id: paciente.id, creado_por: odontologo.id, actualizado_por: odontologo.id });
    res.json(perfil);
  } catch (error) { res.status(400).json({ error: error.message }); }
};

export const listarMisPacientes = async (req, res) => {
  try {
    const odontologo = await obtenerOdontologoAutenticado(req);
    if (!odontologo) return res.status(404).json({ error: "El usuario no tiene perfil odontológico." });

    const citas = await Cita.findAll({
      attributes: ["id", "paciente_id", "fecha", "hora_inicio", "motivo", "estado"],
      where: { odontologo_id: odontologo.id },
      order: [["fecha", "ASC"], ["hora_inicio", "ASC"]],
    });
    const atenciones = await Atencion.findAll({
      attributes: ["paciente_id", "fecha"],
      where: { odontologo_id: odontologo.id },
    });
    const ids = [...new Set([...citas, ...atenciones].map((item) => item.paciente_id))];
    if (ids.length === 0) return res.json([]);

    const { dni, nombres, apellidos } = req.query;
    const where = { id: ids };
    if (dni) where.dni = { [Op.iLike]: `%${dni}%` };
    if (nombres) where.nombres = { [Op.iLike]: `%${nombres}%` };
    if (apellidos) where.apellidos = { [Op.iLike]: `%${apellidos}%` };

    const pacientes = await Paciente.findAll({ where, order: [["nombres", "ASC"], ["apellidos", "ASC"]] });
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const fechaDia = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const resultado = pacientes.map((paciente) => {
      const citasPaciente = citas.filter((cita) => String(cita.paciente_id) === String(paciente.id));
      const atencionesPaciente = atenciones.filter((atencion) => String(atencion.paciente_id) === String(paciente.id));
      const fechasAtendidas = [
        ...citasPaciente
          .filter((cita) => cita.estado?.toLowerCase() === "atendida" && fechaDia(cita.fecha) <= fechaHoy)
          .map((cita) => ({ fecha: fechaDia(cita.fecha), estado: cita.estado })),
        ...atencionesPaciente.map((atencion) => ({ fecha: fechaDia(atencion.fecha), estado: "Atendida" })),
      ].sort((a, b) => b.fecha.localeCompare(a.fecha));
      const proximaCita = citasPaciente.find((cita) =>
        ["programada", "confirmada"].includes(cita.estado?.toLowerCase()) && fechaDia(cita.fecha) >= fechaHoy,
      );
      return {
        ...paciente.toJSON(),
        ultima_cita: fechasAtendidas[0] || null,
        proxima_cita: proximaCita
          ? { fecha: fechaDia(proximaCita.fecha), hora_inicio: proximaCita.hora_inicio, motivo: proximaCita.motivo }
          : null,
      };
    });
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerFichaPaciente = async (req, res) => {
  try {
    const { paciente, odontologo } = await validarAccesoPaciente(req, req.params.id);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    res.json(paciente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listarHistoriaPaciente = async (req, res) => {
  try {
    const { paciente, odontologo } = await validarAccesoPaciente(req, req.params.id);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a la historia de este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });

    const atenciones = await Atencion.findAll({
      where: { paciente_id: paciente.id, odontologo_id: odontologo.id },
      include: [
        { model: Odontologo, attributes: ["id", "nombre", "especialidad"] },
        { model: Cita, as: "cita", attributes: ["id", "fecha", "hora_inicio", "estado"] },
        { model: HistoriaDiagnostico, as: "diagnosticos", through: { attributes: [] } },
        { model: ProcedimientoRealizado, as: "procedimientos", include: [{ model: PlanTratamiento, as: "plan" }] },
        { model: PlanTratamiento, as: "planesTratamiento", include: [
          { model: HistoriaDiagnostico, as: "diagnostico", attributes: ["id", "descripcion", "pieza"] },
          { model: ProcedimientoRealizado, as: "procedimientosRealizados", include: [{ model: Atencion, as: "atencion", attributes: ["id", "fecha"] }] },
        ] },
        { model: OdontogramaCambio, as: "odontogramaCambios", attributes: ["id", "pieza", "estado_anterior", "estado_nuevo", "notas_anteriores", "notas_nuevas", "creado_en"] },
        { model: PeriodontogramaMedicion, as: "medicionesPeriodontales", attributes: ["id", "evaluacion_id", "fecha_evaluacion", "odontologo_id", "pieza", "sitio", "profundidad_sondaje", "nivel_insercion"] },
      ],
      order: [["fecha", "DESC"], ["id", "DESC"]],
    });
    res.json({ paciente, atenciones });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const registrarAtencion = async (req, res) => {
  try {
    const { paciente, odontologo } = await validarAccesoPaciente(req, req.params.id);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso clínico a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });

    const {
      fecha, motivo_consulta, antecedentes, evaluacion, hallazgos, diagnostico, procedimiento,
      tratamiento, evolucion, evolucion_visible_para_paciente, indicaciones, observaciones, cita_id,
      diagnosticos = [], procedimientos = [], planesTratamiento = [],
    } = req.body;
    if (evolucion_visible_para_paciente !== undefined && typeof evolucion_visible_para_paciente !== "boolean") {
      return res.status(400).json({ error: "La autorización de visibilidad de la evolución no es válida." });
    }
    if (typeof motivo_consulta !== "string" || !motivo_consulta.trim()) {
      return res.status(400).json({ error: "El motivo de consulta es obligatorio." });
    }
    if (!Array.isArray(diagnosticos) || diagnosticos.length > 20 ||
        !Array.isArray(procedimientos) || procedimientos.length > 50 ||
        !Array.isArray(planesTratamiento) || planesTratamiento.length > 50) {
      return res.status(400).json({ error: "La lista de diagnósticos, procedimientos o planes de tratamiento no es válida." });
    }
    if (![
      [antecedentes, 3000], [evaluacion, 5000], [hallazgos, 5000], [diagnostico, 2000],
      [procedimiento, 3000], [tratamiento, 5000], [evolucion, 4000], [indicaciones, 4000],
      [observaciones, 4000],
    ].every(([value, max]) => textoOpcionalValido(value, max))) {
      return res.status(400).json({ error: "Uno de los campos clínicos de texto no tiene un formato válido o supera su límite." });
    }
    if (fecha !== undefined && !fechaAtencionValida(fecha)) {
      return res.status(400).json({ error: "La fecha de atención no es válida." });
    }
    let cita = null;
    if (cita_id !== undefined && cita_id !== null && cita_id !== "") {
      if (!/^\d+$/.test(String(cita_id))) return res.status(400).json({ error: "La cita relacionada no es válida." });
      cita = await Cita.findOne({
        where: {
          id: cita_id,
          paciente_id: paciente.id,
          odontologo_id: odontologo.id,
        },
      });
      if (!cita) return res.status(400).json({ error: "La cita no pertenece a este paciente o odontólogo." });
    }

    const transaction = await Atencion.sequelize.transaction();
    let atencion;
    try {
      if (cita) {
        await cita.reload({ transaction, lock: transaction.LOCK.UPDATE });
        const atencionExistente = await Atencion.findOne({
          where: { cita_id: cita.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (atencionExistente) {
          throw Object.assign(new Error("Esta cita ya está vinculada a una atención."), { status: 409 });
        }
      }
      atencion = await Atencion.create({
        paciente_id: paciente.id,
        odontologo_id: odontologo.id,
        cita_id: cita?.id || null,
        fecha: fecha || new Date(),
        motivo_consulta: motivo_consulta.trim(),
        antecedentes: typeof antecedentes === "string" ? antecedentes.trim() || null : null,
        evaluacion: typeof evaluacion === "string" ? evaluacion.trim() || null : null,
        hallazgos: typeof hallazgos === "string" ? hallazgos.trim() || null : null,
        diagnostico: typeof diagnostico === "string" ? diagnostico.trim() || null : null,
        procedimiento: typeof procedimiento === "string" ? procedimiento.trim() || null : null,
        tratamiento,
        evolucion: typeof evolucion === "string" ? evolucion.trim() || null : null,
        evolucion_visible_para_paciente: evolucion_visible_para_paciente === true,
        indicaciones: typeof indicaciones === "string" ? indicaciones.trim() || null : null,
        observaciones,
      }, { transaction });

      const diagnosticoIds = new Set();
      let diagnosticoNuevoId = null;
      for (const item of diagnosticos) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          throw Object.assign(new Error("Cada diagnóstico asociado debe ser válido."), { status: 400 });
        }
        if (item.diagnostico_id !== undefined) {
          if (!/^\d+$/.test(String(item.diagnostico_id))) {
            throw Object.assign(new Error("El identificador de diagnóstico no es válido."), { status: 400 });
          }
          const existing = await HistoriaDiagnostico.findOne({
            where: { id: Number(item.diagnostico_id), paciente_id: paciente.id },
            transaction,
          });
          if (!existing) throw Object.assign(new Error("Uno de los diagnósticos no pertenece a este paciente."), { status: 400 });
          diagnosticoIds.add(existing.id);
          continue;
        }

        const nuevo = item.nuevo;
        if (!nuevo || typeof nuevo.descripcion !== "string" || !nuevo.descripcion.trim()) {
          throw Object.assign(new Error("Un diagnóstico nuevo requiere descripción."), { status: 400 });
        }
        if (![
          [nuevo.codigo, 100], [nuevo.pieza, 8], [nuevo.notas, 2000],
        ].every(([value, max]) => textoOpcionalValido(value, max))) {
          throw Object.assign(new Error("El código, la pieza o las notas del diagnóstico no tienen un formato válido."), { status: 400 });
        }
        const tipo = nuevo.tipo || "clinico";
        const estado = nuevo.estado || "activo";
        if (!["presuntivo", "definitivo", "clinico"].includes(tipo) || !["activo", "resuelto", "suspendido"].includes(estado)) {
          throw Object.assign(new Error("El tipo o estado del diagnóstico no es válido."), { status: 400 });
        }
        const created = await HistoriaDiagnostico.create({
          paciente_id: paciente.id,
          odontologo_id: odontologo.id,
          descripcion: nuevo.descripcion.trim().slice(0, 1000),
          codigo: typeof nuevo.codigo === "string" ? nuevo.codigo.trim().slice(0, 100) || null : null,
          pieza: typeof nuevo.pieza === "string" ? nuevo.pieza.trim().slice(0, 8) || null : null,
          tipo,
          estado,
          notas: typeof nuevo.notas === "string" ? nuevo.notas.trim().slice(0, 2000) || null : null,
        }, { transaction });
        diagnosticoIds.add(created.id);
        diagnosticoNuevoId = created.id;
      }

      for (const item of planesTratamiento) {
        if (!item || typeof item !== "object" || Array.isArray(item) ||
            typeof item.titulo !== "string" || !item.titulo.trim() ||
            (item.descripcion !== undefined && item.descripcion !== null && typeof item.descripcion !== "string") ||
            item.titulo.trim().length > 200 || (typeof item.descripcion === "string" && item.descripcion.length > 3000)) {
          throw Object.assign(new Error("Cada plan de tratamiento requiere un nombre válido; la descripción es opcional."), { status: 400 });
        }
        if (!["baja", "media", "alta"].includes(item.prioridad || "media")) {
          throw Object.assign(new Error("La prioridad de un plan de tratamiento no es válida."), { status: 400 });
        }
        if (item.fecha_prevista !== undefined && item.fecha_prevista !== null &&
            item.fecha_prevista !== "" && !fechaISOValida(item.fecha_prevista)) {
          throw Object.assign(new Error("La fecha prevista del plan de tratamiento no es válida."), { status: 400 });
        }
        let diagnosticoId = null;
        if (item.diagnostico_id === "nuevo") {
          if (!diagnosticoNuevoId) {
            throw Object.assign(new Error("Para asociar el plan al diagnóstico nuevo, primero completa su descripción."), { status: 400 });
          }
          diagnosticoId = diagnosticoNuevoId;
        } else if (item.diagnostico_id !== undefined && item.diagnostico_id !== null && item.diagnostico_id !== "") {
          if (!/^\d+$/.test(String(item.diagnostico_id))) {
            throw Object.assign(new Error("El diagnóstico vinculado al plan no es válido."), { status: 400 });
          }
          const diagnosticoRelacionado = await HistoriaDiagnostico.findOne({
            where: { id: Number(item.diagnostico_id), paciente_id: paciente.id },
            transaction,
          });
          if (!diagnosticoRelacionado) {
            throw Object.assign(new Error("El diagnóstico del plan no pertenece a este paciente."), { status: 400 });
          }
          diagnosticoId = diagnosticoRelacionado.id;
          diagnosticoIds.add(diagnosticoId);
        }
        await PlanTratamiento.create({
          paciente_id: paciente.id,
          odontologo_id: odontologo.id,
          atencion_id: atencion.id,
          diagnostico_id: diagnosticoId,
          titulo: item.titulo.trim(),
          descripcion: typeof item.descripcion === "string" ? item.descripcion.trim() || null : null,
          prioridad: item.prioridad || "media",
          estado: "propuesto",
          fecha_prevista: item.fecha_prevista || null,
        }, { transaction });
      }
      if (diagnosticoIds.size) {
        await AtencionDiagnostico.bulkCreate(
          [...diagnosticoIds].map((diagnosticoId) => ({ atencion_id: atencion.id, diagnostico_id: diagnosticoId })),
          { transaction },
        );
      }

      const planesPorCompletar = new Map();
      for (const item of procedimientos) {
        if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.descripcion !== "string" || !item.descripcion.trim()) {
          throw Object.assign(new Error("Cada procedimiento realizado requiere una descripción."), { status: 400 });
        }
        if (![
          [item.pieza, 8], [item.codigo, 100], [item.observaciones, 2000],
        ].every(([value, max]) => textoOpcionalValido(value, max))) {
          throw Object.assign(new Error("Los datos del procedimiento no tienen un formato válido."), { status: 400 });
        }
        if (item.completar_plan === true && !item.plan_tratamiento_id) {
          throw Object.assign(new Error("Selecciona el procedimiento planificado antes de marcarlo como completado."), { status: 400 });
        }
        let plan = null;
        if (item.completar_plan !== undefined && typeof item.completar_plan !== "boolean") {
          throw Object.assign(new Error("La confirmación de finalización del plan no es válida."), { status: 400 });
        }
        if (item.plan_tratamiento_id !== undefined && item.plan_tratamiento_id !== null && item.plan_tratamiento_id !== "") {
          if (!/^\d+$/.test(String(item.plan_tratamiento_id))) {
            throw Object.assign(new Error("El identificador del plan no es válido."), { status: 400 });
          }
          plan = await PlanTratamiento.findOne({
            where: { id: Number(item.plan_tratamiento_id), paciente_id: paciente.id },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (!plan || ["completado", "cancelado"].includes(plan.estado)) {
            throw Object.assign(new Error("El plan seleccionado no existe para este paciente o ya está cerrado."), { status: 400 });
          }
          if (item.completar_plan === true) planesPorCompletar.set(plan.id, plan);
        }
        const description = item.descripcion.trim().slice(0, 1000);
        await ProcedimientoRealizado.create({
          paciente_id: paciente.id,
          odontologo_id: odontologo.id,
          atencion_id: atencion.id,
          plan_tratamiento_id: plan?.id || null,
          pieza: typeof item.pieza === "string" ? item.pieza.trim().slice(0, 8) || null : null,
          codigo: typeof item.codigo === "string" ? item.codigo.trim().slice(0, 100) || null : null,
          descripcion: description,
          observaciones: typeof item.observaciones === "string" ? item.observaciones.trim().slice(0, 2000) || null : null,
          fecha: atencion.fecha,
        }, { transaction });
      }
      for (const plan of planesPorCompletar.values()) {
        await plan.update({ estado: "completado", fecha_fin: new Date().toISOString().slice(0, 10) }, { transaction });
      }
      if (cita) await cita.update({ estado: "Atendida", odontologo_id: odontologo.id, doctor: odontologo.nombre }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      if (error.status) return res.status(error.status).json({ error: error.message });
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ error: "La cita o la relación clínica ya fue registrada." });
      }
      throw error;
    }

    const resultado = await Atencion.findByPk(atencion.id, {
      include: [
        { model: Odontologo, attributes: ["id", "nombre", "especialidad"] },
        { model: HistoriaDiagnostico, as: "diagnosticos", through: { attributes: [] } },
        { model: ProcedimientoRealizado, as: "procedimientos", include: [{ model: PlanTratamiento, as: "plan" }] },
        { model: PlanTratamiento, as: "planesTratamiento", include: [
          { model: HistoriaDiagnostico, as: "diagnostico", attributes: ["id", "descripcion", "pieza"] },
          { model: ProcedimientoRealizado, as: "procedimientosRealizados", include: [{ model: Atencion, as: "atencion", attributes: ["id", "fecha"] }] },
        ] },
      ],
    });
    res.status(201).json(resultado);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.name === "SequelizeValidationError" || error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({ error: "Los datos de la atención no son válidos o alguna relación ya no está disponible." });
    }
    console.error("Clinical appointment creation failed", { operation: "create-attention" });
    res.status(500).json({ error: "No se pudo guardar la atención. Intenta nuevamente." });
  }
};

export const listarCitasPaciente = async (req, res) => {
  try {
    const { paciente, odontologo } = await validarAccesoPaciente(req, req.params.id);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });

    const citas = await Cita.findAll({
      where: {
        paciente_id: paciente.id,
        odontologo_id: odontologo.id,
      },
      order: [["fecha", "DESC"], ["hora_inicio", "DESC"]],
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerOdontograma = async (req, res) => {
  try {
    const { paciente, odontologo } = await validarAccesoPaciente(req, req.params.id);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso al odontograma de este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });

    const piezas = await OdontogramaPieza.findAll({
      where: { paciente_id: paciente.id },
      order: [["pieza", "ASC"]],
    });
    res.json(piezas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listarCambiosOdontograma = async (req, res) => {
  try {
    const { paciente, odontologo } = await validarAccesoPaciente(req, req.params.id);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso al historial del odontograma de este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    const cambios = await OdontogramaCambio.findAll({
      where: { paciente_id: paciente.id },
      include: [
        { model: Odontologo, attributes: ["id", "nombre"] },
        { model: Atencion, as: "atencion", attributes: ["id", "fecha", "motivo_consulta"] },
      ],
      order: [["creado_en", "DESC"], ["id", "DESC"]],
    });
    res.set("Cache-Control", "private, no-store");
    res.json(cambios);
  } catch (error) {
    console.error("Odontogram change history listing failed", { operation: "list" });
    res.status(500).json({ error: "No se pudo cargar el historial del odontograma." });
  }
};

export const actualizarOdontogramaPieza = async (req, res) => {
  try {
    const { paciente, odontologo } = await validarAccesoPaciente(req, req.params.id);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso al odontograma de este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });

    const { estado, notas, atencion_id: atencionId } = req.body;
    if (!ESTADOS_PIEZA.includes(estado)) {
      return res.status(400).json({ error: "Estado dental no válido." });
    }
    if (!/^(?:[1-4][1-8]|[5-8][1-5])$/.test(req.params.pieza)) {
      return res.status(400).json({ error: "La pieza dental debe utilizar nomenclatura FDI válida." });
    }
    if (notas !== undefined && notas !== null && (typeof notas !== "string" || notas.length > 2000)) {
      return res.status(400).json({ error: "Las notas deben ser texto de hasta 2000 caracteres." });
    }

    let atencion = null;
    if (atencionId !== undefined && atencionId !== null && atencionId !== "") {
      if (!validarIdPaciente(atencionId)) return res.status(400).json({ error: "La atención seleccionada no es válida." });
      atencion = await Atencion.findOne({
        where: { id: Number(atencionId), paciente_id: paciente.id, odontologo_id: odontologo.id },
      });
      if (!atencion) return res.status(400).json({ error: "La atención seleccionada no pertenece a este paciente u odontólogo." });
    }
    const transaction = await OdontogramaPieza.sequelize.transaction();
    let pieza;
    try {
      pieza = await OdontogramaPieza.findOne({
        where: { paciente_id: paciente.id, pieza: req.params.pieza },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const anterior = pieza ? pieza.toJSON() : null;
      const notasNuevas = notas?.trim() || null;
      if (!pieza) {
        pieza = await OdontogramaPieza.create({
          paciente_id: paciente.id,
          pieza: req.params.pieza,
          estado,
          notas: notasNuevas,
          actualizado_por: odontologo.id,
        }, { transaction });
      } else {
        await pieza.update({ estado, notas: notasNuevas, actualizado_por: odontologo.id }, { transaction });
      }
      if (!anterior || anterior.estado !== estado || (anterior.notas || null) !== notasNuevas) {
        await OdontogramaCambio.create({
          paciente_id: paciente.id,
          atencion_id: atencion?.id || null,
          odontologo_id: odontologo.id,
          pieza: req.params.pieza,
          estado_anterior: anterior?.estado || null,
          notas_anteriores: anterior?.notas || null,
          estado_nuevo: estado,
          notas_nuevas: notasNuevas,
        }, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    res.json(pieza);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "La pieza fue actualizada al mismo tiempo. Recarga el odontograma e inténtalo nuevamente." });
    }
    res.status(400).json({ error: error.message });
  }
};
