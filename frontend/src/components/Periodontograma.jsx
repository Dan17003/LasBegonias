/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import api from "../services/api";

const SITIOS = [
  { id: "vestibular_mesial", label: "Mesiovestibular", superficie: "Vestibular" },
  { id: "vestibular_central", label: "Vestibular medio", superficie: "Vestibular" },
  { id: "vestibular_distal", label: "Distovestibular", superficie: "Vestibular" },
  { id: "lingual_mesial", label: "Mesiolingual / palatino", superficie: "Lingual / palatina" },
  { id: "lingual_central", label: "Lingual / palatino medio", superficie: "Lingual / palatina" },
  { id: "lingual_distal", label: "Distolingual / palatino", superficie: "Lingual / palatina" },
];
const PIEZAS = [
  ...[1, 2, 3, 4].flatMap((cuadrante) => Array.from({ length: 8 }, (_, index) => `${cuadrante}${index + 1}`)),
];
const crearSitiosVacios = () => Object.fromEntries(SITIOS.map(({ id }) => [id, {
  profundidad_sondaje: "",
  margen_gingival: "",
  sangrado: null,
  placa: null,
  supuracion: null,
  movilidad: "",
  furcacion: "",
  notas: "",
}]));
const fechaLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const textoMedida = (value) => value === null || value === undefined ? "" : String(value);
const tieneDato = (value) => typeof value === "string" ? value.trim() !== "" : value !== null && value !== undefined;
const nivelInsercion = (profundidad, margen) => {
  if (profundidad === "" || margen === "") return "—";
  const sondaje = Number(profundidad);
  const posicion = Number(margen);
  if (!Number.isFinite(sondaje) || !Number.isFinite(posicion)) return "—";
  const nic = sondaje + posicion;
  return nic >= 0 && nic <= 25 ? `${Math.round(nic * 10) / 10} mm` : "Inconsistente";
};
const datosMedicion = (medicion) => ({
  ...medicion,
  profundidad_sondaje: medicion.profundidad_sondaje == null ? "" : String(medicion.profundidad_sondaje),
  margen_gingival: medicion.margen_gingival === null || medicion.margen_gingival === undefined ? "" : String(medicion.margen_gingival),
  sangrado: medicion.sangrado ?? null,
  placa: medicion.placa ?? null,
  supuracion: medicion.supuracion ?? null,
  movilidad: medicion.movilidad === null || medicion.movilidad === undefined ? "" : String(medicion.movilidad),
  furcacion: medicion.furcacion || "",
  notas: medicion.notas || "",
});

function ControlBooleano({ label, value, onChange, disabled = false }) {
  const options = [
    { value: null, label: "—", title: "No evaluado", active: "border-slate-300 bg-slate-200 text-slate-700" },
    { value: true, label: "Sí", title: "Sí", active: "border-rose-200 bg-rose-100 text-rose-700" },
    { value: false, label: "No", title: "No", active: "border-emerald-200 bg-emerald-100 text-emerald-700" },
  ];
  return (
    <div role="group" aria-label={label} className="mx-auto inline-flex w-[5.8rem] items-center justify-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.title}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            aria-label={`${label}: ${option.title}`}
            aria-pressed={selected}
            title={`${label}: ${option.title}`}
            className={`h-7 min-w-7 flex-1 rounded-full border border-transparent px-1 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              selected ? `${option.active} shadow-sm` : "bg-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const ARCADA_SUPERIOR = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
const ARCADA_INFERIOR = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];

const posicionDiente = (index, count, start, end, centerY, verticalRadius) => {
  const angle = (start + ((end - start) * index) / (count - 1)) * (Math.PI / 180);
  return {
    x: 240 + 162 * Math.cos(angle),
    y: centerY + verticalRadius * Math.sin(angle),
    labelX: 240 + 188 * Math.cos(angle),
    labelY: centerY + (verticalRadius + 25) * Math.sin(angle),
  };
};

function SelectorDental({ pieza, piezasConSitios, onSelect }) {
  const dientes = [
    ...ARCADA_SUPERIOR.map((tooth, index) => ({
      tooth,
      ...posicionDiente(index, ARCADA_SUPERIOR.length, 180, 360, 208, 82),
      rotation: 90 + (180 * index) / (ARCADA_SUPERIOR.length - 1),
      arch: "superior",
    })),
    ...ARCADA_INFERIOR.map((tooth, index) => ({
      tooth,
      ...posicionDiente(index, ARCADA_INFERIOR.length, 180, 0, 272, 82),
      rotation: 90 - (180 * index) / (ARCADA_INFERIOR.length - 1),
      arch: "inferior",
    })),
  ];
  return (
    <svg viewBox="0 0 480 480" role="group" aria-label="Seleccionar pieza dental permanente" className="mx-auto block h-auto w-full max-w-[420px] overflow-visible">
      <text x="240" y="12" textAnchor="middle" className="fill-slate-400 text-[11px] font-bold uppercase tracking-[1.5px]">Maxilar superior</text>
      <text x="240" y="474" textAnchor="middle" className="fill-slate-400 text-[11px] font-bold uppercase tracking-[1.5px]">Mandíbula inferior</text>
      <path d="M240 22v30M240 428v30" stroke="#e2e8f0" strokeDasharray="4 5" strokeWidth="1.5" />
      {dientes.map(({ tooth, x, y, rotation, labelX, labelY, arch }) => {
        const selected = tooth === pieza;
        const recorded = piezasConSitios.has(tooth);
        const fill = selected ? "#ccfbf1" : recorded ? "#fef3c7" : "#ffffff";
        const stroke = selected ? "#0d9488" : recorded ? "#fbbf24" : "#94a3b8";
        return (
          <g
            key={tooth}
            role="button"
            tabIndex={0}
            aria-label={`Seleccionar pieza ${tooth}${recorded ? ", tiene sitios en el borrador" : ""}`}
            aria-pressed={selected}
            onClick={() => onSelect(tooth)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(tooth);
              }
            }}
            className="cursor-pointer outline-none"
          >
            <title>{`Pieza ${tooth}${selected ? " seleccionada" : recorded ? " con sitios añadidos" : ""}`}</title>
            <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(1.18)`}>
              <path
                d="M-8-13C-4-16-1-13 0-12c2-2 6-4 9-1 4 3 4 9 2 13l-5 12c-.7 2-2 3-3.5 1.5L0 10l-3 3.5c-1.5 1.5-2.8.5-3.5-1.5l-5-12c-2-4-2-10 3.5-13Z"
                fill={fill}
                stroke={stroke}
                strokeWidth={selected ? "2" : "1.4"}
                strokeLinejoin="round"
                className="transition-colors"
              />
              <path d="M-5-4Q0-8 5-4M-4 1Q0-2 4 1" fill="none" stroke={stroke} strokeWidth="1" strokeLinecap="round" opacity=".52" />
            </g>
            <text x={labelX} y={labelY + (arch === "superior" ? 8 : 7)} textAnchor="middle" className={`pointer-events-none text-[15px] font-extrabold ${selected ? "fill-teal-800" : "fill-slate-700"}`}>{tooth}</text>
          </g>
        );
      })}
    </svg>
  );
}

function CampoNumerico({ label, value, onChange, min, max, placeholder = "—" }) {
  return (
    <label className="block min-w-20 text-[11px] font-semibold text-slate-500">
      {label}
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min={min}
        max={max}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}

function EditorMedicion({ initial, onCancel, onSave, saving, error }) {
  const [form, setForm] = useState(() => datosMedicion(initial));
  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      profundidad_sondaje: form.profundidad_sondaje,
      margen_gingival: form.margen_gingival === "" ? null : form.margen_gingival,
      movilidad: form.movilidad === "" ? null : form.movilidad,
      furcacion: form.furcacion || null,
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-teal-100 bg-teal-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <CampoNumerico label="Profundidad (mm)" value={form.profundidad_sondaje} onChange={(value) => update("profundidad_sondaje", value)} min="0" max="12" />
      <CampoNumerico label="Margen gingival (mm)" value={form.margen_gingival} onChange={(value) => update("margen_gingival", value)} min="-10" max="15" placeholder="No registrado" />
      <div className="text-[11px] font-semibold text-slate-500">NIC calculado
        <p className="mt-2 text-sm font-bold text-slate-700">{nivelInsercion(form.profundidad_sondaje, form.margen_gingival)}</p>
      </div>
      <label className="text-[11px] font-semibold text-slate-500">Movilidad
        <select value={form.movilidad} onChange={(event) => update("movilidad", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-normal text-slate-700">
          <option value="">No evaluada</option><option value="0">Grado 0</option><option value="1">Grado I</option><option value="2">Grado II</option><option value="3">Grado III</option>
        </select>
      </label>
      <label className="text-[11px] font-semibold text-slate-500">Furcación (Hamp)
        <select value={form.furcacion} onChange={(event) => update("furcacion", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-normal text-slate-700">
          <option value="">No registrada</option><option value="0">Grado 0</option><option value="I">Grado I</option><option value="II">Grado II</option><option value="III">Grado III</option>
        </select>
      </label>
      {[["sangrado", "Sangrado"], ["placa", "Placa"], ["supuracion", "Supuración"]].map(([field, label]) => (
        <div key={field} className="text-[11px] font-semibold text-slate-500">{label}
          <div className="mt-2"><ControlBooleano label={label} value={form[field]} onChange={(value) => update(field, value)} /></div>
        </div>
      ))}
      <label className="text-[11px] font-semibold text-slate-500 sm:col-span-2 lg:col-span-4">Observaciones
        <textarea value={form.notas} maxLength={2000} rows={2} onChange={(event) => update("notas", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
      </label>
      {error && <p role="alert" className="sm:col-span-2 lg:col-span-4 text-sm text-rose-700">{error}</p>}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <button type="submit" disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Guardando…" : "Guardar cambios"}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button>
      </div>
    </form>
  );
}

export default function Periodontograma({ pacienteId, atencionId = "", atenciones = [], onAtencionChange, onSaved }) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [fecha, setFecha] = useState(fechaLocal);
  const [pieza, setPieza] = useState(PIEZAS[0]);
  const [borrador, setBorrador] = useState({});
  const [medicionesNuevas, setMedicionesNuevas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [evaluacionActiva, setEvaluacionActiva] = useState("");
  const [medicionEditando, setMedicionEditando] = useState(null);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const cargarEvaluaciones = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await api.get(`/historia/pacientes/${pacienteId}/periodontograma/evaluaciones`);
      setEvaluaciones(data.evaluaciones || []);
      setEvaluacionActiva((current) => current && data.evaluaciones?.some((item) => item.id === current)
        ? current : data.evaluaciones?.[0]?.id || "");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudo cargar el historial periodontal.");
    } finally {
      setCargando(false);
    }
  }, [pacienteId]);

  useEffect(() => { cargarEvaluaciones(); }, [cargarEvaluaciones]);

  const idsYaAgregados = useMemo(
    () => new Set(medicionesNuevas.map((item) => `${item.pieza}:${item.sitio}`)),
    [medicionesNuevas],
  );
  const piezasConSitios = useMemo(
    () => new Set(medicionesNuevas.map((item) => item.pieza)),
    [medicionesNuevas],
  );
  const actuales = borrador[pieza] || crearSitiosVacios();
  const medicionesDePieza = medicionesNuevas.filter((item) => item.pieza === pieza);
  const piezasEvaluadas = new Set(medicionesNuevas.map((item) => item.pieza)).size;
  const sitiosDisponibles = SITIOS.filter(({ id }) => !idsYaAgregados.has(`${pieza}:${id}`)).length;
  const tieneBorradorActual = Object.values(actuales).some((site) => Object.values(site).some(tieneDato));

  const actualizarCampo = (sitio, campo, valor) => {
    setBorrador((previous) => ({
      ...previous,
      [pieza]: {
        ...(previous[pieza] || crearSitiosVacios()),
        [sitio]: { ...(previous[pieza]?.[sitio] || crearSitiosVacios()[sitio]), [campo]: valor },
      },
    }));
    setMensaje("");
  };

  const agregarPieza = () => {
    setError("");
    setMensaje("");
    const conDatos = SITIOS.map(({ id }) => ({ ...actuales[id], pieza, sitio: id }))
      .filter((item) => Object.entries(item).some(([field, value]) => field !== "pieza" && field !== "sitio" && tieneDato(value)));
    if (!conDatos.length) {
      setError("Registra al menos un sitio de esta pieza antes de agregarla.");
      return;
    }
    const repetido = conDatos.find((item) => idsYaAgregados.has(`${pieza}:${item.sitio}`));
    if (repetido) {
      setError(`El sitio ${repetido.sitio.replaceAll("_", " ")} de la pieza ${pieza} ya está agregado.`);
      return;
    }
    setMedicionesNuevas((previous) => [...previous, ...conDatos]);
    setBorrador((previous) => {
      const next = { ...previous };
      delete next[pieza];
      return next;
    });
    setMensaje(`Se agregaron ${conDatos.length} sitios de la pieza ${pieza}.`);
  };

  const quitarPieza = (tooth) => {
    setMedicionesNuevas((previous) => previous.filter((item) => item.pieza !== tooth));
    setMensaje(`Se quitaron los sitios de la pieza ${tooth} del borrador.`);
  };

  const siguientePieza = () => {
    const start = PIEZAS.indexOf(pieza);
    const next = [...PIEZAS.slice(start + 1), ...PIEZAS.slice(0, start + 1)]
      .find((tooth) => SITIOS.some(({ id }) => !idsYaAgregados.has(`${tooth}:${id}`)));
    if (next) {
      setPieza(next);
      setError("");
      setMensaje("");
      return;
    }
    setMensaje("Todas las piezas permanentes tienen sus seis sitios registrados.");
  };

  const descartarCamposActuales = () => {
    setBorrador((previous) => {
      const next = { ...previous };
      delete next[pieza];
      return next;
    });
    setMensaje("Se descartaron los campos sin añadir de esta pieza.");
    setError("");
  };

  const guardarEvaluacion = async () => {
    setError("");
    setMensaje("");
    if (!fecha || !medicionesNuevas.length) {
      setError("Selecciona la fecha y agrega al menos un sitio medido.");
      return;
    }
    setGuardando(true);
    try {
      const { data } = await api.post(`/historia/pacientes/${pacienteId}/periodontograma/evaluaciones`, {
        fecha,
        atencion_id: atencionId || null,
        mediciones: medicionesNuevas.map((item) => ({
          ...item,
          profundidad_sondaje: item.profundidad_sondaje,
          margen_gingival: item.margen_gingival === "" ? null : item.margen_gingival,
          sangrado: item.sangrado,
          placa: item.placa,
          supuracion: item.supuracion,
          movilidad: item.movilidad === "" ? null : item.movilidad,
          furcacion: item.furcacion || null,
        })),
      });
      setEvaluaciones((previous) => [data, ...previous]);
      setEvaluacionActiva(data.id);
      setMedicionesNuevas([]);
      setBorrador({});
      setMensaje("Evaluación periodontal guardada. Las evaluaciones anteriores se conservaron.");
      await onSaved?.();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudo guardar la evaluación periodontal.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicion = async (evaluation, measurement, values) => {
    setErrorEdicion("");
    setGuardandoEdicion(true);
    try {
      const { data } = await api.put(
        `/historia/pacientes/${pacienteId}/periodontograma/evaluaciones/${encodeURIComponent(evaluation.id)}/sitios/${measurement.id}`,
        values,
      );
      const updatedEvaluationId = data.evaluacion_id || evaluation.id;
      setEvaluaciones((previous) => previous.map((item) => item.id === evaluation.id
        ? {
          ...item,
          id: updatedEvaluationId,
          legado: false,
          mediciones: item.mediciones.map((row) => row.id === measurement.id ? data : row),
        }
        : item));
      setEvaluacionActiva(updatedEvaluationId);
      setMedicionEditando(null);
      setMensaje("Medición actualizada.");
    } catch (requestError) {
      setErrorEdicion(requestError.response?.data?.error || "No se pudo actualizar la medición.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M7 3.5h10a2 2 0 0 1 2 2v13l-3-1.7-4 2.2-4-2.2-3 1.7v-13a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M8.5 8h7M8.5 11.5h7M8.5 15h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Historia clínica · Periodoncia</p>
            <h2 className="text-lg font-bold text-slate-800">Periodontograma</h2>
            <p className="text-xs text-slate-500">Registra y consulta la evaluación periodontal del paciente.</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-[10px] font-bold text-slate-500">Fecha de evaluación
            <input type="date" value={fecha} max={fechaLocal()} onChange={(event) => setFecha(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
          </label>
          <label className="text-[10px] font-bold text-slate-500">Atención asociada <span className="font-normal">(opcional)</span>
            <select value={atencionId || ""} onChange={(event) => onAtencionChange?.(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
              <option value="">Sin vincular a una atención</option>
              {atenciones.map((atencion) => <option key={atencion.id} value={atencion.id}>{new Date(atencion.fecha).toLocaleDateString("es-PE")} · {atencion.motivo_consulta || "Consulta"}</option>)}
            </select>
          </label>
        </div>
      </header>

      {(error || mensaje) && <div role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || mensaje}</div>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,2fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Dentición permanente</p>
              <h3 className="mt-0.5 font-bold text-slate-800">Selecciona una pieza</h3>
            </div>
            <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">FDI</span>
          </div>
          <div className="mt-4 rounded-xl bg-gradient-to-b from-slate-50 to-white px-1 py-3">
            <SelectorDental pieza={pieza} piezasConSitios={piezasConSitios} onSelect={(tooth) => { setPieza(tooth); setError(""); }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-teal-500" />Seleccionada</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" />Con sitios añadidos</span>
          </div>
          <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/60 p-3">
            <p className="text-[10px] font-semibold text-teal-700">PIEZA FDI SELECCIONADA</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{pieza}<span className="ml-2 text-xs font-medium text-slate-500">· {pieza[0] === "1" || pieza[0] === "2" ? "Maxilar superior" : "Mandíbula inferior"}</span></p>
            <p className="mt-1 text-xs text-slate-600">{medicionesDePieza.length} sitio(s) añadido(s) · {sitiosDisponibles} disponible(s)</p>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Nueva evaluación</p>
                <h3 className="mt-0.5 text-base font-bold text-slate-800">Datos generales de la pieza {pieza}</h3>
                <p className="mt-1 text-xs text-slate-500">Completa solo los sitios que hayas examinado.</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] leading-relaxed text-sky-900 sm:max-w-[270px]">
                <strong className="block text-sky-800">Información</strong>
                La movilidad y furcación se anotan por sitio. El NIC se calcula cuando el sondaje y el margen están registrados.
              </div>
            </div>
            {atencionId && <p className="mt-3 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-800">Esta evaluación quedará vinculada a la atención seleccionada; las anteriores no se modificarán.</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Furcación de pieza multirradicular</p>
                <p className="mt-1 text-xs text-slate-600">Se registra individualmente para cada sitio; selecciona el grado en la tabla inferior.</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Convención de margen gingival</p>
                <p className="mt-1 text-xs text-slate-600">Positivo: recesión apical a la UAC. Negativo: posición coronal. NIC = sondaje + margen.</p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Registro periodontal</p>
                <h3 className="font-bold text-slate-800">Sitios periodontales · pieza {pieza}</h3>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">— No evaluado</span>
                <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">Sí</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">No</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] border-collapse text-left text-[11px]">
                <thead className="bg-[#087f81] text-center text-[10px] uppercase tracking-wide text-white">
                  <tr><th className="px-3 py-2.5 text-center align-middle">Superficie / sitio</th><th className="px-2 py-2.5 text-center align-middle">Sondaje<br />(mm)</th><th className="px-2 py-2.5 text-center align-middle">Margen<br />(mm)</th><th className="px-2 py-2.5 text-center align-middle">NIC<br />(mm)</th><th className="px-2 py-2.5 text-center align-middle">Sangrado</th><th className="px-2 py-2.5 text-center align-middle">Placa</th><th className="px-2 py-2.5 text-center align-middle">Supuración</th><th className="px-2 py-2.5 text-center align-middle">Movilidad</th><th className="px-2 py-2.5 text-center align-middle">Furcación</th><th className="px-3 py-2.5 text-center align-middle">Observaciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {["Vestibular", "Lingual / palatina"].map((surface) => (
                    <Fragment key={surface}>
                      <tr className="bg-slate-50"><th colSpan="10" className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Cara {surface}</th></tr>
                      {SITIOS.filter(({ superficie }) => superficie === surface).map(({ id, label }) => {
                        const values = actuales[id];
                        const added = idsYaAgregados.has(`${pieza}:${id}`);
                        const furcationApplies = (Number(pieza[0]) <= 4 && Number(pieza[1]) >= 6 && Number(pieza[1]) <= 7);
                        return (
                          <tr key={id} className={`transition-colors ${added ? "bg-emerald-50/50" : "hover:bg-teal-50/30"}`}>
                            <td className="whitespace-nowrap px-3 py-2.5"><span className="block font-semibold text-slate-700">{label}</span><span className="text-[9px] text-slate-400">{surface}</span></td>
                            <td className="w-20 px-1.5 py-2 text-center"><input aria-label={`${label}: profundidad de sondaje`} type="number" step="0.1" min="0" max="12" placeholder="—" value={added ? "" : values.profundidad_sondaje} disabled={added} onChange={(event) => actualizarCampo(id, "profundidad_sondaje", event.target.value)} className="mx-auto block w-[4.2rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100" /></td>
                            <td className="w-20 px-1.5 py-2 text-center"><input aria-label={`${label}: margen gingival`} type="number" step="0.1" min="-10" max="15" placeholder="—" value={added ? "" : values.margen_gingival} disabled={added} onChange={(event) => actualizarCampo(id, "margen_gingival", event.target.value)} className="mx-auto block w-[4.2rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100" /></td>
                            <td className="whitespace-nowrap px-2 py-2 text-center font-semibold text-slate-700">{added ? "Guardado" : nivelInsercion(values.profundidad_sondaje, values.margen_gingival)}</td>
                            {["sangrado", "placa", "supuracion"].map((field) => <td key={field} className="px-1 py-2 text-center"><ControlBooleano label={`${label}: ${field}`} disabled={added} value={added ? null : values[field]} onChange={(value) => actualizarCampo(id, field, value)} /></td>)}
                            <td className="px-1.5 py-2 text-center"><select aria-label={`${label}: movilidad`} disabled={added} value={added ? "" : values.movilidad} onChange={(event) => actualizarCampo(id, "movilidad", event.target.value)} className="mx-auto block rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100"><option value="">—</option><option value="0">0</option><option value="1">I</option><option value="2">II</option><option value="3">III</option></select></td>
                            <td className="px-1.5 py-2 text-center"><select aria-label={`${label}: furcación`} disabled={added || !furcationApplies} value={added ? "" : values.furcacion} onChange={(event) => actualizarCampo(id, "furcacion", event.target.value)} className="mx-auto block rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100"><option value="">{furcationApplies ? "—" : "No aplica"}</option><option value="0">0</option><option value="I">I</option><option value="II">II</option><option value="III">III</option></select></td>
                            <td className="px-2 py-2 text-center"><input aria-label={`${label}: observaciones`} placeholder="Observaciones…" maxLength={2000} disabled={added} value={added ? "" : values.notas} onChange={(event) => actualizarCampo(id, "notas", event.target.value)} className="mx-auto block w-36 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100" /></td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[10px] leading-relaxed text-slate-500">Los sitios no evaluados quedan vacíos y no se guardan. La profundidad y el margen son opcionales.</p>
              <div className="flex flex-wrap gap-2">
                {tieneBorradorActual && <button type="button" onClick={descartarCamposActuales} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-rose-200 hover:text-rose-700">Limpiar campos</button>}
                <button type="button" onClick={siguientePieza} className="rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-xs font-bold text-teal-800 transition hover:bg-teal-50">Siguiente pieza <span aria-hidden="true">→</span></button>
                <button type="button" onClick={agregarPieza} disabled={sitiosDisponibles === 0} className="shrink-0 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300">{sitiosDisponibles === 0 ? "Pieza completa" : `Añadir sitios (${sitiosDisponibles} disponibles)`}</button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {medicionesNuevas.length > 0 && <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div>
            <h3 className="font-bold text-slate-800">Progreso de la evaluación</h3>
            <p className="mt-0.5 text-xs text-slate-500">Los datos se guardarán como una evaluación con fecha {fecha}.</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-lg bg-teal-50 px-3 py-2 text-center text-[10px] text-teal-800"><strong className="block text-sm">{piezasEvaluadas}</strong>piezas</span>
            <span className="rounded-lg bg-sky-50 px-3 py-2 text-center text-[10px] text-sky-800"><strong className="block text-sm">{medicionesNuevas.length}</strong>sitios</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {[...new Set(medicionesNuevas.map((item) => item.pieza))].map((tooth) => <button key={tooth} type="button" onClick={() => quitarPieza(tooth)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-rose-300 hover:text-rose-700" title={`Quitar del borrador los sitios de la pieza ${tooth}`}>Pieza {tooth} · {medicionesNuevas.filter((item) => item.pieza === tooth).length} sitios <span aria-hidden="true">×</span></button>)}
          </div>
          <button type="button" onClick={guardarEvaluacion} disabled={guardando} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{guardando ? "Guardando evaluación…" : `Guardar evaluación (${medicionesNuevas.length} sitios)`}</button>
        </div>
      </section>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-bold text-slate-800">Historial periodontal</h3><p className="mt-1 text-xs text-slate-500">Cada evaluación conserva su fecha y responsable. Solo quien la registró puede editar sus sitios.</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{evaluaciones.length} evaluación(es)</span>
        </div>
        {cargando ? <p className="py-8 text-center text-sm text-slate-500">Cargando historial periodontal…</p> :
          evaluaciones.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center"><p className="font-semibold text-slate-700">Aún no hay evaluaciones periodontales</p><p className="mt-1 text-sm text-slate-500">Al guardar la primera evaluación aparecerá aquí; los sitios sin datos nunca se mostrarán como normales.</p></div> :
            <div className="mt-4 space-y-3">
              {evaluaciones.map((evaluation) => {
                const expanded = evaluacionActiva === evaluation.id;
                const teeth = new Set(evaluation.mediciones.map((item) => item.pieza)).size;
                const atencionVinculada = atenciones.find((atencion) => Number(atencion.id) === Number(evaluation.atencion_id));
                return <article key={evaluation.id} className="overflow-hidden rounded-xl border border-slate-200">
                  <button type="button" aria-expanded={expanded} onClick={() => setEvaluacionActiva(expanded ? "" : evaluation.id)} className="flex w-full flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 text-left hover:bg-teal-50/50">
                    <span><strong className="text-sm text-slate-800">{evaluation.fecha}</strong><span className="ml-2 text-xs text-slate-500">por {evaluation.odontologo}</span>{evaluation.atencion_id && <span className="ml-2 rounded-full bg-teal-100 px-2 py-1 text-[10px] font-bold text-teal-800">{atencionVinculada ? `Atención ${new Date(atencionVinculada.fecha).toLocaleDateString("es-PE")} · ${atencionVinculada.motivo_consulta}` : `Atención ${evaluation.atencion_id}`}</span>}</span>
                    <span className="text-xs text-slate-600">{teeth} pieza(s) · {evaluation.mediciones.length} sitios registrados · {expanded ? "Ocultar" : "Consultar"}</span>
                  </button>
                  {expanded && <div className="overflow-x-auto p-3">
                    <table className="w-full min-w-[800px] text-left text-xs">
                      <thead className="bg-[#087f81] text-white"><tr className="text-[10px] uppercase"><th className="px-2 py-2">Pieza / sitio</th><th className="px-2 py-2">Sondaje</th><th className="px-2 py-2">Margen</th><th className="px-2 py-2">NIC</th><th className="px-2 py-2">Sangrado</th><th className="px-2 py-2">Placa</th><th className="px-2 py-2">Supuración</th><th className="px-2 py-2">Movilidad / furcación Hamp</th><th className="px-2 py-2">Observaciones</th><th className="px-2 py-2">Acción</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {evaluation.mediciones.map((measurement) => {
                          const site = SITIOS.find(({ id }) => id === measurement.sitio);
                          const editandoEsta = medicionEditando?.measurementId === measurement.id;
                          return <Fragment key={measurement.id}>
                            <tr>
                              <td className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">{measurement.pieza} · {site?.label || measurement.sitio}</td>
                              <td className="px-2 py-2">{measurement.profundidad_sondaje == null ? "—" : `${textoMedida(measurement.profundidad_sondaje)} mm`}</td>
                              <td className="px-2 py-2">{measurement.margen_gingival == null ? "—" : `${measurement.margen_gingival} mm`}</td>
                              <td className="px-2 py-2">{measurement.nivel_insercion == null ? "—" : `${measurement.nivel_insercion} mm`}</td>
                              {[measurement.sangrado, measurement.placa, measurement.supuracion].map((value, index) => <td key={index} className="px-2 py-2">{value === null || value === undefined ? "—" : value ? "Sí" : "No"}</td>)}
                              <td className="px-2 py-2">{measurement.movilidad ?? "—"} / {measurement.furcacion || "—"}</td>
                              <td className="max-w-48 truncate px-2 py-2" title={measurement.notas || ""}>{measurement.notas || "—"}</td>
                              <td className="px-2 py-2">{evaluation.puede_editar && <button type="button" onClick={() => { setMedicionEditando(editandoEsta ? null : { evaluationId: evaluation.id, measurementId: measurement.id }); setErrorEdicion(""); }} className="rounded-lg border border-teal-200 px-2.5 py-1.5 font-semibold text-teal-800 hover:bg-teal-50">{editandoEsta ? "Cerrar" : "Editar"}</button>}</td>
                            </tr>
                            {editandoEsta && <tr><td colSpan="10" className="p-2"><EditorMedicion initial={measurement} saving={guardandoEdicion} error={errorEdicion} onCancel={() => setMedicionEditando(null)} onSave={(values) => guardarEdicion(evaluation, measurement, values)} /></td></tr>}
                          </Fragment>;
                        })}
                      </tbody>
                    </table>
                  </div>}
                </article>;
              })}
            </div>}
      </section>
    </section>
  );
}
