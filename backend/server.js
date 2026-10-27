import app from "./src/app.js";
import {
  sequelize,
  Usuario,
  Odontologo,
  Paciente,
  Cita,
  Notificacion,
  Atencion,
  OdontogramaPieza,
  HistoriaClinicaPerfil,
  HistoriaAntecedenteCambio,
  HistoriaMedicamento,
  HistoriaAlergia,
  AntecedenteOdontologico,
  PeriodontogramaEvaluacion,
  PeriodontogramaMedicion,
  HistoriaDiagnostico,
  PlanTratamiento,
  ProcedimientoRealizado,
  Consentimiento,
  DocumentoClinico,
  Presupuesto,
  Servicio,
  ServicioSolicitado,
  PresupuestoDetalle,
  RespuestaPresupuestoPaciente,
  SolicitudPagoPaciente,
  PasswordResetToken,
} from "./src/models/index.js";
import { iniciarRecordatoriosDeCitas } from "./src/services/notificacionService.js";
import { seedServicios } from "./src/services/servicioSeed.js";
import { ensureConsentimientoEstado } from "./src/database/migrations/ensureConsentimientoEstado.js";
import { ensurePeriodontogramaEvaluations } from "./src/database/migrations/ensurePeriodontogramaEvaluations.js";
import { ensureAtencionClinicalLinks } from "./src/database/migrations/ensureAtencionClinicalLinks.js";
import { ensurePacientePerfilCampos } from "./src/database/migrations/ensurePacientePerfilCampos.js";
import { ensureDocumentoPacienteVisibility } from "./src/database/migrations/ensureDocumentoPacienteVisibility.js";
import { ensureNotificacionUsuario } from "./src/database/migrations/ensureNotificacionUsuario.js";
import { ensureAtencionPatientVisibility } from "./src/database/migrations/ensureAtencionPatientVisibility.js";
import { ensureHistoriaPerfilActorNullable } from "./src/database/migrations/ensureHistoriaPerfilActorNullable.js";
import { ensurePlanTreatmentDescriptionNullable } from "./src/database/migrations/ensurePlanTreatmentDescriptionNullable.js";

const PORT = 3000;

async function sincronizarBaseDeDatos() {
  await Usuario.sync();
  await PasswordResetToken.sync();
  await Odontologo.sync();
  await Paciente.sync();
  await Cita.sync();
  await Notificacion.sync();
  await Atencion.sync();
  await OdontogramaPieza.sync();
  await HistoriaClinicaPerfil.sync();
  await HistoriaAntecedenteCambio.sync();
  await HistoriaMedicamento.sync();
  await HistoriaAlergia.sync();
  await AntecedenteOdontologico.sync();
  await HistoriaDiagnostico.sync();
  await PlanTratamiento.sync();
  await ProcedimientoRealizado.sync();
  await Consentimiento.sync();
  await DocumentoClinico.sync();
  await PeriodontogramaEvaluacion.sync();
  await PeriodontogramaMedicion.sync();
  await Presupuesto.sync({ alter: true });
  await Servicio.sync();
  await PresupuestoDetalle.sync();
  await ServicioSolicitado.sync({ alter: true });
  await RespuestaPresupuestoPaciente.sync();
  await SolicitudPagoPaciente.sync();
  await ensurePacientePerfilCampos(sequelize.getQueryInterface());
  await ensureDocumentoPacienteVisibility(sequelize.getQueryInterface());
  await ensureNotificacionUsuario(sequelize.getQueryInterface());
  await ensureConsentimientoEstado(sequelize.getQueryInterface());
  await ensurePeriodontogramaEvaluations(sequelize.getQueryInterface());
  await ensureAtencionClinicalLinks(sequelize.getQueryInterface());
  await ensureAtencionPatientVisibility(sequelize.getQueryInterface());
  await ensureHistoriaPerfilActorNullable(sequelize.getQueryInterface());
  await ensurePlanTreatmentDescriptionNullable(sequelize.getQueryInterface());
  await seedServicios();
}

sincronizarBaseDeDatos()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor en puerto ${PORT}`);
      iniciarRecordatoriosDeCitas();
    });
  })
  .catch((error) => {
    console.error("Error al sincronizar la base de datos:", error);
    process.exit(1);
  });
