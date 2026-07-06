import express from "express";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from "../controllers/notificacionController.js";

const router = express.Router();

router.put("/leidas/todas", marcarTodasLeidas);
router.get("/", listarNotificaciones);
router.put("/:id/leida", marcarNotificacionLeida);

export default router;
