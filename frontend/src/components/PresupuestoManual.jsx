import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const soles = (monto) => `S/ ${Number(monto || 0).toFixed(2)}`;

export default function PresupuestoManual({ onClose, onSaved }) {
  const [pacientes, setPacientes] = useState([]);
  const [odontologos, setOdontologos] = useState([]);
  const [citas, setCitas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [pacienteId, setPacienteId] = useState("");
  const [citaId, setCitaId] = useState("");
  const [doctor, setDoctor] = useState("");
  const [titulo, setTitulo] = useState("");
  const [notaInterna, setNotaInterna] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [items, setItems] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/pacientes"),
      api.get("/odontologos"),
      api.get("/citas"),
      api.get("/servicios"),
    ])
      .then(([pacientesRespuesta, odontologosRespuesta, citasRespuesta, serviciosRespuesta]) => {
        setPacientes(pacientesRespuesta.data || []);
        setOdontologos((odontologosRespuesta.data || []).filter((item) => item.disponible !== false));
        setCitas(citasRespuesta.data || []);
        setCatalogo(serviciosRespuesta.data || []);
      })
      .catch((err) => setError(err.response?.data?.error || "No se pudieron cargar los datos para el presupuesto."));
  }, []);

  const citasDelPaciente = useMemo(
    () => citas.filter((cita) => String(cita.paciente_id) === pacienteId),
    [citas, pacienteId]
  );

  const citaSeleccionada = citasDelPaciente.find((cita) => String(cita.id) === citaId);
  const servicioSeleccionado = catalogo.find((servicio) => String(servicio.id) === servicioId);

  const cambiarPaciente = (value) => {
    setPacienteId(value);
    setCitaId("");
    setDoctor("");
  };

  const cambiarCita = (value) => {
    setCitaId(value);
    const cita = citasDelPaciente.find((item) => String(item.id) === value);
    setDoctor(cita?.doctor || "");
  };

  const agregarItem = () => {
    if (!servicioSeleccionado || Number(cantidad) < 1) return;
    setItems((actuales) => {
      const existente = actuales.find((item) => item.service_id === servicioSeleccionado.id);
      if (existente) {
        return actuales.map((item) => item.key === existente.key
          ? { ...item, cantidad: Number(item.cantidad) + Number(cantidad) }
          : item);
      }
      return [...actuales, {
      key: `${servicioSeleccionado.id}-${Date.now()}`,
      service_id: servicioSeleccionado.id,
      nombre: servicioSeleccionado.nombre,
      cantidad: Number(cantidad),
      precio_unitario: Number(servicioSeleccionado.precio),
      descuento_pct: 0,
      comentario: "",
      }];
    });
    setServicioId("");
    setCantidad(1);
  };

  const editarItem = (key, campo, valor) => {
    setItems((actuales) => actuales.map((item) => item.key === key ? { ...item, [campo]: valor } : item));
  };

  const total = useMemo(() => items.reduce((suma, item) => {
    const bruto = Number(item.cantidad || 0) * Number(item.precio_unitario || 0);
    return suma + bruto * (1 - Number(item.descuento_pct || 0) / 100);
  }, 0), [items]);

  const guardar = async (event) => {
    event.preventDefault();
    if (!pacienteId || !doctor || items.length === 0) {
      setError("Selecciona paciente, odontólogo y agrega al menos un servicio.");
      return;
    }
    setError("");
    setGuardando(true);
    try {
      const { data: presupuesto } = await api.post("/presupuestos/con-items", {
        paciente_id: Number(pacienteId),
        cita_id: citaId ? Number(citaId) : null,
        doctor,
        titulo,
        nota_interna: notaInterna,
        items: items.map((item) => ({
          service_id: item.service_id,
          nombre: item.nombre,
          cantidad: Number(item.cantidad),
          precio_unitario: Number(item.precio_unitario),
          descuento_pct: Number(item.descuento_pct || 0),
          comentario: item.comentario,
        })),
      });
      await onSaved?.(presupuesto);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el presupuesto.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
      <form onSubmit={guardar} className="my-6 max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">Origen: Recepción</p>
            <h3 className="mt-1 text-xl font-black text-slate-800">Crear presupuesto</h3>
            <p className="mt-1 text-xs text-slate-500">Para primera consulta u otro servicio iniciado directamente por Recepción.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-bold text-slate-400">Cerrar</button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-500">
            Paciente
            <select required value={pacienteId} onChange={(event) => cambiarPaciente(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
              <option value="">Seleccionar paciente...</option>
              {pacientes.map((paciente) => <option key={paciente.id} value={paciente.id}>{paciente.nombres} {paciente.apellidos || ""} · {paciente.dni || "Sin DNI"}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            Cita relacionada (recomendado)
            <select value={citaId} onChange={(event) => cambiarCita(event.target.value)} disabled={!pacienteId} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal disabled:bg-slate-50">
              <option value="">Sin cita asociada</option>
              {citasDelPaciente.map((cita) => <option key={cita.id} value={cita.id}>{cita.fecha} {cita.hora_inicio?.slice(0, 5)} · {cita.motivo}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            Doctor responsable
            <select required disabled={Boolean(citaId)} value={doctor} onChange={(event) => setDoctor(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal disabled:bg-slate-50">
              <option value="">Seleccionar odontólogo...</option>
              {odontologos.map((odontologo) => <option key={odontologo.id} value={odontologo.nombre}>{odontologo.nombre}</option>)}
              {doctor && !odontologos.some((item) => item.nombre === doctor) && <option value={doctor}>{doctor}</option>}
            </select>
          </label>
        </div>
        {citaSeleccionada && <p className="mt-2 text-xs text-emerald-700">Este presupuesto quedará vinculado a la cita seleccionada para prevenir duplicar servicios de esa atención.</p>}
        {!citaSeleccionada && pacienteId && <p className="mt-2 text-xs text-amber-700">Sin cita asociada no se podrá detectar automáticamente si un servicio se solicita otra vez para la misma atención.</p>}

        <div className="mt-5 rounded-xl border border-slate-100 p-4">
          <h4 className="mb-3 text-sm font-bold text-slate-800">Servicios del presupuesto</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_100px_auto]">
            <select value={servicioId} onChange={(event) => setServicioId(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Buscar producto o servicio...</option>
              {catalogo.map((servicio) => <option key={servicio.id} value={servicio.id}>{servicio.nombre} · {soles(servicio.precio)}</option>)}
            </select>
            <input min="1" type="number" value={cantidad} onChange={(event) => setCantidad(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" aria-label="Cantidad" />
            <button type="button" disabled={!servicioSeleccionado || Number(cantidad) < 1} onClick={agregarItem} className="rounded-xl bg-cyan-50 px-4 py-2 text-xs font-bold text-cyan-800 disabled:opacity-50">Agregar</button>
          </div>
          {items.length === 0 ? <p className="py-5 text-center text-sm text-slate-400">Agrega servicios del catálogo para construir el presupuesto.</p> : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-[#087f81] text-white"><tr><th className="p-2">Item</th><th className="p-2">Cant.</th><th className="p-2">Mon.</th><th className="p-2">Precio unit.</th><th className="p-2">Dcto.</th><th className="p-2">Subtotal</th><th className="p-2">Comentario</th><th /></tr></thead>
                <tbody>{items.map((item) => {
                  const subtotal = Number(item.cantidad) * Number(item.precio_unitario) * (1 - Number(item.descuento_pct || 0) / 100);
                  return <tr key={item.key} className="border-t border-slate-100">
                    <td className="p-2 font-semibold text-slate-700">{item.nombre}</td>
                    <td className="p-2"><input min="1" type="number" value={item.cantidad} onChange={(event) => editarItem(item.key, "cantidad", event.target.value)} className="w-14 rounded border px-1.5 py-1" /></td>
                    <td className="p-2">S/</td>
                    <td className="p-2"><input min="0" step="0.01" type="number" value={item.precio_unitario} onChange={(event) => editarItem(item.key, "precio_unitario", event.target.value)} className="w-20 rounded border px-1.5 py-1" /></td>
                    <td className="p-2"><div className="flex items-center"><input min="0" max="99.99" step="0.01" type="number" value={item.descuento_pct} onChange={(event) => editarItem(item.key, "descuento_pct", event.target.value)} className="w-14 rounded border px-1.5 py-1" />%</div></td>
                    <td className="p-2 font-bold">{soles(subtotal)}</td>
                    <td className="p-2"><input value={item.comentario} onChange={(event) => editarItem(item.key, "comentario", event.target.value)} className="w-28 rounded border px-1.5 py-1" /></td>
                    <td className="p-2"><button type="button" onClick={() => setItems((actuales) => actuales.filter((linea) => linea.key !== item.key))} className="font-bold text-rose-600">Quitar</button></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-500">Título del presupuesto (opcional)<input value={titulo} onChange={(event) => setTitulo(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-bold text-slate-500">Nota interna (Recepción)<textarea rows={2} value={notaInterna} onChange={(event) => setNotaInterna(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-lg font-black text-slate-800">Total: {soles(total)}</p>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button><button disabled={guardando || !items.length} className="rounded-xl bg-[#11B9BB] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60">{guardando ? "Guardando..." : "Confirmar presupuesto"}</button></div>
        </div>
      </form>
    </div>
  );
}
