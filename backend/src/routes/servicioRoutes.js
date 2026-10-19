import express from "express";
import { crearServicio, listarServicios } from "../controllers/servicioController.js";
import { auth, requireReceptionOrAdmin, requireStaff } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.get("/", auth, requireStaff, listarServicios);
router.post("/", auth, requireReceptionOrAdmin, crearServicio);

export default router;
