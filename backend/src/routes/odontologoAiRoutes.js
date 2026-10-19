import express from "express";
import {
  conversarConAsistenteOdontologico,
  listarPacientesParaAsistente,
} from "../controllers/odontologoAiController.js";
import { auth, requireOdontologist } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
router.use(auth, requireOdontologist);
router.get("/pacientes", listarPacientesParaAsistente);
router.post("/chat", conversarConAsistenteOdontologico);

export default router;
