import app from "./src/app.js";
import {
  sequelize,
  Usuario,
  Odontologo,
  Paciente,
  Cita,
  Notificacion,
} from "./src/models/index.js";
import { iniciarRecordatoriosDeCitas } from "./src/services/notificacionService.js";

const PORT = 3000;

Promise.all([
  Usuario.sync({ alter: true }),
  Odontologo.sync(),
  Paciente.sync({ alter: true }),
  Cita.sync({ alter: true }),
  Notificacion.sync({ alter: true }),
])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor en puerto ${PORT}`);
      iniciarRecordatoriosDeCitas();
    });
  })
  .catch((error) => {
    console.error("Error al sincronizar la base de datos:", error);
    process.exit(1);
  });
