import express from "express";
import {
  crearCita,
  listarCitas,
  actualizarCita,
  eliminarCita,
  responderCita,
} from "../controllers/citaController.js";
import { auth, requireStaff } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:id/respuesta", responderCita);
router.use(auth, requireStaff);
router.post("/", crearCita);
router.get("/", listarCitas);
router.put("/:id", actualizarCita);
router.delete("/:id", eliminarCita);

export default router;
