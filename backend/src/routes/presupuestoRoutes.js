import express from "express";
import {
  crearPresupuesto,
  listarPresupuestos,
  obtenerPresupuesto,
  actualizarPresupuesto,
  eliminarPresupuesto,
} from "../controllers/presupuestoController.js";

const router = express.Router();

router.post("/", crearPresupuesto);
router.get("/", listarPresupuestos);
router.get("/:id", obtenerPresupuesto);
router.put("/:id", actualizarPresupuesto);
router.delete("/:id", eliminarPresupuesto);

export default router;
