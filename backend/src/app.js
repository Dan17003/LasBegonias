import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import pacienteRoutes from "./routes/pacienteRoutes.js";
import citaRoutes from "./routes/citaRoutes.js";
import presupuestoRoutes from "./routes/presupuestoRoutes.js";
import pagoRoutes from "./routes/pagoRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import odontologoRoutes from "./routes/odontologoRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/pacientes", pacienteRoutes);
app.use("/api/citas", citaRoutes);
app.use("/api/presupuestos", presupuestoRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/odontologos", odontologoRoutes);

export default app;