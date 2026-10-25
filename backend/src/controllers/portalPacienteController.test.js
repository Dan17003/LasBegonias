import test from "node:test";
import assert from "node:assert/strict";
import { requirePatient } from "../middlewares/authMiddleware.js";
import { Paciente, Usuario, Cita, Odontologo, Servicio } from "../models/index.js";
import {
  actualizarPerfilPaciente,
  esServicioPacienteAutogestionable,
  listarDisponibilidadPaciente,
  listarCitasPaciente,
  obtenerPerfilPaciente,
  solicitarCitaPaciente,
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
    assert.equal(res.body.slots.at(-1).hora_inicio, "12:00");
    assert.equal(res.body.slots.length, 5);
    assert.deepEqual(res.body.slots.map((slot) => slot.hora_inicio), ["08:00", "09:00", "10:00", "11:00", "12:00"]);
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
    assert.equal(res.body.slots.at(-1).hora_inicio, "19:00");
    assert.equal(res.body.slots.length, 6);
    assert.deepEqual(res.body.slots.map((slot) => slot.hora_inicio), ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]);
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
    assert.equal(sabado.body.slots.at(-1).hora_inicio, "15:00");
    assert.equal(sabado.body.slots.length, 8);
    assert.deepEqual(sabado.body.slots.map((slot) => slot.hora_inicio), ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]);
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

test("patient self-booking is limited to basic consultation and cleaning services", () => {
  assert.equal(esServicioPacienteAutogestionable({ nombre: "Consulta" }), true);
  assert.equal(esServicioPacienteAutogestionable({ nombre: "Limpieza dental" }), true);
  assert.equal(esServicioPacienteAutogestionable({ nombre: "Tomografía Computarizada Cone Beam" }), false);
  assert.equal(esServicioPacienteAutogestionable({ nombre: "Tratamiento periodontal especializado" }), false);
});

test("patient cannot request an appointment for a treatment requiring odontologist evaluation", async () => {
  const originalPatientFindOne = Paciente.findOne;
  const originalServiceFindOne = Servicio.findOne;
  const originalAppointmentCreate = Cita.create;
  let appointmentCreated = false;
  Paciente.findOne = async () => ({ id: 7 });
  Servicio.findOne = async () => ({ nombre: "Tomografía Computarizada Cone Beam" });
  Cita.create = async () => {
    appointmentCreated = true;
  };

  try {
    const res = crearRespuesta();
    await solicitarCitaPaciente({
      user: { id: 42 },
      body: {
        fecha: proximaFechaConDia(2),
        hora_inicio: "10:00",
        servicio_id: 3,
      },
    }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(appointmentCreated, false);
  } finally {
    Paciente.findOne = originalPatientFindOne;
    Servicio.findOne = originalServiceFindOne;
    Cita.create = originalAppointmentCreate;
  }
});
