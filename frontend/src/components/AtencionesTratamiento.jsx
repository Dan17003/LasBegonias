/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const DIAGNOSTICOS_SUGERIDOS = [
  "Caries dental", "Pulpitis reversible", "Pulpitis irreversible sintomática",
  "Necrosis pulpar", "Periodontitis apical sintomática", "Gingivitis inducida por biofilm",
  "Periodontitis", "Fractura dental", "Abrasión dental", "Erosión dental",
  "Hipersensibilidad dentinaria", "Edentulismo parcial",
];
const PROCEDIMIENTOS_SUGERIDOS = [
  "Examen clínico odontológico", "Profilaxis dental", "Restauración con resina compuesta",
  "Sellante de fosas y fisuras", "Raspado y alisado radicular", "Exodoncia simple",
  "Tratamiento endodóntico", "Impresión para rehabilitación protésica",
];
const ESTADOS_PLAN = ["propuesto", "en_curso", "completado", "cancelado"];
const hoy = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatoFecha = (value) => {
  if (!value) return "No indicada";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("es-PE");
  }
  return new Date(value).toLocaleDateString("es-PE");
};
const control = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
const seccion = "rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5";
const inicialAtencion = () => ({
  fecha: hoy(),
  motivo_consulta: "",
  cita_id: "",
  antecedentes: "",
  hallazgos: "",
  diagnosticosSeleccionados: [],
  diagnosticoNuevo: { descripcion: "", codigo: "", tipo: "clinico", pieza: "", notas: "" },
  planesTratamiento: [{ titulo: "", descripcion: "", diagnostico_id: "", prioridad: "media", fecha_prevista: "" }],
  procedimientos: [{ descripcion: "", pieza: "", plan_tratamiento_id: "", completar_plan: false }],
  evolucion: "",
  evolucion_visible_para_paciente: false,
  indicaciones: "",
});

function Campo({ label, children, className = "" }) {
  return <label className={`block text-xs font-bold text-slate-600 ${className}`}>{label}{children}</label>;
}

function Aviso({ error, mensaje }) {
  if (!error && !mensaje) return null;
  return <p role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || mensaje}</p>;
}

export default function AtencionesTratamiento({ pacienteId, atenciones = [], citas = [], onSaved, onAbrirModuloClinico }) {
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [form, setForm] = useState(inicialAtencion);
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const cargarRegistros = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [diagnosticosResponse, planesResponse] = await Promise.all([
        api.get(`/historia/pacientes/${pacienteId}/diagnosticos`),
        api.get(`/historia/pacientes/${pacienteId}/planes-tratamiento`),
      ]);
      setDiagnosticos(diagnosticosResponse.data || []);
      setPlanes(planesResponse.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudieron cargar los diagnósticos y planes del paciente.");
    } finally {
      setCargando(false);
    }
  }, [pacienteId]);

  useEffect(() => { cargarRegistros(); }, [cargarRegistros]);

  const actualizar = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const actualizarNuevoDiagnostico = (field, value) => setForm((current) => ({
    ...current,
    diagnosticoNuevo: { ...current.diagnosticoNuevo, [field]: value },
  }));
  const actualizarProcedimiento = (index, field, value) => setForm((current) => ({
    ...current,
    procedimientos: current.procedimientos.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));
  const actualizarPlanTratamiento = (index, field, value) => setForm((current) => ({
    ...current,
    planesTratamiento: current.planesTratamiento.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));

  const registrarAtencion = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");
    const nuevos = form.diagnosticoNuevo.descripcion.trim()
      ? [{ nuevo: { ...form.diagnosticoNuevo, descripcion: form.diagnosticoNuevo.descripcion.trim() } }]
      : [];
    const procedimientos = form.procedimientos.filter((item) => item.descripcion.trim()).map((item) => ({
      ...item,
      plan_tratamiento_id: item.plan_tratamiento_id || null,
      pieza: item.pieza.trim() || null,
    }));
    if (form.procedimientos.some((item) => item.plan_tratamiento_id && !item.descripcion.trim())) {
      setError("Describe el procedimiento realizado que quieres vincular al plan.");
      return;
    }
    const planesTratamiento = form.planesTratamiento
      .filter((item) => item.titulo.trim() || item.descripcion.trim())
      .map((item) => ({ ...item, titulo: item.titulo.trim(), descripcion: item.descripcion.trim() }));
    if (planesTratamiento.some((item) => !item.titulo)) {
      setError("Completa el nombre de cada plan de tratamiento que agregues.");
      return;
    }

    setGuardando(true);
    try {
      const { data } = await api.post(`/historia/pacientes/${pacienteId}/atenciones`, {
        fecha: form.fecha,
        motivo_consulta: form.motivo_consulta,
        cita_id: form.cita_id || null,
        antecedentes: form.antecedentes,
        hallazgos: form.hallazgos,
        evolucion: form.evolucion,
        evolucion_visible_para_paciente: form.evolucion_visible_para_paciente,
        indicaciones: form.indicaciones,
        diagnosticos: [
          ...form.diagnosticosSeleccionados.map((diagnostico_id) => ({ diagnostico_id })),
          ...nuevos,
        ],
        planesTratamiento,
        procedimientos,
      });
      await Promise.all([onSaved?.(), cargarRegistros()]);
      setForm(inicialAtencion());
      setMostrarFormulario(false);
      setDetalle(data.id);
      setMensaje("La consulta y sus relaciones clínicas se guardaron en el historial.");
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || "No se pudo registrar la consulta.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoPlan = async (plan, estado) => {
    setError("");
    setMensaje("");
    try {
      const { data } = await api.put(`/historia/pacientes/${pacienteId}/planes-tratamiento/${plan.id}`, {
        estado,
        fecha_fin: estado === "completado" ? hoy() : estado === "cancelado" ? plan.fecha_fin : null,
      });
      setPlanes((current) => current.map((item) => item.id === data.id ? data : item));
      setMensaje("Se actualizó el estado del procedimiento planificado.");
      await onSaved?.();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudo actualizar el procedimiento planificado.");
    }
  };

  const citasDisponibles = citas.filter((cita) =>
    !["cancelada", "atendida"].includes(String(cita.estado || "").toLowerCase()) &&
    !atenciones.some((atencion) => String(atencion.cita_id) === String(cita.id)),
  );

  return (
    <div className="space-y-5">
      <Aviso error={error} mensaje={mensaje} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">Registro por consulta</p>
            <h3 className="mt-1 text-base font-bold text-slate-800">Atenciones y tratamiento</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">Registra en una sola consulta los hallazgos, diagnósticos, procedimientos realizados y el plan de tratamiento del paciente.</p>
          </div>
          <button type="button" onClick={() => { setMostrarFormulario((visible) => !visible); setError(""); setMensaje(""); }} className="shrink-0 rounded-xl bg-[#11B9BB] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b9fa1]">{mostrarFormulario ? "Cerrar formulario" : "＋ Registrar atención"}</button>
        </div>
      </section>

      {mostrarFormulario && <form onSubmit={registrarAtencion} className="space-y-4 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm sm:p-6">
        <header><p className="text-xs font-bold uppercase tracking-wider text-cyan-700">Nueva atención</p><h3 className="mt-1 text-lg font-bold text-slate-800">Nota de consulta</h3><p className="mt-1 text-xs text-slate-500">La consulta, los diagnósticos y el plan de tratamiento se guardan juntos y aparecen en el historial cronológico.</p></header>
        <datalist id="diagnosticos-atencion">{DIAGNOSTICOS_SUGERIDOS.map((item) => <option key={item} value={item} />)}</datalist>
        <datalist id="procedimientos-plan-atencion">{PROCEDIMIENTOS_SUGERIDOS.map((item) => <option key={item} value={item} />)}</datalist>
        <datalist id="procedimientos-atencion">{PROCEDIMIENTOS_SUGERIDOS.map((item) => <option key={item} value={item} />)}</datalist>
        <datalist id="motivos-atencion">
          <option value="Dolor dental" /><option value="Sensibilidad al frío o calor" />
          <option value="Dolor al masticar" /><option value="Inflamación o sangrado de encías" />
          <option value="Control odontológico" /><option value="Evaluación preventiva" />
        </datalist>

        <section className={seccion}>
          <h4 className="mb-3 text-sm font-bold text-slate-800">A. Datos de la consulta</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Fecha"><input required type="date" value={form.fecha} onChange={(event) => actualizar("fecha", event.target.value)} className={control} /></Campo>
            <Campo label="Cita relacionada (opcional)" className="sm:col-span-2"><select value={form.cita_id} onChange={(event) => actualizar("cita_id", event.target.value)} className={control}><option value="">Sin cita asociada</option>{citasDisponibles.map((cita) => <option key={cita.id} value={cita.id}>{cita.fecha} {cita.hora_inicio?.slice(0, 5)} · {cita.motivo} · {cita.estado}</option>)}</select></Campo>
            <Campo label="Motivo de consulta" className="sm:col-span-2"><input required list="motivos-atencion" maxLength={500} value={form.motivo_consulta} onChange={(event) => actualizar("motivo_consulta", event.target.value)} placeholder="Motivo de esta visita" className={control} /></Campo>
          </div>
        </section>

        <section className={seccion}>
          <h4 className="mb-3 text-sm font-bold text-slate-800">B. Evaluación y hallazgos</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Cambios relevantes desde la visita anterior"><textarea rows={3} maxLength={3000} value={form.antecedentes} onChange={(event) => actualizar("antecedentes", event.target.value)} placeholder="No repitas aquí antecedentes generales ya guardados en el perfil." className={control} /></Campo>
            <Campo label="Hallazgos clínicos de esta visita"><textarea rows={3} maxLength={5000} value={form.hallazgos} onChange={(event) => actualizar("hallazgos", event.target.value)} placeholder="Hallazgos objetivos observados y evaluados." className={control} /></Campo>
          </div>
        </section>

        <section className={seccion}>
          <h4 className="mb-1 text-sm font-bold text-slate-800">C. Diagnósticos asociados a la visita</h4>
          <p className="mb-3 text-xs text-slate-500">Selecciona diagnósticos ya registrados o agrega un nuevo hallazgo. Quedarán vinculados a esta atención en el historial.</p>
          {cargando ? <p className="mb-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">Cargando diagnósticos del paciente…</p> : diagnosticos.length ? <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {diagnosticos.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
              <input type="checkbox" checked={form.diagnosticosSeleccionados.includes(String(item.id))} onChange={(event) => actualizar("diagnosticosSeleccionados", event.target.checked ? [...form.diagnosticosSeleccionados, String(item.id)] : form.diagnosticosSeleccionados.filter((id) => id !== String(item.id)))} className="mt-0.5 accent-teal-600" />
              <span><b className="text-slate-800">{item.descripcion}</b><span className="block text-slate-500">{item.codigo ? `${item.codigo} · ` : ""}{item.pieza ? `Pieza ${item.pieza} · ` : ""}{item.estado}</span></span>
            </label>)}
          </div> : <p className="mb-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">No hay diagnósticos activos registrados; puedes crear uno aquí.</p>}
          <details className="rounded-lg border border-teal-100 bg-white">
            <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold text-teal-800">Registrar un diagnóstico nuevo en esta atención</summary>
            <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">
              <Campo label="Descripción"><input list="diagnosticos-atencion" maxLength={1000} value={form.diagnosticoNuevo.descripcion} onChange={(event) => actualizarNuevoDiagnostico("descripcion", event.target.value)} placeholder="Describe el hallazgo diagnóstico" className={control} /></Campo>
              <Campo label="Tipo"><select value={form.diagnosticoNuevo.tipo} onChange={(event) => actualizarNuevoDiagnostico("tipo", event.target.value)} className={control}><option value="clinico">Clínico</option><option value="presuntivo">Presuntivo</option><option value="definitivo">Definitivo</option></select></Campo>
              <Campo label="Código clínico (opcional)"><input maxLength={100} value={form.diagnosticoNuevo.codigo} onChange={(event) => actualizarNuevoDiagnostico("codigo", event.target.value)} className={control} /></Campo>
              <Campo label="Pieza FDI o región (opcional)"><input maxLength={8} value={form.diagnosticoNuevo.pieza} onChange={(event) => actualizarNuevoDiagnostico("pieza", event.target.value)} placeholder="Ej. 16 o región anterior" className={control} /></Campo>
              <Campo label="Nota clínica"><textarea rows={2} maxLength={2000} value={form.diagnosticoNuevo.notas} onChange={(event) => actualizarNuevoDiagnostico("notas", event.target.value)} className={control} /></Campo>
            </div>
          </details>
        </section>

        <section className={seccion}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div><h4 className="text-sm font-bold text-slate-800">D. Plan de tratamiento</h4><p className="mt-1 text-xs text-slate-500">Agrega los procedimientos previstos o pendientes que se originan en esta atención.</p></div>
            <button type="button" onClick={() => actualizar("planesTratamiento", [...form.planesTratamiento, { titulo: "", descripcion: "", diagnostico_id: "", prioridad: "media", fecha_prevista: "" }])} className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50">＋ Añadir</button>
          </div>
          <div className="space-y-3">
            {form.planesTratamiento.map((plan, index) => <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
              <Campo label="Procedimiento previsto"><input list="procedimientos-plan-atencion" maxLength={200} value={plan.titulo} onChange={(event) => actualizarPlanTratamiento(index, "titulo", event.target.value)} placeholder="Ej. Restauración con resina" className={control} /></Campo>
              <Campo label="Diagnóstico relacionado (opcional)"><select value={plan.diagnostico_id} onChange={(event) => actualizarPlanTratamiento(index, "diagnostico_id", event.target.value)} className={control}><option value="">Sin asociación</option>{diagnosticos.map((item) => <option key={item.id} value={item.id}>{item.descripcion}</option>)}{form.diagnosticoNuevo.descripcion.trim() && <option value="nuevo">Diagnóstico nuevo de esta atención</option>}</select></Campo>
              <Campo label="Descripción y etapas (opcional)"><textarea rows={2} maxLength={3000} value={plan.descripcion} onChange={(event) => actualizarPlanTratamiento(index, "descripcion", event.target.value)} placeholder="Describe etapas o alcance previsto, si corresponde." className={control} /></Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Prioridad"><select value={plan.prioridad} onChange={(event) => actualizarPlanTratamiento(index, "prioridad", event.target.value)} className={control}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></Campo>
                <Campo label="Fecha prevista (opcional)"><input type="date" value={plan.fecha_prevista} onChange={(event) => actualizarPlanTratamiento(index, "fecha_prevista", event.target.value)} className={control} /></Campo>
              </div>
              {form.planesTratamiento.length > 1 && <button type="button" onClick={() => actualizar("planesTratamiento", form.planesTratamiento.filter((_, itemIndex) => itemIndex !== index))} className="justify-self-start text-xs font-semibold text-rose-700">Quitar del plan</button>}
            </div>)}
          </div>
        </section>

        <section className={seccion}>
          <div className="mb-3 flex items-center justify-between gap-2"><div><h4 className="text-sm font-bold text-slate-800">E. Procedimientos realizados hoy</h4><p className="mt-1 text-xs text-slate-500">Un procedimiento no planificado también se puede registrar aquí.</p></div><button type="button" onClick={() => actualizar("procedimientos", [...form.procedimientos, { descripcion: "", pieza: "", plan_tratamiento_id: "", completar_plan: false }])} className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50">＋ Añadir</button></div>
          <div className="space-y-3">
            {form.procedimientos.map((item, index) => <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo label="Procedimiento realizado" className="sm:col-span-2"><input list="procedimientos-atencion" maxLength={1000} value={item.descripcion} onChange={(event) => actualizarProcedimiento(index, "descripcion", event.target.value)} placeholder="Describe lo efectivamente realizado" className={control} /></Campo>
              <Campo label="Pieza FDI (opcional)"><input maxLength={8} value={item.pieza} onChange={(event) => actualizarProcedimiento(index, "pieza", event.target.value)} className={control} /></Campo>
              <Campo label="Vincular al plan (opcional)"><select value={item.plan_tratamiento_id} onChange={(event) => actualizarProcedimiento(index, "plan_tratamiento_id", event.target.value)} className={control}><option value="">Sin planificación previa</option>{planes.filter((plan) => ["propuesto", "en_curso"].includes(plan.estado)).map((plan) => <option key={plan.id} value={plan.id}>{plan.titulo} · {plan.estado}</option>)}</select></Campo>
              {item.plan_tratamiento_id && <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2 lg:col-span-4"><input type="checkbox" checked={item.completar_plan} onChange={(event) => actualizarProcedimiento(index, "completar_plan", event.target.checked)} className="accent-teal-600" />El procedimiento realizado completa este plan (solo este plan cambiará a completado).</label>}
              {form.procedimientos.length > 1 && <button type="button" onClick={() => actualizar("procedimientos", form.procedimientos.filter((_, itemIndex) => itemIndex !== index))} className="justify-self-start text-xs font-semibold text-rose-700">Quitar fila</button>}
            </div>)}
          </div>
        </section>

        <section className={seccion}>
          <h4 className="mb-3 text-sm font-bold text-slate-800">F. Evolución e indicaciones</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Evolución clínica"><textarea rows={3} maxLength={4000} value={form.evolucion} onChange={(event) => actualizar("evolucion", event.target.value)} placeholder="Respuesta y evolución durante la atención." className={control} /></Campo>
            <Campo label="Indicaciones para el paciente"><textarea rows={3} maxLength={4000} value={form.indicaciones} onChange={(event) => actualizar("indicaciones", event.target.value)} placeholder="Cuidados, recomendaciones o alertas posteriores." className={control} /></Campo>
            <label className="flex items-start gap-2 rounded-lg border border-cyan-100 bg-cyan-50/60 p-3 text-xs text-cyan-950 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.evolucion_visible_para_paciente}
                onChange={(event) => actualizar("evolucion_visible_para_paciente", event.target.checked)}
                className="mt-0.5 accent-teal-600"
              />
              <span>Autorizar que la evolución clínica de esta atención aparezca en el expediente del paciente.</span>
            </label>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" disabled={guardando} onClick={() => setMostrarFormulario(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50">Cancelar</button>
          <button disabled={guardando} className="rounded-xl bg-[#11B9BB] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0b9fa1] disabled:opacity-60">{guardando ? "Guardando consulta…" : "Guardar atención"}</button>
        </div>
      </form>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4"><h3 className="text-base font-bold text-slate-800">Historial cronológico</h3><p className="mt-1 text-xs text-slate-500">{atenciones.length} {atenciones.length === 1 ? "atención registrada" : "atenciones registradas"} · en orden de más reciente a más antigua</p></div>
        {atenciones.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center"><p className="text-sm font-semibold text-slate-700">Todavía no hay atenciones registradas</p><p className="mt-1 text-xs text-slate-500">Las consultas anteriores se conservarán al agregar una nueva.</p></div> :
          <div className="space-y-3">{atenciones.map((atencion) => {
            const expanded = detalle === atencion.id;
            const diagnosticosAtencion = atencion.diagnosticos || [];
            const procedimientosAtencion = atencion.procedimientos || [];
            const planesDeAtencion = atencion.planesTratamiento || [];
            const cambiosOdontograma = atencion.odontogramaCambios || [];
            const evaluacionesPeriodontales = [...new Map(
              (atencion.medicionesPeriodontales || []).map((medicion) => [
                medicion.evaluacion_id || `${medicion.fecha_evaluacion}-${medicion.odontologo_id}`,
                medicion,
              ]),
            ).values()];
            return <article key={atencion.id} className="overflow-hidden rounded-xl border border-slate-200">
              <button type="button" aria-expanded={expanded} onClick={() => setDetalle(expanded ? null : atencion.id)} className="w-full bg-white p-4 text-left transition hover:bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500">{new Date(atencion.fecha).toLocaleDateString("es-PE")}</span><span className="text-xs font-semibold text-cyan-800">{atencion.Odontologo?.nombre || "Odontólogo"}</span></div>
                <p className="mt-2 text-sm font-bold text-slate-800">{atencion.motivo_consulta}</p>
                <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Hallazgos:</span> {atencion.hallazgos || atencion.evaluacion || "Sin registrar"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]"><span className="rounded-full bg-cyan-50 px-2 py-1 text-cyan-800">{diagnosticosAtencion.length || (atencion.diagnostico ? 1 : 0)} diagnóstico(s)</span><span className="rounded-full bg-teal-50 px-2 py-1 text-teal-800">{procedimientosAtencion.length || (atencion.procedimiento ? 1 : 0)} procedimiento(s) realizado(s)</span>{planesDeAtencion.length > 0 && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">{planesDeAtencion.length} procedimiento(s) en plan</span>}{cambiosOdontograma.length > 0 && <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-800">{cambiosOdontograma.length} cambio(s) odontograma</span>}{evaluacionesPeriodontales.length > 0 && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">{evaluacionesPeriodontales.length} evaluación(es) periodontal(es)</span>}{atencion.cita && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Cita {atencion.cita.estado?.toLowerCase()}</span>}</div>
                <span className="mt-2 inline-block text-[11px] font-bold text-cyan-800">{expanded ? "Ocultar detalle −" : "Ver consulta +"}</span>
              </button>
              {expanded && <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 p-4 text-xs">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Cambios relevantes", atencion.antecedentes],
                    ["Hallazgos clínicos", atencion.hallazgos || atencion.evaluacion],
                    ["Evolución", atencion.evolucion],
                    ["Indicaciones", atencion.indicaciones],
                    ["Tratamiento indicado histórico", atencion.tratamiento],
                    ["Observaciones previas", atencion.observaciones],
                    ["Cita relacionada", atencion.cita ? `${atencion.cita.fecha} ${atencion.cita.hora_inicio?.slice(0, 5) || ""} · ${atencion.cita.estado}` : "Sin cita"],
                  ].filter(([, value]) => value).map(([label, value]) => <p key={label} className="break-words text-slate-600"><b className="text-slate-800">{label}:</b> {value}</p>)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Plan de tratamiento</h4>
                  {planesDeAtencion.length ? <div className="mt-1 space-y-2">{planesDeAtencion.map((plan) => <article key={plan.id} className="rounded-lg border border-amber-100 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-slate-800">{plan.titulo}</p>{plan.descripcion && <p className="mt-1 text-slate-600">{plan.descripcion}</p>}<p className="mt-1 text-[11px] text-slate-500">{plan.diagnostico?.descripcion ? `Diagnóstico: ${plan.diagnostico.descripcion} · ` : ""}Prioridad {plan.prioridad} · fecha prevista {formatoFecha(plan.fecha_prevista)}</p></div>
                      <select aria-label={`Estado del plan ${plan.titulo}`} value={plan.estado} onChange={(event) => cambiarEstadoPlan(plan, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">{ESTADOS_PLAN.filter((estado) => estado !== "completado" || plan.procedimientosRealizados?.length > 0).map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select>
                    </div>
                    {plan.procedimientosRealizados?.length > 0 && <ul className="mt-2 space-y-1 text-[11px] text-teal-800">{plan.procedimientosRealizados.map((item) => <li key={item.id}>Realizado: {item.descripcion} · atención {formatoFecha(item.atencion?.fecha || item.fecha)}</li>)}</ul>}
                  </article>)}</div> : <p className="mt-1 text-slate-500">No se agregó un plan de tratamiento en esta atención.</p>}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Diagnósticos asociados</h4>
                  {diagnosticosAtencion.length ? <ul className="mt-1 list-inside list-disc text-slate-600">{diagnosticosAtencion.map((diagnostico) => <li key={diagnostico.id}>{diagnostico.descripcion}{diagnostico.pieza ? ` · pieza ${diagnostico.pieza}` : ""}{diagnostico.codigo ? ` · ${diagnostico.codigo}` : ""}</li>)}</ul> : atencion.diagnostico ? <p className="mt-1 text-slate-600">{atencion.diagnostico} <span className="text-slate-400">(texto histórico)</span></p> : <p className="mt-1 text-slate-500">Sin diagnóstico asociado.</p>}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Procedimientos realizados</h4>
                  {procedimientosAtencion.length ? <ul className="mt-1 space-y-1 text-slate-600">{procedimientosAtencion.map((item) => <li key={item.id}>• {item.descripcion}{item.pieza ? ` · pieza ${item.pieza}` : ""}{item.plan ? ` · plan: ${item.plan.titulo}` : ""}</li>)}</ul> : atencion.procedimiento ? <p className="mt-1 text-slate-600">{atencion.procedimiento} <span className="text-slate-400">(texto histórico)</span></p> : <p className="mt-1 text-slate-500">Sin procedimiento registrado.</p>}
                </div>
                <section className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800">Registros clínicos vinculados</h4>
                      <p className="mt-1 text-[11px] text-slate-500">Los módulos conservan sus mediciones e historial; aquí se muestran los registros asociados a esta consulta.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onAbrirModuloClinico?.("odontograma", atencion.id)} className="rounded-lg border border-cyan-200 px-3 py-2 text-[11px] font-bold text-cyan-800 hover:bg-cyan-50">Abrir odontograma de esta atención</button>
                      <button type="button" onClick={() => onAbrirModuloClinico?.("periodonto", atencion.id)} className="rounded-lg border border-teal-200 px-3 py-2 text-[11px] font-bold text-teal-800 hover:bg-teal-50">Registrar periodontograma</button>
                    </div>
                  </div>
                  {cambiosOdontograma.length > 0 && <div className="mt-3">
                    <p className="text-[11px] font-bold text-slate-700">Cambios del odontograma</p>
                    <ul className="mt-1 space-y-1 text-[11px] text-slate-600">{cambiosOdontograma.map((cambio) => <li key={cambio.id}>Pieza {cambio.pieza}: {cambio.estado_anterior || "sin registro"} → {cambio.estado_nuevo}{cambio.notas_anteriores ? ` · nota previa: ${cambio.notas_anteriores}` : ""}{cambio.notas_nuevas ? ` · nota nueva: ${cambio.notas_nuevas}` : ""}</li>)}</ul>
                  </div>}
                  {evaluacionesPeriodontales.length > 0 && <div className="mt-3">
                    <p className="text-[11px] font-bold text-slate-700">Evaluaciones periodontales</p>
                    <ul className="mt-1 space-y-1 text-[11px] text-slate-600">{evaluacionesPeriodontales.map((evaluacion) => {
                      const sitios = (atencion.medicionesPeriodontales || []).filter((medicion) =>
                        evaluacion.evaluacion_id
                          ? medicion.evaluacion_id === evaluacion.evaluacion_id
                          : medicion.fecha_evaluacion === evaluacion.fecha_evaluacion &&
                            Number(medicion.odontologo_id) === Number(evaluacion.odontologo_id),
                      );
                      return <li key={evaluacion.evaluacion_id || evaluacion.id}>{formatoFecha(evaluacion.fecha_evaluacion)} · {sitios.length} sitio(s) registrado(s)</li>;
                    })}</ul>
                  </div>}
                  {cambiosOdontograma.length === 0 && evaluacionesPeriodontales.length === 0 && <p className="mt-3 text-[11px] text-slate-500">Aún no hay registros de odontograma o periodontograma vinculados a esta atención.</p>}
                </section>
              </div>}
            </article>;
          })}</div>}
      </section>

    </div>
  );
}
