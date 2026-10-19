import express from "express";
import {
  crearPresupuesto,
  listarPresupuestos,
  obtenerPresupuesto,
  actualizarPresupuesto,
  eliminarPresupuesto,
  crearPresupuestoDesdeSolicitudes,
  listarSolicitudesClinicas,
  crearPresupuestoConItems,
} from "../controllers/presupuestoController.js";
import { auth, requireReceptionOrAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(auth, requireReceptionOrAdmin);

router.get("/solicitudes-clinicas", auth, requireReceptionOrAdmin, listarSolicitudesClinicas);
router.post("/desde-solicitudes", auth, requireReceptionOrAdmin, crearPresupuestoDesdeSolicitudes);
router.post("/con-items", auth, requireReceptionOrAdmin, crearPresupuestoConItems);
router.post("/", crearPresupuesto);
router.get("/", listarPresupuestos);
router.get("/:id", obtenerPresupuesto);
router.put("/:id", actualizarPresupuesto);
router.delete("/:id", eliminarPresupuesto);

export default router;
