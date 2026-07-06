import { Cita, Paciente } from "../models/index.js";
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

    const cita = await Cita.create({
      ...req.body,
      token_respuesta: generarTokenRespuesta(),
    });
    const citaConPaciente = await Cita.findByPk(cita.id, {
      include: [{ model: Paciente }],
    });

    await crearConfirmacionCita(citaConPaciente);

    if (citaConPaciente?.fecha === obtenerFechaLocalISO()) {
      await crearNotificacionCita(citaConPaciente, { enviarEmail: true });
    }

    res.status(201).json(citaConPaciente || cita);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const listarCitas = async (req, res) => {
  try {
    const citas = await Cita.findAll({
      include: [{ model: Paciente }],
      order: [["fecha", "ASC"], ["hora_inicio", "ASC"]],
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarCita = async (req, res) => {
  try {
    const cita = await Cita.findByPk(req.params.id);
    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }
    await cita.update(req.body);
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
