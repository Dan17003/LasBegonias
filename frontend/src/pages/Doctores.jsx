import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { ESPECIALIDADES, TURNOS } from "../constants/odontologo";
import { corregirEncoding } from "../utils/texto";

const FORM_VACIO = {
  usuario_id: "",
  especialidad: ESPECIALIDADES[0],
  turno: TURNOS[0],
  disponible: true,
};

export default function Doctores() {
  const [doctores, setDoctores] = useState([]);
  const [usuariosOdontologos, setUsuariosOdontologos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("todas");

  const cargarDoctores = async () => {
    try {
      setCargando(true);
      const [res, resUsuarios] = await Promise.all([
        api.get("/odontologos"),
        api.get("/usuarios"),
      ]);
      setUsuariosOdontologos((resUsuarios.data || []).filter(
        (usuario) => usuario.rol?.toLowerCase() === "odontologo"
      ));
      setDoctores(
        (res.data || []).map((doc) => ({
          ...doc,
          nombre: corregirEncoding(doc.nombre),
          especialidad: corregirEncoding(doc.especialidad),
          turno: corregirEncoding(doc.turno),
        }))
      );
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los odontólogos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDoctores();
  }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setError("");
    setShowModal(true);
  };

  const abrirEditar = (doc) => {
    setEditando(doc);
    setForm({
      usuario_id: doc.usuario_id || "",
      especialidad: corregirEncoding(doc.especialidad),
      turno: corregirEncoding(doc.turno),
      disponible: doc.disponible !== false,
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

  const guardarDoctor = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.usuario_id) {
      setError("Debes seleccionar primero un usuario con rol odontólogo.");
      return;
    }

    try {
      if (editando) {
        await api.put(`/odontologos/${editando.id}`, form);
      } else {
        await api.post("/odontologos", form);
      }
      cerrarModal();
      cargarDoctores();
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar el odontólogo.");
    }
  };

  const toggleDisponibilidad = async (doc) => {
    try {
      await api.put(`/odontologos/${doc.id}`, { disponible: !doc.disponible });
      cargarDoctores();
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo cambiar la disponibilidad.");
    }
  };

  const eliminarDoctor = async (doc) => {
    const confirmar = window.confirm(
      `¿Eliminar a ${doc.nombre}? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      await api.delete(`/odontologos/${doc.id}`);
      cargarDoctores();
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo eliminar el odontólogo.");
    }
  };

  const doctoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return doctores.filter((doc) => {
      const disponible = doc.disponible !== false;
      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activos" && disponible) ||
        (filtroEstado === "ausentes" && !disponible);
      const coincideEspecialidad =
        filtroEspecialidad === "todas" || doc.especialidad === filtroEspecialidad;
      const coincideBusqueda =
        !termino ||
        doc.nombre.toLowerCase().includes(termino) ||
        doc.especialidad.toLowerCase().includes(termino);

      return coincideEstado && coincideEspecialidad && coincideBusqueda;
    });
  }, [doctores, busqueda, filtroEstado, filtroEspecialidad]);

  const doctoresActivos = doctores.filter((doc) => doc.disponible !== false).length;
  const doctoresAusentes = doctores.length - doctoresActivos;

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
           
            <h2 className="text-2xl font-bold text-slate-800">Control de Doctores</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión del staff odontológico, especialidades y turnos horarios.
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm self-start sm:self-center"
        >
          + Registrar Nuevo Médico
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          ["Odontólogos", doctores.length],
          ["Activos", doctoresActivos],
          ["Ausentes", doctoresAusentes],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Buscar doctor o especialidad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="rounded-2xl border border-white bg-white px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#11B9BB]"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-2xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-[#11B9BB]"
        >
          <option value="todos">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="ausentes">Ausentes</option>
        </select>
        <select
          value={filtroEspecialidad}
          onChange={(e) => setFiltroEspecialidad(e.target.value)}
          className="rounded-2xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-[#11B9BB]"
        >
          <option value="todas">Todas las especialidades</option>
          {ESPECIALIDADES.map((esp) => (
            <option key={esp} value={esp}>{esp}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="text-center text-sm text-slate-400 py-12">Cargando odontólogos...</p>
      ) : doctoresFiltrados.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-12">No hay odontólogos registrados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctoresFiltrados.map((doc) => {
            const partesNombre = doc.nombre.split(" ");
            const inicialAvatar = partesNombre[2]
              ? partesNombre[2].charAt(0)
              : partesNombre[1]
                ? partesNombre[1].charAt(0)
                : "D";

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition duration-200"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 bg-[#11B9BB]/10 text-[#11B9BB] rounded-full flex items-center justify-center font-extrabold text-base border border-[#11B9BB]/20">
                        {inicialAvatar}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{doc.nombre}</h4>
                        <span className="inline-block text-[11px] text-[#11B9BB] font-semibold mt-0.5 bg-cyan-50/50 px-2 py-0.5 rounded-md">
                          {doc.especialidad}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.disponible !== false
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {doc.disponible !== false ? "Activo" : "Ausente"}
                    </span>
                  </div>
                  <p className={`mb-3 text-[10px] font-bold ${doc.usuario_id ? "text-emerald-600" : "text-amber-600"}`}>
                    {doc.usuario_id
                      ? `✓ Acceso vinculado: ${doc.usuario?.email || "cuenta activa"}`
                      : "⚠ Sin usuario vinculado"}
                  </p>

                  <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-100 mb-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Horario de Atención
                    </p>
                    <p className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                      ⏰ {doc.turno}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 flex justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => abrirEditar(doc)}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDisponibilidad(doc)}
                    className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition border ${
                      doc.disponible !== false
                        ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white"
                        : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    {doc.disponible !== false ? "Marcar Ausencia" : "Habilitar Turno"}
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarDoctor(doc)}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form
            onSubmit={guardarDoctor}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100"
          >
            <h3 className="text-base font-bold text-slate-800 mb-4">
              {editando ? "Editar Odontólogo" : "Registrar Odontólogo"}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Usuario odontólogo
                </label>
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={form.usuario_id}
                  onChange={(e) => setForm({ ...form, usuario_id: Number(e.target.value) })}
                >
                  <option value="">Seleccionar usuario</option>
                  {usuariosOdontologos
                    .filter((usuario) => !doctores.some((doc) => doc.usuario_id === usuario.id && doc.id !== editando?.id))
                    .map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre} — {usuario.email}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">
                  La cuenta se crea primero en Usuarios con rol Odontólogo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Especialidad Dental</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                  value={form.especialidad}
                  onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
                >
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Turno Asignado</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                  value={form.turno}
                  onChange={(e) => setForm({ ...form, turno: e.target.value })}
                >
                  {TURNOS.map((turno) => (
                    <option key={turno} value={turno}>
                      {turno}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.disponible}
                  onChange={(e) => setForm({ ...form, disponible: e.target.checked })}
                  className="rounded text-[#11B9BB] focus:ring-[#11B9BB]"
                />
                Disponible para atención
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
                {editando ? "Guardar Cambios" : "Registrar Médico"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
