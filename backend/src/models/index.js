import sequelize from "../config/db.js";
import Usuario from "./Usuario.js";
import Paciente from "./Paciente.js";
import Cita from "./Cita.js";
import Presupuesto from "./Presupuesto.js";
import Pago from "./Pago.js";
import Odontologo from "./Odontologo.js";
import Notificacion from "./Notificacion.js";


Paciente.belongsTo(Usuario, { foreignKey: "usuario_id" });
Usuario.hasOne(Paciente, { foreignKey: "usuario_id" });
Odontologo.belongsTo(Usuario, { foreignKey: "usuario_id" });
Usuario.hasOne(Odontologo, { foreignKey: "usuario_id" });

Cita.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Cita, { foreignKey: "paciente_id" });

Cita.belongsTo(Odontologo, { foreignKey: "odontologo_id" });
Odontologo.hasMany(Cita, { foreignKey: "odontologo_id" });

Presupuesto.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Presupuesto, { foreignKey: "paciente_id" });

Pago.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Pago, { foreignKey: "paciente_id" });

Pago.belongsTo(Presupuesto, { foreignKey: "presupuesto_id" });
Presupuesto.hasMany(Pago, { foreignKey: "presupuesto_id" });

Notificacion.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Notificacion, { foreignKey: "paciente_id" });

Notificacion.belongsTo(Cita, { foreignKey: "cita_id" });
Cita.hasMany(Notificacion, { foreignKey: "cita_id" });

export { sequelize, Usuario, Paciente, Cita, Presupuesto, Pago, Odontologo, Notificacion };
