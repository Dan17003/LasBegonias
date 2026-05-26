import { useState } from "react";

export default function Doctores() {
  // Lista inicial de médicos odontólogos con especialidad y rango de horas
  const [doctores, setDoctores] = useState([
    { id: 1, nombre: "Dr. Carlos Alva", especialidad: "Ortodoncia Avanzada", turno: "Mañana (08:00 AM - 01:00 PM)", disponible: true },
    { id: 2, nombre: "Dra. Sonia Espinoza", especialidad: "Endodoncia y Estética", turno: "Tarde (02:00 PM - 08:00 PM)", disponible: true },
    { id: 3, nombre: "Dr. Jorge Mendoza", especialidad: "Cirugía Maxilofacial", turno: "Sábados (08:00 AM - 04:00 PM)", disponible: false },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [nuevoDoctor, setNuevoDoctor] = useState({ nombre: "", especialidad: "Ortodoncia Avanzada", turno: "Mañana (08:00 AM - 01:00 PM)" });

  // Cambiar disponibilidad del doctor en tiempo real
  const toggleDisponibilidad = (id) => {
    setDoctores(doctores.map(doc => doc.id === id ? { ...doc, disponible: !doc.disponible } : doc));
  };

  // Registrar el odontólogo en el estado local
  const registrarDoctor = (e) => {
    e.preventDefault();
    if (!nuevoDoctor.nombre) return;

    setDoctores([
      ...doctores,
      { id: doctores.length + 1, ...nuevoDoctor, disponible: true }
    ]);
    setShowModal(false);
    setNuevoDoctor({ nombre: "", especialidad: "Ortodoncia Avanzada", turno: "Mañana (08:00 AM - 01:00 PM)" });
  };

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
      
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🥼</span>
            <h2 className="text-2xl font-bold text-slate-800">Control de Doctores</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión del staff odontológico, asignación de especialidades clínicas y turnos horarios.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm self-start sm:self-center"
        >
          + Registrar Nuevo Médico
        </button>
      </div>

      {/* GRID DE TARJETAS DE DOCTORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctores.map((doc) => {
          // Extraer la primera letra del apellido o nombre para el avatar
          const partesNombre = doc.nombre.split(" ");
          const inicialAvatar = partesNombre[2] ? partesNombre[2].charAt(0) : (partesNombre[1] ? partesNombre[1].charAt(0) : "D");

          return (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition duration-200">
              <div>
                {/* Top Card: Avatar y Estado */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-[#11B9BB]/10 text-[#11B9BB] rounded-full flex items-center justify-center font-extrabold text-base border border-[#11B9BB]/20">
                      {inicialAvatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">{doc.nombre}</h4>
                      <span className="inline-block text-[11px] text-[#11B9BB] font-semibold mt-0.5 bg-cyan-50/50 px-2 py-0.5 rounded-md">
                        {doc.especialidad}
                      </span>
                    </div>
                  </div>
                  
                  {/* Badge de Disponibilidad */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    doc.disponible ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}>
                    {doc.disponible ? "Activo" : "Ausente"}
                  </span>
                </div>

                {/* Info Detallada Horarios */}
                <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-100 mb-5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horario de Atención</p>
                  <p className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                    ⏰ {doc.turno}
                  </p>
                </div>
              </div>

              {/* Acción de Cambio de Estado Rápido */}
              <div className="pt-3 border-t border-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => toggleDisponibilidad(doc.id)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition border ${
                    doc.disponible 
                      ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white" 
                      : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                  }`}
                >
                  {doc.disponible ? "Marcar Ausencia" : "Habilitar Turno"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL REGISTRAR MEDICO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form onSubmit={registrarDoctor} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-4">Registrar Odontólogo</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo (Con Prefijo)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Dr. Andrés Soto"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={nuevoDoctor.nombre}
                  onChange={(e) => setNuevoDoctor({ ...nuevoDoctor, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Especialidad Dental</label>
                <select 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                  value={nuevoDoctor.especialidad}
                  onChange={(e) => setNuevoDoctor({ ...nuevoDoctor, specialty: e.target.value })}
                >
                  <option value="Ortodoncia Avanzada">Ortodoncia Avanzada</option>
                  <option value="Endodoncia y Estética">Endodoncia y Estética</option>
                  <option value="Cirugía Maxilofacial">Cirugía Maxilofacial</option>
                  <option value="Odontopediatría">Odontopediatría</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Turno Asignado</label>
                <select 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                  value={nuevoDoctor.turno}
                  onChange={(e) => setNuevoDoctor({ ...nuevoDoctor, turno: e.target.value })}
                >
                  <option value="Mañana (08:00 AM - 01:00 PM)">Mañana (08:00 AM - 01:00 PM)</option>
                  <option value="Tarde (02:00 PM - 08:00 PM)">Tarde (02:00 PM - 08:00 PM)</option>
                  <option value="Sábados (08:00 AM - 04:00 PM)">Sábados (08:00 AM - 04:00 PM)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm"
              >
                Registrar Médico
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}