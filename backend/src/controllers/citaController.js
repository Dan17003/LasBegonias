import { Cita } from "../models/index.js";

export const crearCita = async (req, res) => {
  const cita = await Cita.create(req.body);
  res.json(cita);
};

export const listarCitas = async (req, res) => {
  const citas = await Cita.findAll();
  res.json(citas);
};