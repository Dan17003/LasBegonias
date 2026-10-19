import sequelize from "../config/db.js";
import Usuario from "./Usuario.js";
import Paciente from "./Paciente.js";
import Cita from "./Cita.js";
import Presupuesto from "./Presupuesto.js";
import Pago from "./Pago.js";
import Odontologo from "./Odontologo.js";
import Notificacion from "./Notificacion.js";
import Atencion from "./Atencion.js";
import AtencionDiagnostico from "./AtencionDiagnostico.js";
import OdontogramaPieza from "./OdontogramaPieza.js";
import OdontogramaCambio from "./OdontogramaCambio.js";
import HistoriaClinicaPerfil from "./HistoriaClinicaPerfil.js";
import HistoriaMedicamento from "./HistoriaMedicamento.js";
import HistoriaAlergia from "./HistoriaAlergia.js";
import AntecedenteOdontologico from "./AntecedenteOdontologico.js";
import PeriodontogramaEvaluacion from "./PeriodontogramaEvaluacion.js";
import PeriodontogramaMedicion from "./PeriodontogramaMedicion.js";
import HistoriaDiagnostico from "./HistoriaDiagnostico.js";
import HistoriaDiagnosticoCambio from "./HistoriaDiagnosticoCambio.js";
import PlanTratamiento from "./PlanTratamiento.js";
import ProcedimientoRealizado from "./ProcedimientoRealizado.js";
import Consentimiento from "./Consentimiento.js";
import DocumentoClinico from "./DocumentoClinico.js";
import Servicio from "./Servicio.js";
import ServicioSolicitado from "./ServicioSolicitado.js";
import PresupuestoDetalle from "./PresupuestoDetalle.js";


Paciente.belongsTo(Usuario, { foreignKey: "usuario_id" });
Usuario.hasOne(Paciente, { foreignKey: "usuario_id" });
Odontologo.belongsTo(Usuario, { foreignKey: "usuario_id" });
Usuario.hasOne(Odontologo, { foreignKey: "usuario_id" });

Cita.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Cita, { foreignKey: "paciente_id" });

Cita.belongsTo(Odontologo, { foreignKey: "odontologo_id" });
Odontologo.hasMany(Cita, { foreignKey: "odontologo_id" });

Presupuesto.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Presupuesto, { foreignKey: "paciente_id" });
Presupuesto.belongsTo(Cita, { foreignKey: "cita_id" });
Cita.hasMany(Presupuesto, { foreignKey: "cita_id" });

Pago.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Pago, { foreignKey: "paciente_id" });

Pago.belongsTo(Presupuesto, { foreignKey: "presupuesto_id" });
Presupuesto.hasMany(Pago, { foreignKey: "presupuesto_id" });

Servicio.belongsTo(Usuario, { foreignKey: "creado_por" });
Usuario.hasMany(Servicio, { foreignKey: "creado_por" });
ServicioSolicitado.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(ServicioSolicitado, { foreignKey: "paciente_id" });
ServicioSolicitado.belongsTo(Odontologo, { foreignKey: "odontologo_id" });
Odontologo.hasMany(ServicioSolicitado, { foreignKey: "odontologo_id" });
ServicioSolicitado.belongsTo(Cita, { foreignKey: "cita_id" });
Cita.hasMany(ServicioSolicitado, { foreignKey: "cita_id" });
ServicioSolicitado.belongsTo(Servicio, { foreignKey: "servicio_id" });
Servicio.hasMany(ServicioSolicitado, { foreignKey: "servicio_id" });
ServicioSolicitado.belongsTo(PresupuestoDetalle, { foreignKey: "presupuesto_detalle_id" });
PresupuestoDetalle.belongsTo(Presupuesto, { foreignKey: "presupuesto_id" });
Presupuesto.hasMany(PresupuestoDetalle, { foreignKey: "presupuesto_id" });
PresupuestoDetalle.belongsTo(Servicio, { foreignKey: "servicio_id" });
Servicio.hasMany(PresupuestoDetalle, { foreignKey: "servicio_id" });

Notificacion.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Notificacion, { foreignKey: "paciente_id" });

Notificacion.belongsTo(Cita, { foreignKey: "cita_id" });
Cita.hasMany(Notificacion, { foreignKey: "cita_id" });

Atencion.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Atencion, { foreignKey: "paciente_id" });
Atencion.belongsTo(Odontologo, { foreignKey: "odontologo_id" });
Odontologo.hasMany(Atencion, { foreignKey: "odontologo_id" });
Atencion.belongsTo(Cita, { foreignKey: "cita_id", as: "cita" });
Cita.hasMany(Atencion, { foreignKey: "cita_id", as: "atenciones" });
Atencion.belongsTo(Cita, { foreignKey: "proxima_cita_id", as: "proximaCita" });
Atencion.hasMany(PlanTratamiento, { foreignKey: "atencion_id", as: "planesTratamiento" });
PlanTratamiento.belongsTo(Atencion, { foreignKey: "atencion_id", as: "atencion" });
Atencion.hasMany(OdontogramaCambio, { foreignKey: "atencion_id", as: "odontogramaCambios" });
OdontogramaCambio.belongsTo(Atencion, { foreignKey: "atencion_id", as: "atencion" });
Atencion.hasMany(PeriodontogramaMedicion, { foreignKey: "atencion_id", as: "medicionesPeriodontales" });
PeriodontogramaMedicion.belongsTo(Atencion, { foreignKey: "atencion_id", as: "atencion" });
Paciente.hasMany(PeriodontogramaEvaluacion, {
  foreignKey: "paciente_id",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
PeriodontogramaEvaluacion.belongsTo(Paciente, {
  foreignKey: "paciente_id",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Odontologo.hasMany(PeriodontogramaEvaluacion, {
  foreignKey: "odontologo_id",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
PeriodontogramaEvaluacion.belongsTo(Odontologo, {
  foreignKey: "odontologo_id",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
PeriodontogramaEvaluacion.belongsTo(PeriodontogramaEvaluacion, {
  foreignKey: "evaluacion_origen_id",
  as: "origen",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
PeriodontogramaEvaluacion.hasMany(PeriodontogramaMedicion, {
  foreignKey: "evaluacion_id",
  as: "mediciones",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
PeriodontogramaMedicion.belongsTo(PeriodontogramaEvaluacion, {
  foreignKey: "evaluacion_id",
  as: "evaluacion",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Atencion.hasMany(AtencionDiagnostico, { foreignKey: "atencion_id", as: "diagnosticosVinculados" });
AtencionDiagnostico.belongsTo(Atencion, { foreignKey: "atencion_id" });
AtencionDiagnostico.belongsTo(HistoriaDiagnostico, { foreignKey: "diagnostico_id" });
HistoriaDiagnostico.hasMany(AtencionDiagnostico, { foreignKey: "diagnostico_id", as: "vinculosAtencion" });
HistoriaDiagnostico.hasMany(HistoriaDiagnosticoCambio, { foreignKey: "diagnostico_id", as: "cambiosEstado" });
HistoriaDiagnosticoCambio.belongsTo(Paciente, { foreignKey: "paciente_id" });
HistoriaDiagnosticoCambio.belongsTo(Odontologo, { foreignKey: "odontologo_id", as: "odontologoResponsable" });
Atencion.belongsToMany(HistoriaDiagnostico, { through: AtencionDiagnostico, foreignKey: "atencion_id", otherKey: "diagnostico_id", as: "diagnosticos" });
HistoriaDiagnostico.belongsToMany(Atencion, { through: AtencionDiagnostico, foreignKey: "diagnostico_id", otherKey: "atencion_id", as: "atenciones" });
PlanTratamiento.belongsTo(HistoriaDiagnostico, { foreignKey: "diagnostico_id", as: "diagnostico" });
HistoriaDiagnostico.hasMany(PlanTratamiento, { foreignKey: "diagnostico_id", as: "planes" });
PlanTratamiento.hasMany(ProcedimientoRealizado, { foreignKey: "plan_tratamiento_id", as: "procedimientosRealizados" });
ProcedimientoRealizado.belongsTo(PlanTratamiento, { foreignKey: "plan_tratamiento_id", as: "plan" });

OdontogramaPieza.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(OdontogramaPieza, { foreignKey: "paciente_id" });
OdontogramaPieza.belongsTo(Odontologo, { foreignKey: "actualizado_por" });
Odontologo.hasMany(OdontogramaPieza, { foreignKey: "actualizado_por" });
OdontogramaCambio.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(OdontogramaCambio, { foreignKey: "paciente_id" });
OdontogramaCambio.belongsTo(Odontologo, { foreignKey: "odontologo_id" });
Odontologo.hasMany(OdontogramaCambio, { foreignKey: "odontologo_id" });

const historiaModels = [
  HistoriaMedicamento, HistoriaAlergia, AntecedenteOdontologico,
  PeriodontogramaMedicion, HistoriaDiagnostico, PlanTratamiento,
  ProcedimientoRealizado, Consentimiento, DocumentoClinico,
];
HistoriaClinicaPerfil.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasOne(HistoriaClinicaPerfil, { foreignKey: "paciente_id" });
historiaModels.forEach((Model) => {
  Model.belongsTo(Paciente, { foreignKey: "paciente_id" });
  Paciente.hasMany(Model, { foreignKey: "paciente_id" });
  Model.belongsTo(Odontologo, { foreignKey: "odontologo_id" });
  Odontologo.hasMany(Model, { foreignKey: "odontologo_id" });
});
ProcedimientoRealizado.belongsTo(Atencion, { foreignKey: "atencion_id", as: "atencion" });
Atencion.hasMany(ProcedimientoRealizado, { foreignKey: "atencion_id", as: "procedimientos" });

export {
  sequelize, Usuario, Paciente, Cita, Presupuesto, Pago, Odontologo, Notificacion,
  Atencion, AtencionDiagnostico, OdontogramaPieza, OdontogramaCambio, HistoriaClinicaPerfil, HistoriaMedicamento, HistoriaAlergia,
  AntecedenteOdontologico, PeriodontogramaEvaluacion, PeriodontogramaMedicion, HistoriaDiagnostico, HistoriaDiagnosticoCambio, PlanTratamiento,
  ProcedimientoRealizado, Consentimiento, DocumentoClinico,
  Servicio, ServicioSolicitado, PresupuestoDetalle,
};
