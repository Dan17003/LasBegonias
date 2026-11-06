import test from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";
import {
  Atencion,
  Cita,
  HistoriaClinicaPerfil,
  Notificacion,
  Odontologo,
  OdontogramaCambio,
  Paciente,
  sequelize,
} from "../models/index.js";
import { guardarPerfilHistoria, obtenerResumenInicioOdontologo } from "./historiaController.js";

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

test("odontologist changes to patient antecedents require renewed confirmation and notify the patient", async () => {
  const originals = [
    [Odontologo, "findOne", Odontologo.findOne],
    [Cita, "findOne", Cita.findOne],
    [Paciente, "findByPk", Paciente.findByPk],
    [HistoriaClinicaPerfil, "findOne", HistoriaClinicaPerfil.findOne],
    [Notificacion, "create", Notificacion.create],
    [sequelize, "transaction", sequelize.transaction],
  ];
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  const profile = {
    antecedentes_medicos: {
      "Diabetes mellitus": "No",
      declaracion_paciente: {
        enfermedades: "No",
        consentimiento_veracidad: {
          aceptado: true,
          aceptado_en: "2026-01-01T00:00:00.000Z",
        },
      },
    },
    antecedentes_medicos_otros: "Asma",
    update: async function update(changes) {
      Object.assign(this, changes);
    },
  };
  const notifications = [];
  Odontologo.findOne = async () => ({ id: 3 });
  Cita.findOne = async () => ({ id: 12 });
  Paciente.findByPk = async () => ({ id: 7 });
  HistoriaClinicaPerfil.findOne = async (_query) => profile;
  Notificacion.create = async (values, options) => {
    notifications.push({ values, options });
    return values;
  };
  sequelize.transaction = async (callback) => callback(transaction);

  try {
    const req = {
      user: { id: 30, rol: "odontologo" },
      params: { id: "7" },
      body: {
        antecedentes_medicos: {
          "Diabetes mellitus": "Sí",
          declaracion_paciente: {
            enfermedades: "No",
            consentimiento_veracidad: { aceptado: true },
          },
        },
        antecedentes_medicos_otros: "Asma",
      },
    };
    const res = crearRespuesta();

    await guardarPerfilHistoria(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(
      res.body.antecedentes_medicos.declaracion_paciente.consentimiento_veracidad.aceptado,
      false,
    );
    assert.ok(
      res.body.antecedentes_medicos.declaracion_paciente.consentimiento_veracidad.pendiente_desde,
    );
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].values.paciente_id, 7);
    assert.equal(notifications[0].values.tipo, "antecedentes_por_confirmar");
    assert.equal(notifications[0].options.transaction, transaction);
    assert.match(notifications[0].values.mensaje, /confirma nuevamente/i);

    const noOpRes = crearRespuesta();
    req.body.antecedentes_medicos = profile.antecedentes_medicos;
    await guardarPerfilHistoria(req, noOpRes);
    assert.equal(noOpRes.statusCode, 200);
    assert.equal(notifications.length, 1);
  } finally {
    for (const [model, method, original] of originals) model[method] = original;
  }
});

test("odontologist home summary reports scoped clinical tasks and recent activity", async () => {
  const originals = [
    [Odontologo, "findOne", Odontologo.findOne],
    [Cita, "findAll", Cita.findAll],
    [Atencion, "findAll", Atencion.findAll],
    [HistoriaClinicaPerfil, "findAll", HistoriaClinicaPerfil.findAll],
    [OdontogramaCambio, "findAll", OdontogramaCambio.findAll],
  ];
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const fechaAyerDate = new Date(`${fechaHoy}T00:00:00.000Z`);
  fechaAyerDate.setUTCDate(fechaAyerDate.getUTCDate() - 1);
  const fechaAyer = fechaAyerDate.toISOString().slice(0, 10);
  const paciente = (id, nombres) => ({ id, nombres, apellidos: "Paciente" });
  const citas = [
    { id: 70, paciente_id: 7, fecha: fechaAyer, hora_inicio: "08:00:00", estado: "Atendida", Paciente: paciente(7, "Ana") },
    { id: 71, paciente_id: 8, fecha: fechaHoy, hora_inicio: "09:00:00", estado: "Confirmada", Paciente: paciente(8, "Luis") },
    { id: 72, paciente_id: 7, fecha: fechaHoy, hora_inicio: "10:00:00", estado: "Cancelada", Paciente: paciente(7, "Ana") },
  ];
  Odontologo.findOne = async () => ({ id: 3, nombre: "Dra. Prueba" });
  Cita.findAll = async (options) => {
    assert.deepEqual(options.where[Op.or], [
      { odontologo_id: 3 },
      { doctor: "Dra. Prueba" },
    ]);
    return citas;
  };
  Atencion.findAll = async (options) => {
    if (options.attributes.includes("cita_id")) return [{ paciente_id: 8, cita_id: null }];
    return [{
      id: 90,
      paciente_id: 8,
      fecha: `${fechaHoy}T08:30:00.000Z`,
      creado_en: `${fechaHoy}T08:35:00.000Z`,
      motivo_consulta: "Control",
      Paciente: paciente(8, "Luis"),
    }];
  };
  HistoriaClinicaPerfil.findAll = async (options) => {
    if (options.attributes.length === 1) return [{ paciente_id: 7 }];
    return [];
  };
  OdontogramaCambio.findAll = async () => [{
    id: 4,
    paciente_id: 7,
    pieza: "11",
    creado_en: `${fechaHoy}T08:40:00.000Z`,
    Paciente: paciente(7, "Ana"),
  }];

  try {
    const res = crearRespuesta();
    await obtenerResumenInicioOdontologo({ user: { id: 30, rol: "odontologo" } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.pacientesRelacionados, 2);
    assert.equal(res.body.citasHoy.length, 1);
    assert.equal(res.body.citasProgramadas, 1);
    assert.deepEqual(res.body.pendientesClinicos, {
      historiasPorCompletar: 1,
      atencionesPorRegistrar: 1,
    });
    assert.equal(res.body.actividadClinica[0].tipo, "Odontograma actualizado");
    assert.equal(res.body.actividadClinica[0].paciente, "Ana Paciente");
    assert.ok(res.body.actividadClinica.some(({ tipo }) => tipo === "Consulta registrada"));
  } finally {
    for (const [model, method, original] of originals) model[method] = original;
  }
});
