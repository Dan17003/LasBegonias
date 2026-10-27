/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Odontograma from "../components/Odontograma";
import Periodontograma from "../components/Periodontograma";
import AtencionesTratamiento from "../components/AtencionesTratamiento";
import ServiciosPaciente from "../components/ServiciosPaciente";
import DocumentosClinicos from "../components/DocumentosClinicos";

const MOTIVOS = ["Dolor dental", "Sensibilidad dental", "Sangrado gingival", "Inflamación", "Caries", "Fractura dental", "Movilidad dental", "Problema con prótesis", "Problema con restauración", "Control odontológico", "Limpieza dental", "Evaluación preventiva", "Ortodoncia", "Estética dental", "Otro"];
const CONDICIONES = ["Hipertensión arterial", "Diabetes mellitus", "Enfermedad cardiovascular", "Enfermedad renal", "Enfermedad hepática", "Enfermedad respiratoria", "Asma", "Trastornos de coagulación", "Epilepsia", "Enfermedades infecciosas relevantes", "Inmunosupresión", "Cáncer", "Cirugías previas", "Hospitalizaciones previas"];
const TABS = [
  ["resumen", "Resumen"], ["evaluacion", "Evaluación clínica"], ["odontograma", "Odontograma"],
  ["periodonto", "Periodontograma"], ["atenciones", "Atenciones y tratamiento"],
  ["documentos", "Archivos clínicos"], ["servicios", "Servicios para presupuesto"],
];
const vacio = { paciente: null, atenciones: [] };

function Campo({ label, children, className = "" }) {
  return <label className={`block text-xs font-bold text-slate-500 ${className}`}>{label}{children}</label>;
}

function Area({ value, onChange, ...props }) {
  return <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} {...props} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#11B9BB]" />;
}

export default function HistoriaClinica({ pacienteId, volver }) {
  const [datos, setDatos] = useState(vacio);
  const [perfil, setPerfil] = useState(null);
  const [citas, setCitas] = useState([]);
  const [cargandoHistoria, setCargandoHistoria] = useState(true);
  const [tab, setTab] = useState("resumen");
  const [atencionParaVincularId, setAtencionParaVincularId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [perfilForm, setPerfilForm] = useState({ motivo_tipo: "", motivo_descripcion: "", antecedentes_medicos: {}, antecedentes_medicos_otros: "", embarazo: "", examen_extraoral: {}, examen_intraoral: {} });

  const cargar = async () => {
    try {
      const [historia, citasPaciente, perfilRespuesta, alergiasRespuesta] = await Promise.all([
        api.get(`/historia/pacientes/${pacienteId}/historia`),
        api.get(`/historia/pacientes/${pacienteId}/citas`),
        api.get(`/historia/pacientes/${pacienteId}/perfil`),
        api.get(`/historia/pacientes/${pacienteId}/alergias`),
      ]);
      setDatos(historia.data); setCitas(citasPaciente.data); setPerfil(perfilRespuesta.data);
      setError("");
      const perfilCargado = perfilRespuesta.data || {};
      const antecedentes = perfilCargado.antecedentes_medicos || {};
      const tieneAlergiasEnPerfil = Object.hasOwn(antecedentes, "Alergias");
      const alergiasAntiguas = alergiasRespuesta.data || [];
      const antecedentesConAlergias = tieneAlergiasEnPerfil || alergiasAntiguas.length === 0
        ? antecedentes
        : {
          ...antecedentes,
          Alergias: "Sí",
          alergias_cuales: alergiasAntiguas.map(({ sustancia, reaccion }) =>
            reaccion ? `${sustancia} (${reaccion})` : sustancia,
          ).join("; "),
        };
      setPerfilForm((actual) => ({
        ...actual,
        ...perfilCargado,
        antecedentes_medicos: antecedentesConAlergias,
      }));
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cargar la historia clínica.");
    } finally {
      setCargandoHistoria(false);
    }
  };
  useEffect(() => {
    setAtencionParaVincularId("");
    cargar();
  }, [pacienteId]);

  const abrirModuloClinico = (modulo, atencionId) => {
    setAtencionParaVincularId(String(atencionId));
    setTab(modulo);
  };

  const paciente = datos.paciente;
  const declaracionPaciente = perfilForm.antecedentes_medicos?.declaracion_paciente;
  const citasOrdenadas = useMemo(
    () => [...citas].sort((a, b) =>
      `${b.fecha || ""}T${b.hora_inicio || ""}`.localeCompare(`${a.fecha || ""}T${a.hora_inicio || ""}`),
    ),
    [citas],
  );
  const formatearFechaCita = (fecha) => {
    if (!fecha) return "Fecha no registrada";
    const [year, month, day] = String(fecha).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const edad = useMemo(() => {
    if (!paciente?.fecha_nacimiento) return null;
    const nacimiento = new Date(`${paciente.fecha_nacimiento}T00:00:00`);
    const ahora = new Date();
    return Math.max(0, ahora.getFullYear() - nacimiento.getFullYear() - ((ahora.getMonth() < nacimiento.getMonth() || (ahora.getMonth() === nacimiento.getMonth() && ahora.getDate() < nacimiento.getDate())) ? 1 : 0));
  }, [paciente]);
  const setPerfilCampo = (campo, valor) => setPerfilForm((actual) => ({ ...actual, [campo]: valor }));
  const setObjeto = (campo, llave, valor) => setPerfilCampo(campo, { ...perfilForm[campo], [llave]: valor });

  const guardarPerfil = async (event) => {
    event.preventDefault(); setGuardando(true); setError(""); setMensaje("");
    try {
      const motivo = perfilForm.motivo_tipo === "Otro" ? perfilForm.motivo_descripcion : perfilForm.motivo_tipo;
      const { data } = await api.put(`/historia/pacientes/${pacienteId}/perfil`, { ...perfilForm, motivo: motivo || null });
      setPerfil(data); setMensaje("Información clínica guardada correctamente.");
    } catch (err) { setError(err.response?.data?.error || "No se pudo guardar la información clínica."); } finally { setGuardando(false); }
  };

  if (!paciente) {
    return (
      <main className="mx-auto flex min-h-[50vh] w-full max-w-4xl items-center justify-center px-4 py-10">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          {cargandoHistoria ? (
            <>
              <div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-cyan-100" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-slate-700">Cargando la ficha clínica…</p>
              <p className="mt-1 text-xs text-slate-500">Estamos reuniendo la información disponible del paciente.</p>
            </>
          ) : (
            <>
              <h2 className="text-base font-bold text-slate-800">No se pudo abrir la ficha clínica</h2>
              <p role="alert" className="mt-2 text-sm text-rose-700">{error || "No se encontró la información del paciente."}</p>
              <div className="mt-5 flex justify-center gap-2">
                <button type="button" onClick={volver} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Volver a mis pacientes</button>
                <button type="button" onClick={() => { setCargandoHistoria(true); setError(""); cargar(); }} className="rounded-xl bg-[#11B9BB] px-4 py-2 text-xs font-bold text-white hover:bg-[#0b9fa1]">Reintentar</button>
              </div>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 text-slate-700 sm:px-6 sm:py-7">
        <button type="button" onClick={volver} className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold text-[#0b8f91] transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-[#11B9BB]">
          <span aria-hidden="true">←</span> Volver a mis pacientes
        </button>
        <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Historia clínica odontológica</p>
              <h2 className="mt-1 break-words text-2xl font-black text-slate-800">{paciente.nombres} {paciente.apellidos || ""}</h2>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>DNI: {paciente.dni || "No registrado"}</span>
                <span>{paciente.sexo || "Sexo no registrado"}</span>
                <span>{edad === null ? "Edad no registrada" : `${edad} años`}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Nacimiento: {paciente.fecha_nacimiento || "No registrada"} · Teléfono: {paciente.telefono || "No registrado"}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Datos generales</p><p className="mt-1 text-sm font-bold text-slate-800">{perfil ? "Registrados" : "Pendientes"}</p></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Atenciones</p><p className="mt-1 text-sm font-bold text-slate-800">{datos.atenciones.length}</p></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Última atención</p><p className="mt-1 text-sm font-bold text-slate-800">{datos.atenciones[0] ? new Date(datos.atenciones[0].fecha).toLocaleDateString("es-PE") : "No registrado"}</p></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Alergias</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{perfilForm.antecedentes_medicos?.Alergias === "Sí" ? perfilForm.antecedentes_medicos?.alergias_cuales || "Sí, sin especificar" : perfilForm.antecedentes_medicos?.Alergias === "No" ? "No" : "No registrado"}</p></div>
          </div>
      </header>
      {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{mensaje && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</div>}
      <nav aria-label="Secciones de la historia clínica" role="tablist" className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{TABS.map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#11B9BB] ${tab === id ? "bg-[#11B9BB] text-white shadow-sm" : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-900"}`}>{label}</button>)}</nav>

      {tab === "resumen" && <div className="space-y-5">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800">Resumen clínico</h3>
          <p className="mt-2 text-sm text-slate-500">Motivo: {perfil?.motivo || "No registrado"}</p>
          <p className="mt-1 text-sm text-slate-500">Antecedentes relevantes: {perfil?.antecedentes_medicos_otros || "No registrado"}</p>
          <p className="mt-1 text-sm text-slate-500">Último diagnóstico: {datos.atenciones[0]?.diagnostico || "No registrado"}</p>
          <p className="mt-1 text-sm text-slate-500">Próxima cita: {citas.find((cita) => cita.fecha >= new Date().toISOString().slice(0, 10) && !["cancelada", "atendida"].includes(String(cita.estado || "").toLowerCase()))?.fecha || "No registrada"}</p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Citas del paciente</h3>
              <p className="mt-1 text-xs text-slate-500">Historial de citas asociadas a este paciente.</p>
            </div>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">{citasOrdenadas.length} {citasOrdenadas.length === 1 ? "cita" : "citas"}</span>
          </div>
          {citasOrdenadas.length === 0 ? (
            <p className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-500">Este paciente todavía no tiene citas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead className="bg-[#087f81] text-white">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Fecha</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Hora</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Motivo</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Odontólogo</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {citasOrdenadas.map((cita) => {
                    const estado = String(cita.estado || "Programada");
                    const estiloEstado = {
                      atendida: "bg-emerald-50 text-emerald-700",
                      confirmada: "bg-cyan-50 text-cyan-800",
                      cancelada: "bg-rose-50 text-rose-700",
                    }[estado.toLowerCase()] || "bg-amber-50 text-amber-800";
                    return <tr key={cita.id} className="transition hover:bg-cyan-50/40">
                      <td className="whitespace-nowrap px-5 py-3 text-slate-700">{formatearFechaCita(cita.fecha)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">{cita.hora_inicio?.slice(0, 5) || "—"}{cita.hora_fin ? ` – ${cita.hora_fin.slice(0, 5)}` : ""}</td>
                      <td className="px-5 py-3 text-slate-700">{cita.motivo || "Sin motivo indicado"}</td>
                      <td className="px-5 py-3 text-slate-600">{cita.doctor || "No registrado"}</td>
                      <td className="px-5 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estiloEstado}`}>{estado}</span></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>}

      {tab === "evaluacion" && <form onSubmit={guardarPerfil} className="space-y-5">
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-4">
          <h3 className="text-sm font-bold text-cyan-950">Información clínica general del paciente</h3>
          <p className="mt-1 text-xs leading-relaxed text-cyan-900">Los antecedentes médicos y datos generales se guardan en su perfil y se mantienen entre consultas. En “Atenciones” registra solo los cambios y hallazgos propios de cada visita.</p>
        </div>

        {declaracionPaciente && <section className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5">
          <div className="mb-3 border-b border-teal-200 pb-3">
            <h3 className="text-base font-bold text-teal-950">Antecedentes declarados por el paciente</h3>
            <p className="mt-1 text-xs text-teal-800">
              Esta declaración está vinculada a la ficha del paciente; no reemplaza tus observaciones profesionales.
            </p>
            {declaracionPaciente.consentimiento_veracidad?.aceptado && <p className="mt-1 text-xs font-semibold text-teal-900">
              El paciente confirmó la veracidad el {new Date(declaracionPaciente.consentimiento_veracidad.aceptado_en).toLocaleString("es-PE")}.
            </p>}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["enfermedades", "Enfermedades y condiciones"],
              ["alergias", "Alergias"],
              ["medicamentos_actuales", "Medicamentos actuales"],
              ["antecedentes_familiares", "Antecedentes familiares"],
              ["antecedentes_odontologicos", "Antecedentes odontológicos"],
              ["habitos", "Hábitos de salud bucal"],
            ].map(([campo, etiqueta]) => <div key={campo}>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-teal-800">{etiqueta}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{declaracionPaciente[campo] || "No declarado"}</dd>
            </div>)}
          </dl>
        </section>}

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-800">Motivo y antecedentes médicos</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Campo label="Motivo principal">
              <select value={perfilForm.motivo_tipo} onChange={(event) => setPerfilCampo("motivo_tipo", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Seleccionar...</option>{MOTIVOS.map((motivo) => <option key={motivo}>{motivo}</option>)}
              </select>
            </Campo>
            <Campo label="Embarazo">
              <select value={perfilForm.embarazo} onChange={(event) => setPerfilCampo("embarazo", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">No registrado</option><option>Sí</option><option>No</option><option>No aplica</option>
              </select>
            </Campo>
            <Campo label="Descripción del motivo"><Area value={perfilForm.motivo_descripcion} onChange={(value) => setPerfilCampo("motivo_descripcion", value)} /></Campo>
            <Campo label="Otros antecedentes"><Area value={perfilForm.antecedentes_medicos_otros} onChange={(value) => setPerfilCampo("antecedentes_medicos_otros", value)} /></Campo>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {CONDICIONES.map((condicion) => <div key={condicion} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 text-xs">
              <span>{condicion}</span>
              <select value={perfilForm.antecedentes_medicos?.[condicion] || ""} onChange={(event) => setObjeto("antecedentes_medicos", condicion, event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1">
                <option value="">No registrado</option><option>Sí</option><option>No</option><option>No sabe</option>
              </select>
            </div>)}
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="antecedentes-alergias" className="text-xs font-semibold text-slate-700">¿Tiene alergias?</label>
                <select id="antecedentes-alergias" value={perfilForm.antecedentes_medicos?.Alergias || ""} onChange={(event) => {
                  const tieneAlergias = event.target.value;
                  setPerfilCampo("antecedentes_medicos", {
                    ...perfilForm.antecedentes_medicos,
                    Alergias: tieneAlergias,
                    alergias_cuales: tieneAlergias === "Sí" ? perfilForm.antecedentes_medicos?.alergias_cuales || "" : "",
                  });
                }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
                  <option value="">No registrado</option><option>Sí</option><option>No</option>
                </select>
              </div>
              <label className="mt-2 block text-xs font-semibold text-slate-700">
                ¿Cuáles?
                <input value={perfilForm.antecedentes_medicos?.alergias_cuales || ""} disabled={perfilForm.antecedentes_medicos?.Alergias !== "Sí"} onChange={(event) => setObjeto("antecedentes_medicos", "alergias_cuales", event.target.value)} placeholder="Especifica los alérgenos" maxLength={1000} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 disabled:bg-slate-100 disabled:text-slate-400" />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-800">Examen clínico</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[["examen_extraoral", "Estado general", ["Normal", "Alterado"]], ["examen_extraoral", "Simetría facial", ["Simétrica", "Asimetría"]], ["examen_extraoral", "ATM", ["Sin alteraciones aparentes", "Dolor", "Chasquido", "Crepitación", "Limitación de apertura", "Otro"]], ["examen_extraoral", "Labios", ["Normal", "Alterado"]], ["examen_intraoral", "Mucosa oral", ["Normal", "Alterada"]], ["examen_intraoral", "Lengua", ["Normal", "Alterada"]], ["examen_intraoral", "Paladar", ["Normal", "Alterado"]], ["examen_intraoral", "Piso de boca", ["Normal", "Alterado"]], ["examen_intraoral", "Encía", ["Normal", "Inflamación", "Sangrado", "Recesión", "Aumento de volumen", "Otra alteración"]]].map(([grupo, campo, opciones]) => <Campo key={campo} label={campo}>
              <select value={perfilForm[grupo]?.[campo] || ""} onChange={(event) => setObjeto(grupo, campo, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">No registrado</option>{opciones.map((opcion) => <option key={opcion}>{opcion}</option>)}
              </select>
            </Campo>)}
          </div>
          <Campo label="Observaciones clínicas" className="mt-3"><Area value={perfilForm.examen_intraoral?.observaciones || ""} onChange={(value) => setObjeto("examen_intraoral", "observaciones", value)} /></Campo>
        </section>
        <button disabled={guardando} className="rounded-xl bg-[#11B9BB] px-5 py-2.5 text-xs font-bold text-white">{guardando ? "Guardando..." : "Guardar evaluación clínica"}</button>
      </form>}

      {tab === "odontograma" && <Odontograma
        pacienteId={pacienteId}
        atencionId={atencionParaVincularId}
        atenciones={datos.atenciones}
        onAtencionChange={setAtencionParaVincularId}
        onSaved={cargar}
      />}
      {tab === "servicios" && <ServiciosPaciente pacienteId={pacienteId} citas={citas} />}
      {tab === "periodonto" && <Periodontograma
        key={pacienteId}
        pacienteId={pacienteId}
        atencionId={atencionParaVincularId}
        atenciones={datos.atenciones}
        onAtencionChange={setAtencionParaVincularId}
        onSaved={cargar}
      />}
      {tab === "atenciones" && <AtencionesTratamiento
        key={pacienteId}
        pacienteId={pacienteId}
        atenciones={datos.atenciones}
        citas={citas}
        onSaved={cargar}
        onAbrirModuloClinico={abrirModuloClinico}
      />}
      {tab === "documentos" && (
        <DocumentosClinicos pacienteId={pacienteId} paciente={paciente} />
      )}
    </div>
  );
}
