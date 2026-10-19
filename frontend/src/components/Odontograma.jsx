/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const ESTADOS = [
  { id: "sana", label: "Sana", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
  { id: "caries", label: "Caries", color: "bg-rose-100 border-rose-300 text-rose-800" },
  { id: "tratamiento", label: "Tratamiento", color: "bg-amber-100 border-amber-300 text-amber-800" },
  { id: "ausente", label: "Ausente", color: "bg-slate-200 border-slate-400 text-slate-700" },
  { id: "corona", label: "Corona", color: "bg-violet-100 border-violet-300 text-violet-800" },
  { id: "protesis", label: "Prótesis", color: "bg-sky-100 border-sky-300 text-sky-800" },
  { id: "observacion", label: "Observación", color: "bg-cyan-100 border-cyan-300 text-cyan-800" },
];

const PIEZAS = [
  ["Cuadrante 1 · Superior derecho", ["18", "17", "16", "15", "14", "13", "12", "11"]],
  ["Cuadrante 2 · Superior izquierdo", ["21", "22", "23", "24", "25", "26", "27", "28"]],
  ["Cuadrante 4 · Inferior derecho", ["48", "47", "46", "45", "44", "43", "42", "41"]],
  ["Cuadrante 3 · Inferior izquierdo", ["31", "32", "33", "34", "35", "36", "37", "38"]],
];
const ESTADO_SIN_REGISTRAR = {
  label: "Sin registrar",
  color: "bg-slate-100 border-slate-200 text-slate-600",
};

const estadoPorDefecto = (pieza) => ({
  pieza,
  estado: "",
  notas: "",
});

const esArcadaInferior = (pieza) => ["3", "4", "7", "8"].includes(String(pieza)[0]);
const esMolar = (id) => ["6", "7", "8"].includes(id.slice(-1));

function Diente({ id, estado, invertido }) {
  const visual = {
    sana: { fill: "#ffffff", stroke: "#94a3b8", accent: "#cbd5e1" },
    caries: { fill: "#ffe4e6", stroke: "#fb7185", accent: "#e11d48" },
    tratamiento: { fill: "#fef3c7", stroke: "#f59e0b", accent: "#d97706" },
    ausente: { fill: "#e2e8f0", stroke: "#94a3b8", accent: "#64748b" },
    corona: { fill: "#ede9fe", stroke: "#a78bfa", accent: "#7c3aed" },
    protesis: { fill: "#e0f2fe", stroke: "#38bdf8", accent: "#0284c7" },
    observacion: { fill: "#cffafe", stroke: "#22d3ee", accent: "#0891b2" },
  }[estado] || { fill: "#ffffff", stroke: "#94a3b8", accent: "#cbd5e1" };

  return (
    <svg
      viewBox="0 0 64 92"
      aria-hidden="true"
      className={`h-14 w-10 transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-12 ${invertido ? "rotate-180" : ""}`}
    >
      <path
        d="M18 38C11 32 9 22 13 13c4-9 13-12 19-8 6-4 15-1 19 8 4 9 2 19-5 25-4 4-6 7-7 14l-2 25c-.4 6-4 10-5 10s-4-4-4-10l-2-25c-1-7-3-10-8-14Z"
        fill={visual.fill}
        stroke={visual.stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeDasharray={estado === "ausente" ? "5 3" : undefined}
      />
      <path
        d={esMolar(id) ? "M17 22c5-4 10-4 15 0 5-4 10-4 15 0M20 29c4-3 8-3 12 0 4-3 8-3 12 0" : "M22 22c3-3 6-3 10 0 3-3 6-3 10 0M25 29c2-2 4-2 7 0 2-2 4-2 7 0"}
        fill="none"
        stroke={visual.accent}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={estado === "sana" ? 0.7 : 1}
      />
      {estado === "ausente" && (
        <path d="m19 16 26 28M45 16 19 44" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      )}
      {estado === "caries" && <circle cx="32" cy="24" r="4" fill="#e11d48" opacity="0.8" />}
      {estado === "corona" && <path d="M15 13h34" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}

const estadoDot = (estado, registrada) => ({
  sana: "bg-emerald-400",
  caries: "bg-rose-400",
  tratamiento: "bg-amber-400",
  ausente: "bg-slate-400",
  corona: "bg-violet-400",
  protesis: "bg-sky-400",
  observacion: "bg-cyan-400",
}[estado] || (registrada ? "bg-slate-400" : "bg-slate-200"));

const estadoNombre = (estado) => ESTADOS.find((item) => item.id === estado)?.label || "Sin registro";
const estadoBadge = (estado) => ESTADOS.find((item) => item.id === estado)?.color || ESTADO_SIN_REGISTRAR.color;
const descripcionPieza = (pieza) => {
  if (!pieza) return "";
  const nombre = { 1: "incisivo central", 2: "incisivo lateral", 3: "canino", 4: "primer premolar", 5: "segundo premolar", 6: "primer molar", 7: "segundo molar", 8: "tercer molar" }[pieza[1]];
  const cuadrante = { 1: "superior derecho", 2: "superior izquierdo", 3: "inferior izquierdo", 4: "inferior derecho", 5: "superior derecho", 6: "superior izquierdo", 7: "inferior izquierdo", 8: "inferior derecho" }[pieza[0]];
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${cuadrante}`;
};

function Arcada({ titulo, subtitulo, grupos, piezas, seleccionada, onSelect }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 p-3">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-800">{titulo}</h4>
          <p className="text-[10px] text-slate-400">{subtitulo}</p>
        </div>
        <div className="hidden min-w-[45%] items-center gap-2 text-[9px] text-slate-400 sm:flex">
          <span>Derecha</span><span className="h-px flex-1 bg-slate-200" /><span className="h-px flex-1 bg-slate-200" /><span>Izquierda</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-y-3">
        {grupos.map(([cuadrante, ids]) => (
          <div key={cuadrante} className="min-w-0">
            <p className="mb-1 text-center text-[9px] font-semibold text-slate-300">{cuadrante.split(" · ")[0]}</p>
            <div className={`flex min-w-0 ${esArcadaInferior(ids[0]) ? "items-start" : "items-end"} justify-center gap-0.5 border-slate-100 px-0.5 ${cuadrante.includes("izquierdo") ? "border-l" : "border-r"}`}>
              {ids.map((id) => {
                const pieza = piezas[id] || estadoPorDefecto(id);
                const registrada = Boolean(pieza.estado);
                const estilo = ESTADOS.find((estado) => estado.id === pieza.estado) || (registrada ? ESTADOS[0] : ESTADO_SIN_REGISTRAR);
                const activa = seleccionada === id;
                return (
                  <button
                    type="button"
                    key={id}
                    title={`Pieza ${id}: ${estilo.label}`}
                    aria-label={`Pieza dental ${id}, estado ${estilo.label}`}
                    aria-pressed={activa}
                    onClick={() => onSelect(id)}
                    className={`group flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg border px-0.5 py-1 text-center transition hover:border-teal-200 hover:bg-teal-50/60 ${
                      activa ? "border-teal-300 bg-teal-50 ring-2 ring-teal-500/70 ring-offset-1" : "border-transparent"
                    }`}
                  >
                    <span className={`text-[9px] font-bold ${activa ? "text-teal-800" : "text-slate-600"}`}>{id}</span>
                    <Diente id={id} estado={pieza.estado} invertido={esArcadaInferior(id)} />
                    <span className={`h-1.5 w-1.5 rounded-full ${estadoDot(pieza.estado, registrada)}`} aria-label={estilo.label} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Odontograma({ pacienteId, atencionId = "", atenciones = [], onAtencionChange, onSaved }) {
  const [piezas, setPiezas] = useState({});
  const [cambios, setCambios] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState("");
  const [guardado, setGuardado] = useState("");

  const cargar = async () => {
    try {
      const [odontograma, historial] = await Promise.all([
        api.get(`/historia/pacientes/${pacienteId}/odontograma`),
        api.get(`/historia/pacientes/${pacienteId}/odontograma/cambios`),
      ]);
      setPiezas(Object.fromEntries(odontograma.data.map((pieza) => [pieza.pieza, pieza])));
      setCambios(historial.data);
      setErrorCarga("");
    } catch (err) {
      setErrorCarga(err.response?.data?.error || "No se pudo cargar el odontograma.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [pacienteId]);

  const piezaActual = seleccionada ? (piezas[seleccionada] || estadoPorDefecto(seleccionada)) : null;
  const totalMarcadas = useMemo(
    () => Object.values(piezas).filter((pieza) => pieza.estado && pieza.estado !== "sana").length,
    [piezas]
  );

  const cambiarPieza = (campo, valor) => {
    setPiezas((actual) => ({
      ...actual,
      [seleccionada]: { ...(actual[seleccionada] || estadoPorDefecto(seleccionada)), [campo]: valor },
    }));
  };

  const guardarPieza = async () => {
    if (!seleccionada || !piezaActual?.estado) return;
    setGuardando(true);
    setError("");
    setGuardado("");
    try {
      const pieza = piezas[seleccionada] || estadoPorDefecto(seleccionada);
      const { data } = await api.put(`/historia/pacientes/${pacienteId}/odontograma/${seleccionada}`, {
        estado: pieza.estado,
        notas: pieza.notas,
        atencion_id: atencionId || null,
      });
      setPiezas((actual) => ({ ...actual, [seleccionada]: data }));
      await Promise.all([onSaved?.(), cargar()]);
      setGuardado(`Pieza ${seleccionada} guardada${atencionId ? " y vinculada a la atención" : ""}.`);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar la pieza.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p role="status" className="rounded-xl border border-slate-100 bg-white p-5 text-sm text-slate-500">Cargando odontograma…</p>;
  if (errorCarga) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800">No se pudo cargar el odontograma</h3>
        <p role="alert" className="mt-2 text-sm text-rose-700">{errorCarga}</p>
        <button type="button" onClick={() => { setCargando(true); setErrorCarga(""); cargar(); }} className="mt-4 rounded-xl bg-[#11B9BB] px-4 py-2 text-xs font-bold text-white hover:bg-[#0b9fa1]">
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-[#f4fbff] to-white p-3 shadow-sm sm:p-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <svg viewBox="0 0 64 92" aria-hidden="true" className="h-6 w-5"><path d="M18 38C11 32 9 22 13 13c4-9 13-12 19-8 6-4 15-1 19 8 4 9 2 19-5 25-4 4-6 7-7 14l-2 25c-.4 6-4 10-5 10s-4-4-4-10l-2-25c-1-7-3-10-8-14Z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-800 sm:text-xl">Odontograma</h2>
            <p className="mt-0.5 text-xs text-slate-500">Selecciona una pieza para registrar su estado clínico y notas.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[300px] sm:flex-row sm:items-center">
          <span className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-teal-100 bg-teal-50 px-3 py-2 text-[10px] font-bold text-teal-800 sm:self-auto"><span className="h-2 w-2 rounded-full bg-teal-500" />{totalMarcadas} piezas con observaciones</span>
          <label className="text-[10px] font-semibold text-slate-500">Asociar cambios a una atención
            <select value={atencionId || ""} onChange={(event) => onAtencionChange?.(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
              <option value="">Sin vincular a una atención</option>
              {atenciones.map((atencion) => <option key={atencion.id} value={atencion.id}>{new Date(atencion.fecha).toLocaleDateString("es-PE")} · {atencion.motivo_consulta || "Consulta"}</option>)}
            </select>
          </label>
        </div>
      </header>

      {atencionId && <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-xs text-teal-900">Los cambios que guardes quedarán registrados en la atención seleccionada. El estado actual del odontograma se conservará por separado.</p>}
      {(error || guardado) && <div role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-xs ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || guardado}</div>}

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-white/90 p-3">
        {ESTADOS.map((estado) => <span key={estado.id} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold ${estado.color}`}><i className={`h-2.5 w-2.5 rounded-full ${estadoDot(estado.id, true)}`} />{estado.label}</span>)}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(280px,0.9fr)]">
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
          <Arcada titulo="Arcada superior" subtitulo="Dentición permanente" grupos={PIEZAS.slice(0, 2)} piezas={piezas} seleccionada={seleccionada} onSelect={(id) => { setSeleccionada(id); setGuardado(""); setError(""); }} />
          <Arcada titulo="Arcada inferior" subtitulo="Dentición permanente" grupos={PIEZAS.slice(2)} piezas={piezas} seleccionada={seleccionada} onSelect={(id) => { setSeleccionada(id); setGuardado(""); setError(""); }} />
        </div>

        <aside className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          {piezaActual ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <svg viewBox="0 0 64 92" aria-hidden="true" className="h-6 w-5"><path d="M18 38C11 32 9 22 13 13c4-9 13-12 19-8 6-4 15-1 19 8 4 9 2 19-5 25-4 4-6 7-7 14l-2 25c-.4 6-4 10-5 10s-4-4-4-10l-2-25c-1-7-3-10-8-14Z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" /></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-800">Pieza {seleccionada}</h3>
                  <p className="text-[11px] text-slate-500">{descripcionPieza(seleccionada)} · Dentición permanente</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${estadoBadge(piezaActual.estado)}`}>{piezaActual.estado ? estadoNombre(piezaActual.estado) : "Sin registrar"}</span>
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between text-[10px] text-slate-500"><span>Cuadrante</span><strong className="text-slate-700">{seleccionada[0]}</strong></div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-500"><span>Tipo</span><strong className="text-slate-700">Permanente</strong></div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-500"><span>Pieza FDI</span><strong className="text-base text-teal-800">{seleccionada}</strong></div>
              </div>
              <label className="mt-4 block text-[10px] font-bold text-slate-600">Estado de la pieza
                <select value={piezaActual.estado} onChange={(event) => cambiarPieza("estado", event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="">Selecciona un estado</option>
                  {ESTADOS.map((estado) => <option key={estado.id} value={estado.id}>{estado.label}</option>)}
                </select>
              </label>
              <label className="mt-4 block text-[10px] font-bold text-slate-600">Observaciones de la pieza
                <textarea rows={4} maxLength={2000} value={piezaActual.notas || ""} onChange={(event) => cambiarPieza("notas", event.target.value)} placeholder="Notas clínicas de esta pieza..." className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                <span className="mt-1 block text-right text-[9px] font-normal text-slate-400">{(piezaActual.notas || "").length}/2000</span>
              </label>
              <button type="button" disabled={guardando || !piezaActual.estado} onClick={guardarPieza} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:from-teal-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-50">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M5 4h12l3 3v13H4V4h1Zm3 0v6h8V4M8 20v-7h8v7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                {guardando ? "Guardando cambios…" : "Guardar cambios"}
              </button>
            </>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <svg viewBox="0 0 64 92" aria-hidden="true" className="h-8 w-6"><path d="M18 38C11 32 9 22 13 13c4-9 13-12 19-8 6-4 15-1 19 8 4 9 2 19-5 25-4 4-6 7-7 14l-2 25c-.4 6-4 10-5 10s-4-4-4-10l-2-25c-1-7-3-10-8-14Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /></svg>
              </span>
              <h3 className="mt-4 text-sm font-bold text-slate-800">Selecciona una pieza dental</h3>
              <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-500">Elige un diente en cualquiera de las arcadas para consultar o actualizar su estado clínico.</p>
            </div>
          )}
        </aside>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </span>
            <div><h3 className="text-sm font-bold text-slate-800">Historial de cambios</h3><p className="text-[10px] text-slate-500">Cada cambio conserva el estado previo y el nuevo.</p></div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">{cambios.length} registro(s)</span>
        </div>
        {cambios.length === 0 ? <p className="m-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">Todavía no hay cambios registrados.</p> :
          <div className="overflow-x-auto p-3 sm:p-4">
            <table className="w-full min-w-[850px] border-collapse text-left text-[10px]">
              <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                <tr><th className="rounded-l-lg px-3 py-2.5">Fecha y hora</th><th className="px-3 py-2.5">Pieza</th><th className="px-3 py-2.5">Cambio</th><th className="px-3 py-2.5">Estado anterior → actual</th><th className="px-3 py-2.5">Profesional</th><th className="rounded-r-lg px-3 py-2.5">Observaciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cambios.map((cambio) => (
                  <tr key={cambio.id} className="transition-colors hover:bg-teal-50/40">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{new Date(cambio.creado_en).toLocaleString("es-PE")}</td>
                    <td className="px-3 py-3 font-bold text-slate-700">{cambio.pieza}</td>
                    <td className="px-3 py-3 text-slate-600">{!cambio.estado_anterior ? "Se registró estado" : cambio.estado_anterior !== cambio.estado_nuevo ? `Se actualizó a ${estadoNombre(cambio.estado_nuevo).toLowerCase()}` : "Se actualizaron las observaciones"}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${estadoBadge(cambio.estado_anterior)}`}>{estadoNombre(cambio.estado_anterior)}</span><span className="mx-2 text-slate-400">→</span><span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${estadoBadge(cambio.estado_nuevo)}`}>{estadoNombre(cambio.estado_nuevo)}</span>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-600">{cambio.Odontologo?.nombre || "Odontólogo"}</td>
                    <td className="max-w-64 px-3 py-3 text-slate-500">{cambio.notas_nuevas || cambio.atencion?.motivo_consulta || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
      </section>
    </section>
  );
}
