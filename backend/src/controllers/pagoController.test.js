import test from "node:test";
import assert from "node:assert/strict";
import { Pago, Presupuesto } from "../models/index.js";
import { actualizarPago } from "./pagoController.js";

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

test("payment cannot be reassigned to another patient while retaining its budget", async () => {
  const originalPaymentFindByPk = Pago.findByPk;
  const originalBudgetFindByPk = Presupuesto.findByPk;
  let updated = false;
  Pago.findByPk = async () => ({
    id: 14,
    paciente_id: 7,
    presupuesto_id: 3,
    update: async () => {
      updated = true;
    },
  });
  Presupuesto.findByPk = async () => ({ id: 3, paciente_id: 7 });

  try {
    const res = crearRespuesta();
    await actualizarPago({ params: { id: 14 }, body: { paciente_id: 8 } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /no pertenece al paciente/i);
    assert.equal(updated, false);
  } finally {
    Pago.findByPk = originalPaymentFindByPk;
    Presupuesto.findByPk = originalBudgetFindByPk;
  }
});

test("payment can be detached from its budget when updating its patient", async () => {
  const originalPaymentFindByPk = Pago.findByPk;
  const originalBudgetFindByPk = Presupuesto.findByPk;
  let updatedWith;
  Pago.findByPk = async () => ({
    id: 14,
    paciente_id: 7,
    presupuesto_id: 3,
    update: async (values) => {
      updatedWith = values;
    },
  });
  Presupuesto.findByPk = async () => {
    throw new Error("A detached payment should not load its previous budget.");
  };

  try {
    const res = crearRespuesta();
    await actualizarPago({
      params: { id: 14 },
      body: { paciente_id: 8, presupuesto_id: null },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(updatedWith, { paciente_id: 8, presupuesto_id: null });
  } finally {
    Pago.findByPk = originalPaymentFindByPk;
    Presupuesto.findByPk = originalBudgetFindByPk;
  }
});
