import test from "node:test";
import assert from "node:assert/strict";
import { Paciente, Usuario, sequelize } from "../models/index.js";
import { actualizarPaciente, crearPaciente } from "./pacienteController.js";

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

test("staff patient updates synchronize the linked account email and display name", async () => {
  const originalPatientFindByPk = Paciente.findByPk;
  const originalUserFindOne = Usuario.findOne;
  const originalUserFindByPk = Usuario.findByPk;
  const originalTransaction = sequelize.transaction;
  let cambiosPaciente;
  let cambiosUsuario;
  const paciente = {
    id: 7,
    usuario_id: 42,
    email: "anterior@example.test",
    nombres: "Ana",
    apellidos: "Pérez",
    update: async (changes) => {
      cambiosPaciente = changes;
      Object.assign(paciente, changes);
    },
  };
  Paciente.findByPk = async () => paciente;
  Usuario.findOne = async () => null;
  Usuario.findByPk = async () => ({
    id: 42,
    update: async (changes) => { cambiosUsuario = changes; },
  });
  sequelize.transaction = async (callback) => callback({});

  try {
    const res = crearRespuesta();
    await actualizarPaciente({
      params: { id: "7" },
      body: {
        dni: "12345678",
        nombres: "Ana María",
        apellidos: "Pérez",
        email: "NUEVO@example.test",
        telefono: "999111222",
        usuario_id: 99,
      },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(cambiosPaciente.dni, "12345678");
    assert.equal(cambiosPaciente.email, "nuevo@example.test");
    assert.equal(cambiosPaciente.telefono, "999111222");
    assert.equal(cambiosPaciente.usuario_id, undefined);
    assert.equal(cambiosUsuario.email, "nuevo@example.test");
    assert.equal(cambiosUsuario.nombre, "Ana María Pérez");
  } finally {
    Paciente.findByPk = originalPatientFindByPk;
    Usuario.findOne = originalUserFindOne;
    Usuario.findByPk = originalUserFindByPk;
    sequelize.transaction = originalTransaction;
  }
});

test("staff cannot create a second patient with an existing DNI", async () => {
  const originalPatientFindOne = Paciente.findOne;
  const originalPatientCreate = Paciente.create;
  let created = false;
  Paciente.findOne = async () => ({ id: 7 });
  Paciente.create = async () => {
    created = true;
  };

  try {
    const res = crearRespuesta();
    await crearPaciente({
      body: {
        dni: " 12345678 ",
        nombres: "Ana",
        email: "ana@example.test",
      },
    }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /DNI/i);
    assert.equal(created, false);
  } finally {
    Paciente.findOne = originalPatientFindOne;
    Paciente.create = originalPatientCreate;
  }
});
