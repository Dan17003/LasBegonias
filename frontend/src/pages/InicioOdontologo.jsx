import { useEffect, useState } from "react";
import api from "../services/api";
import odontologoInicio from "../assets/odontologo-inicio.png";

const formatearHora = (hora) => (hora ? hora.slice(0, 5) : "Hora pendiente");

const formatearActividad = (fecha) => {
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "";
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const esMismoDia = (a, b) => a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
  const etiqueta = esMismoDia(date, hoy)
    ? "Hoy"
    : esMismoDia(date, ayer)
      ? "Ayer"
      : date.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  return `${etiqueta}, ${date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
};

function Icono({ tipo, className = "h-6 w-6" }) {
  const iconos = {
    pacientes: <><path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20" /><circle cx="10" cy="7" r="4" /><path d="M16 4.2a4 4 0 0 1 0 7.6m2 2.2a4.5 4.5 0 0 1 2 3.8V20" /></>,
    calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-13 4h3m-3 3h7" /></>,
    calendarioCheck: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m4 5-3 3-1.5-1.5" /><circle cx="17.5" cy="16.5" r="4.5" fill="white" /></>,
    historial: <><path d="M4 5h16v16H4zM8 3v4m8-4v4M4 10h16" /><path d="M8 14h3m-3 3h6" /></>,
    atencion: <><path d="M7.2 4.5c1.8-1 3-.2 4.8-.2s3-.8 4.8.2c2.4 1.3 2.2 4.5 1.3 7.1-.7 2-1.5 4.8-2.5 6.7-.7 1.3-1.9 1.2-2.3-.2l-.8-3.2c-.2-.8-.8-1.3-1.5-1.3s-1.3.5-1.5 1.3l-.8 3.2c-.4 1.4-1.6 1.5-2.3.2-1-1.9-1.8-4.7-2.5-6.7-.9-2.6-1.1-5.8 1.3-7.1Z" /></>,
    actividad: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5m4-1v5l3 2" /></>,
    flecha: <><path d="M4 12h15m-6-6 6 6-6 6" /></>,
    reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    foco: <><path d="M9 18h6m-5 3h4m-2-19a7 7 0 0 0-4 12.7c.5.4 1 1.2 1 2.3h4c0-1.1.5-1.9 1-2.3A7 7 0 0 0 12 2Z" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {iconos[tipo]}
    </svg>
  );
}

function TarjetaIndicador({ titulo, valor, detalle, icono, onClick, color }) {
  const colores = {
    cyan: "from-cyan-50 to-white text-cyan-700 bg-cyan-100",
    teal: "from-teal-50 to-white text-teal-700 bg-teal-100",
    blue: "from-sky-50 to-white text-sky-700 bg-sky-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-0 items-center gap-4 rounded-3xl border border-white bg-gradient-to-br ${colores[color]} p-4 text-left shadow-[0_12px_30px_-22px_rgba(15,76,120,.45)] transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5`}
    >
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${colores[color].split(" ").at(-1)} ring-4 ring-white/70`}>
        <Icono tipo={icono} className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-3xl font-extrabold leading-none text-[#153c68]">{valor}</span>
        <span className="mt-1 block text-sm font-bold text-[#264c70]">{titulo}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{detalle}</span>
      </span>
      <Icono tipo="flecha" className="h-5 w-5 shrink-0 text-[#12aeb5] transition-transform group-hover:translate-x-1" />
    </button>
  );
}

function Panel({ titulo, icono, accion, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/90 shadow-[0_14px_38px_-28px_rgba(15,76,120,.42)] backdrop-blur ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-sky-50 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-100 text-[#079ba0]">
            <Icono tipo={icono} />
          </span>
          <h2 className="text-base font-extrabold text-[#153c68] sm:text-lg">{titulo}</h2>
        </div>
        {accion}
      </header>
      {children}
    </section>
  );
}

export default function InicioOdontologo({ setView }) {
  const nombre = localStorage.getItem("nombre") || "Odontólogo";
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/historia/resumen-inicio")
      .then(({ data }) => setResumen(data))
      .catch((err) => setError(err.response?.data?.error || "No se pudo cargar el resumen clínico."))
      .finally(() => setCargando(false));
  }, []);

  const citasDeHoy = resumen?.citasHoy || [];
  const pendientes = resumen?.pendientesClinicos || { historiasPorCompletar: 0, atencionesPorRegistrar: 0 };
  const indicadores = [
    { titulo: "Pacientes relacionados", valor: resumen?.pacientesRelacionados ?? "—", detalle: "Historias clínicas a tu cargo", icono: "pacientes", vista: "mis-pacientes", color: "cyan" },
    { titulo: "Citas de hoy", valor: resumen ? citasDeHoy.length : "—", detalle: "Atenciones en tu agenda", icono: "calendario", vista: "agenda", color: "teal" },
    { titulo: "Citas programadas", valor: resumen?.citasProgramadas ?? "—", detalle: "Próximas citas confirmadas", icono: "calendarioCheck", vista: "agenda", color: "blue" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 text-slate-700 sm:p-6 lg:p-7">
      <header className="relative isolate grid min-h-[205px] grid-cols-1 items-center gap-3 overflow-hidden rounded-[2rem] border border-cyan-200/80 bg-gradient-to-r from-[#7fe2e5] via-[#d8f8f6] to-[#55d1d6] px-5 py-5 shadow-[0_18px_45px_-30px_rgba(8,127,145,.42)] sm:px-7 md:grid-cols-[minmax(0,1fr)_230px] lg:min-h-[225px] lg:px-9">
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/55 blur-2xl" />
          <div className="absolute -bottom-36 left-[36%] h-64 w-64 rounded-full bg-cyan-50/75 blur-3xl" />
          <svg viewBox="0 0 1200 250" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-30">
            <path d="M0 174C176 110 275 205 440 151S723 33 884 94s214 64 316 10v146H0Z" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 flex min-w-0 items-start gap-4 sm:gap-5">
          <span className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-[#08a9ad] shadow-[0_8px_20px_-14px_rgba(8,127,129,.6)] sm:h-16 sm:w-16">
            <Icono tipo="atencion" className="h-9 w-9" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#087f81]">Panel clínico</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-[#123f68] sm:text-3xl lg:text-[2.1rem]">
              Bienvenido, {nombre}
            </h1>
            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-[#174f71] sm:text-base">
              Consulta tu agenda y continúa la atención clínica de tus pacientes.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 right-[3%] hidden h-[205px] w-[225px] overflow-hidden rounded-t-[2rem] drop-shadow-[0_12px_18px_rgba(8,90,120,.2)] md:block lg:right-[6%] lg:h-[235px] lg:w-[260px]">
          <img
            src={odontologoInicio}
            alt=""
            className="h-full w-full object-contain object-bottom"
          />
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {indicadores.map((indicador) => (
          <TarjetaIndicador
            key={indicador.titulo}
            {...indicador}
            onClick={() => setView(indicador.vista)}
          />
        ))}
      </section>

      <Panel
        titulo="Agenda de hoy"
        icono="calendario"
        accion={(
          <button type="button" onClick={() => setView("agenda")} className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-2 text-[11px] font-bold text-[#079ba0] transition hover:bg-cyan-100 sm:text-xs">
            Ver agenda completa
            <Icono tipo="flecha" className="h-4 w-4" />
          </button>
        )}
      >
        {cargando ? (
          <div className="space-y-3 p-5 sm:px-6">
            {[1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : citasDeHoy.length === 0 ? (
          <div className="px-5 py-9 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-[#0aa6ad]">
              <Icono tipo="calendario" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-600">No tienes citas programadas para hoy.</p>
            <p className="mt-1 text-xs text-slate-400">Tu agenda clínica está al día.</p>
          </div>
        ) : (
          <div className="space-y-2 p-4 sm:px-6 sm:py-5">
            {citasDeHoy.slice(0, 5).map((cita) => (
              <div key={cita.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-50 bg-gradient-to-r from-[#f5fbff] to-white p-3 sm:flex-nowrap sm:p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-600">
                  <Icono tipo="pacientes" className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[#153c68]">
                    {cita.Paciente?.nombres || "Paciente"} {cita.Paciente?.apellidos || ""}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[#68809b]">{cita.motivo || "Consulta odontológica"}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#244b71] ring-1 ring-sky-100">
                  <Icono tipo="reloj" className="h-4 w-4 text-[#12aeb5]" />
                  {formatearHora(cita.hora_inicio)}
                </span>
                <button type="button" onClick={() => setView("agenda")} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#11b9bb] to-[#079b9e] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:shadow-md">
                  Ver detalles
                  <Icono tipo="flecha" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Panel titulo="Pendientes clínicos" icono="historial">
          <div className="space-y-2 p-4 sm:p-5">
            {[
              { titulo: "Historias por completar", valor: pendientes.historiasPorCompletar, icono: "atencion", vista: "mis-pacientes", tone: "rose" },
              { titulo: "Atenciones por registrar", valor: pendientes.atencionesPorRegistrar, icono: "historial", vista: "agenda", tone: "amber" },
            ].map((pendiente) => (
              <button
                type="button"
                key={pendiente.titulo}
                onClick={() => setView(pendiente.vista)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-slate-50/80 p-3 text-left transition hover:border-cyan-200 hover:shadow-sm sm:p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 text-[#078b91]">
                  <Icono tipo={pendiente.icono} />
                </span>
                <span className="flex-1 text-sm font-semibold text-[#294968]">{pendiente.titulo}</span>
                <span className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-sm font-extrabold ${pendiente.tone === "rose" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`}>
                  {cargando ? "—" : pendiente.valor}
                </span>
                <Icono tipo="flecha" className="h-5 w-5 shrink-0 text-[#13aeb3] transition-transform group-hover:translate-x-1" />
              </button>
            ))}
            <p className="px-1 pt-1 text-[11px] leading-relaxed text-slate-400">
              Las historias pendientes corresponden a pacientes sin ficha clínica inicial; las atenciones pendientes son citas marcadas como atendidas sin registro clínico vinculado.
            </p>
          </div>
        </Panel>

        <Panel
          titulo="Actividad clínica reciente"
          icono="actividad"
          accion={(
            <span className="hidden items-center gap-1 text-[11px] font-bold text-[#079ba0] sm:inline-flex">
              Últimos registros
              <Icono tipo="flecha" className="h-4 w-4" />
            </span>
          )}
        >
          {cargando ? (
            <div className="space-y-4 p-5">
              {[1, 2, 3].map((item) => <div key={item} className="h-5 animate-pulse rounded bg-slate-100" />)}
            </div>
          ) : resumen?.actividadClinica?.length ? (
            <ol className="space-y-0 px-5 py-4 sm:px-6">
              {resumen.actividadClinica.map((actividad, index) => (
                <li key={actividad.id} className="relative flex gap-3 pb-5 last:pb-0">
                  <span className="relative flex w-3 shrink-0 justify-center">
                    {index < resumen.actividadClinica.length - 1 && <span className="absolute top-3 h-full w-px bg-cyan-200" />}
                    <span className="relative mt-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#1bc5c4] to-[#078f9e] ring-4 ring-cyan-50" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#264968] sm:text-sm">{actividad.tipo} <span className="font-medium">· {actividad.paciente}</span></p>
                      {actividad.detalle && <p className="mt-0.5 truncate text-[11px] text-slate-500">{actividad.detalle}</p>}
                    </div>
                    <time className="shrink-0 text-[10px] font-medium text-[#69829f] sm:text-xs" dateTime={actividad.fecha}>
                      {formatearActividad(actividad.fecha)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="px-5 py-9 text-center text-sm text-slate-500">
              Aún no hay actividad clínica reciente para mostrar.
            </div>
          )}
        </Panel>
      </div>

      <aside className="relative isolate flex items-center gap-4 overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-r from-[#e7f7ff] via-[#e4fbfa] to-[#b9f1ef] px-5 py-4 shadow-[0_12px_32px_-24px_rgba(8,127,145,.45)] sm:px-7">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#08a9ad] shadow-sm">
          <Icono tipo="foco" className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[#187c9e]">Tu trabajo hace la diferencia</p>
          <p className="mt-0.5 text-xs text-[#58799a]">Gracias por brindar una atención de calidad a nuestros pacientes.</p>
        </div>
        <svg viewBox="0 0 40 40" fill="none" className="hidden h-10 w-10 text-cyan-400/50 sm:block" aria-hidden="true">
          <path d="M20 34S4 24 4 13a8 8 0 0 1 15-4 8 8 0 0 1 15 4c0 11-14 21-14 21Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      </aside>
    </main>
  );
}
