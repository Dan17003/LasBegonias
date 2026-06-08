import express from "express";
import {
  crearPago,
  listarPagos,
  obtenerPago,
  actualizarPago,
  eliminarPago,
  obtenerPagosPorPaciente,
} from "../controllers/pagoController.js";

const router = express.Router();

router.post("/", crearPago);
router.get("/", listarPagos);
router.get("/paciente/:paciente_id", obtenerPagosPorPaciente);
router.get("/:id", obtenerPago);
router.put("/:id", actualizarPago);
router.delete("/:id", eliminarPago);

export default router;
