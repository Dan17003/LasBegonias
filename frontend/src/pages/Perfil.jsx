import { useEffect, useState } from "react";
import api from "../services/api";
import { ESPECIALIDADES, TURNOS } from "../constants/odontologo";

const FORM_INICIAL = {
  nombre: "", email: "", especialidad: "", turno: "", telefono: "",
  colegiatura: "", descripcion: "", disponible: true, password: "",
};

export default function Perfil() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/odontologos/perfil")
      .then(({ data }) => setForm({ ...FORM_INICIAL, ...data.usuario, ...data.odontologo, password: "" }))
      .catch((err) => setError(err.response?.data?.error || "No se pudo cargar el perfil."))
      .finally(() => setCargando(false));
  }, []);

  const cambiar = (campo, valor) => setForm((actual) => ({ ...actual, [campo]: valor }));

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setMensaje("");
    setError("");
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const { data } = await api.put("/odontologos/perfil", payload);
      localStorage.setItem("nombre", data.usuario.nombre);
      setForm((actual) => ({ ...actual, ...data.usuario, ...data.odontologo, password: "" }));
      setMensaje("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar el perfil.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="p-8 text-sm text-slate-500">Cargando perfil...</div>;

  return (
    <div className="p-8 w-full max-w-5xl mx-auto text-slate-700">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Mi perfil odontológico</h2>
        <p className="text-xs text-slate-400 mt-1">Administra tu información profesional y de contacto.</p>
      </div>
      {mensaje && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{mensaje}</div>}
      {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
      <form onSubmit={guardar} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Datos de acceso</h3>
          <label className="block text-xs font-bold text-slate-400">Nombre completo
            <input required value={form.nombre} onChange={(e) => cambiar("nombre", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#11B9BB]" />
          </label>
          <label className="block text-xs font-bold text-slate-400">Correo electrónico
            <input required type="email" value={form.email} onChange={(e) => cambiar("email", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#11B9BB]" />
          </label>
          <label className="block text-xs font-bold text-slate-400">Nueva contraseña (opcional)
            <input type="password" minLength={6} value={form.password} onChange={(e) => cambiar("password", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#11B9BB]" />
          </label>
          <label className="block text-xs font-bold text-slate-400">Teléfono
            <input value={form.telefono || ""} onChange={(e) => cambiar("telefono", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#11B9BB]" />
          </label>
        </section>
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Información profesional</h3>
          <label className="block text-xs font-bold text-slate-400">Especialidad
            <select value={form.especialidad} onChange={(e) => cambiar("especialidad", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#11B9BB]">
              {form.especialidad && !ESPECIALIDADES.includes(form.especialidad) && <option>{form.especialidad}</option>}
              {ESPECIALIDADES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-400">Turno
            <select value={form.turno} onChange={(e) => cambiar("turno", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#11B9BB]">
              {form.turno && !TURNOS.includes(form.turno) && <option>{form.turno}</option>}
              {TURNOS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-400">Número de colegiatura
            <input value={form.colegiatura || ""} onChange={(e) => cambiar("colegiatura", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#11B9BB]" />
          </label>
          <label className="block text-xs font-bold text-slate-400">Descripción profesional
            <textarea rows={4} value={form.descripcion || ""} onChange={(e) => cambiar("descripcion", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#11B9BB]" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={form.disponible !== false} onChange={(e) => cambiar("disponible", e.target.checked)} />
            Disponible para nuevas citas
          </label>
        </section>
        <button disabled={guardando} className="lg:col-span-2 rounded-xl bg-[#11B9BB] py-3 text-sm font-bold text-white transition hover:bg-[#0ea5a7] disabled:opacity-60">
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
