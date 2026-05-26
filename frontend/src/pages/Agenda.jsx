import { useState } from "react";

export default function Agenda() {
  const [view, setView] = useState("dia");
  const [selectedDoctor, setSelectedDoctor] = useState("Todos");
  const [showModal, setShowModal] = useState(false);

  const doctores = ["Todos", "Dr. Carlos Ruiz", "Dra. Tania Mamani"];

  // Paleta de estilos dinámicos para las especialidades clínicas
  const coloresMotivos = {
    "Limpieza dental": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Consulta general": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Control": "bg-amber-50 text-amber-700 border-amber-200",
    "Tratamiento": "bg-purple-50 text-purple-700 border-purple-200",
    "Ortodoncia": "bg-rose-50 text-rose-700 border-rose-200"
  };

  // Listado de citas base con el doctor asignado
  const [citas, setCitas] = useState([
    { id: 1, hora: "09:00 AM", paciente: "María José Torres", motivo: "Limpieza dental", doctor: "Dr. Carlos Ruiz", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    { id: 2, hora: "09:30 AM", paciente: "Carlos Ruiz Mendoza", motivo: "Consulta general", doctor: "Dra. Tania Mamani", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { id: 3, hora: "10:00 AM", paciente: "Paula Gálvez", motivo: "Control", doctor: "Dr. Carlos Ruiz", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { id: 4, hora: "10:30 AM", paciente: "Diego Ramírez", motivo: "Tratamiento", doctor: "Dra. Tania Mamani", color: "bg-purple-50 text-purple-700 border-purple-200" },
    { id: 5, hora: "01:00 PM", paciente: "Lucía Fernández", motivo: "Ortodoncia", doctor: "Dr. Carlos Ruiz", color: "bg-rose-50 text-rose-700 border-rose-200" }
  ]);

  // Formulario del nuevo registro de cita
  const [formCita, setFormCita] = useState({
    paciente: "",
    hora: "08:00 AM",
    motivo: "Consulta general",
    doctor: "Dr. Carlos Ruiz"
  });

  const horasTimeline = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

  // Manejador para agregar citas en tiempo real
  const registrarNuevaCita = (e) => {
    e.preventDefault();
    if (!formCita.paciente) return;

    const nueva = {
      id: citas.length + 1,
      hora: formCita.hora,
      paciente: formCita.paciente,
      motivo: formCita.motivo,
      doctor: formCita.doctor,
      color: coloresMotivos[formCita.motivo] || "bg-slate-50 text-slate-700 border-slate-200"
    };

    setCitas([...citas, nueva]);
    setShowModal(false);
    setFormCita({ paciente: "", hora: "08:00 AM", motivo: "Consulta general", doctor: "Dr. Carlos Ruiz" });
  };

  // Filtrado lógico en tiempo real por odontólogo
  const citasFiltradas = citas.filter(c => selectedDoctor === "Todos" || c.doctor === selectedDoctor);

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">

      {/* HEADER CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-800">Agenda</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Odontólogo:</span>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {doctores.map((doc) => (
              <button
                key={doc}
                onClick={() => setSelectedDoctor(doc)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  selectedDoctor === doc ? "bg-white text-slate-800 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {doc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTROLES DE TIEMPO */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button className="px-3 py-1.5 text-slate-400 hover:bg-slate-50 border-r border-slate-200 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button className="px-3 py-1.5 text-slate-400 hover:bg-slate-50 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <button className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold hover:bg-slate-100">
            Hoy
          </button>
          <div className="flex items-center gap-1 font-semibold text-slate-700 text-base ml-2">
            <span>18 mayo 2026</span>
            <svg className="w-3 h-3 text-slate-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        <div className="flex items-center gap-4 justify-between sm:justify-end">
          <div className="flex border border-slate-200 rounded-xl p-1 bg-white">
            {[{ id: "dia", label: "Día" }, { id: "semana", label: "Semana" }, { id: "mes", label: "Mes" }].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  view === v.id ? "bg-[#11B9BB] text-white shadow-xs font-bold" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nueva cita
          </button>
        </div>
      </div>

      {/* CONTENEDOR CENTRAL */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {view === "dia" && (
          <div className="flex flex-col">
            <div className="bg-slate-50 border-b border-slate-100 py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              Lunes
            </div>

            <div className="relative divide-y divide-slate-100">
              {horasTimeline.map((hora) => {
                const prefixHora = hora.split(":")[0];
                const sufijoAmPm = hora.split(" ")[1];
                
                const citasDeLaHora = citasFiltradas.filter(c => c.hora === `${prefixHora}:00 ${sufijoAmPm}`);
                const citasMediaHora = citasFiltradas.filter(c => c.hora === `${prefixHora}:30 ${sufijoAmPm}`);

                return (
                  <div key={hora} className="flex min-h-[64px] relative">
                    <div className="w-24 text-right pr-4 py-2 text-[11px] font-medium text-slate-400 border-r border-slate-100 bg-slate-50/30">
                      {hora}
                    </div>

                    <div className="flex-1 p-1.5 relative flex flex-col sm:flex-row gap-2">
                      {citasDeLaHora.map((cita) => (
                        <div key={cita.id} className={`flex-1 p-2.5 rounded-xl border ${cita.color} shadow-2xs flex flex-col justify-center`}>
                          <p className="font-bold text-xs">{cita.paciente}</p>
                          <p className="text-[10px] opacity-85 mt-0.5">{cita.hora} - {cita.motivo} ({cita.doctor})</p>
                        </div>
                      ))}

                      {citasMediaHora.map((cita) => (
                        <div key={cita.id} className={`p-2.5 rounded-xl border ${cita.color} shadow-2xs flex flex-col justify-center sm:ml-auto sm:w-1/2`}>
                          <p className="font-bold text-xs">{cita.paciente}</p>
                          <p className="text-[10px] opacity-85 mt-0.5">{cita.hora} - {cita.motivo} ({cita.doctor})</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "semana" && (
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map((dia, idx) => (
              <div key={dia} className="flex flex-col min-h-[450px]">
                <div className="bg-slate-50 border-b border-slate-100 py-2.5 text-center text-xs font-bold text-slate-400 uppercase">
                  {dia}
                </div>
                <div className="p-3 space-y-2.5 flex-1 bg-slate-50/10">
                  {idx === 0 && citasFiltradas.length > 0 ? (
                    citasFiltradas.slice(0, 4).map((cita) => (
                      <div key={cita.id} className={`p-2 rounded-xl border ${cita.color} text-xs shadow-2xs`}>
                        <span className="font-bold block text-slate-800">{cita.paciente}</span>
                        <span className="text-[10px] block mt-0.5">{cita.hora}</span>
                        <span className="text-[9px] opacity-75">{cita.motivo}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-slate-300 text-center py-6">Sin citas</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "mes" && (
          <div className="p-4 overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="font-semibold text-xs text-slate-400 uppercase py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => (
                  <div key={i} className="h-16 border border-slate-100 rounded-xl p-2 text-left bg-slate-50/30 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                    {i === 17 && citasFiltradas.length > 0 && (
                      <span className="text-[9px] bg-[#11B9BB] text-white px-1 py-0.5 rounded font-bold text-center block truncate">
                        {citasFiltradas.length} Citas
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR CITA */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form onSubmit={registrarNuevaCita} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-4">Programación de Cita Dental</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre del Paciente</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Juan Carlos Quispe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={formCita.paciente}
                  onChange={(e) => setFormCita({ ...formCita, paciente: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Bloque Horario</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                    value={formCita.hora}
                    onChange={(e) => setFormCita({ ...formCita, hora: e.target.value })}
                  >
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Especialidad / Motivo</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                    value={formCita.motivo}
                    onChange={(e) => setFormCita({ ...formCita, motivo: e.target.value })}
                  >
                    <option value="Consulta general">Consulta general</option>
                    <option value="Limpieza dental">Limpieza dental</option>
                    <option value="Control">Control</option>
                    <option value="Tratamiento">Tratamiento</option>
                    <option value="Ortodoncia">Ortodoncia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Asignar Odontólogo</label>
                <select 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                  value={formCita.doctor}
                  onChange={(e) => setFormCita({ ...formCita, doctor: e.target.value })}
                >
                  <option value="Dr. Carlos Ruiz">Dr. Carlos Ruiz</option>
                  <option value="Dra. Tania Mamani">Dra. Tania Mamani</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl">
                Cancelar
              </button>
              <button type="submit" className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm">
                Agendar Cita
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}