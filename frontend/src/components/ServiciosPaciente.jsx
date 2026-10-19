/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import api from "../services/api";

const soles = (monto) => `S/ ${Number(monto || 0).toFixed(2)}`;

export default function ServiciosPaciente({ pacienteId, citas = [] }) {
  const [catalogo, setCatalogo] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [servicioId, setServicioId] = useState("");
  const [citaId, setCitaId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [comentario, setComentario] = useState("");
  const [nombrePersonalizado, setNombrePersonalizado] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const [serviciosRespuesta, solicitudesRespuesta] = await Promise.all([
        api.get("/servicios"),
        api.get(`/historia/pacientes/${pacienteId}/servicios-solicitados`),
      ]);
      setCatalogo(serviciosRespuesta.data || []);
      setSolicitudes(solicitudesRespuesta.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudieron cargar los servicios.");
    }
  };

  useEffect(() => { cargar(); }, [pacienteId]);

  const agregar = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");
    const personalizado = servicioId === "custom";
    const servicio = catalogo.find((item) => String(item.id) === servicioId);
    if ((!servicio && !personalizado) || (personalizado && !nombrePersonalizado.trim())) {
      setError("Selecciona un servicio o escribe el nombre del servicio solicitado.");
      return;
    }

    setGuardando(true);
    try {
      const { data } = await api.post(`/historia/pacientes/${pacienteId}/servicios-solicitados`, {
        servicio_id: servicio?.id || null,
        cita_id: citaId || null,
        nombre: personalizado ? nombrePersonalizado.trim() : servicio.nombre,
        cantidad: Number(cantidad),
        comentario: comentario.trim(),
      });
      setSolicitudes((actuales) => [data, ...actuales]);
      setServicioId("");
      setCitaId("");
      setCantidad(1);
      setComentario("");
      setNombrePersonalizado("");
      setMensaje("Servicio enviado a Recepción para preparar el presupuesto.");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo agregar el servicio.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (solicitudId) => {
    try {
      await api.delete(`/historia/pacientes/${pacienteId}/servicios-solicitados/${solicitudId}`);
      setSolicitudes((actuales) => actuales.filter((item) => item.id !== solicitudId));
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo retirar la solicitud.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-white p-5">
        <h3 className="text-base font-bold text-slate-800">Servicios indicados</h3>
        <p className="mt-1 text-sm text-slate-500">
          Agrega los servicios que requiere el paciente. Recepción recibirá esta lista y preparará el presupuesto; el precio final puede ajustarse allí.
        </p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {mensaje && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</div>}

      <form onSubmit={agregar} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <label className="mb-3 block text-xs font-bold text-slate-500">
          Cita relacionada
          <select value={citaId} onChange={(event) => setCitaId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800">
            <option value="">Sin cita asociada</option>
            {citas.map((cita) => <option key={cita.id} value={cita.id}>{cita.fecha} {cita.hora_inicio?.slice(0, 5)} · {cita.motivo}</option>)}
          </select>
        </label>
        <p className="mb-3 text-[11px] text-cyan-800">Asocia la cita para que Recepción evite cotizar dos veces el mismo servicio en esta atención.</p>
        {!citaId && <p className="mb-3 text-[11px] text-amber-700">Sin cita asociada, el sistema no puede detectar automáticamente solicitudes duplicadas.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
          <label className="text-xs font-bold text-slate-500">
            Buscar producto o servicio
            <select required value={servicioId} onChange={(event) => setServicioId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800">
              <option value="">Selecciona del catálogo...</option>
              {catalogo.map((servicio) => (
                <option key={servicio.id} value={servicio.id}>
                  {servicio.nombre} · {soles(servicio.precio)}
                </option>
              ))}
              <option value="custom">Otro servicio (especificar)</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            Cantidad
            <input min="1" step="1" type="number" value={cantidad} onChange={(event) => setCantidad(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </label>
        </div>
        {servicioId === "custom" && (
          <label className="mt-3 block text-xs font-bold text-slate-500">
            Servicio no incluido en el catálogo
            <input required value={nombrePersonalizado} onChange={(event) => setNombrePersonalizado(event.target.value)} placeholder="Especifica el servicio para que Recepción lo cotice" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
          </label>
        )}
        <label className="mt-3 block text-xs font-bold text-slate-500">
          Comentario para Recepción
          <textarea rows={2} value={comentario} onChange={(event) => setComentario(event.target.value)} placeholder="Opcional: indicaciones, piezas o detalles relevantes" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
        </label>
        <button disabled={guardando || !cantidad || Number(cantidad) < 1} className="mt-4 rounded-xl bg-[#11B9BB] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">
          {guardando ? "Enviando..." : "Agregar a presupuesto"}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Servicios solicitados</h3>
          <p className="mt-1 text-xs text-slate-400">Los servicios enviados quedan pendientes de revisión por Recepción.</p>
        </div>
        {solicitudes.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">Todavía no se han agregado servicios.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {solicitudes.map((solicitud) => (
              <div key={solicitud.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">{solicitud.nombre || solicitud.servicio_nombre}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Cantidad: {solicitud.cantidad} · Precio referencial: {solicitud.precio_unitario == null ? "Por cotizar" : soles(solicitud.precio_unitario)}
                  </p>
                  {solicitud.Citum && <p className="mt-1 text-xs text-cyan-700">Cita: {solicitud.Citum.fecha} {solicitud.Citum.hora_inicio?.slice(0, 5)}</p>}
                  {solicitud.comentario && <p className="mt-1 text-xs text-slate-500">{solicitud.comentario}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${solicitud.estado === "pendiente" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {solicitud.estado === "pendiente" ? "Pendiente de presupuesto" : "Presupuestado"}
                  </span>
                  {solicitud.estado === "pendiente" && <button type="button" onClick={() => eliminar(solicitud.id)} className="text-xs font-bold text-rose-600">Retirar</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
