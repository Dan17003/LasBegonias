import { useEffect, useState } from "react";
import api from "../services/api";
import {
  getDeudaPaciente,
  contarPresupuestosPendientes,
  formatearMoneda,
} from "../utils/finanzas";
import {
  getResumenCitas,
  formatearFechaCorta,
  textoRelativoPasado,
} from "../utils/citas";

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState("Todos");

  const [form, setForm] = useState({
    dni: "",
    nombres: "",
    apellidos: "",
    telefono: "",
    email: "",
    fecha_nacimiento: "",
    sexo: "",
  });

  const obtenerPacientes = async () => {
    const res = await api.get("/pacientes");
    setPacientes(res.data);
  };

  const cargarDatos = async () => {
    try {
      const [pacientesRes, citasRes, presupuestosRes, pagosRes] = await Promise.all([
        api.get("/pacientes"),
        api.get("/citas"),
        api.get("/presupuestos"),
        api.get("/pagos"),
      ]);

      setPacientes(pacientesRes.data || []);
      setCitas(citasRes.data || []);
      setPresupuestos(presupuestosRes.data || []);
      setPagos(pagosRes.data || []);
    } catch (error) {
      console.error(error);
      await obtenerPacientes();
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const getDeuda = (pacienteId) =>
    getDeudaPaciente(presupuestos, pagos, pacienteId);

  const pacientesFiltrados = pacientes.filter((paciente) => {
    const deuda = getDeuda(paciente.id);

    if (filtroActivo === "Con deuda") {
      return deuda > 0;
    }

    if (filtroActivo === "Sin deuda") {
      return deuda === 0;
    }

    return true;
  });

  const verPaciente = (paciente) => {
    alert(`
    Paciente: ${paciente.nombres} ${paciente.apellidos || ""}
    DNI: ${paciente.dni}
    Teléfono: ${paciente.telefono}
    Correo: ${paciente.email || "No registrado"}
    Fecha Nacimiento: ${paciente.fecha_nacimiento || "No registrada"
          }
    Sexo: ${paciente.sexo || "No registrado"}
    `);
  };

  const editarPaciente = (paciente) => {
    const nuevoNombre = prompt(
      "Editar nombre del paciente:",
      paciente.nombres
    );

    if (!nuevoNombre) return;

    setPacientes((prev) =>
      prev.map((p) =>
        p.id === paciente.id
          ? { ...p, nombres: nuevoNombre }
          : p
      )
    );
  };

  const eliminarPaciente = async (id) => {
    const confirmar = window.confirm(
      "¿Deseas eliminar este paciente?"
    );

    if (!confirmar) return;

    try {
      await api.delete(`/pacientes/${id}`);

      setPacientes((prev) =>
        prev.filter((p) => p.id !== id)
      );
    } catch (error) {
      console.error(error);

      setPacientes((prev) =>
        prev.filter((p) => p.id !== id)
      );
    }
  };

  const crearPaciente = async () => {
    if (
      !form.dni ||
      !form.nombres ||
      !form.apellidos ||
      !form.telefono ||
      !form.email
    ) {
      alert("Complete todos los campos obligatorios");
      return;
    }

    await api.post("/pacientes", form);

    setShowModal(false);

    setForm({
      dni: "",
      nombres: "",
      apellidos: "",
      telefono: "",
      email: "",
      fecha_nacimiento: "",
      sexo: "",
    });

    cargarDatos();
  };


  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-800">Pacientes</h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-64 hidden md:block">
            <input
              type="text"
              placeholder="Buscar paciente..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#11B9BB]"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>
          <button className="p-2 border border-slate-200 rounded-xl bg-white text-slate-400 hover:text-slate-600 hidden md:block">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
          >
            Nuevo Paciente
          </button>
        </div>
      </div>

      {/* PESTAÑAS DE FILTRADO */}
      <div className="flex gap-2 mb-6 text-xs font-medium overflow-x-auto pb-1">
        {[
          { label: "Todos", count: pacientes.length },
          {
            label: "Con deuda",
            count: pacientes.filter((paciente) => getDeuda(paciente.id) > 0).length,
          },
          {
            label: "Sin deuda",
            count: pacientes.filter((paciente) => getDeuda(paciente.id) === 0).length,
          },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => setFiltroActivo(tab.label)}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition whitespace-nowrap ${filtroActivo === tab.label
              ? "bg-[#11B9BB] text-white font-bold"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${filtroActivo === tab.label
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-600"
                }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>



      {/* TABLA DE PACIENTES */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Paciente</th>
                <th className="py-4 px-6">Contacto</th>
                <th className="py-4 px-6">Última cita</th>
                <th className="py-4 px-6">Próxima cita</th>
                <th className="py-4 px-6">Deuda</th>
                <th className="py-4 px-6">Acciones</th>
              </tr>
            </thead>

            <tbody className="text-sm divide-y divide-slate-50">
              {pacientesFiltrados.map((p) => {
                const { ultima, proxima } = getResumenCitas(citas, p.id);
                const deuda = getDeuda(p.id);
                const presupuestosPendientes = contarPresupuestosPendientes(
                  presupuestos,
                  pagos,
                  p.id
                );

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center text-sm font-bold text-[#11B9BB] overflow-hidden">
                          {p.nombres ? p.nombres.charAt(0).toUpperCase() : "P"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{p.nombres} {p.apellidos || ""}</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">DNI: {p.dni || "--------"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="text-xs space-y-0.5">
                        <p className="text-slate-700 font-medium flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {p.telefono || "Sin teléfono"}
                        </p>
                        <p className="text-slate-400 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {p.email || "Sin correo registrado"}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div>
                        {ultima ? (
                          <>
                            <p className="text-xs font-semibold text-slate-700">
                              {textoRelativoPasado(ultima.fecha)}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatearFechaCorta(ultima.fecha)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-400">Sin cita previa</p>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div>
                        {proxima ? (
                          <>
                            <p className="text-xs font-semibold text-[#11B9BB]">
                              {formatearFechaCorta(proxima.fecha)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {proxima.estado || "Programada"}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-400">Sin cita programada</p>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div>
                        <p className={`text-xs font-bold ${deuda > 0 ? "text-rose-600" : "text-slate-700"}`}>
                          {formatearMoneda(deuda)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {presupuestosPendientes > 0
                            ? `${presupuestosPendientes} presupuesto${presupuestosPendientes > 1 ? "s" : ""} pendiente${presupuestosPendientes > 1 ? "s" : ""}`
                            : "Sin deuda"}
                        </p>
                      </div>
                    </td>

                    { }
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-3 text-slate-400 opacity-60 group-hover:opacity-100 transition">
                        <button className="hover:text-[#11B9BB] transition p-0.5" title="Ver ficha">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="hover:text-[#11B9BB] transition p-0.5" title="Agendar cita">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button className="hover:text-slate-700 transition p-0.5" title="Opciones">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA AGREGAR PACIENTE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#11B9BB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Registrar Nuevo Paciente
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">DNI</label>
                <input
                  placeholder="Ej: 74839201"
                  type="text"
                  maxLength={8}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#11B9BB] text-sm text-slate-800"
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nombres</label>
                <input
                  placeholder="Ej: Patricia Jones"
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#11B9BB] text-sm text-slate-800"
                  value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Apellidos
                </label>

                <input
                  type="text"
                  placeholder="Ej: Pérez Gómez"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  value={form.apellidos}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      apellidos: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Teléfono</label>
                <input
                  placeholder="Ej: 987654321"
                  type="tel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#11B9BB] text-sm text-slate-800"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="correo@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  value={form.fecha_nacimiento}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fecha_nacimiento: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Sexo
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  value={form.sexo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sexo: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>

            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl">
                Cancelar
              </button>
              <button onClick={crearPaciente} className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm">
                Guardar Registro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
