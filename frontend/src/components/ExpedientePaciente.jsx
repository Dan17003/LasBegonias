import { useState } from "react";
import api from "../services/api";

const PESTANAS = [
  ["resumen", "Resumen"],
  ["antecedentes", "Antecedentes"],
  ["clinica", "Atenciones y tratamientos"],
  ["documentos", "Documentos"],
];
const CAMPOS_ANTECEDENTES = [
  ["enfermedades", "Enfermedades y condiciones médicas"],
  ["alergias", "Alergias y reacciones conocidas"],
  ["medicamentos_actuales", "Medicamentos actuales"],
  ["antecedentes_familiares", "Antecedentes familiares relevantes"],
  ["antecedentes_odontologicos", "Antecedentes odontológicos"],
  ["habitos", "Hábitos relacionados con la salud bucal"],
];
const ETIQUETAS_CAMPO = Object.fromEntries([
  ...CAMPOS_ANTECEDENTES,
  ["consentimiento_veracidad", "Consentimiento de veracidad"],
]);
const formatoFecha = (value) => {
  if (!value) return "Sin fecha";
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const parsed = new Date(fecha);
  return Number.isNaN(parsed.getTime())
    ? "Sin fecha"
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(parsed);
};
const formatoTexto = (value) => value || "No registrado";

function Vacio({ children }) {
  return <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">{children}</p>;
}

function Tarjeta({ titulo, descripcion, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800">{titulo}</h3>
        {descripcion && <p className="mt-1 text-xs text-slate-500">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

export default function ExpedientePaciente({ expediente, documentos = [], perfil, onAbrirDocumento, onActualizado }) {
  const [pestana, setPestana] = useState("resumen");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const datos = expediente || {};
  const consentimiento = datos.antecedentes?.consentimiento_veracidad;

  const otorgarConsentimiento = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const { data } = await api.post("/portal-paciente/expediente/consentimiento", { aceptado: true });
      onActualizado?.(data.antecedentes, data.cambio);
      setMensaje("Tu consentimiento quedó registrado en el expediente.");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudieron guardar tus antecedentes.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#087f81] to-[#11B9BB] p-6 text-white shadow-sm sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">Tu información de salud</p>
        <h2 className="mt-1 text-2xl font-black">Mi expediente clínico</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/90">
          Consulta tus antecedentes médicos, atenciones odontológicas, tratamientos y documentos asociados a tu atención.
        </p>
      </header>

      <nav aria-label="Pestañas del expediente clínico" role="tablist" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {PESTANAS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            onClick={() => setPestana(id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#11B9BB] ${
              pestana === id ? "bg-[#11B9BB] text-white shadow-sm" : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-900"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {pestana === "resumen" && (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              ["Última atención", formatoFecha(datos.resumen?.ultimaAtencion)],
              ["Atenciones registradas", datos.resumen?.totalAtenciones || 0],
              ["Documentos disponibles", documentos.length],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-black text-[#087f81]">{value}</p>
              </article>
            ))}
          </section>
          {datos.resumen?.antecedentesPendientes && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Tienes antecedentes pendientes de completar o confirmar. Revisa la pestaña Antecedentes.
            </div>
          )}
          <Tarjeta titulo="Datos generales del expediente">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Paciente</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">{[perfil?.nombres, perfil?.apellidos].filter(Boolean).join(" ") || "No registrado"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">DNI</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">{perfil?.dni || "No registrado"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fecha de nacimiento</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">{formatoFecha(perfil?.fecha_nacimiento)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Última confirmación de antecedentes</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">{formatoFecha(consentimiento?.aceptado_en)}</dd>
              </div>
            </dl>
          </Tarjeta>
          <Tarjeta titulo="Información clínica" descripcion="Los antecedentes que declares se comparten con el odontólogo en tu misma ficha clínica.">
            <p className="text-sm leading-relaxed text-slate-600">
              La información registrada por el odontólogo, como diagnósticos y procedimientos, es de solo lectura. Tus declaraciones no modifican sus notas profesionales.
            </p>
          </Tarjeta>
        </div>
      )}

      {pestana === "antecedentes" && (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 via-white to-cyan-50 shadow-lg shadow-teal-900/10 ring-4 ring-teal-100/70">
            <div className="flex items-start gap-4 border-b border-teal-200 bg-gradient-to-r from-teal-100 to-cyan-100 px-5 py-4 sm:px-6">
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl text-teal-700 shadow-sm">✓</span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-teal-800">Acción requerida</p>
                <h3 className="mt-1 text-lg font-extrabold text-teal-950">Confirma tus antecedentes</h3>
                <p className="mt-1 text-xs leading-relaxed text-teal-900">Revisa la información de tu expediente y deja constancia de que la leíste.</p>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {consentimiento?.aceptado ? (
                <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                  Consentimiento registrado: confirmaste que leíste tus antecedentes y declaras que son veraces el {formatoFecha(consentimiento.aceptado_en)}.
                </p>
              ) : (
                <form onSubmit={otorgarConsentimiento} className="space-y-4">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-teal-200 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm transition hover:border-teal-400">
                    <input required type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-teal-600" />
                    <span>Confirmo que he leído los antecedentes clínicos que aparecen aquí y declaro que la información que consta es veraz según mi conocimiento.</span>
                  </label>
                  {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                  {mensaje && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</p>}
                  <button disabled={guardando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#087f81] to-[#11B9BB] px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-teal-900/20 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:opacity-60">
                    {guardando ? "Registrando..." : "Confirmar y dar consentimiento"}
                  </button>
                </form>
              )}
            </div>
          </section>
          <Tarjeta titulo="Antecedentes clínicos" descripcion="Información de tu ficha clínica, disponible también para el odontólogo que te atiende.">
            <div className="space-y-4">
              <p className="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-950">
                Estos antecedentes son de solo lectura. Si observas un dato incorrecto o incompleto, comunícate con la clínica para que el personal autorizado revise y actualice tu ficha.
              </p>
              {CAMPOS_ANTECEDENTES.map(([campo, label]) => (
                <div key={campo} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <h4 className="text-xs font-bold text-slate-600">{label}</h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{formatoTexto(datos.antecedentes?.[campo])}</p>
                </div>
              ))}
            </div>
          </Tarjeta>
          <Tarjeta titulo="Historial del expediente" descripcion="Registro de las confirmaciones realizadas.">
            {datos.historialAntecedentes?.length ? (
              <ol className="space-y-3">
                {datos.historialAntecedentes.map((cambio) => (
                  <li key={cambio.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-700">Confirmado el {formatoFecha(cambio.confirmado_en)}</p>
                    {cambio.campos_modificados?.length ? (
                      <ul className="mt-2 space-y-2 text-xs text-slate-600">
                        {cambio.campos_modificados.map((campo) => (
                          <li key={campo}>
                            <span className="font-bold">{ETIQUETAS_CAMPO[campo] || campo}:</span>{" "}
                            {formatoTexto(cambio.antes?.[campo])} → {formatoTexto(cambio.despues?.[campo])}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-1 text-xs text-slate-500">Confirmaste tus antecedentes sin cambios.</p>}
                  </li>
                ))}
              </ol>
            ) : <Vacio>Aún no hay confirmaciones registradas.</Vacio>}
          </Tarjeta>
        </div>
      )}

      {pestana === "clinica" && (
        <div className="space-y-5">
        <Tarjeta titulo="Atenciones odontológicas" descripcion="Solo se muestran datos clínicos registrados por la clínica y la evolución autorizada para tu consulta.">
          {datos.atenciones?.length ? (
            <div className="space-y-3">
              {datos.atenciones.map((atencion) => (
                <article key={atencion.id} className="rounded-xl border border-slate-100 p-4">
                  <p className="font-bold text-slate-800">{formatoFecha(atencion.fecha)} · {atencion.motivo || "Motivo no registrado"}</p>
                  <p className="mt-1 text-xs text-slate-500">Odontólogo: {atencion.odontologo || "No registrado"}</p>
                  {(atencion.diagnosticos?.length > 0 || atencion.diagnosticoHistorico) && (
                    <p className="mt-3 text-sm text-slate-700"><span className="font-semibold">Diagnósticos: </span>{atencion.diagnosticos?.map((item) => `${item.descripcion}${item.pieza ? ` (pieza ${item.pieza})` : ""}`).join("; ") || atencion.diagnosticoHistorico}</p>
                  )}
                  {(atencion.procedimientos?.length > 0 || atencion.procedimientoHistorico) && (
                    <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Procedimientos: </span>{atencion.procedimientos?.map((item) => `${item.descripcion}${item.pieza ? ` (pieza ${item.pieza})` : ""}`).join("; ") || atencion.procedimientoHistorico}</p>
                  )}
                  {atencion.evolucion && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700"><span className="font-semibold">Evolución autorizada: </span>{atencion.evolucion}</p>}
                  {atencion.indicaciones && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700"><span className="font-semibold">Indicaciones: </span>{atencion.indicaciones}</p>}
                </article>
              ))}
            </div>
          ) : <Vacio>Aún no tienes atenciones registradas.</Vacio>}
        </Tarjeta>

        <Tarjeta titulo="Planes de tratamiento" descripcion="Consulta los planes asignados, su estado y los procedimientos registrados.">
          {datos.tratamientos?.length ? (
            <div className="space-y-3">
              {datos.tratamientos.map((tratamiento) => (
                <article key={tratamiento.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800">{tratamiento.titulo}</h4>
                      <p className="mt-1 text-sm text-slate-600">{tratamiento.descripcion}</p>
                    </div>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold capitalize text-cyan-800">{tratamiento.estado}</span>
                  </div>
                  {tratamiento.diagnostico && <p className="mt-2 text-xs text-slate-500">Diagnóstico asociado: {tratamiento.diagnostico}</p>}
                  {tratamiento.indicaciones && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700"><span className="font-semibold">Indicaciones: </span>{tratamiento.indicaciones}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    {tratamiento.fechaInicio ? `Inicio: ${formatoFecha(tratamiento.fechaInicio)} · ` : ""}
                    {tratamiento.fechaPrevista ? `Fecha prevista: ${formatoFecha(tratamiento.fechaPrevista)}` : ""}
                    {tratamiento.fechaFin ? ` · Finalizado: ${formatoFecha(tratamiento.fechaFin)}` : ""}
                  </p>
                  {tratamiento.procedimientos?.length > 0 && (
                    <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-600">
                      {tratamiento.procedimientos.map((procedimiento) => <li key={procedimiento.id}>{procedimiento.descripcion} · {formatoFecha(procedimiento.fecha)}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          ) : <Vacio>Aún no tienes tratamientos registrados.</Vacio>}
        </Tarjeta>
        </div>
      )}

      {pestana === "documentos" && (
        <Tarjeta titulo="Documentos disponibles" descripcion="Solo puedes abrir o descargar los documentos que la clínica autorizó para ti.">
          {documentos.length ? (
            <ul className="divide-y divide-slate-100">
              {documentos.map((documento) => (
                <li key={documento.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{documento.nombre}</p>
                    <p className="text-xs text-slate-500">{documento.tipo} · {formatoFecha(documento.fecha_documento || documento.creado_en)}</p>
                    {documento.descripcion && <p className="mt-1 text-xs text-slate-600">{documento.descripcion}</p>}
                  </div>
                  <button type="button" onClick={() => onAbrirDocumento(documento)} className="rounded-lg border border-cyan-200 px-3 py-2 text-xs font-bold text-[#0e999b] hover:bg-cyan-50">Descargar</button>
                </li>
              ))}
            </ul>
          ) : <Vacio>Aún no tienes documentos disponibles.</Vacio>}
        </Tarjeta>
      )}
    </div>
  );
}
