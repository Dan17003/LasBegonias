import { useState } from "react";

export default function Agenda() {
  const [view, setView] = useState("dia");
  const [selectedDoctor, setSelectedDoctor] = useState("Todos");

  const doctores = ["Todos", "Dr. Carlos Ruiz", "Dra. Tanio Mamani"];

  const citasDia = [
    { id: 1, hora: "09:00 AM", paciente: "María José Torres", motivo: "Limpieza dental", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    { id: 2, hora: "09:30 AM", paciente: "Carlos Ruiz", motivo: "Consulta general", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { id: 3, hora: "10:00 AM", paciente: "Paula Gálvez", motivo: "Control", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { id: 4, hora: "10:30 AM", paciente: "Diego Ramírez", motivo: "Tratamiento", color: "bg-purple-50 text-purple-700 border-purple-200" },
    { id: 5, hora: "01:00 PM", paciente: "Lucía Fernández", motivo: "Ortodoncia", color: "bg-rose-50 text-rose-700 border-rose-200" }
  ];

  const horasTimeline = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

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
                  selectedDoctor === doc ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500"
                }`}
              >
                {doc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTRLES DE TIEMPO */}
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
                  view === v.id ? "bg-[#11B9BB] text-white shadow-xs" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5">
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
                const citasDeLaHora = citasDia.filter(c => c.hora.startsWith(hora.split(":")[0] + ":00"));
                const citasMediaHora = citasDia.filter(c => c.hora.startsWith(hora.split(":")[0] + ":30"));

                return (
                  <div key={hora} className="flex min-h-[64px] relative">
                    <div className="w-24 text-right pr-4 py-2 text-[11px] font-medium text-slate-400 border-r border-slate-100 bg-slate-50/30">
                      {hora}
                    </div>

                    <div className="flex-1 p-1.5 relative flex gap-2">
                      {citasDeLaHora.map((cita) => (
                        <div key={cita.id} className={`flex-1 p-2.5 rounded-xl border ${cita.color} shadow-2xs`}>
                          <p className="font-bold text-xs">{cita.paciente}</p>
                          <p className="text-[10px] opacity-85 mt-0.5">{cita.hora} - {cita.motivo}</p>
                        </div>
                      ))}

                      {citasMediaHora.map((cita) => (
                        <div key={cita.id} className={`p-2.5 rounded-xl border ${cita.color} shadow-2xs w-1/2 ml-auto`}>
                          <p className="font-bold text-xs">{cita.paciente}</p>
                          <p className="text-[10px] opacity-85 mt-0.5">{cita.hora} - {cita.motivo}</p>
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
          <div className="grid grid-cols-5 divide-x divide-slate-100">
            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map((dia, idx) => (
              <div key={dia} className="flex flex-col min-h-[450px]">
                <div className="bg-slate-50 border-b border-slate-100 py-2.5 text-center text-xs font-bold text-slate-400 uppercase">
                  {dia}
                </div>
                <div className="p-3 space-y-2.5 flex-1 bg-slate-50/10">
                  {idx === 0 ? (
                    citasDia.slice(0, 3).map((cita) => (
                      <div key={cita.id} className={`p-2 rounded-xl border ${cita.color} text-xs`}>
                        <span className="font-bold block">{cita.paciente}</span>
                        <span className="text-[10px] opacity-85">{cita.hora}</span>
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
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="font-semibold text-xs text-slate-400 uppercase py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className="h-16 border border-slate-100 rounded-xl p-2 text-left bg-slate-50/30 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                  {i === 17 && (
                    <span className="text-[9px] bg-[#11B9BB] text-white px-1 py-0.5 rounded font-bold text-center">
                      5 Citas
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}