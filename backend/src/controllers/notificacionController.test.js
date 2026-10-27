import test from "node:test";
import assert from "node:assert/strict";
import { Notificacion } from "../models/index.js";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from "./notificacionController.js";

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

test("staff notification list is restricted to the authenticated user", async () => {
  const originalFindAll = Notificacion.findAll;
  let options;
  Notificacion.findAll = async (receivedOptions) => {
    options = receivedOptions;
    return [];
  };

  try {
    const res = crearRespuesta();
    await listarNotificaciones({ user: { id: 31 } }, res);
    assert.deepEqual(options.where, { usuario_id: 31 });
    assert.equal(res.statusCode, 200);
  } finally {
    Notificacion.findAll = originalFindAll;
  }
});

test("staff cannot mark another user's notification as read", async () => {
  const originalFindOne = Notificacion.findOne;
  let options;
  Notificacion.findOne = async (receivedOptions) => {
    options = receivedOptions;
    return null;
  };

  try {
    const res = crearRespuesta();
    await marcarNotificacionLeida({ params: { id: "8" }, user: { id: 31 } }, res);
    assert.deepEqual(options.where, { id: "8", usuario_id: 31 });
    assert.equal(res.statusCode, 404);
  } finally {
    Notificacion.findOne = originalFindOne;
  }
});

test("marking all staff notifications read affects only the current user", async () => {
  const originalUpdate = Notificacion.update;
  let options;
  Notificacion.update = async (_values, receivedOptions) => {
    options = receivedOptions;
  };

  try {
    const res = crearRespuesta();
    await marcarTodasLeidas({ user: { id: 31 } }, res);
    assert.deepEqual(options.where, { leida: false, usuario_id: 31 });
    assert.equal(res.statusCode, 200);
  } finally {
    Notificacion.update = originalUpdate;
  }
});
