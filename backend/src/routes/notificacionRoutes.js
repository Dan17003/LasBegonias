import express from "express";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from "../controllers/notificacionController.js";
import { auth, requireStaff } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(auth, requireStaff);
router.put("/leidas/todas", marcarTodasLeidas);
router.get("/", listarNotificaciones);
router.put("/:id/leida", marcarNotificacionLeida);

export default router;
