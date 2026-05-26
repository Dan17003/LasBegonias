import { useEffect, useState } from "react";

export default function Pacientes() {
  // ⚡ Detectamos el rol de la sesión activa en Las Begonias
  const userRol = (localStorage.getItem("rol") || "Recepcionista").toUpperCase();

  // 🚀 DATOS SIMULADOS PARA LA EXPOSICIÓN (Bypass de Base de Datos vacía)
  const [pacientes, setPacientes] = useState([
    { id: 1, dni: "45892014", nombres: "Carlos Mendoza Ruiz", telefono: "984712039", estado: "Activo", deuda: "S/ 0" },
    { id: 2, dni: "70214859", nombres: "Ana María Torres Ramos", telefono: "951236478", estado: "Activo", deuda: "S/ 150.00" },
    { id: 3, dni: "09632514", nombres: "Juan Carlos Quispe Vega", telefono: "963852741", estado: "Inactivo", deuda: "S/ 0" },
    { id: 4, dni: "47158963", nombres: "Milagros Beltrán Prado", telefono: "987123654", estado: "Activo", deuda: "S/ 80.00" },
    { id: 5, dni: "60142589", nombres: "Ricardo Palacios Benítez", telefono: "954128763", estado: "Activo", deuda: "S/ 0" }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState("Todos");
  const [buscar, setBuscar] = useState("");

  const [form, setForm] = useState({
    dni: "",
    nombres: "",
    telefono: "",
  });

  const obtenerPacientes = () => {
    // Aquí no llamamos a la API para evitar errores de red en la exposición
  };

  useEffect(() => {
    obtenerPacientes();
  }, []);

  const crearPaciente = (e) => {
    e.preventDefault();
    if (!form.dni || !form.nombres || !form.telefono) return;
    
    const nuevoPaciente = {
      id: pacientes.length + 1,
      dni: form.dni,
      nombres: form.nombres,
      telefono: form.telefono,
      estado: "Activo",
      deuda: "S/ 0"
    };

    setPacientes([nuevoPaciente, ...pacientes]);
    setShowModal(false);
    setForm({ dni: "", nombres: "", telefono: "" });
  };

  // ⚡ Lógica para eliminar registro (Exclusivo para el Administrador)
  const eliminarPaciente = (id) => {
    if (window.confirm("¿Está seguro de eliminar permanentemente a este paciente del archivo clínico?")) {
      setPacientes(pacientes.filter(p => p.id !== id));
    }
  };

  // 📝 Lógica de filtrado y búsqueda en tiempo real
  const pacientesFiltrados = pacientes.filter(p => {
    const coincideBusqueda = p.nombres.toLowerCase().includes(buscar.toLowerCase()) || p.dni.includes(buscar);
    
    if (filtroActivo === "Activos") return coincideBusqueda && p.estado === "Activo";
    if (filtroActivo === "Inactivos") return coincideBusqueda && p.estado === "Inactivo";
    if (filtroActivo === "Con deuda") return coincideBusqueda && p.deuda !== "S/ 0";
    return coincideBusqueda;
  });

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-800">Archivo de Pacientes</h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-64 block">
            <input 
              type="text" 
              placeholder="Buscar por nombre o DNI..." 
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#11B9BB]"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>
          
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
          { label: "Activos", count: pacientes.filter(p => p.estado === "Activo").length },
          { label: "Inactivos", count: pacientes.filter(p => p.estado === "Inactivo").length },
          { label: "Con deuda", count: pacientes.filter(p => p.deuda !== "S/ 0").length }
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => setFiltroActivo(tab.label)}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
              filtroActivo === tab.label
                ? "bg-[#11B9BB] text-white font-bold shadow-xs"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200/70"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              filtroActivo === tab.label ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
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
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6">Deuda</th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="text-sm divide-y divide-slate-50">
              {pacientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                    No se encontraron pacientes para este filtro.
                  </td>
                </tr>
              ) : (
                pacientesFiltrados.map((p, index) => {
                  const esPar = index % 2 === 0;
                  const ultimaCitaSimulada = esPar ? "En 3 días" : "Hace 6 días";
                  const fechaCitaSimulada = esPar ? "18 may 2026" : "12 may 2026";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center text-sm font-bold text-[#11B9BB] overflow-hidden">
                            {p.nombres ? p.nombres.charAt(0).toUpperCase() : "P"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-tight">{p.nombres}</p>
                            <p className="text-xs text-slate-400 mt-0.5 font-mono">DNI: {p.dni}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="text-xs space-y-0.5">
                          <p className="text-slate-700 font-medium flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {p.telefono}
                          </p>
                          <p className="text-slate-400 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {`${p.nombres.toLowerCase().replace(/\s+/g, '')}@email.com`}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{ultimaCitaSimulada}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{fechaCitaSimulada}</p>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.estado === "Activo"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-slate-100 text-slate-400"
                        }`}>
                          {p.estado}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div>
                          <p className={`text-xs font-bold ${p.deuda !== "S/ 0" ? "text-rose-600" : "text-slate-700"}`}>
                            {p.deuda}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {p.deuda !== "S/ 0" ? "Factura pendiente" : "Sin deuda"}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-3">
                          {/* ⚡ Si es ADMIN ve la papelera de reciclaje / eliminar, sino solo el ojo de visualización */}
                          {userRol === "ADMIN" ? (
                            <button 
                              onClick={() => eliminarPaciente(p.id)}
                              className="text-rose-500 hover:text-rose-700 transition p-1 bg-rose-50 rounded-lg border border-rose-100 text-xs font-bold px-2.5"
                              title="Eliminar del sistema"
                            >
                              Eliminar
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium italic bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              Lectura
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA AGREGAR PACIENTE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form onSubmit={crearPaciente} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#11B9BB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Registrar Nuevo Paciente
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">DNI</label>
                <input
                  placeholder="Ej: 74839201"
                  type="text"
                  required
                  maxLength={8}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#11B9BB] text-sm text-slate-800"
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nombres y Apellidos</label>
                <input
                  placeholder="Ej: Patricia Jones"
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#11B9BB] text-sm text-slate-800"
                  value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Teléfono</label>
                <input
                  placeholder="Ej: 987654321"
                  type="tel"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#11B9BB] text-sm text-slate-800"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl">
                Cancelar
              </button>
              <button type="submit" className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm">
                Guardar Registro
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}