import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

const formatearFecha = (valor) => {
  if (!valor) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
};

export default function Notificaciones() {
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const panelRef = useRef(null);

  const noLeidas = useMemo(
    () => notificaciones.filter((notificacion) => !notificacion.leida).length,
    [notificaciones]
  );

  const cargarNotificaciones = async () => {
    try {
      setCargando(true);
      const res = await api.get("/notificaciones");
      setNotificaciones(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
    const intervalo = setInterval(cargarNotificaciones, 60000);

    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const cerrarAlClickFuera = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", cerrarAlClickFuera);

    return () => document.removeEventListener("mousedown", cerrarAlClickFuera);
  }, []);

  const marcarTodasLeidas = async () => {
    try {
      await api.put("/notificaciones/leidas/todas");
      setNotificaciones((prev) =>
        prev.map((notificacion) => ({ ...notificacion, leida: true }))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const marcarLeida = async (id) => {
    try {
      await api.put(`/notificaciones/${id}/leida`);
      setNotificaciones((prev) =>
        prev.map((notificacion) =>
          notificacion.id === id ? { ...notificacion, leida: true } : notificacion
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className="relative w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#11B9BB] hover:border-teal-200 shadow-sm flex items-center justify-center transition"
        title="Notificaciones"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-3 w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-slate-100 shadow-xl rounded-2xl z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Notificaciones</h3>
              <p className="text-[11px] text-slate-400">{noLeidas} sin leer</p>
            </div>
            <button
              type="button"
              onClick={marcarTodasLeidas}
              className="text-[11px] font-bold text-[#11B9BB] hover:text-[#0ea5a7]"
            >
              Marcar leidas
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {cargando && notificaciones.length === 0 ? (
              <div className="p-5 text-sm text-slate-400 text-center">Cargando...</div>
            ) : notificaciones.length === 0 ? (
              <div className="p-6 text-sm text-slate-400 text-center">
                No hay notificaciones.
              </div>
            ) : (
              notificaciones.map((notificacion) => (
                <button
                  key={notificacion.id}
                  type="button"
                  onClick={() => marcarLeida(notificacion.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition flex gap-3 ${
                    notificacion.leida ? "bg-white" : "bg-teal-50/40"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      notificacion.leida ? "bg-slate-200" : "bg-[#11B9BB]"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800">
                      {notificacion.titulo}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {notificacion.mensaje}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {formatearFecha(notificacion.creado_en)}
                      {notificacion.enviada_email ? " - Email enviado" : ""}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
