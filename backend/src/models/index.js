import Usuario from "./Usuario.js";
import Paciente from "./Paciente.js";
import Cita from "./Cita.js";
import Presupuesto from "./Presupuesto.js";
import Pago from "./Pago.js";


Paciente.belongsTo(Usuario, { foreignKey: "usuario_id" });
Usuario.hasOne(Paciente, { foreignKey: "usuario_id" });

Cita.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Cita, { foreignKey: "paciente_id" });

Presupuesto.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Presupuesto, { foreignKey: "paciente_id" });

Pago.belongsTo(Paciente, { foreignKey: "paciente_id" });
Paciente.hasMany(Pago, { foreignKey: "paciente_id" });

Pago.belongsTo(Presupuesto, { foreignKey: "presupuesto_id" });
Presupuesto.hasMany(Pago, { foreignKey: "presupuesto_id" });

export { Usuario, Paciente, Cita, Presupuesto, Pago };