import test from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";
import { Notificacion, Odontologo, Usuario } from "../models/index.js";
import { notificarPersonal } from "./notificacionPersonalService.js";

test("staff event notifications are created once per intended account", async () => {
  const originalUserFindAll = Usuario.findAll;
  const originalOdontologistFindByPk = Odontologo.findByPk;
  const originalBulkCreate = Notificacion.bulkCreate;
  let query;
  let notifications;
  Usuario.findAll = async (options) => {
    query = options;
    return [{ id: 10 }, { id: 11 }];
  };
  Odontologo.findByPk = async () => ({ usuario_id: 11 });
  Notificacion.bulkCreate = async (rows) => {
    notifications = rows;
    return rows;
  };

  try {
    await notificarPersonal({
      titulo: "Nueva solicitud",
      mensaje: "Cita solicitada",
      tipo: "solicitud_cita_paciente",
      pacienteId: 7,
      citaId: 21,
      roles: ["recepcionista", "admin"],
      odontologoId: 4,
    });
    assert.deepEqual(query.where.rol[Op.in], ["recepcionista", "admin"]);
    assert.deepEqual(notifications.map(({ usuario_id }) => usuario_id), [10, 11]);
    assert.ok(notifications.every(({ paciente_id, cita_id }) => paciente_id === 7 && cita_id === 21));
  } finally {
    Usuario.findAll = originalUserFindAll;
    Odontologo.findByPk = originalOdontologistFindByPk;
    Notificacion.bulkCreate = originalBulkCreate;
  }
});
