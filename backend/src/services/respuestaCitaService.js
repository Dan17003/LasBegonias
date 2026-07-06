import crypto from "crypto";
import { Cita, Notificacion, Paciente } from "../models/index.js";

export const generarTokenRespuesta = () => crypto.randomBytes(24).toString("hex");

export const obtenerBaseUrl = () =>
  process.env.PUBLIC_BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

export const crearLinksRespuesta = (cita) => {
  const baseUrl = obtenerBaseUrl();
  const token = cita.token_respuesta;

  if (!token) {
    return null;
  }

  return {
    confirmar: `${baseUrl}/api/citas/${cita.id}/respuesta?accion=confirmar&token=${token}`,
    cancelar: `${baseUrl}/api/citas/${cita.id}/respuesta?accion=cancelar&token=${token}`,
  };
};

export const registrarRespuestaPaciente = async ({ citaId, token, accion }) => {
  if (!["confirmar", "cancelar"].includes(accion)) {
    return { status: 400, mensaje: "Accion no valida." };
  }

  const cita = await Cita.findByPk(citaId, {
    include: [{ model: Paciente }],
  });

  if (!cita || !cita.token_respuesta || cita.token_respuesta !== token) {
    return { status: 404, mensaje: "El enlace no es valido o ya vencio." };
  }

  const estado = accion === "confirmar" ? "Confirmada" : "Cancelada";
  await cita.update({
    estado,
    fecha_respuesta_paciente: new Date(),
  });

  const pacienteNombre = [cita.Paciente?.nombres, cita.Paciente?.apellidos]
    .filter(Boolean)
    .join(" ");
  const accionTexto = accion === "confirmar" ? "confirmo" : "cancelo";

  await Notificacion.create({
    titulo: accion === "confirmar" ? "Cita confirmada" : "Cita cancelada",
    mensaje: `${pacienteNombre || "El paciente"} ${accionTexto} su asistencia para la cita del ${cita.fecha} a las ${String(cita.hora_inicio).substring(0, 5)}.`,
    tipo: accion === "confirmar" ? "respuesta_confirmada" : "respuesta_cancelada",
    canal: "app",
    paciente_id: cita.paciente_id,
    cita_id: cita.id,
    fecha_programada: cita.fecha,
  });

  return {
    status: 200,
    mensaje:
      accion === "confirmar"
        ? "Tu asistencia fue confirmada correctamente."
        : "Tu cita fue cancelada correctamente.",
  };
};
