import app from "./src/app.js";
import "./src/models/index.js";


import pacienteRoutes from "./src/routes/pacienteRoutes.js";
import presupuestoRoutes from "./src/routes/presupuestoRoutes.js";
import pagoRoutes from "./src/routes/pagoRoutes.js";


app.use("/api/pacientes", pacienteRoutes);
app.use("/api/presupuestos", presupuestoRoutes);
app.use("/api/pagos", pagoRoutes);


app.listen(3000, () => {
  console.log("Servidor en puerto 3000");
});