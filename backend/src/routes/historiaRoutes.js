import express from "express";
import {
  listarMisPacientes,
  obtenerFichaPaciente,
  listarHistoriaPaciente,
  registrarAtencion,
  listarCitasPaciente,
  obtenerOdontograma,
  listarCambiosOdontograma,
  actualizarOdontogramaPieza,
  obtenerPerfilHistoria,
  guardarPerfilHistoria,
  listarHistoriaRecurso,
  crearHistoriaRecurso,
  actualizarHistoriaRecurso,
  eliminarHistoriaRecurso,
} from "../controllers/historiaController.js";
import { auth, requireOdontologist, requireStaff } from "../middlewares/authMiddleware.js";
import {
  crearServicioSolicitado,
  listarServiciosSolicitados,
  retirarServicioSolicitado,
} from "../controllers/servicioSolicitadoController.js";
import {
  actualizarVisibilidadDocumentoPaciente,
  listarDocumentosClinicos,
  obtenerArchivoClinico,
  subirDocumentoClinico,
} from "../controllers/documentoClinicoController.js";
import { cargarArchivoClinico } from "../middlewares/documentoClinicoUpload.js";
import {
  actualizarMedicionPeriodontal,
  crearEvaluacionPeriodontal,
  listarEvaluacionesPeriodontales,
} from "../controllers/periodontogramaController.js";

const router = express.Router();

router.use(auth, requireStaff);
router.get("/mis-pacientes", listarMisPacientes);
router.get("/pacientes/:id/ficha", obtenerFichaPaciente);
router.get("/pacientes/:id/historia", listarHistoriaPaciente);
router.get("/pacientes/:id/citas", listarCitasPaciente);
router.get("/pacientes/:id/odontograma", obtenerOdontograma);
router.get("/pacientes/:id/odontograma/cambios", requireOdontologist, listarCambiosOdontograma);
router.get("/pacientes/:id/periodontograma/evaluaciones", requireOdontologist, listarEvaluacionesPeriodontales);
router.post("/pacientes/:id/periodontograma/evaluaciones", requireOdontologist, crearEvaluacionPeriodontal);
router.put("/pacientes/:id/periodontograma/evaluaciones/:evaluationId/sitios/:measurementId", requireOdontologist, actualizarMedicionPeriodontal);
router.post("/pacientes/:id/atenciones", registrarAtencion);
router.put("/pacientes/:id/odontograma/:pieza", actualizarOdontogramaPieza);
router.get("/pacientes/:id/perfil", obtenerPerfilHistoria);
router.put("/pacientes/:id/perfil", guardarPerfilHistoria);
router.get("/pacientes/:id/documentos", requireOdontologist, listarDocumentosClinicos);
router.post("/pacientes/:id/documentos", requireOdontologist, cargarArchivoClinico, subirDocumentoClinico);
router.get("/pacientes/:id/documentos/:documentoId/archivo", requireOdontologist, obtenerArchivoClinico);
router.put("/pacientes/:id/documentos/:documentoId/visibilidad-paciente", requireOdontologist, actualizarVisibilidadDocumentoPaciente);

router.get("/pacientes/:id/servicios-solicitados", requireOdontologist, listarServiciosSolicitados);
router.post("/pacientes/:id/servicios-solicitados", requireOdontologist, crearServicioSolicitado);
router.delete("/pacientes/:id/servicios-solicitados/:solicitudId", requireOdontologist, retirarServicioSolicitado);

router.get("/pacientes/:id/:recurso", listarHistoriaRecurso);
router.post("/pacientes/:id/:recurso", crearHistoriaRecurso);
router.put("/pacientes/:id/:recurso/:recursoId", actualizarHistoriaRecurso);
router.delete("/pacientes/:id/:recurso/:recursoId", eliminarHistoriaRecurso);

export default router;
