import { useState } from "react";
import api from "../services/api";

const ESTADOS_SOLICITUD = new Set(["Solicitud de cita", "Solicitud de reprogramación"]);

const formatearFecha = (fecha) => {
  const valor = new Date(`${String(fecha).slice(0, 10)}T12:00:00`);
  return Number.isNaN(valor.getTime())
    ? String(fecha).slice(0, 10)
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(valor);
};

export default function SolicitudesCitasPacientes({ citas, onApproved, compact = false }) {
  const [aprobandoCitaId, setAprobandoCitaId] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const pendientes = citas
    .filter((cita) => ESTADOS_SOLICITUD.has(cita.estado))
    .sort((a, b) => `${a.fecha}-${a.hora_inicio}`.localeCompare(`${b.fecha}-${b.hora_inicio}`));

  const aprobarSolicitud = async (cita) => {
    setAprobandoCitaId(cita.id);
    setMensaje("");
    setError("");
    try {
      const { data } = await api.post(`/citas/${cita.id}/aprobar`);
      setMensaje(data.mensaje);
      await onApproved();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudo aprobar la solicitud.");
    } finally {
      setAprobandoCitaId(null);
    }
  };

  return (
    <section className={`rounded-2xl border border-amber-200 bg-amber-50/60 shadow-sm ${compact ? "p-3" : "p-5"}`}>
      {!compact && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800">Solicitudes de pacientes</h3>
            <p className="mt-1 text-xs text-slate-600">Revisa y confirma las solicitudes pendientes. El paciente recibirá una notificación en su portal.</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{pendientes.length} pendiente(s)</span>
        </div>
      )}

      {mensaje && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{mensaje}</p>}
      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      {pendientes.length === 0 ? (
        <p className="rounded-xl bg-white/80 p-4 text-center text-sm text-slate-500">No hay solicitudes pendientes.</p>
      ) : (
        <div className={compact ? "space-y-2" : "space-y-3"}>
          {pendientes.map((cita) => (
            <article key={cita.id} className={`flex flex-wrap items-center justify-between rounded-xl border border-amber-100 bg-white ${compact ? "gap-2 p-3" : "gap-4 p-4"}`}>
              <div>
                <p className="font-semibold text-slate-800">{cita.Paciente?.nombres} {cita.Paciente?.apellidos}</p>
                <p className="mt-1 text-sm text-slate-600">{cita.motivo} · {cita.doctor}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {formatearFecha(cita.fecha)} · {String(cita.hora_inicio).slice(0, 5)} · {cita.estado}
                </p>
              </div>
              <button
                type="button"
                disabled={aprobandoCitaId === cita.id}
                onClick={() => aprobarSolicitud(cita)}
                className={`rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 ${compact ? "px-3 py-2 text-[11px]" : "px-4 py-2.5 text-xs"}`}
              >
                {aprobandoCitaId === cita.id ? "Confirmando..." : "Aprobar y confirmar"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
