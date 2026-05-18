import express from "express";
import { crearPaciente, listarPacientes } from "../controllers/pacienteController.js";

const router = express.Router();

router.post("/", crearPaciente);
router.get("/", listarPacientes);

export default router;