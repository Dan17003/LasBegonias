import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { requirePatient } from "../middlewares/authMiddleware.js";
import {
  Atencion,
  AntecedenteOdontologico,
  DocumentoClinico,
  HistoriaAlergia,
  HistoriaAntecedenteCambio,
  HistoriaClinicaPerfil,
  HistoriaDiagnostico,
  HistoriaMedicamento,
  Paciente,
  PlanTratamiento,
  ProcedimientoRealizado,
  Usuario,
  Cita,
  Odontologo,
  Servicio,
  Notificacion,
  Presupuesto,
  Pago,
  sequelize,
} from "../models/index.js";
import {
  actualizarPerfilPaciente,
  cambiarContrasenaPaciente,
  esServicioPacienteAutogestionable,
  listarDisponibilidadPaciente,
  listarCitasPaciente,
  listarFinanzasPaciente,
  listarNotificacionesPaciente,
  marcarNotificacionPacienteLeida,
  marcarTodasNotificacionesPacienteLeidas,
  obtenerPerfilPaciente,
  obtenerExpedientePaciente,
  otorgarConsentimientoAntecedentesPaciente,
  responderPreguntaPaciente,
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
  const originalPatientFindOne = Paciente.findOne;
  const originalUserFindByPk = Usuario.findByPk;
  const originalUserFindOne = Usuario.findOne;
  const originalTransaction = sequelize.transaction;
  let cambiosAplicados;
  let cambiosUsuario;
  sequelize.transaction = async (callback) => callback({});
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
  Usuario.findByPk = async () => ({
    email: "ana@example.test",
    update: async (changes) => { cambiosUsuario = changes; },
  });
  Usuario.findOne = async () => null;

  try {
    const res = crearRespuesta();
    await actualizarPerfilPaciente({
      user: { id: 42 },
      body: { nombres: " Ana María ", dni: "999", usuario_id: 999, observaciones: "cambiar" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(cambiosAplicados, { nombres: "Ana María" });
    assert.deepEqual(cambiosUsuario, { nombre: "Ana María" });
    assert.equal(res.body.paciente.dni, "123");
    assert.equal(res.body.emailAcceso, "ana@example.test");
  } finally {
    Paciente.findOne = originalPatientFindOne;
    Usuario.findByPk = originalUserFindByPk;
    Usuario.findOne = originalUserFindOne;
    sequelize.transaction = originalTransaction;
  }
});

test("patient profile email changes are synchronized with the login account", async () => {
  const originalPatientFindOne = Paciente.findOne;
  const originalUserFindByPk = Usuario.findByPk;
  const originalUserFindOne = Usuario.findOne;
  const originalTransaction = sequelize.transaction;
  let emailFicha;
  let emailCuenta;
  let paciente;
  sequelize.transaction = async (callback) => callback({});
  Paciente.findOne = async () => {
    paciente = {
      id: 7,
      dni: "123",
      nombres: "Ana",
      email: "anterior@example.test",
      update: async (changes) => {
        Object.assign(paciente, changes);
        emailFicha = changes.email;
      },
    };
    return paciente;
  };
  Usuario.findByPk = async () => ({
    id: 42,
    email: "anterior@example.test",
    update: async (changes) => { emailCuenta = changes.email; },
  });
  Usuario.findOne = async () => null;

  try {
    const res = crearRespuesta();
    await actualizarPerfilPaciente({
      user: { id: 42 },
      body: { email: "  Nuevo@Example.Test " },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(emailFicha, "nuevo@example.test");
    assert.equal(emailCuenta, "nuevo@example.test");
    assert.equal(res.body.emailAcceso, "nuevo@example.test");
  } finally {
    Paciente.findOne = originalPatientFindOne;
    Usuario.findByPk = originalUserFindByPk;
    Usuario.findOne = originalUserFindOne;
    sequelize.transaction = originalTransaction;
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

test("patient notifications list and read actions exclude staff-targeted notifications", async () => {
  const originalPatientFindOne = Paciente.findOne;
  const originalNotificationFindAll = Notificacion.findAll;
  const originalNotificationUpdate = Notificacion.update;
  let listOptions;
  const updateOptions = [];
  Paciente.findOne = async () => ({ id: 7 });
  Notificacion.findAll = async (options) => {
    listOptions = options;
    return [];
  };
  Notificacion.update = async (_changes, options) => {
    updateOptions.push(options);
    return [1];
  };

  try {
    await listarNotificacionesPaciente({ user: { id: 42 } }, crearRespuesta());
    await marcarNotificacionPacienteLeida({ user: { id: 42 }, params: { id: 9 } }, crearRespuesta());
    await marcarTodasNotificacionesPacienteLeidas({ user: { id: 42 } }, crearRespuesta());
    assert.deepEqual(listOptions.where, { paciente_id: 7, usuario_id: null });
    assert.deepEqual(updateOptions[0].where, {
      id: 9,
      paciente_id: 7,
      usuario_id: null,
      leida: false,
    });

    test("patient finances only query budgets and payments linked to the authenticated patient's record", async () => {
      const originalPatientFindOne = Paciente.findOne;
      const originalBudgetFindAll = Presupuesto.findAll;
      const originalPaymentFindAll = Pago.findAll;
      let budgetQuery;
      let paymentQuery;
      Paciente.findOne = async (options) => {
        assert.deepEqual(options.where, { usuario_id: 42 });
        return { id: 7 };
      };
      Presupuesto.findAll = async (options) => {
        budgetQuery = options;
        return [];
      };
      Pago.findAll = async (options) => {
        paymentQuery = options;
        return [];
      };

      try {
        const res = crearRespuesta();
        await listarFinanzasPaciente({ user: { id: 42 } }, res);
        assert.deepEqual(budgetQuery.where, { paciente_id: 7 });
        assert.deepEqual(paymentQuery.where, { paciente_id: 7 });
        assert.deepEqual(res.body, { presupuestos: [], pagos: [] });
      } finally {
        Paciente.findOne = originalPatientFindOne;
        Presupuesto.findAll = originalBudgetFindAll;
        Pago.findAll = originalPaymentFindAll;
      }
    });
    assert.deepEqual(updateOptions[1].where, {
      paciente_id: 7,
      usuario_id: null,
      leida: false,
    });
  } finally {
    Paciente.findOne = originalPatientFindOne;
    Notificacion.findAll = originalNotificationFindAll;
    Notificacion.update = originalNotificationUpdate;
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

test("patient assistant uses AI with only the public service catalog and question", async () => {
  const originalPatientFindOne = Paciente.findOne;
  const originalServiceFindAll = Servicio.findAll;
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    AI_API_URL: process.env.AI_API_URL,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
  };
  let requestBody;
  Paciente.findOne = async () => ({ id: 7, nombres: "Paciente privado", observaciones: "Dato clínico privado" });
  Servicio.findAll = async () => [{
    nombre: "Limpieza dental",
    categoria: "Preventivo",
    precio: "120.00",
    moneda: "PEN",
  }];
  process.env.AI_API_URL = "https://ai.example.test/v1/chat/completions";
  process.env.AI_API_KEY = "test-key";
  process.env.AI_MODEL = "test-model";
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{ message: { content: "La limpieza dental figura en el catálogo por PEN 120.00." } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const res = crearRespuesta();
    await responderPreguntaPaciente({ user: { id: 42 }, body: { mensaje: "¿Cuánto cuesta la limpieza dental?" } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.respuesta, /PEN 120\.00/);
    assert.equal(requestBody.messages[1].content.includes("Limpieza dental"), true);
    assert.equal(requestBody.messages[1].content.includes("Dato clínico privado"), false);
    assert.equal(requestBody.messages[1].content.includes("Paciente privado"), false);
    assert.equal(requestBody.model, "test-model");
    assert.equal(res.headers["Cache-Control"], "private, no-store");
  } finally {
    Paciente.findOne = originalPatientFindOne;
    Servicio.findAll = originalServiceFindAll;
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("patient assistant rejects questions longer than its documented limit", async () => {
  const originalPatientFindOne = Paciente.findOne;
  const originalServiceFindAll = Servicio.findAll;
  let catalogQueried = false;
  Paciente.findOne = async () => ({ id: 7 });
  Servicio.findAll = async () => {
    catalogQueried = true;
    return [];
  };

  try {
    const res = crearRespuesta();
    await responderPreguntaPaciente({ user: { id: 42 }, body: { mensaje: "x".repeat(501) } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(catalogQueried, false);
  } finally {
    Paciente.findOne = originalPatientFindOne;
    Servicio.findAll = originalServiceFindAll;
  }
});

test("patient can change their password only after proving the current password", async () => {
  const originalFindByPk = Usuario.findByPk;
  const passwordAnterior = await bcrypt.hash("password-anterior", 4);
  let passwordGuardada = "";
  Usuario.findByPk = async () => ({
    password: passwordAnterior,
    save: async function save() {
      passwordGuardada = this.password;
    },
  });

  test("patient consent records verification without permitting antecedent edits", async () => {
    const originalPatientFindOne = Paciente.findOne;
    const originalProfileFindOne = HistoriaClinicaPerfil.findOne;
    const originalChangeCreate = HistoriaAntecedenteCambio.create;
    const originalTransaction = sequelize.transaction;
    const profile = {
      antecedentes_medicos: { "Diabetes mellitus": "Sí" },
      update: async function update(changes) {
        this.antecedentes_medicos = changes.antecedentes_medicos;
      },
    };
    let auditEntry;
    let lockQuery;
    Paciente.findOne = async () => ({ id: 7 });
    HistoriaClinicaPerfil.findOne = async (options) => {
      lockQuery = options;
      return profile;
    };
    HistoriaAntecedenteCambio.create = async (values) => {
      auditEntry = values;
      return { id: 15, ...values };
    };
    sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });

    try {
      const res = crearRespuesta();
      await otorgarConsentimientoAntecedentesPaciente({
        user: { id: 42, rol: "paciente" },
        body: { aceptado: true },
      }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(lockQuery.where, { paciente_id: 7 });
      assert.equal(profile.antecedentes_medicos["Diabetes mellitus"], "Sí");
      assert.equal(profile.antecedentes_medicos.declaracion_paciente.consentimiento_veracidad.aceptado, true);
      assert.deepEqual(auditEntry.campos_modificados, ["consentimiento_veracidad"]);
      assert.equal(auditEntry.usuario_id, 42);
      assert.equal(res.body.antecedentes.consentimiento_veracidad.aceptado, true);
    } finally {
      Paciente.findOne = originalPatientFindOne;
      HistoriaClinicaPerfil.findOne = originalProfileFindOne;
      HistoriaAntecedenteCambio.create = originalChangeCreate;
      sequelize.transaction = originalTransaction;
    }
  });

  test("patient clinical record is scoped to its own authorized data and omits internal notes", async () => {
    const originals = {
      paciente: Paciente.findOne,
      perfil: HistoriaClinicaPerfil.findOne,
      alergias: HistoriaAlergia.findAll,
      medicamentos: HistoriaMedicamento.findAll,
      antecedentesOdontologicos: AntecedenteOdontologico.findAll,
      atenciones: Atencion.findAll,
      planes: PlanTratamiento.findAll,
      documentos: DocumentoClinico.findAll,
      historial: HistoriaAntecedenteCambio.findAll,
    };
    const queries = {};
    Paciente.findOne = async () => ({ id: 7 });
    HistoriaClinicaPerfil.findOne = async (options) => {
      queries.perfil = options;
      return { antecedentes_medicos: { "Diabetes mellitus": "Sí" } };
    };
    HistoriaAlergia.findAll = async (options) => { queries.alergias = options; return [{ sustancia: "Penicilina", reaccion: "Urticaria" }]; };
    HistoriaMedicamento.findAll = async (options) => { queries.medicamentos = options; return [{ nombre: "Medicamento A", dosis: "10 mg" }]; };
    AntecedenteOdontologico.findAll = async (options) => { queries.antecedentesOdontologicos = options; return [{ tipo: "Tratamiento previo", descripcion: "Endodoncia" }]; };
    Atencion.findAll = async (options) => {
      queries.atenciones = options;
      return [
        {
          id: 2,
          fecha: "2026-02-01",
          motivo_consulta: "Control",
          diagnostico: "Diagnóstico",
          procedimiento: "Limpieza",
          evolucion: "Evolución autorizada",
          evolucion_visible_para_paciente: true,
          observaciones: "Nota interna",
          Odontologo: { nombre: "Dra. Ejemplo" },
          diagnosticos: [],
          procedimientos: [],
        },
        {
          id: 3,
          evolucion: "Evolución privada",
          evolucion_visible_para_paciente: false,
          observaciones: "Nota interna",
          diagnosticos: [],
          procedimientos: [],
        },
      ];
    };
    PlanTratamiento.findAll = async (options) => { queries.planes = options; return []; };
    DocumentoClinico.findAll = async (options) => { queries.documentos = options; return []; };
    HistoriaAntecedenteCambio.findAll = async (options) => { queries.historial = options; return []; };

    try {
      const res = crearRespuesta();
      await obtenerExpedientePaciente({ user: { id: 42 } }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(queries.atenciones.where, { paciente_id: 7 });
      assert.deepEqual(queries.documentos.where, { paciente_id: 7, visible_para_paciente: true });
      assert.equal(res.body.atenciones[0].evolucion, "Evolución autorizada");
      assert.equal(res.body.atenciones[1].evolucion, null);
      assert.equal(res.body.antecedentes.enfermedades, "Diabetes mellitus: Sí");
      assert.equal(res.body.antecedentes.alergias, "Penicilina (Urticaria)");
      assert.equal(res.body.antecedentes.medicamentos_actuales, "Medicamento A · 10 mg");
      assert.equal(res.body.antecedentes.antecedentes_odontologicos, "Tratamiento previo · Endodoncia");
      assert.equal(JSON.stringify(res.body).includes("Nota interna"), false);
      assert.equal(JSON.stringify(res.body).includes("Evolución privada"), false);
      assert.equal(queries.historial.where.paciente_id, 7);
    } finally {
      Paciente.findOne = originals.paciente;
      HistoriaClinicaPerfil.findOne = originals.perfil;
      HistoriaAlergia.findAll = originals.alergias;
      HistoriaMedicamento.findAll = originals.medicamentos;
      AntecedenteOdontologico.findAll = originals.antecedentesOdontologicos;
      Atencion.findAll = originals.atenciones;
      PlanTratamiento.findAll = originals.planes;
      DocumentoClinico.findAll = originals.documentos;
      HistoriaAntecedenteCambio.findAll = originals.historial;
    }
  });

  try {
    const res = crearRespuesta();
    await cambiarContrasenaPaciente({
      user: { id: 42 },
      body: { contrasenaActual: "password-anterior", nuevaContrasena: "password-nueva" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "La contraseña se actualizó correctamente.");
    assert.notEqual(passwordGuardada, "password-nueva");
    assert.equal(await bcrypt.compare("password-nueva", passwordGuardada), true);

    const errorActual = crearRespuesta();
    await cambiarContrasenaPaciente({
      user: { id: 42 },
      body: { contrasenaActual: "incorrecta", nuevaContrasena: "otra-nueva-123" },
    }, errorActual);
    assert.equal(errorActual.statusCode, 400);
    assert.equal(errorActual.body.error, "La contraseña actual es incorrecta.");
  } finally {
    Usuario.findByPk = originalFindByPk;
  }
});
