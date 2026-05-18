import express from "express";
import {
  login,
  registerPaciente,
  crearUsuario,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);

router.post("/register", registerPaciente);

router.post("/users", crearUsuario);

export default router;