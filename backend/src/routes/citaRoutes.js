import express from "express";
import {
  crearCita,
  listarCitas,
  actualizarCita,
  eliminarCita,
} from "../controllers/citaController.js";

const router = express.Router();

router.post("/", crearCita);
router.get("/", listarCitas);
router.put("/:id", actualizarCita);
router.delete("/:id", eliminarCita);

export default router;