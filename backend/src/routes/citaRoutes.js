import express from "express";
import { crearCita, listarCitas } from "../controllers/citaController.js";

const router = express.Router();

router.post("/", crearCita);
router.get("/", listarCitas);

export default router;