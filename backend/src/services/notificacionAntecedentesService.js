import { HistoriaClinicaPerfil, Notificacion } from "../models/index.js";

export const solicitarNuevaConfirmacionAntecedentes = async ({
  pacienteId,
  perfil,
  transaction,
}) => {
  const antecedentesMedicos = perfil?.antecedentes_medicos || {};
  const declaracionPaciente = antecedentesMedicos.declaracion_paciente || {};
  const consentimiento = declaracionPaciente.consentimiento_veracidad;
  const pendienteDesde = new Date().toISOString();

  if (perfil && consentimiento) {
    await perfil.update({
      antecedentes_medicos: {
        ...antecedentesMedicos,
        declaracion_paciente: {
          ...declaracionPaciente,
          consentimiento_veracidad: {
            ...consentimiento,
            aceptado: false,
            pendiente_desde: pendienteDesde,
          },
        },
      },
    }, { transaction });
  }

  return Notificacion.create({
    titulo: "Confirma nuevamente tus antecedentes",
    mensaje: "El odontólogo actualizó tus antecedentes clínicos. Revísalos en Mi expediente y confirma nuevamente que la información es correcta.",
    tipo: "antecedentes_por_confirmar",
    canal: "app",
    paciente_id: pacienteId,
  }, { transaction });
};
