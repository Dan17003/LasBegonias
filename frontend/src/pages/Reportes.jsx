import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import {
  obtenerMesesDisponibles,
  calcularResumenMes,
  calcularRendimientoDoctores,
  formatearSoles,
  filtrarCitasMes,
  filtrarPagosMes,
} from "../utils/reportes";
import { calcularDeudas, toNumber } from "../utils/finanzas";
import { exportarCSV, exportarPDF } from "../utils/exportar";

const Card = ({ label, value, detail, tone = "teal" }) => {
  const tones = {
    teal: "border-teal-100 bg-teal-50 text-teal-800",
    slate: "border-slate-100 bg-white text-slate-900",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-xl shadow-slate-200/60 ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
};

const Section = ({ title, children, action, className = "" }) => (
  <section className={`rounded-2xl border border-white bg-white/95 shadow-xl shadow-slate-200/60 ${className}`}>
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const BarRow = ({ label, value, max, color = "bg-[#11B9BB]", right }) => {
  const width = max ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-700 truncate">{label}</span>
        <span className="font-bold text-slate-500">{right ?? value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const agruparPor = (items, keyFn, valueFn = () => 1) =>
  items.reduce((acc, item) => {
    const key = keyFn(item) || "Sin dato";
    acc[key] = (acc[key] || 0) + valueFn(item);
    return acc;
  }, {});

const mesKeyDeFecha = (fecha) => {
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export default function Reportes() {
  const [citas, setCitas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [odontologos, setOdontologos] = useState([]);
  const [filtroMes, setFiltroMes] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const [resCitas, resPagos, resPresupuestos, resOdontologos] = await Promise.all([
          api.get("/citas"),
          api.get("/pagos"),
          api.get("/presupuestos"),
          api.get("/odontologos"),
        ]);
        setCitas(resCitas.data || []);
        setPagos(resPagos.data || []);
        setPresupuestos(resPresupuestos.data || []);
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

  const analitica = useMemo(() => {
    const citasMes = filtrarCitasMes(citas, filtroMes);
    const pagosMes = filtrarPagosMes(pagos, filtroMes);
    const deudas = calcularDeudas(presupuestos, pagos);
    const totalDeuda = deudas.reduce((sum, deuda) => sum + deuda.saldo, 0);
    const totalPresupuestado = presupuestos.reduce(
      (sum, presupuesto) => sum + toNumber(presupuesto.monto),
      0
    );

    const estados = agruparPor(citasMes, (cita) => cita.estado || "Programada");
    const metodosPago = agruparPor(
      pagosMes,
      (pago) => pago.metodo || "Sin metodo",
      (pago) => toNumber(pago.monto)
    );
    const ingresosPorDoctor = agruparPor(
      pagosMes,
      (pago) => pago.doctor || "Sin doctor",
      (pago) => toNumber(pago.monto)
    );
    const citasPorServicio = agruparPor(citasMes, (cita) => cita.servicio || cita.motivo || "Sin servicio");
    const tendenciaMensual = meses.slice(0, 6).reverse().map((mes) => {
      const total = pagos
        .filter((pago) => mesKeyDeFecha(pago.created_at || pago.createdAt) === mes.value)
        .reduce((sum, pago) => sum + toNumber(pago.monto), 0);
      return { ...mes, total };
    });

    return {
      citasMes,
      pagosMes,
      deudas,
      totalDeuda,
      totalPresupuestado,
      estados,
      metodosPago,
      ingresosPorDoctor,
      citasPorServicio,
      tendenciaMensual,
    };
  }, [citas, pagos, presupuestos, filtroMes, meses]);

  const exportarExcel = () => {
    exportarCSV(
      [
        {
          Periodo: periodoLabel,
          "Total recaudado": formatearSoles(resumen.totalRecaudado),
          "Citas atendidas": resumen.citasAtendidas,
          "Total citas": resumen.citasTotal,
          "Tasa inasistencias": `${resumen.tasaInasistencias}%`,
          "Deuda activa": formatearSoles(analitica.totalDeuda),
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
      titulo: "Reportes y Estadisticas - Clinica Las Begonias",
      periodo: periodoLabel,
      resumen: {
        totalRecaudado: formatearSoles(resumen.totalRecaudado),
        citasAtendidas: `${resumen.citasAtendidas} de ${resumen.citasTotal}`,
        tasaInasistencias: `${resumen.tasaInasistencias}%`,
      },
      tabla: rendimientoDoctores,
    });
  };

  const maxIngresosDoctor = Math.max(...Object.values(analitica.ingresosPorDoctor), 1);
  const maxMetodos = Math.max(...Object.values(analitica.metodosPago), 1);
  const maxServicios = Math.max(...Object.values(analitica.citasPorServicio), 1);
  const maxTendencia = Math.max(...analitica.tendenciaMensual.map((m) => m.total), 1);

  if (cargando) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        Cargando reportes...
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-[1450px] mx-auto font-sans text-slate-700">
      <div className="mb-8 rounded-3xl bg-white border border-white shadow-xl shadow-slate-200/70 p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#11B9BB]">
              Analitica y control
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Reportes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Indicadores de citas, productividad, pagos, servicios y cobranza.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
              <span className="text-xs font-bold text-slate-400 px-2">Periodo</span>
              <select
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-white px-3 py-2 rounded-xl outline-none cursor-pointer border border-slate-100"
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
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-emerald-100"
            >
              Exportar Excel
            </button>
            <button
              onClick={exportarReportePDF}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-rose-100"
            >
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <Card
          label="Total recaudado"
          value={formatearSoles(resumen.totalRecaudado)}
          detail={`${resumen.pagosCount} pago${resumen.pagosCount !== 1 ? "s" : ""} en ${periodoLabel}`}
          tone="teal"
        />
        <Card
          label="Citas atendidas"
          value={`${resumen.citasAtendidas}/${resumen.citasTotal}`}
          detail={`${resumen.tasaExito}% de cumplimiento`}
        />
        <Card
          label="Inasistencias"
          value={`${resumen.tasaInasistencias}%`}
          detail="Cancelaciones sobre total de citas"
          tone={resumen.tasaInasistencias > 8 ? "rose" : "slate"}
        />
        <Card
          label="Deuda activa"
          value={formatearSoles(analitica.totalDeuda)}
          detail={`${analitica.deudas.length} presupuesto${analitica.deudas.length !== 1 ? "s" : ""} pendiente${analitica.deudas.length !== 1 ? "s" : ""}`}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Section title="Tendencia de ingresos" className="xl:col-span-2">
          <div className="flex h-72 items-end gap-3 px-5 pb-5 pt-6">
            {analitica.tendenciaMensual.map((mes) => {
              const altura = Math.max((mes.total / maxTendencia) * 100, mes.total > 0 ? 6 : 0);
              return (
                <div key={mes.value} className="flex h-full flex-1 flex-col justify-end gap-2">
                  <div className="flex flex-1 items-end rounded-2xl bg-slate-100 px-2">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-[#0d8f91] to-[#11B9BB]"
                      style={{ height: `${altura}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-600">{mes.label.split(" ")[0].slice(0, 3)}</p>
                    <p className="text-[10px] text-slate-400">{formatearSoles(mes.total)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Estado de citas">
          <div className="space-y-4 p-5">
            {Object.entries(analitica.estados).map(([estado, total]) => (
              <BarRow
                key={estado}
                label={estado}
                value={total}
                max={Math.max(...Object.values(analitica.estados), 1)}
                color={estado === "Cancelada" ? "bg-rose-500" : estado === "Confirmada" ? "bg-[#11B9BB]" : "bg-slate-500"}
              />
            ))}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Section title="Ingresos por odontologo">
          <div className="space-y-4 p-5">
            {Object.entries(analitica.ingresosPorDoctor).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Sin pagos asociados a odontologos.</p>
            ) : (
              Object.entries(analitica.ingresosPorDoctor)
                .sort((a, b) => b[1] - a[1])
                .map(([doctor, total]) => (
                  <BarRow
                    key={doctor}
                    label={doctor}
                    value={total}
                    max={maxIngresosDoctor}
                    right={formatearSoles(total)}
                  />
                ))
            )}
          </div>
        </Section>

        <Section title="Metodos de pago">
          <div className="space-y-4 p-5">
            {Object.entries(analitica.metodosPago).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Sin pagos en este periodo.</p>
            ) : (
              Object.entries(analitica.metodosPago).map(([metodo, total]) => (
                <BarRow
                  key={metodo}
                  label={metodo}
                  value={total}
                  max={maxMetodos}
                  right={formatearSoles(total)}
                  color="bg-emerald-500"
                />
              ))
            )}
          </div>
        </Section>

        <Section title="Servicios mas solicitados">
          <div className="space-y-4 p-5">
            {Object.entries(analitica.citasPorServicio).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Sin citas en este periodo.</p>
            ) : (
              Object.entries(analitica.citasPorServicio)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([servicio, total]) => (
                  <BarRow
                    key={servicio}
                    label={servicio}
                    value={total}
                    max={maxServicios}
                    color="bg-amber-500"
                  />
                ))
            )}
          </div>
        </Section>
      </div>

      <Section title="Productividad y rendimiento por odontologo">
        {rendimientoDoctores.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            No hay datos para el periodo seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Odontologo</th>
                  <th className="py-4 px-6">Especialidad</th>
                  <th className="py-4 px-6 text-center">Citas</th>
                  <th className="py-4 px-6 text-center">Cumplimiento</th>
                  <th className="py-4 px-6 text-right">Ingreso neto</th>
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
      </Section>
    </div>
  );
}
