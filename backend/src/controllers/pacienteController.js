import { Paciente } from "../models/index.js";

export const crearPaciente = async (req, res) => {
  const paciente = await Paciente.create(req.body);
  res.json(paciente);
};

export const listarPacientes = async (req, res) => {
  const pacientes = await Paciente.findAll();
  res.json(pacientes);
};