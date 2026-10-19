/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const hoy = new Date().toISOString().slice(0, 10);

const formatearHora = (hora) => (hora ? hora.slice(0, 5) : "Hora pendiente");

export default function InicioOdontologo({ setView }) {
  const nombre = localStorage.getItem("nombre") || "Odontólogo";
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/citas"),
      api.get("/historia/mis-pacientes"),
    ])
      .then(([citasRespuesta, pacientesRespuesta]) => {
        setCitas(citasRespuesta.data || []);
        setPacientes(pacientesRespuesta.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "No se pudo cargar el resumen clínico.");
      });
  }, []);

  const citasDeHoy = useMemo(
    () => citas.filter((cita) => cita.fecha === hoy).sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || "")),
    [citas]
  );

  return (
    <div className="mx-auto w-full max-w-7xl p-8 text-slate-700">
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#087f81] to-[#11B9BB] p-7 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Panel clínico</p>
        <h2 className="mt-2 text-3xl font-black">Bienvenido, {nombre}</h2>
        <p className="mt-2 max-w-xl text-sm text-white/80">
          Consulta tu agenda y continúa la atención clínica de tus pacientes desde un solo lugar.
        </p>
      </div>

      {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Pacientes relacionados", pacientes.length, "Consulta sus fichas e historias clínicas.", "mis-pacientes"],
          ["Citas de hoy", citasDeHoy.length, "Revisa tu agenda del día.", "agenda"],
          ["Citas programadas", citas.length, "Visualiza todas tus citas asignadas.", "agenda"],
        ].map(([titulo, valor, detalle, vista]) => (
          <button
            type="button"
            key={titulo}
            onClick={() => setView(vista)}
            className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{titulo}</p>
            <p className="mt-3 text-3xl font-black text-[#087f81]">{valor}</p>
            <p className="mt-1 text-xs text-slate-500">{detalle}</p>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Agenda de hoy</h3>
            <p className="text-xs text-slate-400">Tus próximas atenciones clínicas.</p>
          </div>
          <button type="button" onClick={() => setView("agenda")} className="text-xs font-bold text-[#087f81] hover:underline">
            Ver agenda completa
          </button>
        </div>

        {citasDeHoy.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">
            No tienes citas programadas para hoy.
          </div>
        ) : (
          <div className="space-y-3">
            {citasDeHoy.slice(0, 5).map((cita) => (
              <div key={cita.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {cita.Paciente?.nombres || "Paciente"} {cita.Paciente?.apellidos || ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{cita.motivo || "Consulta odontológica"}</p>
                </div>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-[#087f81]">
                  {formatearHora(cita.hora_inicio)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
