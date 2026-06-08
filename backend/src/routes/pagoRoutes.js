import express from "express";
import {
  crearPago,
  listarPagos,
  obtenerPago,
  actualizarPago,
  obtenerPagosPorPaciente,
} from "../controllers/pagoController.js";

const router = express.Router();

router.post("/", crearPago);
router.get("/", listarPagos);
router.get("/paciente/:paciente_id", obtenerPagosPorPaciente);
router.get("/:id", obtenerPago);
router.put("/:id", actualizarPago);


export default router;
