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
} from "./src/models/index.js";
import { iniciarRecordatoriosDeCitas } from "./src/services/notificacionService.js";
import { seedServicios } from "./src/services/servicioSeed.js";
import { ensureConsentimientoEstado } from "./src/database/migrations/ensureConsentimientoEstado.js";
import { ensurePeriodontogramaEvaluations } from "./src/database/migrations/ensurePeriodontogramaEvaluations.js";
import { ensureAtencionClinicalLinks } from "./src/database/migrations/ensureAtencionClinicalLinks.js";

const PORT = 3000;

Promise.all([
  Usuario.sync(),
  Odontologo.sync(),
  Paciente.sync(),
  Cita.sync(),
  Notificacion.sync(),
  Atencion.sync(),
  OdontogramaPieza.sync(),
  HistoriaClinicaPerfil.sync(),
  HistoriaMedicamento.sync(),
  HistoriaAlergia.sync(),
  AntecedenteOdontologico.sync(),
  HistoriaDiagnostico.sync(),
  PlanTratamiento.sync(),
  ProcedimientoRealizado.sync(),
  Consentimiento.sync(),
  DocumentoClinico.sync(),
])
  .then(async () => {
    await PeriodontogramaEvaluacion.sync();
    await PeriodontogramaMedicion.sync();
    await ensureConsentimientoEstado(sequelize.getQueryInterface());
    await ensurePeriodontogramaEvaluations(sequelize.getQueryInterface());
    await ensureAtencionClinicalLinks(sequelize.getQueryInterface());
    await Presupuesto.sync({ alter: true });
    await Servicio.sync();
    await PresupuestoDetalle.sync();
    await ServicioSolicitado.sync({ alter: true });
    await seedServicios();
    app.listen(PORT, () => {
      console.log(`Servidor en puerto ${PORT}`);
      iniciarRecordatoriosDeCitas();
    });
  })
  .catch((error) => {
    console.error("Error al sincronizar la base de datos:", error);
    process.exit(1);
  });
