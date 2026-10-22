import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const SECCIONES = [
  ["resumen", "Inicio"],
  ["perfil", "Mis datos"],
  ["citas", "Mis citas"],
  ["documentos", "Documentos"],
  ["finanzas", "Presupuestos y pagos"],
  ["asistente", "Asistente virtual"],
];

const CAMPOS_PERFIL = [
  ["nombres", "Nombres", true],
  ["apellidos", "Apellidos"],
  ["telefono", "Teléfono", false, "tel"],
  ["email", "Correo de contacto", false, "email"],
  ["fecha_nacimiento", "Fecha de nacimiento", false, "date"],
  ["sexo", "Sexo"],
  ["direccion", "Dirección"],
  ["distrito", "Distrito"],
  ["ocupacion", "Ocupación"],
  ["estado_civil", "Estado civil"],
  ["contacto_emergencia", "Contacto de emergencia"],
  ["telefono_emergencia", "Teléfono de emergencia", false, "tel"],
  ["parentesco_emergencia", "Parentesco de emergencia"],
];

const CAMPO = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#11B9BB] focus:ring-2 focus:ring-[#11B9BB]/20";
const FORM_CITA_INICIAL = { servicio_id: "", odontologo_id: "", fecha: "", hora_inicio: "" };
const FORM_PAGO_INICIAL = { presupuesto_id: "", monto: "", fecha_declarada: "", metodo: "transferencia", referencia: "" };
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
  const [finanzas, setFinanzas] = useState({ presupuestos: [], pagos: [], declaraciones: [], respuestas: [] });
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
  const [pagoForm, setPagoForm] = useState(FORM_PAGO_INICIAL);
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

  const responderPresupuesto = async (id, respuesta) => {
    await ejecutar(() => api.put(`/portal-paciente/presupuestos/${id}/respuesta`, { respuesta }), "Tu respuesta quedó registrada.");
  };

  const declararPago = async (event) => {
    event.preventDefault();
    await ejecutar(async () => {
      const { data } = await api.post("/portal-paciente/pagos/declaraciones", pagoForm);
      setPagoForm(FORM_PAGO_INICIAL);
      setMensaje(data.mensaje);
    }, "La declaración del pago fue enviada.");
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

  const cerrarSesion = () => {
    localStorage.clear();
    setIsLogged(false);
    window.location.reload();
  };

  const notificacionesNoLeidas = notificaciones.filter((item) => !item.leida).length;

  if (cargando) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Cargando tu portal...</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-700">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#11B9BB] text-white md:flex">
        <div className="border-b border-white/20 px-5 py-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Clínica</p>
          <h1 className="mt-1 text-lg font-extrabold">Las Begonias</h1>
          <p className="mt-4 truncate text-sm font-semibold">{nombrePaciente(perfil)}</p>
          <p className="text-xs text-white/75">Portal del paciente</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {SECCIONES.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setSeccion(id)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${seccion === id ? "bg-white text-[#087f81]" : "text-white/85 hover:bg-white/15"}`}>
              {label}
              {id === "resumen" && notificacionesNoLeidas > 0 && <span className="float-right rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{notificacionesNoLeidas}</span>}
            </button>
          ))}
        </nav>
        <button type="button" onClick={cerrarSesion} className="m-4 rounded-xl border border-white/30 bg-white/10 px-3 py-2.5 text-sm font-bold hover:bg-white hover:text-[#087f81]">Cerrar sesión</button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800">{SECCIONES.find(([id]) => id === seccion)?.[1]}</h2>
              <p className="text-xs text-slate-500 md:hidden">{nombrePaciente(perfil)} · Paciente</p>
            </div>
            <button type="button" onClick={cargarPortal} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Actualizar</button>
          </div>
          <nav className="mx-auto mt-3 flex max-w-6xl gap-2 overflow-x-auto pb-1 md:hidden">
            {SECCIONES.map(([id, label]) => <button key={id} type="button" onClick={() => setSeccion(id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${seccion === id ? "bg-[#11B9BB] text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}
          </nav>
        </header>

        <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
          {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{mensaje}<button type="button" onClick={() => setMensaje("")} className="float-right">×</button></div>}

          {seccion === "resumen" && (
            <>
              <div className="rounded-2xl bg-gradient-to-r from-[#11B9BB] to-[#0e999b] p-6 text-white shadow-sm sm:p-8">
                <p className="text-sm text-white/80">Bienvenido/a</p>
                <h1 className="mt-1 text-2xl font-bold">{nombrePaciente(perfil)}</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/85">Consulta tus citas, datos personales, documentos autorizados y movimientos financieros desde tu espacio privado.</p>
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
            <Panel titulo="Mis datos personales" descripcion="El DNI y el correo usado para iniciar sesión son de solo lectura. Para corregirlos, contacta con la clínica.">
              <form onSubmit={guardarPerfil} className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-500">DNI<input value={perfil.dni || ""} readOnly className={`${CAMPO} bg-slate-100`} /></label>
                <label className="block text-xs font-bold text-slate-500">Correo de inicio de sesión<input value={emailAcceso} readOnly className={`${CAMPO} bg-slate-100`} /></label>
                {CAMPOS_PERFIL.map(([campo, label, requerido, tipo]) => <label key={campo} className="block text-xs font-bold text-slate-500">{label}<input type={tipo || "text"} required={Boolean(requerido)} value={perfil[campo] || ""} onChange={(event) => cambiarPerfil(campo, event.target.value)} className={CAMPO} /></label>)}
                <button disabled={guardando} className="rounded-xl bg-[#11B9BB] px-6 py-3 text-sm font-bold text-white hover:bg-[#0e999b] disabled:opacity-60 sm:col-span-2 sm:justify-self-start">{guardando ? "Guardando..." : "Guardar mis datos"}</button>
              </form>
            </Panel>
          )}

          {seccion === "citas" && (
            <div className="space-y-5">
              <Panel titulo="Solicitar una cita" descripcion="Consulta los espacios disponibles. La clínica confirmará la solicitud antes de que la cita quede reservada.">
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
                <p className="mt-1 text-xs text-amber-800">Las declaraciones pendientes de verificación no se descuentan del saldo.</p>
              </div>
              <Panel titulo="Presupuestos" descripcion="Acepta o rechaza presupuestos emitidos para ti.">
                {finanzas.presupuestos.length === 0 ? <MensajeVacio>No tienes presupuestos registrados.</MensajeVacio> : <div className="space-y-3">{finanzas.presupuestos.map((presupuesto) => {
                  const respuesta = finanzas.respuestas.find((item) => item.presupuesto_id === presupuesto.id)?.respuesta;
                  const pagado = finanzas.pagos.filter((pago) => pago.presupuesto_id === presupuesto.id).reduce((subtotal, pago) => subtotal + Number(pago.monto), 0);
                  return <article key={presupuesto.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-800">{presupuesto.titulo || presupuesto.descripcion}</p><p className="mt-1 text-xs text-slate-500">Vigencia: {formatoFecha(presupuesto.fecha_vigencia)} · Estado: {presupuesto.estado}</p><p className="mt-2 text-lg font-bold text-[#0e999b]">{formatoImporte(presupuesto.monto)}</p><p className="mt-1 text-xs font-semibold text-amber-800">Saldo: {formatoImporte(Math.max(0, Number(presupuesto.monto) - pagado))}</p>{presupuesto.PresupuestoDetalles?.map((detalle) => <p key={detalle.id} className="mt-1 text-xs text-slate-600">{detalle.cantidad} × {detalle.servicio_nombre}</p>)}</div>{respuesta ? <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">Tu respuesta: {respuesta}</span> : <div className="flex gap-2"><button type="button" onClick={() => responderPresupuesto(presupuesto.id, "Aceptado")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Aceptar</button><button type="button" onClick={() => responderPresupuesto(presupuesto.id, "Rechazado")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Rechazar</button></div>}</div></article>;
                })}</div>}
              </Panel>
              <Panel titulo="Registrar un pago" descripcion="La declaración no es un comprobante ni confirma que el pago se haya recibido. La clínica debe verificarla.">
                <form onSubmit={declararPago} className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-500">Presupuesto (opcional)<select value={pagoForm.presupuesto_id} onChange={(event) => setPagoForm((form) => ({ ...form, presupuesto_id: event.target.value }))} className={CAMPO}><option value="">Sin asociar</option>{finanzas.presupuestos.map((item) => <option key={item.id} value={item.id}>{item.titulo || item.descripcion} · {formatoImporte(item.monto)}</option>)}</select></label>
                  <label className="text-xs font-bold text-slate-500">Monto<input required type="number" min="0.01" step="0.01" value={pagoForm.monto} onChange={(event) => setPagoForm((form) => ({ ...form, monto: event.target.value }))} className={CAMPO} /></label>
                  <label className="text-xs font-bold text-slate-500">Fecha del pago<input required type="date" max={fechaActualLocal()} value={pagoForm.fecha_declarada} onChange={(event) => setPagoForm((form) => ({ ...form, fecha_declarada: event.target.value }))} className={CAMPO} /></label>
                  <label className="text-xs font-bold text-slate-500">Medio de pago<select value={pagoForm.metodo} onChange={(event) => setPagoForm((form) => ({ ...form, metodo: event.target.value }))} className={CAMPO}>{[["transferencia", "Transferencia"], ["tarjeta", "Tarjeta"], ["efectivo", "Efectivo"], ["cheque", "Cheque"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="text-xs font-bold text-slate-500 sm:col-span-2">Referencia o número de operación (opcional)<input maxLength={160} value={pagoForm.referencia} onChange={(event) => setPagoForm((form) => ({ ...form, referencia: event.target.value }))} className={CAMPO} /></label>
                  <button disabled={guardando} className="rounded-xl bg-[#11B9BB] px-5 py-3 text-sm font-bold text-white hover:bg-[#0e999b] disabled:opacity-60 sm:col-span-2 sm:justify-self-start">Enviar para verificación</button>
                </form>
              </Panel>
              <Panel titulo="Pagos registrados por la clínica">
                {finanzas.pagos.length === 0 ? <MensajeVacio>Aún no hay pagos confirmados registrados.</MensajeVacio> : <ul className="divide-y divide-slate-100">{finanzas.pagos.map((pago) => <li key={pago.id} className="flex justify-between gap-3 py-3 text-sm"><span>{formatoFecha(pago.created_at)} · {pago.metodo}</span><strong>{formatoImporte(pago.monto)}</strong></li>)}</ul>}
              </Panel>
              <Panel titulo="Declaraciones pendientes o revisadas">
                {finanzas.declaraciones.length === 0 ? <MensajeVacio>No has declarado pagos.</MensajeVacio> : <ul className="divide-y divide-slate-100">{finanzas.declaraciones.map((pago) => <li key={pago.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{formatoFecha(pago.fecha_declarada)} · {pago.metodo} · {pago.estado}</span><strong>{formatoImporte(pago.monto)}</strong></li>)}</ul>}
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
