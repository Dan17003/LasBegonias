import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  calcularDeudas,
  contarPacientesConDeuda,
  contarPresupuestosPorVencer,
  formatearMoneda,
  getIngresosDelMes,
  getIngresosSemanales,
  getTotalDeudas,
  toNumber,
} from "../utils/finanzas";
import {
  formatearFechaCorta,
  formatearHora,
  getCitasDelDia,
  getCitasDelMes,
  getNombrePacienteCita,
  getResumenCitas,
  parseFecha,
} from "../utils/citas";

const iconos = {
  calendar: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
  ),
  money: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m4-8a4 4 0 0 0-4-2c-2 0-3 .9-3 2s1 2 3 2 3 .9 3 2-1 2-3 2a4 4 0 0 1-4-2M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0z" />
  ),
  users: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20a5 5 0 0 0-10 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7-1 2 2 3-4" />
  ),
  alert: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 4.4 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0z" />
  ),
  check: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.5 11.5 15 16 9m5 3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
  ),
  close: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 10l4 4m0-4-4 4m11-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
  ),
};

const Icon = ({ name, className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    {iconos[name]}
  </svg>
);

const StatCard = ({ label, value, detail, icon, tone = "teal" }) => {
  const tones = {
    teal: "from-[#11B9BB] to-cyan-700 text-white",
    slate: "from-slate-900 to-slate-700 text-white",
    amber: "from-amber-500 to-orange-600 text-white",
    rose: "from-rose-500 to-red-700 text-white",
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tones[tone]} p-5 shadow-xl shadow-slate-200/70`}>
      <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[48px] bg-white/10" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-xs font-medium text-white/75">{detail}</p>
        </div>
        <div className="rounded-2xl bg-white/15 p-3 text-white">
          <Icon name={icon} />
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, action, children, className = "" }) => (
  <section className={`rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur ${className}`}>
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const Badge = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    teal: "border-teal-100 bg-teal-50 text-teal-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };

  return (
    <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
};

const porcentaje = (valor, total) => {
  if (!total) return 0;
  return Math.round((valor / total) * 100);
};

const getFechaPago = (pago) => new Date(pago.created_at || pago.createdAt);

const getPacienteNombre = (paciente) =>
  paciente ? `${paciente.nombres || ""} ${paciente.apellidos || ""}`.trim() : "Paciente no registrado";

export default function Inicio({ setView }) {
  const userRol = (localStorage.getItem("rol") || "Recepcionista").toUpperCase();
  const esAdmin = userRol === "ADMIN";

  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async () => {
    try {
      const [pacientesRes, citasRes, presupuestosRes, pagosRes, notificacionesRes] =
        await Promise.all([
          api.get("/pacientes"),
          api.get("/citas"),
          api.get("/presupuestos"),
          api.get("/pagos"),
          api.get("/notificaciones"),
        ]);

      setPacientes(pacientesRes.data || []);
      setCitas(citasRes.data || []);
      setPresupuestos(presupuestosRes.data || []);
      setPagos(pagosRes.data || []);
      setNotificaciones(notificacionesRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resumen = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const citasHoy = getCitasDelDia(citas, hoy);
    const citasMes = getCitasDelMes(citas, hoy);
    const citasActivasMes = citasMes.filter((cita) => cita.estado !== "Cancelada");
    const citasConfirmadasMes = citasMes.filter((cita) => cita.estado === "Confirmada");
    const citasCanceladasMes = citasMes.filter((cita) => cita.estado === "Cancelada");
    const citasAtendidasMes = citasMes.filter((cita) => cita.estado === "Atendida");
    const citasProgramadasMes = citasMes.filter((cita) => cita.estado === "Programada");
    const citasPorConfirmar = citasHoy.filter((cita) => cita.estado === "Programada");
    const pacientesIncompletos = pacientes.filter(
      (paciente) => !paciente.telefono || !paciente.email
    );
    const deudas = calcularDeudas(presupuestos, pagos);
    const totalDeudas = getTotalDeudas(presupuestos, pagos);
    const ingresosMes = getIngresosDelMes(pagos, hoy);
    const ingresosHoy = pagos
      .filter((pago) => {
        const fecha = getFechaPago(pago);
        fecha.setHours(0, 0, 0, 0);
        return fecha.getTime() === hoy.getTime();
      })
      .reduce((sum, pago) => sum + toNumber(pago.monto), 0);

    const presupuestosEmitidos = presupuestos.reduce(
      (sum, presupuesto) => sum + toNumber(presupuesto.monto),
      0
    );
    const pagosRegistrados = pagos.reduce((sum, pago) => sum + toNumber(pago.monto), 0);
    const cobranza = porcentaje(pagosRegistrados, presupuestosEmitidos);

    const rankingDoctores = Object.entries(
      citasActivasMes.reduce((acc, cita) => {
        if (!cita.doctor) return acc;
        acc[cita.doctor] = (acc[cita.doctor] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const ingresosPorDoctor = Object.entries(
      citasAtendidasMes.reduce((acc, cita) => {
        if (!cita.doctor) return acc;
        acc[cita.doctor] = (acc[cita.doctor] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const proximasCitas = citas
      .filter((cita) => cita.estado !== "Cancelada")
      .map((cita) => ({ ...cita, fechaDate: parseFecha(cita.fecha) }))
      .filter((cita) => cita.fechaDate && cita.fechaDate >= hoy)
      .sort(
        (a, b) =>
          a.fechaDate - b.fechaDate ||
          (a.hora_inicio || "").localeCompare(b.hora_inicio || "")
      )
      .slice(0, 5);

    const citasCanceladasRecientes = citas
      .filter((cita) => cita.estado === "Cancelada")
      .map((cita) => ({ ...cita, fechaDate: parseFecha(cita.fecha) }))
      .sort((a, b) => (b.fechaDate || 0) - (a.fechaDate || 0))
      .slice(0, 5);

    const respuestasPacientes = notificaciones
      .filter((notificacion) =>
        ["respuesta_confirmada", "respuesta_cancelada"].includes(notificacion.tipo)
      )
      .slice(0, 6);

    const pacientesRecientes = pacientes
      .map((paciente) => ({
        ...paciente,
        resumenCitas: getResumenCitas(citas, paciente.id),
      }))
      .slice(-5)
      .reverse();

    const deudasPrincipales = deudas
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 5);

    return {
      citasHoy,
      citasMes,
      citasActivasMes,
      citasConfirmadasMes,
      citasCanceladasMes,
      citasAtendidasMes,
      citasProgramadasMes,
      citasPorConfirmar,
      citasCanceladasRecientes,
      respuestasPacientes,
      pacientesIncompletos,
      totalDeudas,
      ingresosMes,
      ingresosHoy,
      cobranza,
      rankingDoctores,
      ingresosPorDoctor,
      proximasCitas,
      pacientesRecientes,
      deudasPrincipales,
      presupuestosPorVencer: contarPresupuestosPorVencer(presupuestos, pagos),
      pacientesConDeuda: contarPacientesConDeuda(presupuestos, pagos),
    };
  }, [citas, pacientes, pagos, presupuestos, notificaciones]);

  const ingresosSemanales = useMemo(() => getIngresosSemanales(pagos), [pagos]);
  const maxIngresoSemanal = Math.max(
    ...ingresosSemanales.map((dia) => dia.monto),
    1
  );

  const eliminarCita = async (citaId) => {
    const confirmar = window.confirm("Eliminar esta cita cancelada del sistema?");
    if (!confirmar) return;

    try {
      await api.delete(`/citas/${citaId}`);
      setCitas((prev) => prev.filter((cita) => cita.id !== citaId));
      await cargarDatos();
    } catch (error) {
      alert(error.response?.data?.error || "No se pudo eliminar la cita.");
    }
  };

  if (cargando) {
    return (
      <div className="p-8 w-full max-w-[1400px] mx-auto text-sm text-slate-500">
        Cargando resumen...
      </div>
    );
  }

  const goTo = (view) => setView?.(view);

  if (esAdmin) {
    return (
      <div className="w-full max-w-[1480px] mx-auto p-6 lg:p-8 text-slate-700">
        <div className="mb-6 overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl shadow-slate-200/70 border border-white">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#11B9BB]">
                Administracion general
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight lg:text-4xl">
                Panel administrativo
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Vision gerencial de ingresos, cobranza, rendimiento clinico y actividad del sistema.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Cobranza</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{resumen.cobranza}%</p>
                <p className="text-xs text-slate-500">Sobre presupuestos</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Actividad</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{resumen.citasMes.length}</p>
                <p className="text-xs text-slate-500">Citas del mes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Ingresos del mes"
            value={formatearMoneda(resumen.ingresosMes)}
            detail={`${formatearMoneda(resumen.ingresosHoy)} registrados hoy`}
            icon="money"
            tone="teal"
          />
          <StatCard
            label="Cuentas por cobrar"
            value={formatearMoneda(resumen.totalDeudas)}
            detail={`${resumen.pacientesConDeuda} pacientes con saldo`}
            icon="alert"
            tone="amber"
          />
          <StatCard
            label="Pacientes activos"
            value={pacientes.length}
            detail={`${resumen.pacientesIncompletos.length} fichas incompletas`}
            icon="users"
            tone="slate"
          />
          <StatCard
            label="Asistencia"
            value={`${porcentaje(resumen.citasAtendidasMes.length, resumen.citasActivasMes.length)}%`}
            detail={`${resumen.citasCanceladasMes.length} cancelaciones del mes`}
            icon="check"
            tone={resumen.citasCanceladasMes.length > 0 ? "rose" : "teal"}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Section title="Ingresos semanales" className="xl:col-span-2">
            <div className="flex h-72 items-end gap-3 px-5 pb-5 pt-6">
              {ingresosSemanales.map((dia) => {
                const altura = Math.max((dia.monto / maxIngresoSemanal) * 100, 5);

                return (
                  <div key={dia.dia} className="flex h-full flex-1 flex-col justify-end gap-2">
                    <div className="flex flex-1 items-end rounded-2xl bg-slate-100 px-2">
                      <div
                        className="w-full rounded-t-xl bg-gradient-to-t from-[#0d8f91] to-[#11B9BB] transition-all"
                        style={{ height: `${altura}%` }}
                        title={formatearMoneda(dia.monto)}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-slate-700">{dia.dia}</p>
                      <p className="text-[10px] text-slate-400">{formatearMoneda(dia.monto)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Indicadores clave">
            <div className="space-y-4 p-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">Cobranza global</span>
                  <span className="font-black text-slate-950">{resumen.cobranza}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-[#11B9BB]" style={{ width: `${Math.min(resumen.cobranza, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Confirmadas</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{resumen.citasConfirmadasMes.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Programadas</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{resumen.citasProgramadasMes.length}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-700">Presupuestos por vencer</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{resumen.presupuestosPorVencer}</p>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Section title="Rendimiento por doctor">
            <div className="space-y-3 p-5">
              {resumen.rankingDoctores.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Sin citas registradas este mes.</p>
              ) : (
                resumen.rankingDoctores.map(([doctor, total], index) => (
                  <div key={doctor} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{doctor}</p>
                      <p className="text-[11px] text-slate-400">Posicion {index + 1}</p>
                    </div>
                    <Badge tone="teal">{total} citas</Badge>
                  </div>
                ))
              )}
            </div>
          </Section>

          <Section title="Cuentas por cobrar" className="xl:col-span-2">
            <div className="divide-y divide-slate-100">
              {resumen.deudasPrincipales.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No hay deudas activas.</div>
              ) : (
                resumen.deudasPrincipales.map(({ presupuesto, saldo }) => {
                  const paciente = pacientes.find((item) => Number(item.id) === Number(presupuesto.paciente_id));

                  return (
                    <div key={presupuesto.id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-black text-slate-950">{getPacienteNombre(paciente)}</p>
                        <p className="text-xs text-slate-500">Vence {formatearFechaCorta(presupuesto.fecha_vigencia)}</p>
                      </div>
                      <p className="text-sm font-black text-amber-700">{formatearMoneda(saldo)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </Section>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Section title="Gestion del sistema">
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <button onClick={() => goTo("usuarios")} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-left hover:border-teal-200 hover:bg-teal-50">
                <p className="text-sm font-black text-slate-950">Usuarios y accesos</p>
                <p className="mt-1 text-xs text-slate-500">Roles, permisos y estado de cuentas.</p>
              </button>
              <button onClick={() => goTo("reportes")} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-left hover:border-teal-200 hover:bg-teal-50">
                <p className="text-sm font-black text-slate-950">Reportes</p>
                <p className="mt-1 text-xs text-slate-500">Analisis de operacion y finanzas.</p>
              </button>
              <button onClick={() => goTo("doctores")} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-left hover:border-teal-200 hover:bg-teal-50">
                <p className="text-sm font-black text-slate-950">Doctores</p>
                <p className="mt-1 text-xs text-slate-500">Disponibilidad y equipo clinico.</p>
              </button>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-sm font-black text-slate-950">Pacientes registrados</p>
                <p className="mt-1 text-xs text-slate-500">{pacientes.length} fichas en el sistema.</p>
              </div>
            </div>
          </Section>

          <Section title="Pacientes recientes">
            <div className="divide-y divide-slate-100">
              {resumen.pacientesRecientes.map((paciente) => (
                <div key={paciente.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-black text-slate-950">{paciente.nombres} {paciente.apellidos || ""}</p>
                    <p className="text-xs text-slate-500">{paciente.email || "Sin correo registrado"}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-400">
                    {paciente.resumenCitas.proxima ? formatearFechaCorta(paciente.resumenCitas.proxima.fecha) : "Sin cita"}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1480px] mx-auto p-6 lg:p-8 text-slate-700">
      <div className="mb-6 overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl shadow-slate-200/70 border border-white">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#11B9BB]">
              Recepcion y agenda
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight lg:text-4xl">
              Centro de recepcion
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Control de citas, confirmaciones por correo, cancelaciones, presupuestos y pagos pendientes.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Confirmadas</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{resumen.citasConfirmadasMes.length}</p>
              <p className="text-xs text-slate-500">Este mes</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Canceladas</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{resumen.citasCanceladasMes.length}</p>
              <p className="text-xs text-slate-500">Reprogramar</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={esAdmin ? "Ingresos del mes" : "Citas hoy"}
          value={resumen.citasHoy.length}
          detail={`${resumen.citasPorConfirmar.length} por confirmar`}
          icon="calendar"
          tone="teal"
        />
        <StatCard
          label="Confirmadas"
          value={resumen.citasConfirmadasMes.length}
          detail="Respuestas por correo y agenda"
          icon="check"
          tone="slate"
        />
        <StatCard
          label="Pacientes con deuda"
          value={resumen.pacientesConDeuda}
          detail={`${resumen.pacientesConDeuda} paciente${resumen.pacientesConDeuda !== 1 ? "s" : ""} con saldo`}
          icon="alert"
          tone={resumen.totalDeudas > 0 ? "amber" : "slate"}
        />
        <StatCard
          label="Presupuestos por vencer"
          value={resumen.presupuestosPorVencer}
          detail="Pendientes de pago o seguimiento"
          icon="money"
          tone={resumen.presupuestosPorVencer > 0 ? "rose" : "teal"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Section
          title="Respuestas de pacientes"
          action={<Badge tone="teal">{resumen.respuestasPacientes.length} recientes</Badge>}
          className="xl:col-span-2"
        >
          <div className="divide-y divide-slate-100">
            {resumen.respuestasPacientes.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Aun no hay respuestas desde correo.
              </div>
            ) : (
              resumen.respuestasPacientes.map((notificacion) => (
                <div key={notificacion.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-2xl p-2 ${notificacion.tipo === "respuesta_cancelada" ? "bg-rose-50 text-rose-600" : "bg-teal-50 text-teal-700"}`}>
                      <Icon name={notificacion.tipo === "respuesta_cancelada" ? "close" : "check"} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950">{notificacion.titulo}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{notificacion.mensaje}</p>
                    </div>
                  </div>
                  <Badge tone={notificacion.tipo === "respuesta_cancelada" ? "rose" : "teal"}>
                    {notificacion.tipo === "respuesta_cancelada" ? "Cancelada" : "Confirmada"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title="Tareas de recepcion">
          <div className="space-y-3 p-5">
            {[
              ["Confirmar agenda del dia", `${resumen.citasPorConfirmar.length} pendiente${resumen.citasPorConfirmar.length !== 1 ? "s" : ""}`],
              ["Reprogramar canceladas", `${resumen.citasCanceladasRecientes.length} cita${resumen.citasCanceladasRecientes.length !== 1 ? "s" : ""}`],
              ["Completar contactos", `${resumen.pacientesIncompletos.length} paciente${resumen.pacientesIncompletos.length !== 1 ? "s" : ""}`],
              ["Presupuestos por vencer", `${resumen.presupuestosPorVencer} con saldo pendiente`],
            ].map(([titulo, desc]) => (
              <div key={titulo} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <p className="text-sm font-black text-slate-950">{titulo}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Section
          title="Agenda inmediata"
          action={<Badge>{resumen.proximasCitas.length} proximas</Badge>}
          className="xl:col-span-2"
        >
          <div className="divide-y divide-slate-100">
            {resumen.proximasCitas.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No hay citas proximas.
              </div>
            ) : (
              resumen.proximasCitas.map((cita) => (
                <div key={cita.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <div>
                    <p className="text-xs font-black text-slate-950">{formatearFechaCorta(cita.fecha)}</p>
                    <p className="text-[11px] text-slate-400">{formatearHora(cita.hora_inicio)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-950">{getNombrePacienteCita(cita, pacientes)}</p>
                    <p className="text-xs text-slate-500">{cita.motivo} - {cita.doctor}</p>
                  </div>
                  <Badge tone={cita.estado === "Confirmada" ? "teal" : "slate"}>
                    {cita.estado || "Programada"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title={esAdmin ? "Doctores destacados" : "Citas canceladas"}>
          <div className="space-y-3 p-5">
            {esAdmin ? (
              resumen.rankingDoctores.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Sin citas registradas este mes.</p>
              ) : (
                resumen.rankingDoctores.map(([doctor, total], index) => (
                  <div key={doctor} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{doctor}</p>
                      <p className="text-[11px] text-slate-400">Posicion {index + 1}</p>
                    </div>
                    <Badge tone="teal">{total} citas</Badge>
                  </div>
                ))
              )
            ) : resumen.citasCanceladasRecientes.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No hay cancelaciones recientes.</p>
            ) : (
              resumen.citasCanceladasRecientes.map((cita) => (
                <div key={cita.id} className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                  <p className="text-sm font-black text-slate-950">{getNombrePacienteCita(cita, pacientes)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatearFechaCorta(cita.fecha)} - {formatearHora(cita.hora_inicio)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setView?.("agenda")}
                      className="rounded-xl bg-slate-950 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800"
                    >
                      Reprogramar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarCita(cita.id)}
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
