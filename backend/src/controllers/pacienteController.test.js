import test from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";
import {
  AntecedenteOdontologico,
  Atencion,
  AtencionDiagnostico,
  Cita,
  Consentimiento,
  DocumentoClinico,
  HistoriaAlergia,
  HistoriaAntecedenteCambio,
  HistoriaClinicaPerfil,
  HistoriaDiagnostico,
  HistoriaDiagnosticoCambio,
  HistoriaMedicamento,
  Notificacion,
  OdontogramaCambio,
  OdontogramaPieza,
  Pago,
  PasswordResetToken,
  Paciente,
  PeriodontogramaEvaluacion,
  PeriodontogramaMedicion,
  PlanTratamiento,
  Presupuesto,
  PresupuestoDetalle,
  ProcedimientoRealizado,
  RespuestaPresupuestoPaciente,
  Servicio,
  ServicioSolicitado,
  SolicitudPagoPaciente,
  Usuario,
  sequelize,
} from "../models/index.js";
import { actualizarPaciente, crearPaciente, eliminarPaciente } from "./pacienteController.js";

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

test("staff patient deletion removes dependent records and the linked account atomically", async () => {
  const originals = [];
  const llamadasEliminacion = [];
  let condicionEliminacionMediciones;
  let medicionesActualizadas = false;
  const simular = (modelo, metodo, implementacion) => {
    originals.push([modelo, metodo, modelo[metodo]]);
    modelo[metodo] = implementacion;
  };
  const modelosIds = [
    Atencion,
    Cita,
    HistoriaDiagnostico,
    PeriodontogramaEvaluacion,
    Presupuesto,
  ];
  const modelosEliminacion = [
    AtencionDiagnostico,
    ProcedimientoRealizado,
    ServicioSolicitado,
    Pago,
    RespuestaPresupuestoPaciente,
    SolicitudPagoPaciente,
    Notificacion,
    OdontogramaCambio,
    OdontogramaPieza,
    PeriodontogramaMedicion,
    PeriodontogramaEvaluacion,
    HistoriaDiagnosticoCambio,
    PlanTratamiento,
    HistoriaMedicamento,
    HistoriaAlergia,
    AntecedenteOdontologico,
    Consentimiento,
    DocumentoClinico,
    HistoriaAntecedenteCambio,
    HistoriaClinicaPerfil,
    HistoriaDiagnostico,
    Atencion,
    PresupuestoDetalle,
    Presupuesto,
    Cita,
    PasswordResetToken,
    Usuario,
  ];
  const transaccion = { LOCK: { UPDATE: "UPDATE" } };
  let transaccionEjecutada = false;
  simular(sequelize, "transaction", async (callback) => {
    transaccionEjecutada = true;
    return callback(transaccion);
  });
  simular(Paciente, "findByPk", async (_id, opciones) => {
    assert.equal(opciones.transaction, transaccion);
    assert.equal(opciones.lock, "UPDATE");
    return {
      id: 7,
      usuario_id: 42,
      destroy: async (opcionesBorrado) => {
        assert.equal(opcionesBorrado.transaction, transaccion);
        llamadasEliminacion.push("Paciente");
      },
    };
  });
  for (const modelo of modelosIds) {
    simular(modelo, "findAll", async () => [{ id: modelo === Cita ? 12 : 5 }]);
  }
  simular(DocumentoClinico, "findAll", async () => []);
  for (const modelo of modelosEliminacion) {
    simular(modelo, "destroy", async ({ transaction: actual, where }) => {
      assert.equal(actual, transaccion);
      if (modelo === PeriodontogramaMedicion) condicionEliminacionMediciones = where;
      llamadasEliminacion.push(modelo.name);
      return 1;
    });
  }
  for (const modelo of [Atencion, Cita, PeriodontogramaEvaluacion, PeriodontogramaMedicion]) {
    simular(modelo, "update", async (_values, { transaction: actual }) => {
      assert.equal(actual, transaccion);
      if (modelo === PeriodontogramaMedicion) medicionesActualizadas = true;
      return [1];
    });
  }
  simular(Servicio, "update", async (_values, { transaction: actual }) => {
    assert.equal(actual, transaccion);
    return [1];
  });

  try {
    const res = crearRespuesta();
    await eliminarPaciente({ params: { id: "7" } }, res);

    assert.equal(transaccionEjecutada, true);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /eliminados definitivamente/i);
    assert.ok(llamadasEliminacion.indexOf("PeriodontogramaMedicion") < llamadasEliminacion.indexOf("Paciente"));
    assert.ok(llamadasEliminacion.indexOf("PeriodontogramaEvaluacion") < llamadasEliminacion.indexOf("Paciente"));
    assert.ok(llamadasEliminacion.indexOf("PeriodontogramaMedicion") < llamadasEliminacion.indexOf("PeriodontogramaEvaluacion"));
    assert.ok(condicionEliminacionMediciones[Op.or].some((condition) => condition.paciente_id === 7));
    assert.deepEqual(condicionEliminacionMediciones[Op.or].find((condition) => condition.evaluacion_id), {
      evaluacion_id: { [Op.in]: [5] },
    });
    assert.equal(medicionesActualizadas, false);
    assert.ok(llamadasEliminacion.indexOf("ProcedimientoRealizado") < llamadasEliminacion.indexOf("PlanTratamiento"));
    assert.ok(llamadasEliminacion.indexOf("Atencion") < llamadasEliminacion.indexOf("Cita"));
    assert.ok(llamadasEliminacion.indexOf("Paciente") < llamadasEliminacion.indexOf("Usuario"));
  } finally {
    for (const [modelo, metodo, original] of originals.reverse()) modelo[metodo] = original;
  }
});
