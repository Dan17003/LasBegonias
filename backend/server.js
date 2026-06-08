import app from "./src/app.js";
import { sequelize, Usuario, Odontologo } from "./src/models/index.js";

const PORT = 3000;

Promise.all([Usuario.sync({ alter: true }), Odontologo.sync()])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor en puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error al sincronizar la base de datos:", error);
    process.exit(1);
  });