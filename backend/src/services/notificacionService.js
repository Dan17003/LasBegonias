import { Op } from "sequelize";
import { Cita, Notificacion, Paciente } from "../models/index.js";
import { enviarCorreo } from "./emailService.js";
import { crearLinksRespuesta } from "./respuestaCitaService.js";

const ESTADOS_RECORDABLES = ["Programada", "Confirmada"];

export const obtenerFechaLocalISO = () => {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatearHora = (hora) => (hora ? hora.substring(0, 5) : "");

const crearMensajeCita = (cita, tipo) => {
  const paciente = cita.Paciente;
  const nombrePaciente = [paciente?.nombres, paciente?.apellidos]
    .filter(Boolean)
    .join(" ");
  const hora = formatearHora(cita.hora_inicio);
  const fecha = cita.fecha;

  if (tipo === "confirmacion_cita") {
    return {
      titulo: "Cita registrada",
      mensaje: `${nombrePaciente || "Paciente"} tiene una cita registrada para el ${fecha} a las ${hora} con ${cita.doctor}.`,
      asunto: "Cita registrada - Clinica Las Begonias",
      textoCorreo: `Hola ${paciente?.nombres || ""}, tu cita fue registrada para el ${fecha} a las ${hora} con ${cita.doctor}. Motivo: ${cita.motivo}.`,
    };
  }

  return {
    titulo: "Recordatorio de cita",
    mensaje: `${nombrePaciente || "Paciente"} tiene una cita hoy a las ${hora} con ${cita.doctor}. Motivo: ${cita.motivo}.`,
    asunto: "Recordatorio de cita - Clinica Las Begonias",
    textoCorreo: `Hola ${paciente?.nombres || ""}, te recordamos que tienes una cita hoy a las ${hora} con ${cita.doctor}. Motivo: ${cita.motivo}.`,
  };
};

const crearHtmlCorreoCita = (text, cita) => {
  const links = crearLinksRespuesta(cita);

  if (!links) {
    return `<p>${text}</p><p>Clinica Las Begonias</p>`;
  }

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <p>${text}</p>
      <p style="margin-top: 18px;">Puedes confirmar o cancelar tu asistencia desde estos enlaces:</p>
      <p style="margin-top: 18px;">
        <a href="${links.confirmar}" style="display: inline-block; padding: 10px 14px; background: #11B9BB; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700;">Confirmar asistencia</a>
        <a href="${links.cancelar}" style="display: inline-block; padding: 10px 14px; margin-left: 8px; background: #f8fafc; color: #be123c; text-decoration: none; border: 1px solid #e2e8f0; border-radius: 8px; font-weight: 700;">Cancelar cita</a>
      </p>
      <p style="margin-top: 18px; color: #64748b; font-size: 12px;">Clinica Las Begonias</p>
    </div>
  `;
};

const enviarEmailNotificacion = async (notificacion, { to, subject, text, cita }) => {
  const resultado = await enviarCorreo({
    to,
    subject,
    text,
    html: crearHtmlCorreoCita(text, cita),
  });

  if (resultado.enviado) {
    await notificacion.update({
      canal: "app,email",
      enviada_email: true,
      fecha_envio_email: new Date(),
    });
  }

  return resultado;
};

export const crearNotificacionCita = async (
  cita,
  { enviarEmail = false, tipo = "recordatorio_cita" } = {}
) => {
  const citaCompleta = cita.Paciente
    ? cita
    : await Cita.findByPk(cita.id, { include: [{ model: Paciente }] });

  if (!citaCompleta) {
    return null;
  }

  const { titulo, mensaje, asunto, textoCorreo } = crearMensajeCita(
    citaCompleta,
    tipo
  );

  const [notificacion] = await Notificacion.findOrCreate({
    where: {
      cita_id: citaCompleta.id,
      tipo,
      fecha_programada: citaCompleta.fecha,
    },
    defaults: {
      titulo,
      mensaje,
      tipo,
      canal: "app",
      paciente_id: citaCompleta.paciente_id,
      cita_id: citaCompleta.id,
      fecha_programada: citaCompleta.fecha,
    },
  });

  if (enviarEmail && !notificacion.enviada_email && citaCompleta.Paciente?.email) {
    await enviarEmailNotificacion(notificacion, {
      to: citaCompleta.Paciente.email,
      subject: asunto,
      text: textoCorreo,
      cita: citaCompleta,
    });
  }

  return notificacion;
};

export const crearConfirmacionCita = (cita) =>
  crearNotificacionCita(cita, {
    enviarEmail: true,
    tipo: "confirmacion_cita",
  });

export const procesarEmailsPendientes = async () => {
  const pendientes = await Notificacion.findAll({
    where: {
      enviada_email: false,
      tipo: { [Op.in]: ["confirmacion_cita", "recordatorio_cita"] },
    },
    include: [{ model: Paciente }, { model: Cita }],
    limit: 50,
  });

  const enviados = [];

  for (const notificacion of pendientes) {
    const cita = notificacion.Citum || notificacion.Cita;
    const paciente = notificacion.Paciente;

    if (!cita || !paciente?.email) {
      continue;
    }

    const datosCorreo = crearMensajeCita(
      { ...cita.get({ plain: true }), Paciente: paciente },
      notificacion.tipo
    );

    const resultado = await enviarEmailNotificacion(notificacion, {
      to: paciente.email,
      subject: datosCorreo.asunto,
      text: datosCorreo.textoCorreo,
      cita,
    });

    if (resultado.enviado) {
      enviados.push(notificacion.id);
    }
  }

  return enviados;
};

export const procesarRecordatoriosDelDia = async () => {
  const citas = await Cita.findAll({
    where: {
      fecha: obtenerFechaLocalISO(),
      estado: { [Op.in]: ESTADOS_RECORDABLES },
    },
    include: [{ model: Paciente }],
  });

  const resultados = [];

  for (const cita of citas) {
    resultados.push(await crearNotificacionCita(cita, { enviarEmail: true }));
  }

  return resultados.filter(Boolean);
};

export const iniciarRecordatoriosDeCitas = () => {
  Promise.all([procesarRecordatoriosDelDia(), procesarEmailsPendientes()]).catch((error) => {
    console.error("Error procesando recordatorios de citas:", error);
  });

  setInterval(() => {
    Promise.all([procesarRecordatoriosDelDia(), procesarEmailsPendientes()]).catch((error) => {
      console.error("Error procesando recordatorios de citas:", error);
    });
  }, 60 * 60 * 1000);
};
