import { Paciente, Usuario, sequelize } from "../models/index.js";
import { esEmailValido } from "../utils/email.js";

const rechazarOdontologoAdministrativo = (req, res) => {
  if (req.user?.rol?.toLowerCase() === "odontologo") {
    res.status(403).json({ error: "El odontólogo debe consultar pacientes desde Mis pacientes." });
    return true;
  }
  return false;
};

export const crearPaciente = async (req, res) => {
  try {
    if (rechazarOdontologoAdministrativo(req, res)) return;
    if (!esEmailValido(req.body.email)) {
      return res.status(400).json({ error: "Ingrese un email valido." });
    }

    const dni = String(req.body.dni || "").trim();
    if (!dni) return res.status(400).json({ error: "El DNI es obligatorio." });
    const pacienteExistente = await Paciente.findOne({ where: { dni } });
    if (pacienteExistente) {
      return res.status(409).json({ error: "Ya existe un paciente registrado con ese DNI." });
    }

    const paciente = await Paciente.create({
      ...req.body,
      dni,
      email: String(req.body.email).trim().toLowerCase(),
    });
    res.status(201).json(paciente);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe un paciente registrado con ese DNI." });
    }
    res.status(400).json({ error: error.message });
  }
};

export const listarPacientes = async (req, res) => {
  try {
    if (rechazarOdontologoAdministrativo(req, res)) return;
    const pacientes = await Paciente.findAll();
    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPaciente = async (req, res) => {
  try {
    if (rechazarOdontologoAdministrativo(req, res)) return;
    if (!esEmailValido(req.body.email)) {
      return res.status(400).json({ error: "Ingrese un email valido." });
    }

    const paciente = await Paciente.findByPk(req.params.id);

    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    const cambios = { ...req.body };
    delete cambios.usuario_id;
    if (cambios.dni !== undefined) cambios.dni = String(cambios.dni || "").trim();
    if (cambios.email !== undefined) cambios.email = String(cambios.email || "").trim().toLowerCase();
    await sequelize.transaction(async (transaction) => {
      if (cambios.email && cambios.email !== paciente.email?.toLowerCase()) {
        const usuarioConCorreo = await Usuario.findOne({
          where: { email: cambios.email },
          transaction,
        });
        if (usuarioConCorreo && usuarioConCorreo.id !== paciente.usuario_id) {
          const error = new Error("Ese correo electrónico ya está asociado a otra cuenta.");
          error.status = 409;
          throw error;
        }
      }

      await paciente.update(cambios, { transaction });
      if (paciente.usuario_id) {
        const usuario = await Usuario.findByPk(paciente.usuario_id, { transaction });
        if (usuario) {
          await usuario.update({
            ...(cambios.email !== undefined ? { email: cambios.email } : {}),
            ...(cambios.nombres !== undefined || cambios.apellidos !== undefined
              ? { nombre: `${cambios.nombres ?? paciente.nombres} ${cambios.apellidos ?? paciente.apellidos ?? ""}`.trim() }
              : {}),
          }, { transaction });
        }
      }
    });
    res.json(paciente);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError" || error.status === 409) {
      return res.status(409).json({
        error: error.name === "SequelizeUniqueConstraintError" && error.fields?.dni
          ? "Ya existe un paciente registrado con ese DNI."
          : "Ese correo electrónico ya está asociado a otra cuenta.",
      });
    }
    res.status(400).json({ error: error.message });
  }
};

export const eliminarPaciente = async (req, res) => {
  try {
    if (rechazarOdontologoAdministrativo(req, res)) return;
    const paciente = await Paciente.findByPk(req.params.id);

    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    await paciente.destroy();
    res.json({ message: "Paciente eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
