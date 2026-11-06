import test from "node:test";
import assert from "node:assert/strict";
import {
  AntecedenteOdontologico,
  Atencion,
  Cita,
  Consentimiento,
  DocumentoClinico,
  HistoriaAlergia,
  HistoriaClinicaPerfil,
  HistoriaDiagnostico,
  HistoriaDiagnosticoCambio,
  HistoriaMedicamento,
  Odontologo,
  OdontogramaPieza,
  Paciente,
  PeriodontogramaEvaluacion,
  PeriodontogramaMedicion,
  PlanTratamiento,
  ProcedimientoRealizado,
  Usuario,
} from "../models/index.js";
import { conversarConAsistenteOdontologico } from "./odontologoAiController.js";

const crearRespuesta = () => ({
  statusCode: 200,
  headers: {},
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

test("odontologist assistant sends a broad, de-identified clinical record to the AI provider", async () => {
  const modelos = [
    AntecedenteOdontologico,
    Atencion,
    Cita,
    Consentimiento,
    DocumentoClinico,
    HistoriaAlergia,
    HistoriaClinicaPerfil,
    HistoriaDiagnostico,
    HistoriaDiagnosticoCambio,
    HistoriaMedicamento,
    Odontologo,
    OdontogramaPieza,
    Paciente,
    PeriodontogramaEvaluacion,
    PeriodontogramaMedicion,
    PlanTratamiento,
    ProcedimientoRealizado,
    Usuario,
  ];
  const originales = [];
  const consultas = [];
  const guardar = (modelo, metodo, implementacion) => {
    originales.push([modelo, metodo, modelo[metodo]]);
    modelo[metodo] = implementacion;
  };
  const fila = (values) => ({ get: (field) => values[field] ?? null });
  const valorClinico = (field) => (
    field === "fecha" || field.endsWith("_en") || field.endsWith("_documento")
      ? "2026-11-05"
      : field === "visible_para_paciente" ? false
        : field === "embarazo" ? "No" : `registro clínico de ${field}`
  );
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    AI_API_URL: process.env.AI_API_URL,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
  };
  let requestBody;
  for (const modelo of modelos) {
    guardar(modelo, "findAll", async (options) => {
      consultas.push({ modelo: modelo.name, options });
      return [fila(Object.fromEntries(
        (options.attributes || []).map((field) => [field, valorClinico(field)]),
      ))];
    });
  }
  guardar(Usuario, "findByPk", async () => ({ id: 42, rol: "odontologo", activo: true }));
  guardar(Odontologo, "findOne", async () => ({ id: 3 }));
  guardar(Cita, "findOne", async () => ({ id: 100 }));
  guardar(Atencion, "findOne", async () => null);
  guardar(Paciente, "findByPk", async () => ({
    id: 7,
    nombres: "Paciente Reservado",
    apellidos: "Ejemplo",
    dni: "12345678",
    telefono: "999123456",
    email: "paciente@example.test",
    fecha_nacimiento: "1980-01-01",
    sexo: "Femenino",
  }));
  guardar(HistoriaClinicaPerfil, "findOne", async (options) => {
    consultas.push({ modelo: HistoriaClinicaPerfil.name, options });
    const values = {
      motivo: "Dolor dental",
      motivo_tipo: "Dolor",
      motivo_descripcion: "Dolor al masticar",
      antecedentes_medicos: { "Diabetes mellitus": "Sí" },
      antecedentes_medicos_otros: "Asma",
      embarazo: "No",
      examen_extraoral: { simetria: "Normal" },
      examen_intraoral: { encia: "Inflamada" },
      antecedentes: "Antecedente clínico general",
      examenes: "Radiografía pendiente de revisar",
    };
    return fila(Object.fromEntries(options.attributes.map((field) => [field, values[field]])));
  });
  process.env.AI_API_URL = "https://ai.example.test/v1/chat/completions";
  process.env.AI_API_KEY = "test-key";
  process.env.AI_MODEL = "test-model";
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{ message: { content: "Respuesta clínica de prueba." } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const res = crearRespuesta();
    await conversarConAsistenteOdontologico({
      user: { id: 42, rol: "odontologo" },
      body: { patientId: 7, message: "Resume la situación clínica." },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.answer, "Respuesta clínica de prueba.");
    const contenidoPregunta = requestBody.messages.at(-1).content;
    const inicioContexto = contenidoPregunta.indexOf("{");
    const finContexto = contenidoPregunta.indexOf("\n\nPREGUNTA DEL ODONTÓLOGO:");
    const contexto = JSON.parse(contenidoPregunta.slice(inicioContexto, finContexto));
    for (const section of [
      "motivoConsulta",
      "antecedentesMedicos",
      "alergias",
      "medicamentos",
      "antecedentesOdontologicos",
      "examenes",
      "odontograma",
      "periodontograma",
      "evaluacionesPeriodontales",
      "diagnosticos",
      "cambiosDiagnosticos",
      "planesTratamiento",
      "atencionesAnteriores",
      "procedimientos",
      "consentimientos",
      "citasRegistradas",
      "documentosClinicos",
      "edad",
      "sexo",
    ]) {
      assert.ok(Object.hasOwn(contexto, section), `missing context section: ${section}`);
    }
    assert.equal(contexto.edad, 46);
    assert.equal(contexto.antecedentesMedicos.antecedentes_medicos["Diabetes mellitus"], "Sí");
    assert.equal(contexto.atencionesAnteriores.length, 1);
    assert.equal(contexto.periodontograma[0].placa, "registro clínico de placa");
    const atenciones = consultas.find(({ modelo }) => modelo === Atencion.name);
    const citas = consultas.find(({ modelo, options }) => modelo === Cita.name && options.limit === 100);
    assert.equal(atenciones.options.limit, 100);
    assert.deepEqual(atenciones.options.where, { paciente_id: 7, odontologo_id: 3 });
    assert.equal(citas.options.where.odontologo_id, 3);
    assert.equal(citas.options.where.paciente_id, 7);
    assert.equal(JSON.stringify(contexto).includes("Paciente Reservado"), false);
    assert.equal(JSON.stringify(contexto).includes("12345678"), false);
    assert.equal(JSON.stringify(contexto).includes("paciente@example.test"), false);
    assert.match(requestBody.messages[0].content, /Relaciona los hallazgos pertinentes entre secciones/);
    assert.equal(res.headers["Cache-Control"], undefined);
  } finally {
    for (const [modelo, metodo, original] of originales.reverse()) modelo[metodo] = original;
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
