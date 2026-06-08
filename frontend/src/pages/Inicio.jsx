import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  formatearMoneda,
  getIngresosDelMes,
  getIngresosSemanales,
  getTotalDeudas,
  contarPacientesConDeuda,
  contarPresupuestosPorVencer,
  calcularDeudas,
} from "../utils/finanzas";
import {
  getCitasDelDia,
  getNombrePacienteCita,
  formatearHora,
  getDoctorDestacado,
  getPorcentajeInasistencias,
} from "../utils/citas";

export default function Inicio() {
  const userRol = (localStorage.getItem("rol") || "Recepcionista").toUpperCase();
  const esAdmin = userRol === "ADMIN";

  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [pacientesRes, citasRes, presupuestosRes, pagosRes] =
          await Promise.all([
            api.get("/pacientes"),
            api.get("/citas"),
            api.get("/presupuestos"),
            api.get("/pagos"),
          ]);

        setPacientes(pacientesRes.data || []);
        setCitas(citasRes.data || []);
        setPresupuestos(presupuestosRes.data || []);
        setPagos(pagosRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const citasHoy = useMemo(() => getCitasDelDia(citas), [citas]);
  const citasPorConfirmar = citasHoy.filter(
    (cita) => cita.estado === "Programada"
  ).length;
  const pacientesIncompletos = pacientes.filter(
    (paciente) => !paciente.telefono || !paciente.email
  ).length;
  const presupuestosPorVencer = contarPresupuestosPorVencer(
    presupuestos,
    pagos
  );
  const totalDeudas = getTotalDeudas(presupuestos, pagos);
  const presupuestosPendientes = calcularDeudas(presupuestos, pagos).length;
  const tareasPendientes =
    citasPorConfirmar +
    pacientesIncompletos +
    presupuestosPorVencer +
    (totalDeudas > 0 ? 1 : 0);

  const doctorDestacado = getDoctorDestacado(citas);
  const inasistencias = getPorcentajeInasistencias(citas);
  const ingresosSemanales = getIngresosSemanales(pagos);
  const maxIngresoSemanal = Math.max(
    ...ingresosSemanales.map((dia) => dia.monto),
    1
  );

  const cardsResumen = esAdmin
    ? [
        {
          id: 1,
          label: "Ingresos del Mes",
          count: formatearMoneda(getIngresosDelMes(pagos)),
          bg: "bg-cyan-50/60 border-cyan-100",
          textColor: "text-cyan-700",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          id: 2,
          label: "Pacientes registrados",
          count: pacientes.length,
          bg: "bg-teal-50/60 border-teal-100",
          textColor: "text-teal-700",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          id: 3,
          label: "Doctor destacado",
          count: doctorDestacado
            ? `${doctorDestacado[1]} citas`
            : "Sin citas",
          bg: "bg-sky-50/60 border-sky-100",
          textColor: "text-sky-700",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
        },
        {
          id: 4,
          label: "Inasistencias del Mes",
          count: `${inasistencias.toFixed(1)}%`,
          bg: "bg-rose-50/60 border-rose-100",
          textColor: "text-rose-700",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ]
    : [
        {
          id: 1,
          label: "Citas hoy",
          count: citasHoy.length,
          bg: "bg-cyan-50/60 border-cyan-100",
          textColor: "text-cyan-700",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          id: 2,
          label: "Pacientes registrados",
          count: pacientes.length,
          bg: "bg-teal-50/60 border-teal-100",
          textColor: "text-teal-700",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          id: 3,
          label: "Pacientes con deuda",
          count: contarPacientesConDeuda(presupuestos, pagos),
          bg: "bg-sky-50/60 border-sky-100",
          textColor: "text-sky-700",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
        },
        {
          id: 4,
          label: "Tareas pendientes",
          count: tareasPendientes,
          bg: "bg-slate-50 border-slate-200/60",
          textColor: "text-slate-700",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
        },
      ];

  const recordatorios = [
    {
      titulo: "Confirmar citas del día",
      desc:
        citasPorConfirmar > 0
          ? `${citasPorConfirmar} pendiente${citasPorConfirmar > 1 ? "s" : ""}`
          : "Al día",
      color:
        citasPorConfirmar > 0
          ? "text-amber-500 bg-amber-50"
          : "text-slate-400 bg-slate-50",
    },
    {
      titulo: "Presupuestos por vencer",
      desc:
        presupuestosPorVencer > 0
          ? `${presupuestosPorVencer} con saldo pendiente`
          : "Ninguno próximo a vencer",
      color:
        presupuestosPorVencer > 0
          ? "text-blue-500 bg-blue-50"
          : "text-slate-400 bg-slate-50",
    },
    {
      titulo: "Pacientes sin contacto completo",
      desc:
        pacientesIncompletos > 0
          ? `${pacientesIncompletos} por actualizar`
          : "Todos completos",
      color:
        pacientesIncompletos > 0
          ? "text-purple-500 bg-purple-50"
          : "text-slate-400 bg-slate-50",
    },
    {
      titulo: "Cobros pendientes",
      desc:
        totalDeudas > 0
          ? `${formatearMoneda(totalDeudas)} · ${presupuestosPendientes} presupuesto${presupuestosPendientes > 1 ? "s" : ""}`
          : "Sin deudas activas",
      color:
        totalDeudas > 0
          ? "text-emerald-500 bg-emerald-50"
          : "text-slate-400 bg-slate-50",
    },
  ];

  if (cargando) {
    return (
      <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-500">
        Cargando resumen...
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">
          ¡Bienvenido, {esAdmin ? "Administrador" : "Recepcionista"}!
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {esAdmin
            ? "Resumen financiero y operativo con datos en tiempo real."
            : "Resumen operativo de la clínica con datos en tiempo real."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cardsResumen.map((card) => (
          <div
            key={card.id}
            className={`p-4 rounded-2xl border ${card.bg} flex items-center justify-between shadow-2xs`}
          >
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">
                {card.count}
              </p>
              {esAdmin && card.id === 3 && doctorDestacado && (
                <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[140px]">
                  {doctorDestacado[0]}
                </p>
              )}
            </div>
            <div className={`p-2.5 rounded-xl bg-white shadow-3xs ${card.textColor}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {esAdmin && (
        <div className="mb-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
            <svg className="w-4 h-4 text-[#11B9BB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            Ingresos semanales (pagos registrados)
          </h3>
          <div className="flex items-end justify-between h-40 pt-4 px-4 border-b border-slate-100">
            {ingresosSemanales.map((dia) => {
              const altura = Math.max((dia.monto / maxIngresoSemanal) * 100, 8);

              return (
                <div key={dia.dia} className="flex flex-col items-center gap-2 group w-16">
                  <span className="text-[9px] bg-slate-800 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {formatearMoneda(dia.monto)}
                  </span>
                  <div
                    className="w-full bg-[#11B9BB]/80 group-hover:bg-[#11B9BB] rounded-t-lg transition-all duration-300 shadow-3xs"
                    style={{ height: `${altura}%` }}
                  ></div>
                  <span className="text-xs text-slate-400 font-semibold">{dia.dia}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#11B9BB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Citas de hoy
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              {citasHoy.length} programada{citasHoy.length !== 1 ? "s" : ""}
            </span>
          </div>

          {citasHoy.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No hay citas programadas para hoy
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {citasHoy.map((cita) => (
                <div
                  key={cita.id}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-xl transition group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-[#11B9BB] bg-teal-50 px-2.5 py-1 rounded-lg font-mono">
                      {formatearHora(cita.hora_inicio)}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {getNombrePacienteCita(cita, pacientes)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {cita.motivo} · {cita.doctor}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    {cita.estado || "Programada"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
            <svg className="w-4 h-4 text-[#11B9BB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Recordatorios del Sistema
          </h3>

          <div className="space-y-4">
            {recordatorios.map((rec) => (
              <div
                key={rec.titulo}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition"
              >
                <div className={`p-2 rounded-lg ${rec.color} mt-0.5`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">
                    {rec.titulo}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{rec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
