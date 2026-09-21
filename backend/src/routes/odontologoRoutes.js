import express from "express";
import {
  listarOdontologos,
  crearOdontologo,
  actualizarOdontologo,
  eliminarOdontologo,
  obtenerPerfilOdontologo,
  actualizarPerfilOdontologo,
} from "../controllers/odontologoController.js";
import { auth, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", auth, listarOdontologos);
router.get("/perfil", auth, obtenerPerfilOdontologo);
router.put("/perfil", auth, actualizarPerfilOdontologo);
router.post("/", auth, requireAdmin, crearOdontologo);
router.put("/:id", auth, requireAdmin, actualizarOdontologo);
router.delete("/:id", auth, requireAdmin, eliminarOdontologo);

export default router;
