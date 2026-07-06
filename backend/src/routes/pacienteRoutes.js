import express from "express";
import {
  actualizarPaciente,
  crearPaciente,
  eliminarPaciente,
  listarPacientes,
} from "../controllers/pacienteController.js";

const router = express.Router();

router.post("/", crearPaciente);
router.get("/", listarPacientes);
router.put("/:id", actualizarPaciente);
router.delete("/:id", eliminarPaciente);

export default router;
