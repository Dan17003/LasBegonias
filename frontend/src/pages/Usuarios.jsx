import { useState } from "react";

export default function Usuarios() {
  const [showModal, setShowModal] = useState(false);
  
  // Listado de usuarios inicializado con los datos de tu vista
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "Laura Benavides", correo: "l.benavides@begonias.com", rol: "Recepcionista", activo: true },
    { id: 2, nombre: "Carlos Alva", correo: "c.alva@begonias.com", rol: "Admin", activo: true },
    { id: 3, nombre: "Sonia Espinoza", correo: "s.espinoza@begonias.com", rol: "Recepcionista", activo: false }
  ]);

  // Estado para el formulario de nuevo usuario
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    correo: "",
    rol: "Recepcionista"
  });

  // Alternar el estado de acceso (Permitido / Bloqueado) en tiempo real
  const toggleEstado = (id) => {
    setUsuarios(usuarios.map(u => u.id === id ? { ...u, activo: !u.activo } : u));
  };

  // Agregar un usuario a la tabla de manera interactiva
  const registrarUsuario = (e) => {
    e.preventDefault();
    if (!nuevoUsuario.nombre || !nuevoUsuario.correo) return;

    setUsuarios([
      ...usuarios,
      { id: usuarios.length + 1, ...nuevoUsuario, activo: true }
    ]);

    // Resetear formulario y cerrar modal
    setNuevoUsuario({ nombre: "", correo: "", rol: "Recepcionista" });
    setShowModal(false);
  };

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
      
      {/* HEADER DE GESTIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔑</span>
            <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Control de credenciales, asignación de roles y revocación de permisos del sistema.</p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <span className="text-sm">+</span> Crear Nuevo Usuario
        </button>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Usuario / Colaborador</th>
                <th className="py-4 px-6">Correo Electrónico</th>
                <th className="py-4 px-6">Rol de Sistema</th>
                <th className="py-4 px-6">Estado de Acceso</th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {usuarios.map((usuario) => {
                // Obtener inicial para el avatar
                const inicial = usuario.nombre.charAt(0);
                
                return (
                  <tr key={usuario.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Columna Usuario */}
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-50 text-[#11B9BB] font-bold text-xs flex items-center justify-center border border-cyan-100">
                        {inicial}
                      </div>
                      <span className="font-bold text-slate-800">{usuario.nombre}</span>
                    </td>

                    {/* Columna Correo */}
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {usuario.correo}
                    </td>

                    {/* Columna Rol */}
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${
                        usuario.rol === "Admin" 
                          ? "bg-purple-50 text-purple-600 border border-purple-100" 
                          : "bg-cyan-50 text-cyan-600 border border-cyan-100"
                      }`}>
                        {usuario.rol}
                      </span>
                    </td>

                    {/* Columna Estado */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${usuario.activo ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                        <span className={`text-xs font-bold ${usuario.activo ? "text-emerald-600" : "text-rose-600"}`}>
                          {usuario.activo ? "Permitido" : "Bloqueado"}
                        </span>
                      </div>
                    </td>

                    {/* Columna Acciones */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => toggleEstado(usuario.id)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition border ${
                          usuario.activo 
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100" 
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100"
                        }`}
                      >
                        {usuario.activo ? "Suspender" : "Dar Alta"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREAR NUEVO USUARIO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form onSubmit={registrarUsuario} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-4">Registrar Nuevo Colaborador</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Laura Benavides"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={nuevoUsuario.nombre}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  required
                  placeholder="ejemplo@begonias.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={nuevoUsuario.correo}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, correo: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Rol de Acceso</label>
                <select 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                  value={nuevoUsuario.rol}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                >
                  <option value="Recepcionista">Recepcionista</option>
                  <option value="Admin">Administrador (Admin)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm"
              >
                Guardar Usuario
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}