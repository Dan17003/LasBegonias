import { useState } from "react";

export default function Reportes() {
  const [filtroMes, setFiltroMes] = useState("Mayo");

  // Simulación de base de datos analítica para la clínica
  const rendimientoDoctores = [
    { doctor: "Dr. Carlos Alva", especialidad: "Ortodoncia", citas: 48, efectividad: "96%", ingresos: "S/ 7,200" },
    { doctor: "Dra. Sonia Espinoza", especialidad: "Endodoncia", citas: 35, efectividad: "91%", ingresos: "S/ 5,800" },
    { doctor: "Dr. Jorge Mendoza", especialidad: "Cirugía", citas: 12, efectividad: "83%", ingresos: "S/ 1,850" },
  ];

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
      
      {/* HEADER CON FILTRO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📈</span>
            <h2 className="text-2xl font-bold text-slate-800">Reportes Estadísticos</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Análisis consolidado de productividad de personal, flujo financiero e inasistencias.
          </p>
        </div>
        
        {/* Filtro interactivo de mes */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-white border border-slate-200 p-1.5 rounded-xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 px-2">Período:</span>
          <select 
            value={filtroMes} 
            onChange={(e) => setFiltroMes(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg outline-none cursor-pointer border border-slate-100"
          >
            <option value="Mayo">Mayo 2026</option>
            <option value="Abril">Abril 2026</option>
            <option value="Marzo">Marzo 2026</option>
          </select>
        </div>
      </div>

      {/* SECCIÓN 1: METRICAS DE CONTROL FINANCIERO Y ASISTENCIA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Card Resumen 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Recaudado ({filtroMes})</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-800">
              {filtroMes === "Mayo" ? "S/ 14,850" : filtroMes === "Abril" ? "S/ 16,200" : "S/ 13,400"}
            </span>
            <span className="text-xs font-bold text-emerald-500">🟢 100% Auditado</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: "85%" }}></div>
          </div>
        </div>

        {/* Card Resumen 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Citas Atendidas con Éxito</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-800">
              {filtroMes === "Mayo" ? "95" : filtroMes === "Abril" ? "112" : "88"} Citas
            </span>
            <span className="text-xs font-bold text-cyan-500">92% del total</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-[#11B9BB] h-full rounded-full" style={{ width: "92%" }}></div>
          </div>
        </div>

        {/* Card Resumen 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tasa de Inasistencias</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-rose-600">
              {filtroMes === "Mayo" ? "4.2%" : filtroMes === "Abril" ? "5.1%" : "6.8%"}
            </span>
            <span className="text-xs font-bold text-rose-400">Objetivo: &lt; 8%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: "42%" }}></div>
          </div>
        </div>

      </div>

      {/* SECCIÓN 2: TABLA DE RENDIMIENTO POR DOCTOR */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800">📊 Productividad y Rendimiento por Odontólogo</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Desglose de pacientes atendidos e ingresos generados por cada profesional.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Médico Odontólogo</th>
                <th className="py-4 px-6">Especialidad</th>
                <th className="py-4 px-6 text-center">Citas Agendadas</th>
                <th className="py-4 px-6 text-center">Tasa de Cumplimiento</th>
                <th className="py-4 px-6 text-right">Ingreso Neto Generado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {rendimientoDoctores.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 px-6 font-bold text-slate-800">{r.doctor}</td>
                  <td className="py-4 px-6 text-slate-500 text-xs">{r.especialidad}</td>
                  <td className="py-4 px-6 text-center font-semibold font-mono text-slate-600">{r.citas}</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-0.5 rounded-md border border-teal-100">
                      {r.efectividad}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-emerald-600 font-mono">{r.ingresos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}