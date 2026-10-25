import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";

const SECCIONES = [
  ["resumen", "Inicio"],
  ["perfil", "Mis datos"],
  ["citas", "Mis citas"],
  ["documentos", "Documentos"],
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
      ["email", "Correo de contacto", false, "email"],
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
  const [emailAcceso, setEmailAcceso] = useState("");
  const [citas, setCitas] = useState([]);
  const [catalogo, setCatalogo] = useState({ servicios: [], odontologos: [] });
  const [documentos, setDocumentos] = useState([]);
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

  const cargarPortal = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [perfilRes, citasRes, catalogoRes, documentosRes, finanzasRes, notificacionesRes] = await Promise.all([
        api.get("/portal-paciente/perfil"),
        api.get("/portal-paciente/citas"),
        api.get("/portal-paciente/catalogo"),
        api.get("/portal-paciente/documentos"),
        api.get("/portal-paciente/finanzas"),
        api.get("/portal-paciente/notificaciones"),
      ]);
      setPerfil(perfilRes.data.paciente);
      setEmailAcceso(perfilRes.data.emailAcceso || "");
      setCitas(citasRes.data);
      setCatalogo(catalogoRes.data);
      setDocumentos(documentosRes.data);
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
      setPerfil(data.paciente);
      localStorage.setItem("nombre", nombrePaciente(data.paciente));
    }, "Tus datos se actualizaron correctamente.");
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

  const enviarPregunta = async (event) => {
    event.preventDefault();
    const texto = pregunta.trim();
    if (!texto || consultando) return;
    setChat((actual) => [...actual, { autor: "tú", texto }]);
    setPregunta("");
    setConsultando(true);
    try {
      const { data } = await api.post("/portal-paciente/asistente", { mensaje: texto });
      setChat((actual) => [...actual, { autor: "asistente", texto: data.respuesta }]);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "El asistente no está disponible.");
    } finally {
      setConsultando(false);
    }
  };

  const notificacionesNoLeidas = notificaciones.filter((item) => !item.leida).length;
  const citasPendientes = citas.filter((cita) => !["Cancelada", "Atendida"].includes(cita.estado)).length;
  const saldoPendiente = finanzas.presupuestos.reduce((total, presupuesto) => {
    const pagado = finanzas.pagos
      .filter((pago) => pago.presupuesto_id === presupuesto.id)
      .reduce((subtotal, pago) => subtotal + Number(pago.monto), 0);
    return total + Math.max(0, Number(presupuesto.monto) - pagado);
  }, 0);
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
                  Consulta tus citas, datos personales, documentos autorizados y movimientos financieros desde un solo lugar.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Citas pendientes", citasPendientes, "Próximas citas y solicitudes en curso.", "citas"],
                  ["Documentos", documentos.length, "Archivos habilitados por la clínica.", "documentos"],
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
              <div className="mb-2">
                <h3 className="text-2xl font-bold text-slate-800">Mis datos personales</h3>
                <p className="mt-1 text-xs text-slate-400">
                  El DNI y el correo usado para iniciar sesión son de solo lectura. Para corregirlos, contacta con la clínica.
                </p>
              </div>
              <form onSubmit={guardarPerfil} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
                  <h4 className="border-b border-slate-100 pb-3 font-bold text-slate-800">Identidad y acceso</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-slate-400">
                      DNI
                      <input value={perfil.dni || ""} readOnly className={`${CAMPO} bg-slate-100`} />
                    </label>
                    <label className="block text-xs font-bold text-slate-400">
                      Correo de inicio de sesión
                      <input value={emailAcceso} readOnly className={`${CAMPO} bg-slate-100`} />
                    </label>
                  </div>
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
                  className="rounded-xl bg-[#11B9BB] py-3 text-sm font-bold text-white transition hover:bg-[#0ea5a7] disabled:opacity-60 lg:col-span-2"
                >
                  {guardando ? "Guardando..." : "Guardar mis datos"}
                </button>
              </form>
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
            <Panel titulo="Documentos e información autorizada" descripcion="Aquí solo aparecen documentos que la clínica habilitó expresamente para tu cuenta.">
              {documentos.length === 0 ? <MensajeVacio>La clínica aún no ha habilitado documentos para consulta.</MensajeVacio> : <ul className="divide-y divide-slate-100">{documentos.map((documento) => <li key={documento.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-slate-800">{documento.nombre}</p><p className="text-xs text-slate-500">{documento.tipo} · {formatoFecha(documento.fecha_documento || documento.creado_en)}</p>{documento.descripcion && <p className="mt-1 text-xs text-slate-600">{documento.descripcion}</p>}</div><button type="button" onClick={() => abrirDocumento(documento)} className="rounded-lg border border-cyan-200 px-3 py-2 text-xs font-bold text-[#0e999b] hover:bg-cyan-50">Descargar</button></li>)}</ul>}
            </Panel>
          )}

          {seccion === "finanzas" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">Saldo pendiente según pagos confirmados por la clínica</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-900">{formatoImporte(finanzas.presupuestos.reduce((total, presupuesto) => {
                  const pagado = finanzas.pagos
                    .filter((pago) => pago.presupuesto_id === presupuesto.id)
                    .reduce((subtotal, pago) => subtotal + Number(pago.monto), 0);
                  return total + Math.max(0, Number(presupuesto.monto) - pagado);
                }, 0))}</p>
                <p className="mt-1 text-xs text-amber-800">Este saldo considera únicamente los pagos registrados por la clínica.</p>
              </div>
              <Panel titulo="Presupuestos" descripcion="Consulta los presupuestos y saldos registrados por la clínica. Para resolver dudas, comunícate con recepción.">
                {finanzas.presupuestos.length === 0 ? <MensajeVacio>No tienes presupuestos registrados.</MensajeVacio> : <div className="space-y-3">{finanzas.presupuestos.map((presupuesto) => {
                  const pagado = finanzas.pagos.filter((pago) => pago.presupuesto_id === presupuesto.id).reduce((subtotal, pago) => subtotal + Number(pago.monto), 0);
                  return <article key={presupuesto.id} className="rounded-xl border border-slate-100 p-4"><p className="font-semibold text-slate-800">{presupuesto.titulo || presupuesto.descripcion}</p><p className="mt-1 text-xs text-slate-500">Vigencia: {formatoFecha(presupuesto.fecha_vigencia)} · Estado: {presupuesto.estado}</p><p className="mt-2 text-lg font-bold text-[#0e999b]">{formatoImporte(presupuesto.monto)}</p><p className="mt-1 text-xs font-semibold text-amber-800">Saldo: {formatoImporte(Math.max(0, Number(presupuesto.monto) - pagado))}</p>{presupuesto.PresupuestoDetalles?.map((detalle) => <p key={detalle.id} className="mt-1 text-xs text-slate-600">{detalle.cantidad} × {detalle.servicio_nombre}</p>)}</article>;
                })}</div>}
              </Panel>
              <Panel titulo="Pagos registrados por la clínica">
                {finanzas.pagos.length === 0 ? <MensajeVacio>Aún no hay pagos confirmados registrados.</MensajeVacio> : <ul className="divide-y divide-slate-100">{finanzas.pagos.map((pago) => <li key={pago.id} className="flex justify-between gap-3 py-3 text-sm"><span>{formatoFecha(pago.created_at)} · {pago.metodo}</span><strong>{formatoImporte(pago.monto)}</strong></li>)}</ul>}
              </Panel>
            </div>
          )}

          {seccion === "asistente" && (
            <Panel titulo="Asistente virtual" descripcion="Responde con el catálogo publicado y no sustituye la orientación de un profesional.">
              <div className="mb-4 flex min-h-64 flex-col gap-3 rounded-xl bg-slate-50 p-4" aria-live="polite">
                {chat.length === 0 && <p className="m-auto max-w-md text-center text-sm text-slate-500">Puedes preguntar por servicios, precios publicados, citas o cómo contactar con la clínica. Para horarios, confirmaciones y dudas clínicas, consulta con recepción o con tu odontólogo.</p>}
                {chat.map((item, index) => <div key={`${index}-${item.autor}`} className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${item.autor === "tú" ? "self-end bg-[#11B9BB] text-white" : "self-start border border-slate-200 bg-white text-slate-700"}`}><span className="mb-1 block text-[10px] font-bold uppercase opacity-70">{item.autor}</span>{item.texto}</div>)}
                {consultando && <p className="text-xs text-slate-400">Consultando...</p>}
              </div>
              <form onSubmit={enviarPregunta} className="flex gap-2"><input maxLength={500} value={pregunta} onChange={(event) => setPregunta(event.target.value)} placeholder="Escribe tu pregunta..." className={`${CAMPO} min-w-0 flex-1`} /><button disabled={consultando || !pregunta.trim()} className="rounded-xl bg-[#11B9BB] px-4 text-sm font-bold text-white disabled:opacity-50">Enviar</button></form>
            </Panel>
          )}
        </div>
      </main>
    </div>
  );
}
