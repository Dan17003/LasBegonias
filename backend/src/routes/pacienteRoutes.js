import express from "express";
import {
  actualizarPaciente,
  crearPaciente,
  eliminarPaciente,
  listarPacientes,
} from "../controllers/pacienteController.js";
import { auth, requireStaff } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(auth, requireStaff);
router.post("/", crearPaciente);
router.get("/", listarPacientes);
router.put("/:id", actualizarPaciente);
router.delete("/:id", eliminarPaciente);

export default router;
