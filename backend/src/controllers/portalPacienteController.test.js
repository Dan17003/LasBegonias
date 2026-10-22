import test from "node:test";
import assert from "node:assert/strict";
import { requirePatient } from "../middlewares/authMiddleware.js";
import { Paciente, Usuario, Cita, Odontologo } from "../models/index.js";
import {
  actualizarPerfilPaciente,
  listarDisponibilidadPaciente,
  listarCitasPaciente,
  obtenerPerfilPaciente,
} from "./portalPacienteController.js";

const crearRespuesta = () => ({
  statusCode: 200,
  headers: {},
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  set(name, value) {
    this.headers[name] = value;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const proximaFechaConDia = (diaSemana) => {
  const fecha = new Date();
  fecha.setHours(12, 0, 0, 0);
  do {
    fecha.setDate(fecha.getDate() + 1);
  } while (fecha.getDay() !== diaSemana);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};

test("patient profile read is scoped to the authenticated account and omits internal fields", async () => {
  const originalFindOne = Paciente.findOne;
  const originalFindByPk = Usuario.findByPk;
  let patientQuery;
  Paciente.findOne = async (options) => {
    patientQuery = options;
    return {
      id: 7,
      usuario_id: 42,
      dni: "123",
      nombres: "Ana",
      observaciones: "Nota interna",
    };
  };
  Usuario.findByPk = async () => ({ email: "ana@example.test" });

  try {
    const res = crearRespuesta();
    await obtenerPerfilPaciente({ user: { id: 42 } }, res);
    assert.deepEqual(patientQuery.where, { usuario_id: 42 });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.paciente.nombres, "Ana");
    assert.equal(res.body.paciente.usuario_id, undefined);
    assert.equal(res.body.paciente.observaciones, undefined);
    assert.equal(res.body.emailAcceso, "ana@example.test");
  } finally {
    Paciente.findOne = originalFindOne;
    Usuario.findByPk = originalFindByPk;
  }
});

test("patient profile update accepts personal fields but ignores identity and ownership fields", async () => {
  const originalFindOne = Paciente.findOne;
  let cambiosAplicados;
  Paciente.findOne = async () => {
    const paciente = {
      id: 7,
      dni: "123",
      nombres: "Ana",
      update: async (changes) => {
        cambiosAplicados = changes;
        Object.assign(paciente, changes);
      },
    };
    return paciente;
  };

  try {
    const res = crearRespuesta();
    await actualizarPerfilPaciente({
      user: { id: 42 },
      body: { nombres: " Ana María ", dni: "999", usuario_id: 999, observaciones: "cambiar" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(cambiosAplicados, { nombres: "Ana María" });
    assert.equal(res.body.paciente.dni, "123");
  } finally {
    Paciente.findOne = originalFindOne;
  }
});

test("patient appointment list is restricted to the patient's linked record", async () => {
  const originalPatientFindOne = Paciente.findOne;
  const originalCitaFindAll = Cita.findAll;
  let appointmentQuery;
  Paciente.findOne = async () => ({ id: 7 });
  Cita.findAll = async (options) => {
    appointmentQuery = options;
    return [];
  };

  try {
    const res = crearRespuesta();
    await listarCitasPaciente({ user: { id: 42 } }, res);
    assert.deepEqual(appointmentQuery.where, { paciente_id: 7 });
    assert.equal(res.statusCode, 200);
  } finally {
    Paciente.findOne = originalPatientFindOne;
    Cita.findAll = originalCitaFindAll;
  }
});

test("appointment availability follows the odontologist morning shift", async () => {
  const originalOdontologoFindAll = Odontologo.findAll;
  const originalCitaFindAll = Cita.findAll;
  Odontologo.findAll = async () => [{
    id: 3,
    nombre: "Dra. Ana",
    turno: "Mañana (08:00 AM - 01:00 PM)",
  }];
  Cita.findAll = async () => [];

  try {
    const res = crearRespuesta();
    await listarDisponibilidadPaciente({ query: { fecha: proximaFechaConDia(2) } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slots[0].hora_inicio, "08:00");
    assert.equal(res.body.slots.at(-1).hora_inicio, "12:30");
    assert.equal(res.body.slots.length, 10);
  } finally {
    Odontologo.findAll = originalOdontologoFindAll;
    Cita.findAll = originalCitaFindAll;
  }
});

test("appointment availability follows the odontologist afternoon shift", async () => {
  const originalOdontologoFindAll = Odontologo.findAll;
  const originalCitaFindAll = Cita.findAll;
  Odontologo.findAll = async () => [{
    id: 4,
    nombre: "Dr. Luis",
    turno: "Tarde (02:00 PM - 08:00 PM)",
  }];
  Cita.findAll = async () => [];

  try {
    const res = crearRespuesta();
    await listarDisponibilidadPaciente({ query: { fecha: proximaFechaConDia(2) } }, res);
    assert.equal(res.body.slots[0].hora_inicio, "14:00");
    assert.equal(res.body.slots.at(-1).hora_inicio, "19:30");
    assert.equal(res.body.slots.length, 12);
  } finally {
    Odontologo.findAll = originalOdontologoFindAll;
    Cita.findAll = originalCitaFindAll;
  }
});

test("Saturday availability is limited to Saturday-shift odontologists", async () => {
  const originalOdontologoFindAll = Odontologo.findAll;
  const originalCitaFindAll = Cita.findAll;
  Odontologo.findAll = async () => [{
    id: 5,
    nombre: "Dra. Rosa",
    turno: "Sábados (08:00 AM - 04:00 PM)",
  }];
  Cita.findAll = async () => [];

  try {
    const diaLaboral = crearRespuesta();
    await listarDisponibilidadPaciente({ query: { fecha: proximaFechaConDia(2) } }, diaLaboral);
    assert.deepEqual(diaLaboral.body.slots, []);

    const sabado = crearRespuesta();
    await listarDisponibilidadPaciente({ query: { fecha: proximaFechaConDia(6) } }, sabado);
    assert.equal(sabado.body.slots[0].hora_inicio, "08:00");
    assert.equal(sabado.body.slots.at(-1).hora_inicio, "15:30");
    assert.equal(sabado.body.slots.length, 16);
  } finally {
    Odontologo.findAll = originalOdontologoFindAll;
    Cita.findAll = originalCitaFindAll;
  }
});

test("only a patient role passes the patient portal guard", () => {
  let nextCalled = false;
  const patientResponse = crearRespuesta();
  requirePatient({ user: { rol: "paciente" } }, patientResponse, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  const staffResponse = crearRespuesta();
  requirePatient({ user: { rol: "admin" } }, staffResponse, () => { nextCalled = true; });
  assert.equal(staffResponse.statusCode, 403);
});
