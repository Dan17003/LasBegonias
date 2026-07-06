import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

let transporter;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER } = process.env;
  const SMTP_PASS = process.env.SMTP_PASS?.replace(/\s/g, "");

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
};

export const enviarCorreo = async ({ to, subject, text, html }) => {
  const smtp = getTransporter();

  if (!smtp) {
    console.warn("Correo no enviado: faltan variables SMTP.");
    return { enviado: false, motivo: "SMTP no configurado" };
  }

  await smtp.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { enviado: true };
};
