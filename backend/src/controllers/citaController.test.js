import test from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";
import { Cita, Notificacion, Odontologo, Paciente, sequelize } from "../models/index.js";
import { aprobarSolicitudCita, crearCita, obtenerHoraFinCita } from "./citaController.js";

const crearRespuesta = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("appointment end time defaults to one hour after the required start time", () => {
  assert.equal(obtenerHoraFinCita("09:00:00", ""), "10:00:00");
  assert.equal(obtenerHoraFinCita("09:00:00", "09:45:00"), "09:45:00");
  assert.equal(obtenerHoraFinCita("09:00:00", "08:30:00"), null);
  assert.equal(obtenerHoraFinCita("23:00:00", ""), null);
});

test("reception cannot create a second appointment for the same dentist and start time", async () => {
  const originalTransaction = sequelize.transaction;
  const originalPatientFindByPk = Paciente.findByPk;
  const originalOdontologistFindByPk = Odontologo.findByPk;
  const originalAppointmentFindOne = Cita.findOne;
  const originalAppointmentCreate = Cita.create;
  let query;
  let created = false;
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });
  Paciente.findByPk = async () => ({ id: 7, email: "paciente@example.test" });
  Odontologo.findByPk = async () => ({ id: 3, nombre: "Dra. Ana" });
  Cita.findOne = async (options) => {
    query = options;
    return { id: 12 };
  };
  Cita.create = async () => {
    created = true;
  };

  try {
    const res = crearRespuesta();
    await crearCita({
      user: { rol: "recepcionista" },
      body: {
        paciente_id: 7,
        odontologo_id: 3,
        fecha: "2026-11-03",
        hora_inicio: "10:00:00",
        hora_fin: "",
        doctor: "Dra. Ana",
        motivo: "Consulta",
      },
    }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /ya tiene una cita/i);
    assert.equal(query.where.fecha, "2026-11-03");
    assert.equal(query.where.hora_inicio, "10:00:00");
    assert.deepEqual(query.where[Op.or], [
      { odontologo_id: 3 },
      { doctor: "Dra. Ana" },
    ]);
    assert.equal(created, false);
  } finally {
    sequelize.transaction = originalTransaction;
    Paciente.findByPk = originalPatientFindByPk;
    Odontologo.findByPk = originalOdontologistFindByPk;
    Cita.findOne = originalAppointmentFindOne;
    Cita.create = originalAppointmentCreate;
  }
});

test("reception approval confirms a pending appointment and notifies its patient", async () => {
  const originalTransaction = sequelize.transaction;
  const originalFindByPk = Cita.findByPk;
  const originalFindOne = Cita.findOne;
  const originalOdontologistFindByPk = Odontologo.findByPk;
  const originalNotificationCreate = Notificacion.create;
  let actualizacion;
  let notificacion;
  const solicitud = {
    id: 15,
    paciente_id: 7,
    odontologo_id: 3,
    doctor: "Dra. Ana",
    fecha: "2026-11-03",
    hora_inicio: "10:00:00",
    estado: "Solicitud de cita",
    token_respuesta: null,
    update: async (cambios) => {
      actualizacion = cambios;
      Object.assign(solicitud, cambios);
    },
  };
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });
  Cita.findByPk = async (id, options) => {
    assert.equal(id, 15);
    assert.equal(options.lock, "UPDATE");
    return solicitud;
  };
  Cita.findOne = async () => null;
  Odontologo.findByPk = async () => ({ id: 3 });
  Notificacion.create = async (datos) => {
    notificacion = datos;
  };

  try {
    const res = crearRespuesta();
    await aprobarSolicitudCita({ params: { id: "15" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(actualizacion.estado, "Confirmada");
    assert.ok(actualizacion.token_respuesta);
    assert.equal(notificacion.paciente_id, 7);
    assert.equal(notificacion.cita_id, 15);
    assert.equal(res.body.cita.estado, "Confirmada");
  } finally {
    sequelize.transaction = originalTransaction;
    Cita.findByPk = originalFindByPk;
    Cita.findOne = originalFindOne;
    Odontologo.findByPk = originalOdontologistFindByPk;
    Notificacion.create = originalNotificationCreate;
  }
});
