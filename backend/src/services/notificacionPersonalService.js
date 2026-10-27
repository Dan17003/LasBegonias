import { Op } from "sequelize";
import { Notificacion, Odontologo, Usuario } from "../models/index.js";

export const notificarPersonal = async ({
  titulo,
  mensaje,
  tipo,
  pacienteId = null,
  citaId = null,
  roles = [],
  odontologoId = null,
}) => {
  const [usuarios, odontologo] = await Promise.all([
    roles.length
      ? Usuario.findAll({
        attributes: ["id"],
        where: { rol: { [Op.in]: roles } },
      })
      : [],
    odontologoId
      ? Odontologo.findByPk(odontologoId, { attributes: ["usuario_id"] })
      : null,
  ]);
  const destinatarios = new Set(usuarios.map((usuario) => usuario.id));
  if (odontologo?.usuario_id) destinatarios.add(odontologo.usuario_id);
  if (destinatarios.size === 0) return [];

  return Notificacion.bulkCreate([...destinatarios].map((usuarioId) => ({
    usuario_id: usuarioId,
    paciente_id: pacienteId,
    cita_id: citaId,
    titulo,
    mensaje,
    tipo,
    canal: "app",
  })));
};
