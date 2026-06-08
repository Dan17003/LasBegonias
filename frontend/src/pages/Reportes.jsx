import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import {
  obtenerMesesDisponibles,
  calcularResumenMes,
  calcularRendimientoDoctores,
  formatearSoles,
} from "../utils/reportes";
import { exportarCSV, exportarPDF } from "../utils/exportar";

export default function Reportes() {
  const [citas, setCitas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [odontologos, setOdontologos] = useState([]);
  const [filtroMes, setFiltroMes] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const [resCitas, resPagos, resOdontologos] = await Promise.all([
          api.get("/citas"),
          api.get("/pagos"),
          api.get("/odontologos"),
        ]);
        setCitas(resCitas.data || []);
        setPagos(resPagos.data || []);
        setOdontologos(resOdontologos.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const meses = useMemo(
    () => obtenerMesesDisponibles(citas, pagos),
    [citas, pagos]
  );

  useEffect(() => {
    if (!filtroMes && meses.length > 0) {
      setFiltroMes(meses[0].value);
    }
  }, [meses, filtroMes]);

  const periodoLabel = meses.find((m) => m.value === filtroMes)?.label || "";
  const resumen = useMemo(
    () => calcularResumenMes(citas, pagos, filtroMes),
    [citas, pagos, filtroMes]
  );
  const rendimientoDoctores = useMemo(
    () => calcularRendimientoDoctores(odontologos, citas, pagos, filtroMes),
    [odontologos, citas, pagos, filtroMes]
  );

  const exportarExcel = () => {
    exportarCSV(
      [
        {
          Periodo: periodoLabel,
          "Total recaudado": formatearSoles(resumen.totalRecaudado),
          "Citas atendidas": resumen.citasAtendidas,
          "Total citas": resumen.citasTotal,
          "Tasa inasistencias": `${resumen.tasaInasistencias}%`,
        },
        ...rendimientoDoctores.map((r) => ({
          Periodo: periodoLabel,
          Odontologo: r.doctor,
          Especialidad: r.especialidad,
          Citas: r.citas,
          Cumplimiento: r.efectividad,
          Ingresos: r.ingresos,
        })),
      ],
      `reporte-begonias-${filtroMes}`
    );
  };

  const exportarReportePDF = () => {
    exportarPDF({
      titulo: "Reportes y Estadísticas — Clínica Las Begonias",
      periodo: periodoLabel,
      resumen: {
        totalRecaudado: formatearSoles(resumen.totalRecaudado),
        citasAtendidas: `${resumen.citasAtendidas} de ${resumen.citasTotal}`,
        tasaInasistencias: `${resumen.tasaInasistencias}%`,
      },
      tabla: rendimientoDoctores,
    });
  };

  if (cargando) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        Cargando reportes...
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📈</span>
            <h2 className="text-2xl font-bold text-slate-800">Reportes y Estadísticas</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Datos en tiempo real de citas, pagos y productividad por odontólogo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-2xs">
            <span className="text-xs font-bold text-slate-400 px-2">Período:</span>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg outline-none cursor-pointer border border-slate-100"
            >
              {meses.map((mes) => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={exportarExcel}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-2 rounded-xl border border-emerald-100"
          >
            Exportar Excel
          </button>
          <button
            onClick={exportarReportePDF}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-4 py-2 rounded-xl border border-rose-100"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Recaudado ({periodoLabel})
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-800">
              {formatearSoles(resumen.totalRecaudado)}
            </span>
            <span className="text-xs font-bold text-emerald-500">
              {resumen.pagosCount} pago{resumen.pagosCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${Math.min(resumen.pagosCount * 10, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Citas Atendidas con Éxito
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-800">
              {resumen.citasAtendidas} Citas
            </span>
            <span className="text-xs font-bold text-cyan-500">
              {resumen.tasaExito}% del total
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-[#11B9BB] h-full rounded-full"
              style={{ width: `${resumen.tasaExito}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Tasa de Inasistencias
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-rose-600">
              {resumen.tasaInasistencias}%
            </span>
            <span className="text-xs font-bold text-rose-400">Objetivo: &lt; 8%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full"
              style={{ width: `${Math.min(resumen.tasaInasistencias * 10, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800">
            Productividad y Rendimiento por Odontólogo
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Citas agendadas e ingresos registrados en finanzas por cada profesional.
          </p>
        </div>

        {rendimientoDoctores.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            No hay datos para el período seleccionado.
          </p>
        ) : (
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
                {rendimientoDoctores.map((r) => (
                  <tr key={r.doctor} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-bold text-slate-800">{r.doctor}</td>
                    <td className="py-4 px-6 text-slate-500 text-xs">{r.especialidad}</td>
                    <td className="py-4 px-6 text-center font-semibold font-mono text-slate-600">
                      {r.citas}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-0.5 rounded-md border border-teal-100">
                        {r.efectividad}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-600 font-mono">
                      {r.ingresos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
