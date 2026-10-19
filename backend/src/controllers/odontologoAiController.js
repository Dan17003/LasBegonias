import { Op } from "sequelize";
import {
  AntecedenteOdontologico,
  Atencion,
  Cita,
  HistoriaAlergia,
  HistoriaClinicaPerfil,
  HistoriaDiagnostico,
  HistoriaMedicamento,
  Odontologo,
  OdontogramaPieza,
  Paciente,
  PeriodontogramaMedicion,
  PlanTratamiento,
  ProcedimientoRealizado,
  Usuario,
} from "../models/index.js";
import { validarAccesoPaciente } from "./historiaController.js";
import { AiServiceError, responderConsultaOdontologica } from "../services/odontologoAiService.js";

const SECCIONES_RESUMEN = [
  "motivoConsulta", "antecedentesMedicos", "alergias", "medicamentos",
  "antecedentesOdontologicos", "examenes", "odontograma", "periodontograma",
  "diagnosticos", "planesTratamiento", "atenciones", "procedimientos",
];

const REQUIERE_CONTEXTO_ANTERIOR = /\b(eso|esto|esa|ese|aquello|aquella|aquel|lo anterior|la anterior|el anterior|en ese caso|en este caso|entonces|influye|afecta|lo que dijiste|lo que mencionaste|mas detalle|amplia|explica mas|otra opcion|otra alternativa|mas opciones|alguna alternativa|primera opcion|segunda opcion|cual opcion)\b/i;

const normalizarTexto = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es-PE");

const SOLICITA_SUGERENCIAS_CLINICAS = /\b(suger\w*|recomend\w*|opciones? de tratamiento|alternativas? (?:de )?tratamiento|que procedimientos? (?:podria|puedo|deberia|se puede|recomiendas?|considerar|valorar)|que tratamientos? (?:podria|puedo|deberia|considerar|valorar)|procedimientos? (?:posibles|a considerar|por valorar)|que podria realizar|que se le puede hacer)\b/i;
const SECCIONES_PARA_SUGERENCIAS = [
  "motivoConsulta", "antecedentesMedicos", "alergias", "medicamentos",
  "antecedentesOdontologicos", "examenes", "odontograma", "periodontograma",
  "diagnosticos", "planesTratamiento", "atenciones", "procedimientos",
];

export const seleccionarSecciones = (message, conversation) => {
  const texto = normalizarTexto(message);
  const secciones = new Set();
  const agregar = (pattern, ...values) => {
    if (pattern.test(texto)) values.forEach((value) => secciones.add(value));
  };

  if (SOLICITA_SUGERENCIAS_CLINICAS.test(texto)) {
    SECCIONES_PARA_SUGERENCIAS.forEach((value) => secciones.add(value));
  }

  if (/\b(resumen|resume|resumir)\s+(?:de\s+)?(?:la\s+)?(?:historia clinica|informacion clinica|todo)\b|\b(historia clinica completa|informacion clinica relevante)\b/.test(texto)) {
    SECCIONES_RESUMEN.forEach((value) => secciones.add(value));
  }
  agregar(/\b(motivo de consulta|por que consult|razon de consulta)\b/, "motivoConsulta");
  agregar(/\b(alerg\w*|reaccion alergica)\b/, "alergias");
  agregar(/\b(medic\w*|farmac\w*|dosis|interaccion medicamentosa)\b/, "medicamentos");
  agregar(/\b(antecedentes? medicos?|antecedentes? de salud|hipertension|diabet|asma|embarazo|enfermedad|condicion medica)\b/, "antecedentesMedicos");
  agregar(/\b(antecedente odontolog|historial odontolog)\b/, "antecedentesOdontologicos");
  agregar(/\b(examen extraoral|examen intraoral|examenes registrados|hallazgos clinicos)\b/, "examenes");
  agregar(/\b(odontograma|pieza dental|diente|caries|corona|pieza ausente)\b/, "odontograma");
  agregar(/\b(periodontograma|sondaje|sangrado gingival|movilidad dental|furcacion|periodontal)\b/, "periodontograma");
  agregar(/\b(diagnostico|diagnosticos|diagnosticado)\b/, "diagnosticos");
  agregar(/\b(tratamiento|tratamientos|plan terapeutico|plan de tratamiento|pendiente)\b/, "planesTratamiento");
  agregar(/\b(procedimiento|procedimientos)\b/, "procedimientos");
  agregar(/\b(atencion|atenciones|evolucion|cambios entre|compar|ultima consulta|ultimas consultas)\b/, "atenciones");
  agregar(/\b(proxima cita|citas futuras|proxima atencion|cuando es su cita)\b/, "citas");
  agregar(/\b(edad|cuantos anos tiene|anos tiene)\b/, "edad");
  agregar(/\b(sexo|genero)\b/, "sexo");

  if (secciones.size === 0 || REQUIERE_CONTEXTO_ANTERIOR.test(texto)) {
    const preguntaAnterior = [...conversation].reverse().find((item) => item.role === "user");
    if (preguntaAnterior) {
      const textoAnterior = normalizarTexto(preguntaAnterior.content);
      if (/\b(resumen|resume|resumir)\s+(?:de\s+)?(?:la\s+)?(?:historia clinica|informacion clinica|todo)\b|\b(historia clinica completa|informacion clinica relevante)\b/.test(textoAnterior)) {
        SECCIONES_RESUMEN.forEach((value) => secciones.add(value));
      }
      if (SOLICITA_SUGERENCIAS_CLINICAS.test(textoAnterior)) {
        SECCIONES_PARA_SUGERENCIAS.forEach((value) => secciones.add(value));
      }
      for (const [pattern, ...values] of [
        [/\b(alerg\w*|reaccion alergica)\b/, "alergias"],
        [/\b(medic\w*|farmac\w*|dosis)\b/, "medicamentos"],
        [/\b(antecedentes? medicos?|antecedentes? de salud|hipertension|diabet|asma|embarazo|enfermedad)\b/, "antecedentesMedicos"],
        [/\b(odontograma|pieza dental|diente|caries|corona)\b/, "odontograma"],
        [/\b(periodontograma|sondaje|periodontal)\b/, "periodontograma"],
        [/\b(diagnostico|diagnosticos)\b/, "diagnosticos"],
        [/\b(tratamiento|plan terapeutico|pendiente)\b/, "planesTratamiento"],
        [/\b(procedimiento)\b/, "procedimientos"],
        [/\b(atencion|evolucion|cambios entre|compar|consulta)\b/, "atenciones"],
      ]) {
        if (pattern.test(textoAnterior)) values.forEach((value) => secciones.add(value));
      }
    }
  }

  return [...secciones];
};

const redactarTextoPersonal = (value, paciente, ocultarNombresProbables = false) => {
  let text = String(value ?? "");
  const datosPersonales = [
    paciente.nombres,
    paciente.apellidos,
    `${paciente.nombres || ""} ${paciente.apellidos || ""}`.trim(),
    paciente.dni,
    paciente.telefono,
    paciente.email,
  ].filter((dato) => typeof dato === "string" && dato.trim().length >= 3);

  for (const dato of datosPersonales.sort((a, b) => b.length - a.length)) {
    text = text.replace(new RegExp(dato.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[dato personal omitido]");
  }
  if (ocultarNombresProbables) {
    text = text.replace(/\b[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)+\b/g, "[posible nombre omitido]");
  }
  return text
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "[credencial omitida]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[token omitido]")
    .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,})\b/g, "[clave omitida]")
    .replace(/\b(?:patient\s*id|id\s+(?:del\s+)?paciente|paciente\s*(?:id|#))\s*[:=#]?\s*\d+\b/gi, "[identificador omitido]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[correo omitido]")
    .replace(/\b\d{8}\b/g, "[identificador omitido]")
    .replace(/\b(?:\+?51[\s-]?)?9(?:[\s-]?\d){8}\b/g, "[teléfono omitido]")
    .replace(/\b(?:dni|documento|tel[eé]fono|celular|correo|email|direcci[oó]n|domicilio|fecha de nacimiento|token|jwt|api key|secret|password|contrase(?:ña|na))\s*[:=]\s*[^,;\n]+/gi, "[dato sensible omitido]");
};

const limpiarJsonClinico = (value, paciente, depth = 0) => {
  if (typeof value === "string") return redactarTextoPersonal(value, paciente).slice(0, 1200);
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => limpiarJsonClinico(item, paciente, depth + 1));
  if (!value || typeof value !== "object") return value;
  if (depth >= 4) return "[contenido omitido]";

  const camposNoPermitidos = /(^id$|(?:^|[_-])id(?:$|[_-])|patient.?id|paciente.?id|odontologo.?id|doctor.?id|nombre|name|apellido|surname|dni|email|correo|telefono|phone|direccion|address|domicilio|usuario|token|password|created|updated|creado|actualizado|autor)/i;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !camposNoPermitidos.test(key))
      .slice(0, 30)
      .map(([key, nested]) => [key, limpiarJsonClinico(nested, paciente, depth + 1)])
  );
};

const obtenerRegistro = async (Model, pacienteId, paciente, fields, order, limit = 20) => {
  const rows = await Model.findAll({
    attributes: fields,
    where: { paciente_id: pacienteId },
    order,
    limit,
  });
  return rows.map((row) => Object.fromEntries(
    fields.map((field) => [field, limpiarJsonClinico(row.get(field), paciente)])
  ));
};

const obtenerEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00Z`);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  if (
    hoy.getUTCMonth() < nacimiento.getUTCMonth() ||
    (hoy.getUTCMonth() === nacimiento.getUTCMonth() && hoy.getUTCDate() < nacimiento.getUTCDate())
  ) edad -= 1;
  return edad;
};

const obtenerUsuarioOdontologoActual = async (req) => {
  const usuarioId = Number(req.user?.id);
  if (!Number.isSafeInteger(usuarioId) || usuarioId < 1) return null;
  const usuario = await Usuario.findByPk(usuarioId, { attributes: ["id", "rol", "activo"] });
  if (!usuario || usuario.activo === false || usuario.rol?.toLowerCase() !== "odontologo") return null;
  return usuario;
};

const obtenerContextoClinico = async (paciente, odontologo, secciones) => {
  const context = {};
  const tareas = [];
  const incluir = (section, key, task) => {
    if (!secciones.includes(section)) return;
    tareas.push(Promise.resolve().then(task).then((value) => { context[key] = value; }));
  };
  const cargarPerfil = (section, key, fields) => incluir(section, key, () => HistoriaClinicaPerfil.findOne({
      attributes: fields,
      where: { paciente_id: paciente.id },
    }).then((perfil) => perfil
      ? Object.fromEntries(fields.map((field) => [field, limpiarJsonClinico(perfil.get(field), paciente)]))
      : null));

  cargarPerfil("motivoConsulta", "motivoConsulta", ["motivo", "motivo_tipo", "motivo_descripcion"]);
  cargarPerfil("antecedentesMedicos", "antecedentesMedicos", [
    "antecedentes_medicos", "antecedentes_medicos_otros", "embarazo", "antecedentes",
  ]);
  cargarPerfil("examenes", "examenes", ["examen_extraoral", "examen_intraoral", "examenes"]);

  const registrosClinicos = [
    ["alergias", "alergias", HistoriaAlergia, ["sustancia", "reaccion", "severidad"], [["creado_en", "DESC"]]],
    ["medicamentos", "medicamentos", HistoriaMedicamento, ["nombre", "dosis", "frecuencia", "via", "indicaciones", "activo"], [["creado_en", "DESC"]]],
    ["antecedentesOdontologicos", "antecedentesOdontologicos", AntecedenteOdontologico, ["tipo", "descripcion", "fecha"], [["fecha", "DESC"]]],
    ["odontograma", "odontograma", OdontogramaPieza, ["pieza", "estado", "notas"], [["pieza", "ASC"]]],
    ["periodontograma", "periodontograma", PeriodontogramaMedicion, ["pieza", "sitio", "profundidad_sondaje", "nivel_insercion", "sangrado", "movilidad", "furcacion", "notas"], [["pieza", "ASC"]]],
    ["diagnosticos", "diagnosticos", HistoriaDiagnostico, ["codigo", "descripcion", "tipo", "estado", "notas"], [["creado_en", "DESC"]]],
    ["planesTratamiento", "planesTratamiento", PlanTratamiento, ["titulo", "descripcion", "estado", "prioridad", "fecha_inicio", "fecha_fin"], [["creado_en", "DESC"]]],
    ["procedimientos", "procedimientos", ProcedimientoRealizado, ["pieza", "codigo", "descripcion", "fecha", "observaciones"], [["fecha", "DESC"]]],
  ];

  for (const [section, key, Model, fields, order] of registrosClinicos) {
    incluir(section, key, () => obtenerRegistro(Model, paciente.id, paciente, fields, order));
  }

  incluir("atenciones", "atencionesAnteriores", () => Atencion.findAll({
    attributes: [
      "fecha", "motivo_consulta", "antecedentes", "evaluacion", "hallazgos", "diagnostico",
      "procedimiento", "tratamiento", "evolucion", "indicaciones", "proxima_cita", "observaciones",
    ],
    where: { paciente_id: paciente.id, odontologo_id: odontologo.id },
    order: [["fecha", "DESC"], ["id", "DESC"]],
    limit: 5,
  }).then((rows) => rows.map((row) => Object.fromEntries(
    ["fecha", "motivo_consulta", "antecedentes", "evaluacion", "hallazgos", "diagnostico",
      "procedimiento", "tratamiento", "evolucion", "indicaciones", "proxima_cita", "observaciones"]
      .map((field) => [field, limpiarJsonClinico(row.get(field), paciente)])
  ))));

  incluir("citas", "proximasCitas", () => Cita.findAll({
    attributes: ["fecha", "hora_inicio", "motivo", "servicio", "estado"],
    where: {
      paciente_id: paciente.id,
      odontologo_id: odontologo.id,
      fecha: { [Op.gte]: new Date().toISOString().slice(0, 10) },
    },
    order: [["fecha", "ASC"], ["hora_inicio", "ASC"]],
    limit: 5,
  }).then((rows) => rows.map((row) => Object.fromEntries(
    ["fecha", "hora_inicio", "motivo", "servicio", "estado"]
      .map((field) => [field, limpiarJsonClinico(row.get(field), paciente)])
  ))));

  if (secciones.includes("edad")) context.edad = obtenerEdad(paciente.fecha_nacimiento);
  if (secciones.includes("sexo")) context.sexo = redactarTextoPersonal(paciente.sexo || "", paciente);
  await Promise.all(tareas);
  return context;
};

const validarConversacion = (conversation) => {
  if (conversation === undefined) return [];
  if (!Array.isArray(conversation) || conversation.length > 12) return null;
  if (conversation.some((item) =>
    !item ||
    !["user", "assistant"].includes(item.role) ||
    typeof item.content !== "string" ||
    !item.content.trim()
  )) return null;
  return conversation.map(({ role, content }) => ({ role, content: content.trim().slice(0, 2000) }));
};

const obtenerConversacionParaProveedor = (conversation, message, paciente) => {
  const requiereContextoAnterior = REQUIERE_CONTEXTO_ANTERIOR.test(normalizarTexto(message));
  if (!requiereContextoAnterior) return [];
  return conversation.slice(-2).map(({ role, content }) => ({
    role,
    content: redactarTextoPersonal(content, paciente, true),
  }));
};

export const conversarConAsistenteOdontologico = async (req, res) => {
  const { patientId, message, conversation } = req.body || {};
  const patientIdValue = typeof patientId === "number"
    ? patientId
    : typeof patientId === "string" && /^\d+$/.test(patientId) ? Number(patientId) : NaN;
  if (!Number.isSafeInteger(patientIdValue) || patientIdValue < 1) {
    return res.status(400).json({ error: "Selecciona un paciente válido." });
  }
  if (typeof message !== "string" || !message.trim() || message.trim().length > 2000) {
    return res.status(400).json({ error: "Escribe una consulta de hasta 2000 caracteres." });
  }
  const historial = validarConversacion(conversation);
  if (!historial) return res.status(400).json({ error: "El contexto de conversación no es válido." });

  try {
    const usuario = await obtenerUsuarioOdontologoActual(req);
    if (!usuario) {
      return res.status(403).json({ error: "No autorizado para utilizar el asistente." });
    }

    const { paciente, odontologo } = await validarAccesoPaciente(req, patientIdValue);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso clínico a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });

    const mensajeSeguro = redactarTextoPersonal(message.trim(), paciente, true);
    const secciones = seleccionarSecciones(mensajeSeguro, historial);
    const context = await obtenerContextoClinico(paciente, odontologo, secciones);
    const answer = await responderConsultaOdontologica({
      context,
      conversation: obtenerConversacionParaProveedor(historial, mensajeSeguro, paciente),
      message: mensajeSeguro,
    });
    res.json({ answer });
  } catch (error) {
    if (error instanceof AiServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("AI chat request failed", { status: 500, operation: "build-context-or-provider-response" });
    res.status(500).json({ error: "No se pudo procesar la consulta en este momento." });
  }
};

export const listarPacientesParaAsistente = async (req, res) => {
  try {
    const usuario = await obtenerUsuarioOdontologoActual(req);
    if (!usuario) {
      return res.status(403).json({ error: "No autorizado para utilizar el asistente." });
    }
    const odontologo = await Odontologo.findOne({
      attributes: ["id"],
      where: { usuario_id: usuario.id },
    });
    if (!odontologo) return res.status(404).json({ error: "El usuario no tiene perfil odontológico." });

    const [citas, atenciones] = await Promise.all([
      Cita.findAll({
        attributes: ["paciente_id"],
        where: { odontologo_id: odontologo.id },
        group: ["paciente_id"],
      }),
      Atencion.findAll({
        attributes: ["paciente_id"],
        where: { odontologo_id: odontologo.id },
        group: ["paciente_id"],
      }),
    ]);
    const patientIds = [...new Set([...citas, ...atenciones].map((row) => row.get("paciente_id")))];
    if (patientIds.length === 0) return res.json([]);

    const pacientes = await Paciente.findAll({
      attributes: ["id", "nombres", "apellidos"],
      where: { id: patientIds },
      order: [["nombres", "ASC"], ["apellidos", "ASC"]],
    });
    res.json(pacientes);
  } catch {
    console.error("AI patient selector request failed", { status: 500 });
    res.status(500).json({ error: "No se pudieron cargar los pacientes autorizados." });
  }
};
