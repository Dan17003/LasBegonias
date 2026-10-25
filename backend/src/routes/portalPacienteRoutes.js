import express from "express";
import {
  actualizarCitaPaciente,
  actualizarPerfilPaciente,
  listarCitasPaciente,
  listarDisponibilidadPaciente,
  listarDocumentosAutorizadosPaciente,
  listarFinanzasPaciente,
  listarNotificacionesPaciente,
  marcarNotificacionPacienteLeida,
  marcarTodasNotificacionesPacienteLeidas,
  obtenerCatalogoPaciente,
  obtenerPerfilPaciente,
  responderPreguntaPaciente,
  solicitarCitaPaciente,
} from "../controllers/portalPacienteController.js";
import { obtenerArchivoAutorizadoPaciente } from "../controllers/documentoClinicoController.js";
import { auth, requirePatient } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(auth, requirePatient);
router.get("/perfil", obtenerPerfilPaciente);
router.put("/perfil", actualizarPerfilPaciente);
router.get("/catalogo", obtenerCatalogoPaciente);
router.get("/disponibilidad", listarDisponibilidadPaciente);
router.get("/citas", listarCitasPaciente);
router.post("/citas", solicitarCitaPaciente);
router.patch("/citas/:id", actualizarCitaPaciente);
router.get("/documentos", listarDocumentosAutorizadosPaciente);
router.get("/documentos/:documentoId/archivo", obtenerArchivoAutorizadoPaciente);
router.get("/finanzas", listarFinanzasPaciente);
router.get("/notificaciones", listarNotificacionesPaciente);
router.put("/notificaciones/leidas", marcarTodasNotificacionesPacienteLeidas);
router.put("/notificaciones/:id/leida", marcarNotificacionPacienteLeida);
router.post("/asistente", responderPreguntaPaciente);

export default router;
