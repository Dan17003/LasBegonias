import { useEffect, useState } from "react";
import api from "../services/api";
import LogoClinica from "../components/LogoClinica";

export default function Login({ setIsLogged }) {
  const [modoRegistro, setModoRegistro] = useState(false);
  const [modoRecuperacion, setModoRecuperacion] = useState(false);
  const [tokenRecuperacion, setTokenRecuperacion] = useState(() =>
    new URLSearchParams(window.location.search).get("resetToken") || ""
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [datosRegistro, setDatosRegistro] = useState({ dni: "", nombres: "", apellidos: "" });
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

useEffect(() => {
  const url = new URL(window.location.href);
  if (url.searchParams.has("resetToken")) {
    url.searchParams.delete("resetToken");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}, []);

const handleLogin = async (e) => {
  e.preventDefault();

  try {
    setError("");

    const res = await api.post("/auth/login", {
      email,
      password,
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("rol", res.data.user.rol);
    localStorage.setItem("permisos", JSON.stringify(res.data.user.permisos || []));
    localStorage.setItem("nombre", res.data.user.nombre || res.data.user.email);

    setIsLogged(true);
  } catch (err) {
    console.error(err);
    setError(err.response?.data?.error || "No se pudo iniciar sesión.");
  }
};

const handleSolicitarRecuperacion = async (e) => {
  e.preventDefault();
  setError("");
  setMensaje("");
  try {
    const { data } = await api.post("/auth/forgot-password", { email });
    setMensaje(data.message);
  } catch (err) {
    setError(err.response?.data?.error || "No se pudo solicitar la recuperación de contraseña.");
  }
};

const handleRestablecerContrasena = async (e) => {
  e.preventDefault();
  setError("");
  setMensaje("");
  if (nuevaContrasena !== confirmarContrasena) {
    setError("La confirmación no coincide con la nueva contraseña.");
    return;
  }
  try {
    const { data } = await api.post("/auth/reset-password", {
      token: tokenRecuperacion,
      nuevaContrasena,
    });
    setTokenRecuperacion("");
    setNuevaContrasena("");
    setConfirmarContrasena("");
    setMensaje(data.message);
    window.history.replaceState({}, "", window.location.pathname);
  } catch (err) {
    setError(err.response?.data?.error || "No se pudo restablecer la contraseña.");
  }
};

const handleRegistro = async (e) => {
  e.preventDefault();
  setError("");
  setMensaje("");
  try {
    const { data } = await api.post("/auth/register", { ...datosRegistro, email, password });
    setPassword("");
    setModoRegistro(false);
    setMensaje(data.message || "Cuenta creada. Ya puedes iniciar sesión.");
  } catch (err) {
    setError(err.response?.data?.error || "No se pudo crear la cuenta.");
  }
};

const cambiarModo = (registro) => {
  setModoRegistro(registro);
  setModoRecuperacion(false);
  setError("");
  setMensaje("");
};

const volverAInicioSesion = () => {
  setModoRegistro(false);
  setModoRecuperacion(false);
  setError("");
  setMensaje("");
};

const esRestablecimiento = Boolean(tokenRecuperacion);
const tituloFormulario = esRestablecimiento
  ? "Crea una nueva contraseña"
  : modoRecuperacion
    ? "Recupera tu contraseña"
    : modoRegistro
      ? "Crea tu cuenta de paciente"
      : "¡Bienvenido de vuelta!";

  return (
    <div className="flex min-h-screen w-full flex-col bg-white font-sans md:h-screen md:flex-row md:overflow-hidden">
      <section className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-[#f4fbfb] px-6 py-5 text-center select-none sm:py-9 md:min-h-screen md:w-1/2 md:p-10">
        <img
          src="/fondo-login-clinica.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-[1.18] origin-[8%_center] object-cover object-[8%_center] md:scale-[1.35]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-white/35" />
        <div aria-hidden="true" className="absolute -left-24 -top-24 h-64 w-64 rounded-full border border-[#11B9BB]/20" />
        <div aria-hidden="true" className="absolute -bottom-36 -right-24 h-80 w-80 rounded-full border border-[#11B9BB]/20" />
        <div className="relative flex max-w-lg flex-col items-center md:-translate-y-20">
          <div className="mb-2 flex h-24 w-24 items-center justify-center sm:h-36 sm:w-36 md:mb-4 md:h-64 md:w-64">
            <LogoClinica className="h-full w-full drop-shadow-[0_12px_18px_rgba(0,168,150,0.2)]" />
          </div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#004643] [text-shadow:0_1px_8px_rgba(255,255,255,0.95)] sm:text-xs sm:tracking-[0.2em] md:text-sm md:tracking-[0.24em]">
            Especialidades odontológicas
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003f3d] [text-shadow:0_2px_10px_rgba(255,255,255,0.95)] sm:mt-2 sm:text-3xl md:mt-3 md:text-4xl">
            Las Begonias
          </h1>
          <div className="mt-2 h-0.5 w-12 rounded-full bg-[#087f81] shadow-[0_1px_6px_rgba(255,255,255,0.9)] sm:mt-3 md:mt-5" />
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#075b5d] [text-shadow:0_1px_8px_rgba(255,255,255,0.98)] sm:mt-4 sm:text-xs sm:tracking-[0.22em] md:mt-5 md:text-sm">
            Tu sonrisa, nuestra especialidad
          </p>
        </div>
        <p className="relative mt-4 hidden text-[10px] font-medium tracking-wide text-slate-400 md:absolute md:bottom-6 md:block">
          © {new Date().getFullYear()} Clínica Las Begonias
        </p>
      </section>

      <section className="relative flex w-full flex-1 flex-col justify-center overflow-y-auto bg-[#dff1f5] px-5 py-8 sm:px-8 md:h-screen md:min-h-0 md:w-1/2 md:flex-none md:px-10 lg:px-16">
        <div aria-hidden="true" className="pointer-events-none absolute right-8 top-8 h-24 w-24 rounded-full border border-[#11B9BB]/15 sm:right-12 sm:top-12 sm:h-36 sm:w-36" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-10 left-8 h-16 w-16 rounded-full border border-[#11B9BB]/15 sm:left-12 sm:h-24 sm:w-24" />
        <div className="relative mx-auto w-full max-w-md rounded-3xl bg-[#11B9BB] p-6 text-white shadow-[0_24px_60px_rgba(8,127,129,0.22)] ring-1 ring-white/70 sm:p-8 lg:p-10">
          <div className="mb-7 text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.035em] text-[#003b49] [text-shadow:0_1px_0_rgba(255,255,255,0.45)] sm:text-3xl">
              {tituloFormulario}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-white/95">
              {esRestablecimiento
                ? "Elige una contraseña segura para proteger tu cuenta."
                : modoRecuperacion
                  ? "Te enviaremos instrucciones para recuperar el acceso."
                  : modoRegistro
                    ? "Completa tus datos para crear el acceso a tu portal."
                    : "Inicia sesión para acceder al sistema de la clínica."}
            </p>
          </div>

          <form
            onSubmit={esRestablecimiento ? handleRestablecerContrasena : modoRecuperacion ? handleSolicitarRecuperacion : modoRegistro ? handleRegistro : handleLogin}
            className={modoRegistro || esRestablecimiento ? "max-h-[55vh] space-y-4 overflow-y-auto pr-2 sm:max-h-[62vh]" : "space-y-5"}
          >
            {modoRegistro && (
              <>
                <label className="block text-sm font-semibold tracking-wide text-white">DNI<input required value={datosRegistro.dni} onChange={(e) => setDatosRegistro((actual) => ({ ...actual, dni: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/80 bg-white p-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-white/30" /></label>
                <label className="block text-sm font-semibold tracking-wide text-white">Nombres<input required value={datosRegistro.nombres} onChange={(e) => setDatosRegistro((actual) => ({ ...actual, nombres: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/80 bg-white p-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-white/30" /></label>
                <label className="block text-sm font-semibold tracking-wide text-white">Apellidos<input value={datosRegistro.apellidos} onChange={(e) => setDatosRegistro((actual) => ({ ...actual, apellidos: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/80 bg-white p-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-white/30" /></label>
              </>
            )}
            {!esRestablecimiento && <div>
              <label className="mb-1 block text-sm font-semibold tracking-wide text-white">Correo electrónico</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-xl border border-white/80 bg-white p-3 text-sm text-slate-800 shadow-sm placeholder-slate-400 outline-none transition focus:ring-4 focus:ring-white/30"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>}

            {!modoRecuperacion && !esRestablecimiento && <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold tracking-wide text-white">Contraseña</label>
                {!modoRegistro && <button type="button" onClick={() => { setModoRecuperacion(true); setError(""); setMensaje(""); }} className="text-xs font-semibold text-white underline decoration-white/60 underline-offset-4 transition hover:decoration-white">
                  ¿Has olvidado tu contraseña?
                </button>}
              </div>
              <input
                type="password"
                required
                minLength={modoRegistro ? 8 : undefined}
                className="mt-1 w-full rounded-xl border border-white/80 bg-white p-3 text-sm text-slate-800 shadow-sm placeholder-slate-400 outline-none transition focus:ring-4 focus:ring-white/30"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>}

            {esRestablecimiento && (
              <>
                <label className="block text-sm font-semibold tracking-wide text-white">Nueva contraseña<input type="password" required minLength={8} autoComplete="new-password" value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)} className="mt-1 w-full rounded-xl border border-white/80 bg-white p-3 text-sm text-slate-800 shadow-sm outline-none transition focus:ring-4 focus:ring-white/30" /></label>
                <label className="block text-sm font-semibold tracking-wide text-white">Confirmar nueva contraseña<input type="password" required minLength={8} autoComplete="new-password" value={confirmarContrasena} onChange={(e) => setConfirmarContrasena(e.target.value)} className="mt-1 w-full rounded-xl border border-white/80 bg-white p-3 text-sm text-slate-800 shadow-sm outline-none transition focus:ring-4 focus:ring-white/30" /></label>
              </>
            )}

            {mensaje && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">{mensaje}</div>}
            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 animate-shake">
                ⚠️ {error}
              </div>
            )}

            <div className="pt-2">
              <button 
                type="submit"
                className="mt-2 w-full rounded-xl bg-[#087f81] py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-[#075b5d]/25 transition duration-200 hover:bg-[#075b5d] hover:shadow-xl active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                {esRestablecimiento ? "Guardar nueva contraseña" : modoRecuperacion ? "Enviar instrucciones" : modoRegistro ? "Crear cuenta" : "Iniciar sesión"}
              </button>
            </div>
          </form>

          {(modoRecuperacion || esRestablecimiento) ? (
            <div className="mt-6 text-center text-sm font-medium text-white/95">
              <button type="button" onClick={volverAInicioSesion} className="font-semibold text-white underline decoration-white/70 underline-offset-4 transition hover:decoration-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">Volver al inicio de sesión</button>
            </div>
          ) : (
            <div className="mt-6 text-center text-sm font-medium text-white/95">
              <span>{modoRegistro ? "¿Ya tienes una cuenta? " : "¿No tienes una cuenta? "}</span>
              <button type="button" onClick={() => cambiarModo(!modoRegistro)} className="font-bold text-white underline decoration-white/70 underline-offset-4 transition hover:decoration-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                {modoRegistro ? "Volver al inicio de sesión" : "Crea una cuenta"}
              </button>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}