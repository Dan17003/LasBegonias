import express from "express";
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerPermisosDisponibles,
} from "../controllers/usuarioController.js";
import { auth, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(auth, requireAdmin);

router.get("/permisos", obtenerPermisosDisponibles);
router.get("/", listarUsuarios);
router.post("/", crearUsuario);
router.put("/:id", actualizarUsuario);
router.delete("/:id", eliminarUsuario);

export default router;
