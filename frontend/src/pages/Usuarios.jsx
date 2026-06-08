import { useState, useEffect } from "react";
import api from "../services/api";

const ROL_LABELS = {
  admin: "Admin",
  recepcionista: "Recepcionista",
  odontologo: "Odontólogo",
};

const ROL_STYLES = {
  admin: "bg-purple-50 text-purple-600 border border-purple-100",
  recepcionista: "bg-cyan-50 text-cyan-600 border border-cyan-100",
  odontologo: "bg-amber-50 text-amber-600 border border-amber-100",
};

const normalizarRol = (rol) => (rol || "").toLowerCase();

const FORM_VACIO = {
  nombre: "",
  email: "",
  password: "",
  rol: "recepcionista",
  permisos: [],
  activo: true,
};

const PERMISOS_DEFAULT = {
  admin: ["inicio", "usuarios", "doctores", "reportes"],
  recepcionista: ["inicio", "pacientes", "agenda", "finanzas"],
  odontologo: ["inicio", "agenda"],
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [permisosDisponibles, setPermisosDisponibles] = useState([]);
  const [rolesDisponibles, setRolesDisponibles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [resUsuarios, resPermisos] = await Promise.all([
        api.get("/usuarios"),
        api.get("/usuarios/permisos"),
      ]);
      setUsuarios(resUsuarios.data);
      setPermisosDisponibles(resPermisos.data.permisos);
      setRolesDisponibles(resPermisos.data.roles);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm({ ...FORM_VACIO, permisos: PERMISOS_DEFAULT.recepcionista });
    setError("");
    setShowModal(true);
  };

  const abrirEditar = (usuario) => {
    setEditando(usuario);
    setForm({
      nombre: usuario.nombre || "",
      email: usuario.email,
      password: "",
      rol: normalizarRol(usuario.rol),
      permisos: usuario.permisos || PERMISOS_DEFAULT[normalizarRol(usuario.rol)] || [],
      activo: usuario.activo !== false,
    });
    setError("");
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm(FORM_VACIO);
    setError("");
  };

  const cambiarRol = (rol) => {
    setForm((prev) => ({
      ...prev,
      rol,
      permisos: PERMISOS_DEFAULT[rol] || [],
    }));
  };

  const togglePermiso = (permisoId) => {
    setForm((prev) => ({
      ...prev,
      permisos: prev.permisos.includes(permisoId)
        ? prev.permisos.filter((p) => p !== permisoId)
        : [...prev.permisos, permisoId],
    }));
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.nombre || !form.email) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    if (!editando && !form.password) {
      setError("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    try {
      const payload = {
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
        permisos: form.permisos,
        activo: form.activo,
      };

      if (form.password) payload.password = form.password;

      if (editando) {
        await api.put(`/usuarios/${editando.id}`, payload);
      } else {
        await api.post("/usuarios", payload);
      }

      cerrarModal();
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar el usuario.");
    }
  };

  const toggleEstado = async (usuario) => {
    try {
      await api.put(`/usuarios/${usuario.id}`, { activo: !usuario.activo });
      cargarDatos();
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo cambiar el estado.");
    }
  };

  const eliminarUsuario = async (usuario) => {
    const confirmar = window.confirm(
      `¿Eliminar a ${usuario.nombre || usuario.email}? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      await api.delete(`/usuarios/${usuario.id}`);
      cargarDatos();
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo eliminar el usuario.");
    }
  };

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔑</span>
            <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Control de credenciales, asignación de roles y permisos del sistema.
          </p>
        </div>

        <button
          onClick={abrirCrear}
          className="bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
        >
          <span className="text-sm">+</span> Crear Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {cargando ? (
            <p className="p-8 text-center text-sm text-slate-400">Cargando usuarios...</p>
          ) : usuarios.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No hay usuarios registrados.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Usuario / Colaborador</th>
                  <th className="py-4 px-6">Correo Electrónico</th>
                  <th className="py-4 px-6">Rol de Sistema</th>
                  <th className="py-4 px-6">Permisos</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {usuarios.map((usuario) => {
                  const inicial = (usuario.nombre || usuario.email).charAt(0).toUpperCase();
                  const permisos = usuario.permisos || [];

                  return (
                    <tr key={usuario.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-50 text-[#11B9BB] font-bold text-xs flex items-center justify-center border border-cyan-100">
                            {inicial}
                          </div>
                          <span className="font-bold text-slate-800">
                            {usuario.nombre || "Sin nombre"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-medium">{usuario.email}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${
                            ROL_STYLES[normalizarRol(usuario.rol)] || ROL_STYLES.recepcionista
                          }`}
                        >
                          {ROL_LABELS[normalizarRol(usuario.rol)] || usuario.rol}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs text-slate-500">
                          {permisos.length} módulo{permisos.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              usuario.activo !== false ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          ></span>
                          <span
                            className={`text-xs font-bold ${
                              usuario.activo !== false ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {usuario.activo !== false ? "Permitido" : "Bloqueado"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => abrirEditar(usuario)}
                            className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleEstado(usuario)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition border ${
                              usuario.activo !== false
                                ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100"
                            }`}
                          >
                            {usuario.activo !== false ? "Suspender" : "Dar Alta"}
                          </button>
                          <button
                            onClick={() => eliminarUsuario(usuario)}
                            className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form
            onSubmit={guardarUsuario}
            className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-bold text-slate-800 mb-4">
              {editando ? "Editar Colaborador" : "Registrar Nuevo Colaborador"}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Laura Benavides"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@begonias.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Contraseña {editando && "(dejar vacío para no cambiar)"}
                </label>
                <input
                  type="password"
                  required={!editando}
                  placeholder={editando ? "••••••••" : "Mínimo 6 caracteres"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Rol de Acceso</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                  value={form.rol}
                  onChange={(e) => cambiarRol(e.target.value)}
                >
                  {rolesDisponibles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Permisos del Sistema</label>
                <div className="grid grid-cols-2 gap-2">
                  {permisosDisponibles.map((permiso) => (
                    <label
                      key={permiso.id}
                      className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={form.permisos.includes(permiso.id)}
                        onChange={() => togglePermiso(permiso.id)}
                        className="rounded text-[#11B9BB] focus:ring-[#11B9BB]"
                      />
                      {permiso.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="rounded text-[#11B9BB] focus:ring-[#11B9BB]"
                />
                Acceso permitido al sistema
              </label>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={cerrarModal}
                className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm"
              >
                {editando ? "Guardar Cambios" : "Guardar Usuario"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
