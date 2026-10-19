/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const formatearSoles = (monto) => `S/ ${Number(monto || 0).toFixed(2)}`;

export default function FinanzasServicios({ onPresupuestoCreado }) {
  const [vista, setVista] = useState("solicitudes");
  const [solicitudes, setSolicitudes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [modalSolicitud, setModalSolicitud] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [notaInterna, setNotaInterna] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [servicioNuevo, setServicioNuevo] = useState({ nombre: "", categoria: "", subcategoria: "", precio: "" });

  const cargar = async () => {
    try {
      const [solicitudesRespuesta, catalogoRespuesta] = await Promise.all([
        api.get("/presupuestos/solicitudes-clinicas"),
        api.get("/servicios"),
      ]);
      setSolicitudes(solicitudesRespuesta.data || []);
      setCatalogo(catalogoRespuesta.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudieron cargar los servicios y solicitudes.");
    }
  };

  useEffect(() => { cargar(); }, []);

  const solicitudesPendientes = useMemo(
    () => solicitudes.filter((solicitud) => solicitud.estado === "pendiente"),
    [solicitudes]
  );

  const buscar = (event) => {
    const value = event.target.value.toLocaleLowerCase("es-PE");
    setBusqueda(event.target.value);
    setCatalogo((actual) => actual.map((servicio) => ({
      ...servicio,
      _visible: !value || `${servicio.nombre} ${servicio.categoria} ${servicio.subcategoria}`.toLocaleLowerCase("es-PE").includes(value),
    })));
  };

  const abrirPresupuesto = (solicitud) => {
    const delPaciente = solicitudesPendientes.filter(
      (item) => item.paciente_id === solicitud.paciente_id &&
        item.odontologo_id === solicitud.odontologo_id &&
        item.cita_id === solicitud.cita_id
    );
    setModalSolicitud(solicitud);
    setLineas(delPaciente.map((item) => ({
      solicitud_id: item.id,
      nombre: item.nombre,
      cantidad: Number(item.cantidad || 1),
      precio_unitario: item.precio_unitario == null ? "" : Number(item.precio_unitario),
      descuento_pct: 0,
      comentario: item.comentario || "",
    })));
    setTitulo("");
    setNotaInterna("");
    setError("");
  };

  const cerrarPresupuesto = () => {
    setModalSolicitud(null);
    setLineas([]);
  };

  const actualizarLinea = (solicitudId, campo, valor) => {
    setLineas((actuales) => actuales.map((linea) => linea.solicitud_id === solicitudId ? { ...linea, [campo]: valor } : linea));
  };

  const total = useMemo(() => lineas.reduce((suma, linea) => {
    const precio = Number(linea.precio_unitario || 0);
    const cantidad = Number(linea.cantidad || 0);
    const descuento = Number(linea.descuento_pct || 0);
    return suma + precio * cantidad * (1 - descuento / 100);
  }, 0), [lineas]);

  const guardarPresupuesto = async (event) => {
    event.preventDefault();
    if (lineas.some((linea) => !Number.isFinite(Number(linea.precio_unitario)) || Number(linea.precio_unitario) < 0)) {
      setError("Completa un precio unitario válido para cada servicio antes de confirmar.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const { data: presupuesto } = await api.post("/presupuestos/desde-solicitudes", {
        paciente_id: modalSolicitud.paciente_id,
        doctor: modalSolicitud.Odontologo?.nombre || modalSolicitud.doctor || "",
        titulo,
        nota_interna: notaInterna,
        solicitudes: lineas.map((linea) => ({
          solicitud_id: linea.solicitud_id,
          cantidad: Number(linea.cantidad),
          precio_unitario: Number(linea.precio_unitario),
          descuento_pct: Number(linea.descuento_pct || 0),
          comentario: linea.comentario,
        })),
      });
      cerrarPresupuesto();
      await cargar();
      await onPresupuestoCreado?.(presupuesto);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el presupuesto.");
    } finally {
      setGuardando(false);
    }
  };

  const crearServicio = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const { data } = await api.post("/servicios", {
        ...servicioNuevo,
        precio: Number(servicioNuevo.precio),
      });
      setCatalogo((actual) => [data, ...actual]);
      setServicioNuevo({ nombre: "", categoria: "", subcategoria: "", precio: "" });
      setMensaje("Servicio agregado al catálogo.");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el servicio.");
    } finally {
      setGuardando(false);
    }
  };

  const solicitudesPorPaciente = useMemo(() => {
    const agrupadas = new Map();
    solicitudesPendientes.forEach((solicitud) => {
      const paciente = solicitud.Paciente;
      const grupoId = `${solicitud.paciente_id}:${solicitud.odontologo_id}:${solicitud.cita_id || "sin-cita"}`;
      const grupo = agrupadas.get(grupoId) || {
        pacienteId: solicitud.paciente_id,
        pacienteNombre: [paciente?.nombres, paciente?.apellidos].filter(Boolean).join(" ") || `Paciente ${solicitud.paciente_id}`,
        odontologoId: solicitud.odontologo_id,
        odontologoNombre: solicitud.Odontologo?.nombre || "No registrado",
        cita: solicitud.Citum || null,
        solicitudes: [],
      };
      grupo.solicitudes.push(solicitud);
      agrupadas.set(grupoId, grupo);
    });
    return [...agrupadas.values()];
  }, [solicitudesPendientes]);

  return (
    <section className="space-y-5">
      <div className="flex gap-2 rounded-xl bg-slate-50 p-1">
        {[["solicitudes", "Solicitudes clínicas"], ["catalogo", "Configurar servicios"]].map(([id, label]) => (
          <button type="button" key={id} onClick={() => { setVista(id); setError(""); setMensaje(""); }} className={`rounded-lg px-4 py-2 text-xs font-bold ${vista === id ? "bg-white text-cyan-800 shadow-sm" : "text-slate-500"}`}>
            {label}
          </button>
        ))}
      </div>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {mensaje && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</div>}

      {vista === "solicitudes" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Servicios solicitados por Odontología</h3>
            <p className="mt-1 text-xs text-slate-500">Revisa los servicios del paciente, ajusta los importes en el presupuesto y luego registra el cobro.</p>
          </div>
          {solicitudesPorPaciente.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">No hay solicitudes clínicas pendientes de presupuesto.</div>
          ) : solicitudesPorPaciente.map((grupo) => (
            <div key={grupo.pacienteId} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div><p className="font-bold text-slate-800">{grupo.pacienteNombre}</p><p className="text-xs text-slate-400">{grupo.solicitudes.length} servicio(s) · Odontólogo: {grupo.odontologoNombre}{grupo.cita ? ` · Cita ${grupo.cita.fecha} ${grupo.cita.hora_inicio?.slice(0, 5)}` : " · Sin cita asociada"}</p></div>
                <button type="button" onClick={() => abrirPresupuesto(grupo.solicitudes[0])} className="rounded-xl bg-[#11B9BB] px-4 py-2 text-xs font-bold text-white">Crear presupuesto</button>
              </div>
              <div className="divide-y divide-slate-100">
                {grupo.solicitudes.map((solicitud) => <div key={solicitud.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"><div><p className="text-sm font-semibold text-slate-700">{solicitud.nombre}</p>{solicitud.comentario && <p className="text-xs text-slate-400">{solicitud.comentario}</p>}</div><div className="text-right text-xs text-slate-500"><p>Cantidad: {solicitud.cantidad}</p><p>Referencia: {solicitud.precio_unitario == null ? "Por cotizar" : formatearSoles(solicitud.precio_unitario)}</p></div></div>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {vista === "catalogo" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-800">Catálogo de servicios</h3><p className="text-xs text-slate-400">Precios referenciales en soles; se pueden ajustar al cotizar.</p></div><input value={busqueda} onChange={buscar} placeholder="Buscar servicio..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-[#087f81] text-xs text-white"><tr><th className="px-3 py-2">Servicio</th><th className="px-3 py-2">Categoría</th><th className="px-3 py-2 text-right">Monto</th></tr></thead><tbody className="divide-y divide-slate-100">{catalogo.filter((item) => item.activo !== false && item._visible !== false).map((item) => <tr key={item.id}><td className="px-3 py-2 font-medium text-slate-700">{item.nombre}</td><td className="px-3 py-2 text-xs text-slate-500">{item.categoria}{item.subcategoria ? ` · ${item.subcategoria}` : ""}</td><td className="px-3 py-2 text-right font-bold text-cyan-800">{formatearSoles(item.precio)}</td></tr>)}</tbody></table>
            </div>
          </div>
          <form onSubmit={crearServicio} className="h-fit rounded-2xl border border-slate-100 bg-white p-5">
            <h3 className="mb-4 text-base font-bold text-slate-800">Crear nuevo servicio</h3>
            <label className="mb-3 block text-xs font-bold text-slate-500">Nombre<input required value={servicioNuevo.nombre} onChange={(event) => setServicioNuevo({ ...servicioNuevo, nombre: event.target.value })} placeholder="Ej. Limpieza dental" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
            <label className="mb-3 block text-xs font-bold text-slate-500">Categoría<input required value={servicioNuevo.categoria} onChange={(event) => setServicioNuevo({ ...servicioNuevo, categoria: event.target.value })} placeholder="Ej. Consulta" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
            <label className="mb-3 block text-xs font-bold text-slate-500">Sub-categoría<input required value={servicioNuevo.subcategoria} onChange={(event) => setServicioNuevo({ ...servicioNuevo, subcategoria: event.target.value })} placeholder="Ej. General" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
            <label className="mb-4 block text-xs font-bold text-slate-500">Monto (S/)<input required min="0" step="0.01" type="number" value={servicioNuevo.precio} onChange={(event) => setServicioNuevo({ ...servicioNuevo, precio: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
            <button disabled={guardando} className="w-full rounded-xl bg-[#11B9BB] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{guardando ? "Guardando..." : "Crear servicio"}</button>
          </form>
        </div>
      )}

      {modalSolicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
          <form onSubmit={guardarPresupuesto} className="my-6 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-700">Origen: solicitud de Odontología</p><h3 className="mt-1 text-xl font-black text-slate-800">{[modalSolicitud.Paciente?.nombres, modalSolicitud.Paciente?.apellidos].filter(Boolean).join(" ")}</h3><p className="mt-1 text-xs text-slate-500">Odontólogo: {modalSolicitud.Odontologo?.nombre || "No registrado"}{modalSolicitud.Citum ? ` · Cita ${modalSolicitud.Citum.fecha} ${modalSolicitud.Citum.hora_inicio?.slice(0, 5)}` : " · Sin cita asociada"}</p></div><button type="button" onClick={cerrarPresupuesto} className="text-sm font-bold text-slate-400">Cerrar</button></div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[860px] text-left text-xs"><thead className="bg-[#087f81] text-white"><tr><th className="p-3">Servicio</th><th className="p-3">Cant.</th><th className="p-3">Mon.</th><th className="p-3">Precio unit.</th><th className="p-3">Dcto.</th><th className="p-3">Subtotal</th><th className="p-3">Comentario</th><th /></tr></thead><tbody>{lineas.map((linea) => <tr key={linea.solicitud_id} className="border-t border-slate-100"><td className="p-3 font-semibold text-slate-700">{linea.nombre}</td><td className="p-3"><input required min="1" type="number" value={linea.cantidad} onChange={(event) => actualizarLinea(linea.solicitud_id, "cantidad", event.target.value)} className="w-16 rounded border px-2 py-1" /></td><td className="p-3">S/</td><td className="p-3"><input required min="0" step="0.01" type="number" value={linea.precio_unitario} onChange={(event) => actualizarLinea(linea.solicitud_id, "precio_unitario", event.target.value)} className="w-24 rounded border px-2 py-1" /></td><td className="p-3"><div className="flex items-center"><input min="0" max="100" step="0.01" type="number" value={linea.descuento_pct} onChange={(event) => actualizarLinea(linea.solicitud_id, "descuento_pct", event.target.value)} className="w-16 rounded border px-2 py-1" /><span>%</span></div></td><td className="p-3 font-bold">{formatearSoles(Number(linea.precio_unitario || 0) * Number(linea.cantidad || 0) * (1 - Number(linea.descuento_pct || 0) / 100))}</td><td className="p-3"><input value={linea.comentario} onChange={(event) => actualizarLinea(linea.solicitud_id, "comentario", event.target.value)} className="w-36 rounded border px-2 py-1" /></td><td className="p-3"><button type="button" onClick={() => setLineas((actuales) => actuales.filter((item) => item.solicitud_id !== linea.solicitud_id))} className="font-bold text-rose-600">Quitar</button></td></tr>)}</tbody></table>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs font-bold text-slate-500">Título del presupuesto (opcional)<input value={titulo} onChange={(event) => setTitulo(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-500">Doctor responsable<input readOnly value={modalSolicitud.Odontologo?.nombre || modalSolicitud.doctor || ""} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-500">Nota interna (Recepción)<textarea rows={2} value={notaInterna} onChange={(event) => setNotaInterna(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-lg font-black text-slate-800">Total: {formatearSoles(total)}</p><div className="flex gap-2"><button type="button" onClick={cerrarPresupuesto} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button><button disabled={guardando || lineas.length === 0} className="rounded-xl bg-[#11B9BB] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60">{guardando ? "Confirmando..." : "Confirmar presupuesto"}</button></div></div>
          </form>
        </div>
      )}
    </section>
  );
}
