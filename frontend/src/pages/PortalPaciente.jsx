import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import ExpedientePaciente from "../components/ExpedientePaciente";
import { calcularDeudas } from "../utils/finanzas";

const SECCIONES = [
  ["resumen", "Inicio"],
  ["perfil", "Mi perfil"],
  ["citas", "Mis citas"],
  ["documentos", "Mi expediente clínico"],
  ["finanzas", "Presupuestos y pagos"],
  ["asistente", "Asistente virtual"],
];

const GRUPOS_PERFIL = [
  {
    titulo: "Datos personales",
    descripcion: "Información básica de tu ficha clínica.",
    campos: [
      ["nombres", "Nombres", true],
      ["apellidos", "Apellidos"],
      ["telefono", "Teléfono", false, "tel"],
      ["email", "Correo electrónico y de inicio de sesión", false, "email"],
      ["fecha_nacimiento", "Fecha de nacimiento", false, "date"],
      ["sexo", "Sexo"],
      ["ocupacion", "Ocupación"],
      ["estado_civil", "Estado civil"],
    ],
  },
  {
    titulo: "Ubicación",
    descripcion: "Datos para ubicarte y contactarte.",
    campos: [
      ["direccion", "Dirección"],
      ["distrito", "Distrito"],
    ],
  },
  {
    titulo: "Contacto de emergencia",
    descripcion: "Persona a contactar en caso necesario.",
    campos: [
      ["contacto_emergencia", "Contacto de emergencia"],
      ["telefono_emergencia", "Teléfono de emergencia", false, "tel"],
      ["parentesco_emergencia", "Parentesco de emergencia"],
    ],
  },
];

const CAMPO = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#11B9BB] focus:ring-2 focus:ring-[#11B9BB]/20";
const FORM_CITA_INICIAL = { servicio_id: "", odontologo_id: "", fecha: "", hora_inicio: "" };
const PREGUNTAS_SUGERIDAS = [
  "¿Qué servicios ofrece la clínica?",
  "¿Cómo puedo reservar una cita?",
  "¿Cómo prevenir las caries?",
  "¿Qué debo hacer si me duelen los dientes?",
];
const MENSAJE_BIENVENIDA = "¡Hola! 👋\n\nSoy el asistente virtual de Las Begonias. Puedo ayudarte con información odontológica general y tus citas. ¿Qué necesitas?";
const fechaActualLocal = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
};

const formatoFecha = (fecha) => {
  if (!fecha) return "Sin fecha";
  const parsed = new Date(`${String(fecha).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? "Sin fecha"
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(parsed);
};

const formatoImporte = (monto, moneda = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda }).format(Number(monto) || 0);

const ETIQUETAS_METODO_PAGO = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  cheque: "Cheque",
};

const ETIQUETAS_TIPO_PAGO = {
  pago_total: "Pago total",
  pago_parcial: "Pago parcial",
  adelanto: "Adelanto",
};

const nombrePaciente = (paciente) =>
  [paciente?.nombres, paciente?.apellidos].filter(Boolean).join(" ") || "Paciente";

function Panel({ titulo, children, descripcion }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h2 className="font-bold text-slate-800">{titulo}</h2>
        {descripcion && <p className="mt-1 text-xs text-slate-500">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

function MensajeVacio({ children }) {
  return <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">{children}</p>;
}

export default function PortalPaciente({ setIsLogged }) {
  const [seccion, setSeccion] = useState("resumen");
  const [perfil, setPerfil] = useState(null);
  const [citas, setCitas] = useState([]);
  const [catalogo, setCatalogo] = useState({ servicios: [], odontologos: [] });
  const [documentos, setDocumentos] = useState([]);
  const [expediente, setExpediente] = useState(null);
  const [finanzas, setFinanzas] = useState({ presupuestos: [], pagos: [] });
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [citaForm, setCitaForm] = useState(FORM_CITA_INICIAL);
  const [disponibilidad, setDisponibilidad] = useState({ fecha: "", slots: [] });
  const [disponibilidadReprogramar, setDisponibilidadReprogramar] = useState({ fecha: "", slots: [] });
  const [consultandoDisponibilidad, setConsultandoDisponibilidad] = useState(false);
  const [consultandoDisponibilidadCambio, setConsultandoDisponibilidadCambio] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState("");
  const [errorDisponibilidadCambio, setErrorDisponibilidadCambio] = useState("");
  const [citaReprogramar, setCitaReprogramar] = useState(null);
  const [chat, setChat] = useState([]);
  const [pregunta, setPregunta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [errorAsistente, setErrorAsistente] = useState("");
  const [contrasenas, setContrasenas] = useState({ actual: "", nueva: "", confirmar: "" });
  const [guardandoContrasena, setGuardandoContrasena] = useState(false);
  const [errorContrasena, setErrorContrasena] = useState("");
  const [mensajeContrasena, setMensajeContrasena] = useState("");
  const chatFinalRef = useRef(null);

  const cargarPortal = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [perfilRes, citasRes, catalogoRes, expedienteRes, finanzasRes, notificacionesRes] = await Promise.all([
        api.get("/portal-paciente/perfil"),
        api.get("/portal-paciente/citas"),
        api.get("/portal-paciente/catalogo"),
        api.get("/portal-paciente/expediente"),
        api.get("/portal-paciente/finanzas"),
        api.get("/portal-paciente/notificaciones"),
      ]);
      setPerfil({ ...perfilRes.data.paciente, email: perfilRes.data.emailAcceso || perfilRes.data.paciente.email || "" });
      setCitas(citasRes.data);
      setCatalogo(catalogoRes.data);
      setExpediente(expedienteRes.data);
      setDocumentos(expedienteRes.data.documentos);
      setFinanzas(finanzasRes.data);
      setNotificaciones(notificacionesRes.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudo cargar el portal del paciente.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(cargarPortal, 0);
    return () => window.clearTimeout(temporizador);
  }, [cargarPortal]);

  useEffect(() => {
    if (!citaForm.fecha) return undefined;
    let activo = true;
    api.get("/portal-paciente/disponibilidad", {
      params: {
        fecha: citaForm.fecha,
        ...(citaForm.odontologo_id ? { odontologo_id: citaForm.odontologo_id } : {}),
      },
    }).then(({ data }) => {
      if (activo) {
        setDisponibilidad(data);
        setErrorDisponibilidad("");
      }
    }).catch((requestError) => {
      if (activo) {
        setDisponibilidad({ fecha: citaForm.fecha, slots: [] });
        setErrorDisponibilidad(requestError.response?.data?.error || "No se pudo consultar la disponibilidad.");
      }
    }).finally(() => {
      if (activo) setConsultandoDisponibilidad(false);
    });
    return () => {
      activo = false;
    };
  }, [citaForm.fecha, citaForm.odontologo_id]);

  useEffect(() => {
    if (!citaReprogramar?.fecha) return undefined;
    let activo = true;
    api.get("/portal-paciente/disponibilidad", {
      params: {
        fecha: citaReprogramar.fecha,
        ...(citaReprogramar.odontologo_id ? { odontologo_id: citaReprogramar.odontologo_id } : {}),
      },
    }).then(({ data }) => {
      if (activo) {
        setDisponibilidadReprogramar(data);
        setErrorDisponibilidadCambio("");
      }
    }).catch((requestError) => {
      if (activo) {
        setDisponibilidadReprogramar({ fecha: citaReprogramar.fecha, slots: [] });
        setErrorDisponibilidadCambio(requestError.response?.data?.error || "No se pudo consultar la disponibilidad.");
      }
    }).finally(() => {
      if (activo) setConsultandoDisponibilidadCambio(false);
    });
    return () => {
      activo = false;
    };
  }, [citaReprogramar?.fecha, citaReprogramar?.odontologo_id]);

  const ejecutar = async (accion, exito) => {
    setError("");
    setMensaje("");
    setGuardando(true);
    try {
      await accion();
      setMensaje(exito);
      await cargarPortal();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudo completar la operación.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPerfil = (campo, valor) =>
    setPerfil((actual) => ({ ...actual, [campo]: valor }));

  const guardarPerfil = async (event) => {
    event.preventDefault();
    await ejecutar(async () => {
      const { data } = await api.put("/portal-paciente/perfil", perfil);
      setPerfil({ ...data.paciente, email: data.emailAcceso || data.paciente.email || "" });
      localStorage.setItem("nombre", nombrePaciente(data.paciente));
    }, "Tus datos se actualizaron correctamente.");
  };

  const cambiarContrasena = async (event) => {
    event.preventDefault();
    setErrorContrasena("");
    setMensajeContrasena("");
    if (contrasenas.nueva.length < 8) {
      setErrorContrasena("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (contrasenas.nueva !== contrasenas.confirmar) {
      setErrorContrasena("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    setGuardandoContrasena(true);
    try {
      const { data } = await api.put("/portal-paciente/contrasena", {
        contrasenaActual: contrasenas.actual,
        nuevaContrasena: contrasenas.nueva,
      });
      setContrasenas({ actual: "", nueva: "", confirmar: "" });
      setMensajeContrasena(data.message);
    } catch (requestError) {
      setErrorContrasena(requestError.response?.data?.error || "No se pudo actualizar la contraseña.");
    } finally {
      setGuardandoContrasena(false);
    }
  };

  const solicitarCita = async (event) => {
    event.preventDefault();
    const horarioDisponible = disponibilidad.fecha === citaForm.fecha &&
      disponibilidad.slots.some((slot) => slot.hora_inicio === citaForm.hora_inicio);
    if (!horarioDisponible || consultandoDisponibilidad) {
      setError("El horario seleccionado ya no está disponible. Consulta los horarios y vuelve a elegir.");
      return;
    }
    await ejecutar(async () => {
      const { data } = await api.post("/portal-paciente/citas", citaForm);
      setCitaForm(FORM_CITA_INICIAL);
      setMensaje(data.mensaje);
    }, "Solicitud enviada a la clínica.");
  };

  const cambiarCita = async (id, datos) => {
    await ejecutar(async () => {
      const { data } = await api.patch(`/portal-paciente/citas/${id}`, datos);
      setMensaje(data.mensaje);
      setCitaReprogramar(null);
    }, "La solicitud se registró.");
  };

  const marcarLeida = async (id) => {
    try {
      await api.put(`/portal-paciente/notificaciones/${id}/leida`);
      setNotificaciones((actuales) => actuales.map((item) => item.id === id ? { ...item, leida: true } : item));
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudo actualizar la notificación.");
    }
  };

  const abrirDocumento = async (documento) => {
    setError("");
    try {
      const { data } = await api.get(`/portal-paciente/documentos/${documento.id}/archivo`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = documento.nombre;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "No se pudo descargar el documento.");
    }
  };

  useEffect(() => {
    chatFinalRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, consultando]);

  const enviarPregunta = async (event, textoPregunta = pregunta) => {
    event?.preventDefault();
    const texto = textoPregunta.trim();
    if (!texto || consultando) return;
    setErrorAsistente("");
    setChat((actual) => [...actual, { autor: "tú", texto }]);
    setPregunta("");
    setConsultando(true);
    try {
      const { data } = await api.post("/portal-paciente/asistente", { mensaje: texto });
      setChat((actual) => [...actual, { autor: "asistente", texto: data.respuesta }]);
    } catch (requestError) {
      setErrorAsistente(requestError.response?.data?.error || "El asistente no está disponible.");
    } finally {
      setConsultando(false);
    }
  };

  const notificacionesNoLeidas = notificaciones.filter((item) => !item.leida).length;
  const citasPendientes = citas.filter((cita) => !["Cancelada", "Atendida"].includes(cita.estado)).length;
  const saldosPendientes = calcularDeudas(
    [...finanzas.presupuestos].sort((a, b) => Number(a.id) - Number(b.id)),
    finanzas.pagos,
  );
  const resumenPresupuestos = finanzas.presupuestos.map((presupuesto) => {
    const saldo = saldosPendientes.find((item) => Number(item.presupuesto.id) === Number(presupuesto.id))?.saldo || 0;
    const monto = Number(presupuesto.monto) || 0;
    const pagado = Math.min(monto, Math.max(0, monto - saldo));
    return {
      presupuesto,
      monto,
      pagado,
      saldo,
      porcentajePagado: monto > 0 ? Math.min(100, (pagado / monto) * 100) : 0,
    };
  });
  const saldoPendiente = resumenPresupuestos.reduce((total, item) => total + item.saldo, 0);
  const totalPagado = resumenPresupuestos.reduce((total, item) => total + item.pagado, 0);
  const totalPagosRegistrados = finanzas.pagos.reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
  const tituloSeccion = SECCIONES.find(([id]) => id === seccion)?.[1];

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 text-[17px] text-slate-500">
        Cargando tu portal...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 text-[17px] text-slate-800">
      <Sidebar
        patientSections={SECCIONES}
        sectionBadges={{ resumen: notificacionesNoLeidas }}
        currentView={seccion}
        setView={setSeccion}
        setIsLogged={setIsLogged}
      />

      <main className="min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,#e0f7f7_0,#f8fafc_34%,#eef2f7_100%)]">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 px-8 py-4 shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Portal del paciente</p>
              <h2 className="text-2xl font-bold text-slate-800">{tituloSeccion}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{nombrePaciente(perfil)}</p>
            </div>
            <button type="button" onClick={cargarPortal} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
              Actualizar
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-8">
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
          {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{mensaje}<button type="button" onClick={() => setMensaje("")} className="float-right">×</button></div>}

          {seccion === "resumen" && (
            <>
              <div className="rounded-3xl bg-gradient-to-r from-[#087f81] to-[#11B9BB] p-7 text-white shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Tu espacio clínico</p>
                <h1 className="mt-2 text-3xl font-black">{nombrePaciente(perfil)}</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  Consulta tus citas, datos personales, expediente clínico y movimientos financieros desde un solo lugar.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Citas pendientes", citasPendientes, "Próximas citas y solicitudes en curso.", "citas"],
                  ["Expediente clínico", documentos.length, "Antecedentes, atenciones, tratamientos y documentos.", "documentos"],
                  ["Saldo pendiente", formatoImporte(saldoPendiente), "Según pagos confirmados por recepción.", "finanzas"],
                  ["Notificaciones", notificacionesNoLeidas, "Avisos sin leer en tu bandeja.", "resumen"],
                ].map(([titulo, valor, detalle, destino]) => (
                  <button
                    key={titulo}
                    type="button"
                    onClick={() => setSeccion(destino)}
                    className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{titulo}</p>
                    <p className="mt-3 text-2xl font-black text-[#087f81]">{valor}</p>
                    <p className="mt-1 text-xs text-slate-500">{detalle}</p>
                  </button>
                ))}
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel titulo="Próximas citas">
                  {citas.filter((cita) => !["Cancelada", "Atendida"].includes(cita.estado)).slice(0, 4).length === 0
                    ? <MensajeVacio>No tienes citas pendientes.</MensajeVacio>
                    : <ul className="divide-y divide-slate-100">{citas.filter((cita) => !["Cancelada", "Atendida"].includes(cita.estado)).slice(0, 4).map((cita) => <li key={cita.id} className="py-3"><p className="text-sm font-semibold text-slate-800">{formatoFecha(cita.fecha)} · {String(cita.hora_inicio).slice(0, 5)}</p><p className="text-xs text-slate-500">{cita.motivo} · {cita.doctor}</p><p className="mt-1 text-xs font-semibold text-[#0e999b]">{cita.estado}</p></li>)}</ul>}
                </Panel>
                <Panel titulo={`Notificaciones${notificacionesNoLeidas ? ` (${notificacionesNoLeidas} sin leer)` : ""}`}>
                  {notificaciones.slice(0, 5).length === 0 ? <MensajeVacio>No tienes notificaciones.</MensajeVacio> : <ul className="space-y-2">{notificaciones.slice(0, 5).map((item) => <li key={item.id} className={`rounded-xl p-3 ${item.leida ? "bg-slate-50" : "bg-cyan-50"}`}><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-800">{item.titulo}</p><p className="mt-1 text-xs text-slate-600">{item.mensaje}</p></div>{!item.leida && <button type="button" onClick={() => marcarLeida(item.id)} className="shrink-0 text-xs font-bold text-[#0e999b]">Leída</button>}</div></li>)}</ul>}
                </Panel>
              </div>
            </>
          )}

          {seccion === "perfil" && perfil && (
            <>
              <div className="rounded-3xl bg-gradient-to-r from-[#087f81] to-[#11B9BB] p-6 text-white shadow-lg sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Tu cuenta</p>
                <h3 className="mt-2 text-2xl font-black sm:text-3xl">Mi perfil</h3>
                <p className="mt-2 max-w-2xl text-sm text-white/85">
                  Mantén actualizados tus datos de contacto y protege tu cuenta con una contraseña segura.
                </p>
              </div>
              <p className="text-sm text-slate-500">
                  El DNI y el correo usado para iniciar sesión son de solo lectura. Para corregirlos, contacta con la clínica.
              </p>
              <form onSubmit={guardarPerfil} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-800">Identidad verificada</h4>
                    <p className="mt-1 text-xs text-slate-500">El DNI identifica tu ficha y no se puede cambiar desde el portal. Para corregirlo, contacta con recepción.</p>
                  </div>
                  <label className="block max-w-sm text-xs font-bold text-slate-500">
                    DNI
                    <input value={perfil.dni || ""} readOnly className={`${CAMPO} cursor-not-allowed bg-slate-100`} />
                  </label>
                </section>
                {GRUPOS_PERFIL.map(({ titulo, descripcion, campos }) => (
                  <section key={titulo} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-slate-800">{titulo}</h4>
                      <p className="mt-1 text-xs text-slate-500">{descripcion}</p>
                    </div>
                    {campos.map(([campo, label, requerido, tipo]) => (
                      <label key={campo} className="block text-xs font-bold text-slate-400">
                        {label}
                        <input
                          type={tipo || "text"}
                          required={Boolean(requerido)}
                          value={perfil[campo] || ""}
                          onChange={(event) => cambiarPerfil(campo, event.target.value)}
                          className={CAMPO}
                        />
                      </label>
                    ))}
                  </section>
                ))}
                <button
                  disabled={guardando}
                  className="rounded-xl bg-[#11B9BB] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0ea5a7] disabled:opacity-60 lg:col-span-2"
                >
                  {guardando ? "Guardando..." : "Guardar mis datos"}
                </button>
              </form>
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800">Seguridad de la cuenta</h4>
                  <p className="mt-1 text-xs text-slate-500">Confirma tu contraseña actual para establecer una nueva.</p>
                </div>
                <form onSubmit={cambiarContrasena} className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-500 sm:col-span-2">
                    Contraseña actual
                    <input autoComplete="current-password" type="password" required value={contrasenas.actual} onChange={(event) => setContrasenas((actual) => ({ ...actual, actual: event.target.value }))} className={CAMPO} />
                  </label>
                  <label className="text-xs font-bold text-slate-500">
                    Nueva contraseña
                    <input autoComplete="new-password" type="password" minLength={8} required value={contrasenas.nueva} onChange={(event) => setContrasenas((actual) => ({ ...actual, nueva: event.target.value }))} className={CAMPO} />
                  </label>
                  <label className="text-xs font-bold text-slate-500">
                    Confirmar nueva contraseña
                    <input autoComplete="new-password" type="password" minLength={8} required value={contrasenas.confirmar} onChange={(event) => setContrasenas((actual) => ({ ...actual, confirmar: event.target.value }))} className={CAMPO} />
                  </label>
                  {errorContrasena && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{errorContrasena}</p>}
                  {mensajeContrasena && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 sm:col-span-2">{mensajeContrasena}</p>}
                  <button disabled={guardandoContrasena} className="rounded-xl border border-[#11B9BB] px-5 py-3 text-sm font-bold text-[#087f81] transition hover:bg-cyan-50 disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
                    {guardandoContrasena ? "Actualizando..." : "Cambiar contraseña"}
                  </button>
                </form>
              </section>
            </>
          )}

          {seccion === "citas" && (
            <div className="space-y-5">
              <Panel titulo="Solicitar una cita" descripcion="Puedes solicitar una consulta inicial o limpieza dental. Para otros tratamientos, el odontólogo debe evaluarte primero y recepción coordinará la cita. La clínica confirmará tu solicitud.">
                <form onSubmit={solicitarCita} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="text-xs font-bold text-slate-500 lg:col-span-2">Servicio<select required value={citaForm.servicio_id} onChange={(event) => setCitaForm((form) => ({ ...form, servicio_id: event.target.value }))} className={CAMPO}><option value="">Selecciona un servicio</option>{catalogo.servicios.map((servicio) => <option key={servicio.id} value={servicio.id}>{servicio.nombre} · {formatoImporte(servicio.precio, servicio.moneda)}</option>)}</select></label>
                  <label className="text-xs font-bold text-slate-500 lg:col-span-2">Odontólogo (opcional)<select value={citaForm.odontologo_id} onChange={(event) => { setDisponibilidad({ fecha: "", slots: [] }); setConsultandoDisponibilidad(Boolean(citaForm.fecha)); setErrorDisponibilidad(""); setCitaForm((form) => ({ ...form, odontologo_id: event.target.value, hora_inicio: "" })); }} className={CAMPO}><option value="">Que la clínica lo asigne</option>{catalogo.odontologos.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.nombre} · {doctor.especialidad}</option>)}</select></label>
                  <label className="text-xs font-bold text-slate-500">Fecha<input required type="date" min={fechaActualLocal()} value={citaForm.fecha} onChange={(event) => { setDisponibilidad({ fecha: "", slots: [] }); setConsultandoDisponibilidad(Boolean(event.target.value)); setErrorDisponibilidad(""); setCitaForm((form) => ({ ...form, fecha: event.target.value, hora_inicio: "" })); }} className={CAMPO} /></label>
                  <label className="text-xs font-bold text-slate-500">Hora disponible<select required disabled={!citaForm.fecha || disponibilidad.fecha !== citaForm.fecha} value={citaForm.hora_inicio} onChange={(event) => setCitaForm((form) => ({ ...form, hora_inicio: event.target.value }))} className={CAMPO}><option value="">{citaForm.fecha ? "Selecciona un espacio" : "Selecciona fecha"}</option>{(disponibilidad.fecha === citaForm.fecha ? disponibilidad.slots : []).map((slot) => <option key={slot.hora_inicio} value={slot.hora_inicio}>{slot.hora_inicio}</option>)}</select></label>
                  <div className="text-xs text-slate-500 sm:col-span-2 lg:col-span-5">{catalogo.odontologos.length === 0 ? <p role="alert" className="text-amber-700">La clínica aún no tiene odontólogos configurados como disponibles, así que no se pueden mostrar horarios. Contacta con recepción o con el administrador de la clínica.</p> : errorDisponibilidad ? <p role="alert" className="text-rose-700">{errorDisponibilidad}</p> : consultandoDisponibilidad ? "Consultando espacios disponibles..." : citaForm.fecha && disponibilidad.fecha === citaForm.fecha && disponibilidad.slots.length === 0 ? "No hay espacios disponibles para esa selección. Prueba otra fecha u odontólogo." : "Los espacios se calculan según el turno del odontólogo y la agenda actual; pueden cambiar antes de la confirmación."}</div>
                  {catalogo.servicios.length === 0 && <p className="text-xs text-amber-700 sm:col-span-2 lg:col-span-5">No hay servicios disponibles para solicitar una cita. Contacta con la clínica.</p>}
                  <button disabled={guardando || consultandoDisponibilidad || catalogo.servicios.length === 0 || catalogo.odontologos.length === 0 || !citaForm.servicio_id || !citaForm.fecha || !citaForm.hora_inicio} className="rounded-xl bg-[#11B9BB] px-5 py-3 text-sm font-bold text-white hover:bg-[#0e999b] disabled:opacity-60 sm:col-span-2 lg:col-span-5 lg:justify-self-start">{guardando ? "Enviando solicitud..." : "Enviar solicitud"}</button>
                </form>
              </Panel>
              <Panel titulo="Mis citas">
                {citas.length === 0 ? <MensajeVacio>Aún no hay citas asociadas a tu cuenta.</MensajeVacio> : <div className="space-y-3">{citas.map((cita) => <article key={cita.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-800">{formatoFecha(cita.fecha)} · {String(cita.hora_inicio).slice(0, 5)}</p><p className="mt-1 text-sm text-slate-600">{cita.motivo} · {cita.doctor}</p><p className="mt-1 text-xs font-bold text-[#0e999b]">{cita.estado}</p></div>{!["Atendida", "Cancelada"].includes(cita.estado) && <div className="flex gap-2"><button type="button" onClick={() => { const cerrar = citaReprogramar?.id === cita.id; setCitaReprogramar(cerrar ? null : { id: cita.id, odontologo_id: cita.odontologo_id || "", fecha: "", hora_inicio: "" }); setDisponibilidadReprogramar({ fecha: "", slots: [] }); setConsultandoDisponibilidadCambio(false); setErrorDisponibilidadCambio(""); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Solicitar cambio</button><button type="button" disabled={guardando} onClick={() => cambiarCita(cita.id, { accion: "cancelar" })} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">Cancelar</button></div>}</div>{citaReprogramar?.id === cita.id && <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); cambiarCita(cita.id, { ...citaReprogramar, accion: "reprogramar" }); }}><label className="text-xs font-bold text-slate-500">Nueva fecha<input required type="date" min={fechaActualLocal()} value={citaReprogramar.fecha} onChange={(event) => { setDisponibilidadReprogramar({ fecha: "", slots: [] }); setConsultandoDisponibilidadCambio(Boolean(event.target.value)); setErrorDisponibilidadCambio(""); setCitaReprogramar((actual) => ({ ...actual, fecha: event.target.value, hora_inicio: "" })); }} className={CAMPO} /></label><label className="text-xs font-bold text-slate-500">Nueva hora<select required disabled={!citaReprogramar.fecha || disponibilidadReprogramar.fecha !== citaReprogramar.fecha || consultandoDisponibilidadCambio} value={citaReprogramar.hora_inicio} onChange={(event) => setCitaReprogramar((actual) => ({ ...actual, hora_inicio: event.target.value }))} className={CAMPO}><option value="">{consultandoDisponibilidadCambio ? "Consultando horarios..." : "Selecciona un espacio"}</option>{(disponibilidadReprogramar.fecha === citaReprogramar.fecha ? disponibilidadReprogramar.slots : []).map((slot) => <option key={slot.hora_inicio} value={slot.hora_inicio}>{slot.hora_inicio}</option>)}</select></label>{errorDisponibilidadCambio && <p role="alert" className="text-xs text-rose-700">{errorDisponibilidadCambio}</p>}<button disabled={guardando || consultandoDisponibilidadCambio || !citaReprogramar.hora_inicio} className="rounded-lg bg-[#11B9BB] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{guardando ? "Enviando..." : "Enviar solicitud"}</button></form>}</article>)}</div>}
              </Panel>
            </div>
          )}

          {seccion === "documentos" && (
            <ExpedientePaciente
              expediente={expediente}
              documentos={documentos}
              perfil={perfil}
              onAbrirDocumento={abrirDocumento}
              onActualizado={(antecedentes, cambio) => setExpediente((actual) => ({
                ...actual,
                antecedentes: {
                  ...actual.antecedentes,
                  consentimiento_veracidad: antecedentes.consentimiento_veracidad,
                },
                historialAntecedentes: cambio
                  ? [cambio, ...(actual.historialAntecedentes || [])]
                  : actual.historialAntecedentes,
                resumen: {
                  ...actual.resumen,
                  antecedentesPendientes: !antecedentes.consentimiento_veracidad?.aceptado,
                },
              }))}
            />
          )}

          {seccion === "finanzas" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ["Saldo pendiente", saldoPendiente, "Aún por cubrir en tus presupuestos.", "amber"],
                  ["Total abonado", totalPagado, "Aplicado a los presupuestos registrados.", "teal"],
                  ["Pagos registrados", totalPagosRegistrados, `${finanzas.pagos.length} movimiento(s) confirmado(s) por la clínica.`, "blue"],
                ].map(([titulo, monto, detalle, color]) => (
                  <article
                    key={titulo}
                    className={`rounded-2xl border p-5 shadow-sm ${
                      color === "amber"
                        ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
                        : color === "teal"
                          ? "border-teal-100 bg-gradient-to-br from-teal-50 to-white"
                          : "border-blue-100 bg-gradient-to-br from-blue-50 to-white"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
                    <p className="mt-2 text-2xl font-black text-slate-800">{formatoImporte(monto)}</p>
                    <p className="mt-1 text-xs text-slate-500">{detalle}</p>
                  </article>
                ))}
              </div>
              <Panel titulo="Mis presupuestos" descripcion="Revisa los servicios, el monto, los abonos y el saldo registrado por la clínica. Para consultas, comunícate con recepción.">
                {resumenPresupuestos.length === 0 ? <MensajeVacio>No tienes presupuestos registrados.</MensajeVacio> : <div className="grid gap-4 lg:grid-cols-2">{resumenPresupuestos.map(({ presupuesto, monto, pagado, saldo, porcentajePagado }) => (
                  <article key={presupuesto.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-5">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">{presupuesto.titulo || presupuesto.descripcion}</p>
                        <p className="mt-1 text-xs text-slate-500">Odontólogo: {presupuesto.doctor || "No especificado"}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        {saldo > 0 ? "Pendiente" : "Pagado"}
                      </span>
                    </div>
                    <div className="space-y-4 p-4 sm:p-5">
                      <div className="flex flex-wrap justify-between gap-2 text-sm">
                        <span className="text-slate-500">Monto del presupuesto</span>
                        <strong className="text-slate-800">{formatoImporte(monto)}</strong>
                      </div>
                      <div>
                        <div className="mb-2 flex justify-between gap-3 text-xs">
                          <span className="text-slate-500">Abonado: <strong className="text-teal-700">{formatoImporte(pagado)}</strong></span>
                          <span className={saldo > 0 ? "font-bold text-amber-700" : "font-bold text-teal-700"}>
                            Saldo: {formatoImporte(saldo)}
                          </span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                          aria-label={`Monto abonado del presupuesto ${presupuesto.titulo || presupuesto.descripcion}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(porcentajePagado)}
                        >
                          <div className="h-full rounded-full bg-gradient-to-r from-[#0e999b] to-[#11B9BB] transition-[width]" style={{ width: `${porcentajePagado}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Estado: {presupuesto.estado || "Sin estado"}</span>
                        <span>Vigencia: {formatoFecha(presupuesto.fecha_vigencia)}</span>
                      </div>
                      {presupuesto.PresupuestoDetalles?.length > 0 && (
                        <div className="border-t border-slate-100 pt-3">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Servicios incluidos</p>
                          <ul className="space-y-2">
                            {presupuesto.PresupuestoDetalles.map((detalle) => (
                              <li key={detalle.id} className="flex justify-between gap-3 text-xs text-slate-600">
                                <span>{detalle.cantidad} × {detalle.servicio_nombre}</span>
                                <strong className="shrink-0 text-slate-700">{formatoImporte(detalle.subtotal)}</strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </article>
                ))}</div>}
              </Panel>
              <Panel titulo="Historial de pagos" descripcion="Movimientos registrados y confirmados por la clínica. El registro de pagos se realiza en recepción.">
                {finanzas.pagos.length === 0 ? <MensajeVacio>Aún no hay pagos confirmados registrados.</MensajeVacio> : <ul className="divide-y divide-slate-100">{finanzas.pagos.map((pago) => {
                  const presupuesto = finanzas.presupuestos.find((item) => Number(item.id) === Number(pago.presupuesto_id));
                  return (
                    <li key={pago.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{ETIQUETAS_TIPO_PAGO[pago.tipo_pago] || "Pago"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatoFecha(pago.created_at)} · {ETIQUETAS_METODO_PAGO[pago.metodo] || "Método no especificado"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {presupuesto ? `Asociado a: ${presupuesto.titulo || presupuesto.descripcion}` : "Abono registrado en tu ficha"}
                        </p>
                      </div>
                      <strong className="text-base text-teal-700">{formatoImporte(pago.monto)}</strong>
                    </li>
                  );
                })}</ul>}
              </Panel>
            </div>
          )}

          {seccion === "asistente" && (
            <main className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl min-w-0 flex-col">
              <header className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b8f91]">Clínica Las Begonias</p>
                <h3 className="mt-1 text-xl font-black text-slate-800 sm:text-2xl">Asistente virtual</h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">Información odontológica general, servicios publicados y orientación sobre tus citas.</p>
              </header>
              <section className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
                  {chat.length === 0 && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-xl" aria-hidden="true">🤖</div>
                      <div className="whitespace-pre-line rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">{MENSAJE_BIENVENIDA}</div>
                    </div>
                  )}
                  {chat.map((item, index) => (
                    <div key={`${index}-${item.autor}`} className={`flex items-start gap-3 ${item.autor === "tú" ? "justify-end" : ""}`}>
                      {item.autor !== "tú" && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-lg" aria-hidden="true">🤖</div>}
                      <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] ${item.autor === "tú" ? "rounded-tr-sm bg-[#11B9BB] text-white" : "rounded-tl-sm bg-slate-100 text-slate-700"}`}>
                        <span className={`mb-1 block text-[10px] font-bold uppercase tracking-wide ${item.autor === "tú" ? "text-white/75" : "text-slate-500"}`}>{item.autor === "tú" ? "Tú" : "Asistente virtual"}</span>
                        {item.texto}
                      </div>
                      {item.autor === "tú" && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-lg" aria-hidden="true">🙂</div>}
                    </div>
                  ))}
                  {consultando && <div className="flex items-center gap-3 text-sm text-slate-500"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50" aria-hidden="true">🤖</div>Preparando una respuesta...</div>}
                  <div ref={chatFinalRef} />
                </div>

                {errorAsistente && <p role="alert" className="mx-4 mb-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:mx-6">{errorAsistente}</p>}

                {chat.length === 0 && (
                  <div className="px-4 pb-4 sm:px-6">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Preguntas sugeridas</p>
                    <div className="flex flex-wrap gap-2">
                      {PREGUNTAS_SUGERIDAS.map((preguntaSugerida) => (
                        <button key={preguntaSugerida} type="button" disabled={consultando} onClick={() => enviarPregunta(null, preguntaSugerida)} className="rounded-full border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition hover:border-[#11B9BB] hover:bg-cyan-50 disabled:opacity-50">
                          {preguntaSugerida}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={enviarPregunta} className="border-t border-slate-100 p-4 sm:p-5">
                  <div className="flex items-end gap-2">
                    <textarea
                      maxLength={500}
                      rows={2}
                      value={pregunta}
                      onChange={(event) => setPregunta(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          enviarPregunta();
                        }
                      }}
                      placeholder="Escribe tu pregunta... (Enter para enviar)"
                      className="min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#11B9BB] focus:ring-2 focus:ring-[#11B9BB]/20"
                    />
                    <button type="submit" disabled={consultando || !pregunta.trim()} aria-label="Enviar pregunta" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#11B9BB] text-xl font-bold text-white transition hover:bg-[#0b9fa1] disabled:cursor-not-allowed disabled:opacity-40">
                      ➤
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-400">La información es orientativa y no sustituye la valoración profesional. Ante síntomas intensos, contacta con un profesional de salud.</p>
                </form>
              </section>
            </main>
          )}
        </div>
      </main>
    </div>
  );
}
