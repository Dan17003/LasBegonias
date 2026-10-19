import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import HistoriaClinica from "./HistoriaClinica";

const FILTROS_VACIOS = { dni: "", nombres: "", apellidos: "" };

const inicialesPaciente = (paciente) => [paciente.nombres, paciente.apellidos]
  .filter(Boolean)
  .map((nombre) => nombre.trim()[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

const fechaLocal = (value) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const fechaRelativa = (value) => {
  const fecha = fechaLocal(value);
  if (!fecha || Number.isNaN(fecha.getTime())) return "—";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diferencia = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
  if (diferencia === 0) return "Hoy";
  if (diferencia === -1) return "Ayer";
  if (diferencia === 1) return "Mañana";
  return diferencia < 0 ? `Hace ${Math.abs(diferencia)} días` : `En ${diferencia} días`;
};

const fechaCompleta = (value) => fechaLocal(value)?.toLocaleDateString("es-PE", {
  day: "numeric",
  month: "short",
  year: "numeric",
}) || "—";

export default function MisPacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [busquedaAplicada, setBusquedaAplicada] = useState(false);
  const [error, setError] = useState("");

  const cargar = async (criterios = filtros) => {
    setCargando(true);
    setError("");
    try {
      const params = Object.fromEntries(
        Object.entries(criterios).map(([campo, valor]) => [campo, valor.trim()]).filter(([, valor]) => valor),
      );
      const { data } = await api.get("/historia/mis-pacientes", { params });
      setPacientes(data);
      setBusquedaAplicada(Object.keys(params).length > 0);
    } catch (err) {
      setPacientes([]);
      setError(err.response?.data?.error || "No se pudieron cargar tus pacientes. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let activo = true;
    api.get("/historia/mis-pacientes")
      .then(({ data }) => {
        if (!activo) return;
        setPacientes(data);
        setBusquedaAplicada(false);
      })
      .catch((err) => {
        if (!activo) return;
        setPacientes([]);
        setError(err.response?.data?.error || "No se pudieron cargar tus pacientes. Intenta nuevamente.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const pacientesOrdenados = useMemo(
    () => [...pacientes].sort((a, b) => `${a.nombres} ${a.apellidos || ""}`.localeCompare(`${b.nombres} ${b.apellidos || ""}`, "es")),
    [pacientes],
  );

  if (seleccionado) {
    return <HistoriaClinica
      pacienteId={seleccionado}
      volver={() => setSeleccionado(null)}
    />;
  }

  const cambiarFiltro = (campo, valor) => {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }));
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    cargar(FILTROS_VACIOS);
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 text-slate-700 sm:px-6 lg:px-8">
      <header className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-[#087f81] to-[#11B9BB] px-5 py-6 text-white shadow-sm sm:px-8 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Atención odontológica</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">Mis pacientes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
              Accede a la ficha, historia clínica, odontograma y documentos de pacientes vinculados a tus citas o atenciones.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/15 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">Pacientes encontrados</p>
            <p className="mt-1 text-2xl font-black">{cargando && pacientes.length === 0 ? "—" : pacientes.length}</p>
          </div>
        </div>
      </header>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form onSubmit={(event) => { event.preventDefault(); cargar(); }}>
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-800">Buscar paciente</h2>
            <p className="mt-0.5 text-xs text-slate-500">Filtra por uno o más datos. La búsqueda se ejecuta al pulsar “Buscar”.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <label className="text-xs font-semibold text-slate-500">
              DNI
              <input
                value={filtros.dni}
                onChange={(event) => cambiarFiltro("dni", event.target.value)}
                placeholder="Número de documento"
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#11B9BB] focus:ring-2 focus:ring-[#11B9BB]/20"
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Nombres
              <input
                value={filtros.nombres}
                onChange={(event) => cambiarFiltro("nombres", event.target.value)}
                placeholder="Nombre del paciente"
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#11B9BB] focus:ring-2 focus:ring-[#11B9BB]/20"
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Apellidos
              <input
                value={filtros.apellidos}
                onChange={(event) => cambiarFiltro("apellidos", event.target.value)}
                placeholder="Apellido del paciente"
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#11B9BB] focus:ring-2 focus:ring-[#11B9BB]/20"
              />
            </label>
            <button
              type="submit"
              disabled={cargando}
              className="self-end rounded-xl bg-[#11B9BB] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b9fa1] disabled:cursor-wait disabled:opacity-60"
            >
              {cargando ? "Buscando…" : "Buscar"}
            </button>
            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={cargando || !Object.values(filtros).some(Boolean)}
              className="self-end rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section aria-live="polite">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-800">Listado de pacientes</h2>
            {!cargando && !error && <p className="mt-0.5 text-xs text-slate-500">{pacientes.length} {pacientes.length === 1 ? "resultado" : "resultados"}{busquedaAplicada ? " para esta búsqueda" : ""}</p>}
          </div>
          <button type="button" onClick={() => cargar()} disabled={cargando} className="text-xs font-bold text-cyan-800 hover:text-cyan-950 disabled:opacity-50">
            Actualizar listado
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => cargar()} className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">Reintentar</button>
          </div>
        )}

        {cargando ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Cargando pacientes">
            <div className="h-12 animate-pulse bg-slate-100" />
            {[1, 2, 3].map((item) => <div key={item} className="h-[76px] animate-pulse border-t border-slate-100 bg-white" />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No se pudo actualizar el listado. Reintenta para cargar los datos más recientes.
          </div>
        ) : !error && pacientesOrdenados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-xl text-cyan-800" aria-hidden="true">⌕</div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">
              {busquedaAplicada ? "No encontramos pacientes con esos datos" : "Todavía no tienes pacientes vinculados"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              {busquedaAplicada
                ? "Revisa el DNI, los nombres o los apellidos e inténtalo nuevamente."
                : "Los pacientes aparecerán aquí cuando estén asociados contigo mediante una cita o una atención clínica."}
            </p>
            {busquedaAplicada && <button type="button" onClick={limpiarFiltros} className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Limpiar búsqueda</button>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-[#087f81] text-white">
                <tr>
                  <th scope="col" className="px-5 py-4 text-sm font-semibold">Paciente</th>
                  <th scope="col" className="px-5 py-4 text-sm font-semibold">Última cita</th>
                  <th scope="col" className="px-5 py-4 text-sm font-semibold">Próxima cita</th>
                  <th scope="col" className="px-5 py-4 text-center text-sm font-semibold">Historial clínico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-100">
                {pacientesOrdenados.map((paciente) => (
                  <tr key={paciente.id} className="transition hover:bg-cyan-50/40">
                    <td className="px-5 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-cyan-100 bg-cyan-50 text-sm font-bold text-cyan-800" aria-hidden="true">
                          {inicialesPaciente(paciente) || "P"}
                        </div>
                        <div className="min-w-0">
                          <p className="break-words font-medium text-cyan-800">{[paciente.nombres, paciente.apellidos].filter(Boolean).join(" ") || "Paciente sin nombre"}</p>
                          <p className="mt-0.5 text-xs text-slate-500">DNI: {paciente.dni || "No registrado"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {paciente.ultima_cita ? <><span>{fechaRelativa(paciente.ultima_cita.fecha)}</span><span className="sr-only">, {fechaCompleta(paciente.ultima_cita.fecha)}</span></> : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {paciente.proxima_cita ? <><span>{fechaRelativa(paciente.proxima_cita.fecha)}</span><span className="block text-xs text-slate-400">{fechaCompleta(paciente.proxima_cita.fecha)}{paciente.proxima_cita.hora_inicio ? ` · ${paciente.proxima_cita.hora_inicio.slice(0, 5)}` : ""}</span></> : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSeleccionado(paciente.id)}
                        aria-label={`Ver historial clínico de ${[paciente.nombres, paciente.apellidos].filter(Boolean).join(" ")}`}
                        className="inline-flex items-center justify-center rounded-lg bg-cyan-50 px-4 py-2 text-xs font-bold text-cyan-900 transition hover:bg-[#11B9BB] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                      >
                        Ver historial clínico
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
