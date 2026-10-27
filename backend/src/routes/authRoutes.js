import express from "express";
import {
  login,
  registerPaciente,
  restablecerContrasena,
  solicitarRestablecimientoContrasena,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", registerPaciente);
router.post("/forgot-password", solicitarRestablecimientoContrasena);
router.post("/reset-password", restablecerContrasena);

export default router;