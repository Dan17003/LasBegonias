import app from "./src/app.js";

app.listen(3000, () => {
  console.log("Servidor en puerto 3000");
});

import pacienteRoutes from "./src/routes/pacienteRoutes.js";

app.use("/api/pacientes", pacienteRoutes);

