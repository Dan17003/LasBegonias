import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import pacienteRoutes from "./routes/pacienteRoutes.js";
import citaRoutes from "./routes/citaRoutes.js";
import presupuestoRoutes from "./routes/presupuestoRoutes.js";
import pagoRoutes from "./routes/pagoRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import odontologoRoutes from "./routes/odontologoRoutes.js";
import notificacionRoutes from "./routes/notificacionRoutes.js";
import historiaRoutes from "./routes/historiaRoutes.js";
import servicioRoutes from "./routes/servicioRoutes.js";
import odontologoAiRoutes from "./routes/odontologoAiRoutes.js";

const app = express();

const originsConfigurados = process.env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean);
const originsPermitidos = originsConfigurados?.length
  ? originsConfigurados
  : process.env.NODE_ENV === "development" ? ["http://localhost:5173"] : [];

if (process.env.NODE_ENV === "production" && originsPermitidos.some((origin) => {
  try {
    const parsed = new URL(origin);
    return parsed.protocol !== "https:" || parsed.origin !== origin;
  } catch {
    return true;
  }
})) {
  throw new Error("CORS_ORIGINS must contain HTTPS origins only in production.");
}

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || originsPermitidos.includes(origin)),
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/pacientes", pacienteRoutes);
app.use("/api/citas", citaRoutes);
app.use("/api/presupuestos", presupuestoRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/odontologos", odontologoRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/historia", historiaRoutes);
app.use("/api/servicios", servicioRoutes);
app.use("/api/odontologo/ai", odontologoAiRoutes);

export default app;
