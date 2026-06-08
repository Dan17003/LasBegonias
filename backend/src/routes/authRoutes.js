import express from "express";
import { login, registerPaciente } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", registerPaciente);

export default router;