import { Cita, Paciente } from "../models/index.js";

export const crearCita = async (req, res) => {
  const cita = await Cita.create(req.body);
  res.json(cita);
};

export const listarCitas = async (req, res) => {
  const citas = await Cita.findAll({
    include: [
      {
        model: Paciente,
      },
    ],
  });

  res.json(citas);
};