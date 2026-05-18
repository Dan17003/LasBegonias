import Usuario from "./Usuario.js";
import Paciente from "./Paciente.js";
import Cita from "./Cita.js";


Paciente.belongsTo(Usuario, { foreignKey: "usuario_id" });
Usuario.hasOne(Paciente, { foreignKey: "usuario_id" });

Cita.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Cita, { foreignKey: "paciente_id" });

export { Usuario, Paciente, Cita };