import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { corregirEncoding } from "../utils/texto";

export default function Agenda() {
  const [view, setView] = useState("dia");
  const [selectedDoctor, setSelectedDoctor] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editandoCita, setEditandoCita] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [odontologos, setOdontologos] = useState([]);

  const coloresMotivos = {
    "Limpieza dental": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Consulta general": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Control": "bg-amber-50 text-amber-700 border-amber-200",
    "Tratamiento": "bg-purple-50 text-purple-700 border-purple-200",
    "Ortodoncia": "bg-rose-50 text-rose-700 border-rose-200"
  };

  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);

  const [formCita, setFormCita] = useState({
    paciente_id: "",
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    motivo: "Consulta general",
    doctor: "",
    servicio: "",
    consultorio: "",
    nota_cita: "",
    estado: "Programada",
  });

  const formCitaVacio = () => ({
    paciente_id: "",
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    motivo: "Consulta general",
    doctor: doctoresDisponibles[0]?.nombre || "",
    servicio: "",
    consultorio: "",
    nota_cita: "",
    estado: "Programada",
  });

  const obtenerOdontologos = async () => {
    try {
      const res = await api.get("/odontologos");
      const lista = (res.data || []).map((d) => ({
        ...d,
        nombre: corregirEncoding(d.nombre),
        turno: corregirEncoding(d.turno),
      }));
      setOdontologos(lista);

      const primerDisponible = lista.find((d) => d.disponible !== false);
      if (primerDisponible) {
        setFormCita((prev) => ({
          ...prev,
          doctor: prev.doctor || primerDisponible.nombre,
        }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const nombresDoctores = useMemo(
    () => ["Todos", ...odontologos.map((d) => corregirEncoding(d.nombre))],
    [odontologos]
  );

  const doctoresDisponibles = odontologos.filter((d) => d.disponible !== false);

  useEffect(() => {
    if (selectedDoctor !== "Todos" && !nombresDoctores.includes(selectedDoctor)) {
      setSelectedDoctor("Todos");
    }
  }, [nombresDoctores, selectedDoctor]);

  const obtenerPacientes = async () => {
    try {
      const res = await api.get("/pacientes");
      setPacientes(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const obtenerCitas = async () => {
    try {
      const res = await api.get("/citas");
      setCitas(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    obtenerPacientes();
    obtenerCitas();
    obtenerOdontologos();
  }, []);

  const horasTimeline = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

  // Función para cambiar la fecha según la vista
  const cambiarFecha = (dias) => {
    const nuevaFecha = new Date(selectedDate);
    
    if (view === "mes") {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + dias);
    } else if (view === "semana") {
      nuevaFecha.setDate(nuevaFecha.getDate() + (dias * 7));
    } else {
      nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    }
    
    setSelectedDate(nuevaFecha);
  };

  const obtenerNombreDia = (fecha) => {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return dias[fecha.getDay()];
  };

  const formatearFecha = (fecha) => {
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
  };

  const sameDay = (d1, d2) => {
    let fecha1Str, fecha2Str;
    
    if (typeof d1 === 'string') {
      fecha1Str = d1.substring(0, 10);
    } else {
      fecha1Str = d1.getFullYear() + '-' + 
                  String(d1.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(d1.getDate()).padStart(2, '0');
    }
    
    if (typeof d2 === 'string') {
      fecha2Str = d2.substring(0, 10);
    } else {
      fecha2Str = d2.getFullYear() + '-' + 
                  String(d2.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(d2.getDate()).padStart(2, '0');
    }
    
    return fecha1Str === fecha2Str;
  };

  const citasFiltradas = citas.filter(c => {
    const cumpleDoctor = selectedDoctor === "Todos" || c.doctor === selectedDoctor;
    
    if (!cumpleDoctor) return false;
    
    if (view === "dia" && c.fecha) {
      return sameDay(c.fecha, selectedDate);
    }
    
    return true;
  });

  const obtenerCitasDia = (diaOffset) => {
    const fecha = new Date(selectedDate);
    fecha.setDate(selectedDate.getDate() - selectedDate.getDay() + 1 + diaOffset);
    
    return citas.filter(cita => {
      const cumpleDoctor = selectedDoctor === "Todos" || cita.doctor === selectedDoctor;
      if (!cita.fecha || !cumpleDoctor) return false;
      return sameDay(cita.fecha, fecha);
    });
  };

  const obtenerCitasDiaDelMes = (dia) => {
    const fecha = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dia);
    
    return citas.filter(cita => {
      const cumpleDoctor = selectedDoctor === "Todos" || cita.doctor === selectedDoctor;
      if (!cita.fecha || !cumpleDoctor) return false;
      return sameDay(cita.fecha, fecha);
    });
  };

  const cerrarModalCita = () => {
    setShowModal(false);
    setEditandoCita(null);
    setFormCita(formCitaVacio());
  };

  const abrirCrearCita = () => {
    setEditandoCita(null);
    setFormCita(formCitaVacio());
    setShowModal(true);
  };

  const abrirEditarCita = (cita) => {
    setEditandoCita(cita);
    setFormCita({
      paciente_id: String(cita.paciente_id),
      fecha: cita.fecha?.substring(0, 10) || "",
      hora_inicio: cita.hora_inicio || "",
      hora_fin: cita.hora_fin || "",
      motivo: cita.motivo || "Consulta general",
      doctor: cita.doctor || "",
      servicio: cita.servicio || "",
      consultorio: cita.consultorio || "",
      nota_cita: cita.nota_cita || "",
      estado: cita.estado || "Programada",
    });
    setShowModal(true);
  };

  const guardarCita = async (e) => {
    e.preventDefault();

    const payload = {
      paciente_id: Number(formCita.paciente_id),
      fecha: formCita.fecha,
      hora_inicio: formCita.hora_inicio,
      hora_fin: formCita.hora_fin,
      motivo: formCita.motivo,
      doctor: formCita.doctor,
      servicio: formCita.servicio,
      consultorio: formCita.consultorio,
      nota_cita: formCita.nota_cita,
      estado: formCita.estado,
    };

    try {
      if (editandoCita) {
        await api.put(`/citas/${editandoCita.id}`, payload);
      } else {
        await api.post("/citas", payload);
      }

      await obtenerCitas();
      cerrarModalCita();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "No se pudo guardar la cita.");
    }
  };

  const eliminarCita = async () => {
    if (!editandoCita) return;

    const confirmar = window.confirm("¿Eliminar esta cita? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    try {
      await api.delete(`/citas/${editandoCita.id}`);
      await obtenerCitas();
      cerrarModalCita();
    } catch (error) {
      alert(error.response?.data?.error || "No se pudo eliminar la cita.");
    }
  };

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-800">Agenda</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Odontólogo:</span>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {nombresDoctores.map((doc) => (
              <button
                key={doc}
                onClick={() => setSelectedDoctor(doc)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${selectedDoctor === doc ? "bg-white text-slate-800 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {doc}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={() => cambiarFecha(-1)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            title={view === "mes" ? "Mes anterior" : view === "semana" ? "Semana anterior" : "Día anterior"}>
            ← {view === "mes" ? "Mes Ant" : view === "semana" ? "Sem Ant" : "Ant"}
          </button>
          <button 
            onClick={() => cambiarFecha(1)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            title={view === "mes" ? "Próximo mes" : view === "semana" ? "Próxima semana" : "Próximo día"}>
            {view === "mes" ? "Mes Sig" : view === "semana" ? "Sem Sig" : "Sig"} →
          </button>
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold hover:bg-slate-100 text-slate-700">
            Hoy
          </button>
          <div className="flex items-center gap-1 font-semibold text-slate-700 text-sm">
            <span>
              {view === "mes" 
                ? new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(selectedDate)
                : formatearFecha(selectedDate)
              }
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 justify-between sm:justify-end">
          <div className="flex border border-slate-200 rounded-xl p-1 bg-white">
            {[{ id: "dia", label: "Día" }, { id: "semana", label: "Semana" }, { id: "mes", label: "Mes" }].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${view === v.id ? "bg-[#11B9BB] text-white shadow-xs font-bold" : "text-slate-500 hover:bg-slate-50"
                  }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={abrirCrearCita}
            className="bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nueva cita
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {view === "dia" && (
          <div className="flex flex-col">
            <div className="bg-slate-50 border-b border-slate-100 py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              {obtenerNombreDia(selectedDate)} - {formatearFecha(selectedDate)}
            </div>

            <div className="relative divide-y divide-slate-100">
              {horasTimeline.map((hora) => {
                const prefixHora = hora.split(":")[0];
                const sufijoAmPm = hora.split(" ")[1];

                let horaTimeline24 = Number(prefixHora);
                if (sufijoAmPm === "PM" && horaTimeline24 !== 12) {
                  horaTimeline24 += 12;
                } else if (sufijoAmPm === "AM" && horaTimeline24 === 12) {
                  horaTimeline24 = 0;
                }

                const citasDeLaHora = citasFiltradas.filter((cita) => {
                  if (!cita.hora_inicio) return false;
                  const citaHora = Number(cita.hora_inicio.substring(0, 2));
                  return citaHora === horaTimeline24;
                });

                return (
                  <div key={hora} className="flex min-h-[64px] relative">
                    <div className="w-24 text-right pr-4 py-2 text-[11px] font-medium text-slate-400 border-r border-slate-100 bg-slate-50/30">
                      {hora}
                    </div>

                    <div className="flex-1 p-1.5 relative flex flex-col sm:flex-row gap-2">
                      {citasDeLaHora.map((cita) => (
                        <div
                          key={cita.id}
                          onClick={() => abrirEditarCita(cita)}
                          className={`flex-1 p-2.5 rounded-xl border cursor-pointer hover:opacity-90 ${coloresMotivos[cita.motivo] || "bg-slate-50 text-slate-700 border-slate-200"} shadow-2xs flex flex-col justify-center`}
                        >
                          <p className="font-bold text-xs">
                            {cita.Paciente?.nombres}
                          </p>
                          <p className="text-[10px] opacity-85 mt-0.5">
                            {cita.hora_inicio} - {cita.motivo} ({cita.doctor})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "semana" && (
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map((dia, idx) => {
              const citasDiaActual = obtenerCitasDia(idx);
              return (
                <div key={dia} className="flex flex-col min-h-[450px]">
                  <div className="bg-slate-50 border-b border-slate-100 py-2.5 text-center text-xs font-bold text-slate-400 uppercase">
                    {dia}
                  </div>
                  <div className="p-3 space-y-2.5 flex-1 bg-slate-50/10 overflow-y-auto">
                    {citasDiaActual.length > 0 ? (
                      citasDiaActual.map((cita) => (
                        <div
                          key={cita.id}
                          onClick={() => abrirEditarCita(cita)}
                          className={`p-2 rounded-xl border cursor-pointer hover:opacity-90 ${coloresMotivos[cita.motivo] || "bg-slate-50 text-slate-700 border-slate-200"} text-xs shadow-2xs`}
                        >
                          <span className="font-bold block text-slate-800">{cita.Paciente?.nombres}</span>
                          <span className="text-[10px] block mt-0.5">{cita.hora_inicio}</span>
                          <span className="text-[9px] opacity-75">{cita.motivo}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-slate-300 text-center py-6">Sin citas</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "mes" && (
          <div className="p-4 overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="font-semibold text-xs text-slate-400 uppercase py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => {
                  const citasDiaDelMes = obtenerCitasDiaDelMes(i + 1);
                  return (
                    <div key={i} className="min-h-24 border border-slate-100 rounded-xl p-2 text-left bg-slate-50/30 flex flex-col hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                        {citasDiaDelMes.length > 0 && (
                          <span className="text-[10px] font-bold bg-[#11B9BB] text-white px-1.5 py-0.5 rounded-full">
                            {citasDiaDelMes.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 flex-1 overflow-y-auto">
                        {citasDiaDelMes.map((cita) => (
                          <div
                            key={cita.id}
                            onClick={() => abrirEditarCita(cita)}
                            className={`text-[7.5px] p-1 rounded border cursor-pointer hover:opacity-90 ${coloresMotivos[cita.motivo] || "bg-slate-100 border-slate-200"}`}
                          >
                            <div className="font-bold text-slate-800 truncate">{cita.Paciente?.nombres || "Cita"}</div>
                            <div className="text-slate-600">{cita.hora_inicio?.substring(0, 5)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <form onSubmit={guardarCita} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              {editandoCita ? "Editar Cita Dental" : "Programación de Cita Dental"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Paciente
                </label>

                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={formCita.paciente_id}
                  onChange={(e) =>
                    setFormCita({
                      ...formCita,
                      paciente_id: e.target.value,
                    })
                  }
                >
                  <option value="">
                    Seleccionar paciente
                  </option>

                  {pacientes.map((paciente) => (
                    <option
                      key={paciente.id}
                      value={paciente.id}
                    >
                      {paciente.nombres} {paciente.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Fecha
                </label>

                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={formCita.fecha}
                  onChange={(e) =>
                    setFormCita({
                      ...formCita,
                      fecha: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Hora Inicio
                  </label>

                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    value={formCita.hora_inicio}
                    onChange={(e) =>
                      setFormCita({
                        ...formCita,
                        hora_inicio: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccionar hora</option>
                    {horasTimeline.map((hora) => {
                      const horaNum = hora.split(":")[0];
                      const sufijoAmPm = hora.split(" ")[1];
                      let hora24 = Number(horaNum);
                      if (sufijoAmPm === "PM" && horaNum !== "12") {
                        hora24 += 12;
                      } else if (sufijoAmPm === "AM" && horaNum === "12") {
                        hora24 = 0;
                      }
                      return (
                        <option key={hora} value={`${String(hora24).padStart(2, "0")}:00:00`}>
                          {hora}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Hora Fin
                  </label>

                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    value={formCita.hora_fin}
                    onChange={(e) =>
                      setFormCita({
                        ...formCita,
                        hora_fin: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccionar hora</option>
                    {horasTimeline.map((hora) => {
                      const horaNum = hora.split(":")[0];
                      const sufijoAmPm = hora.split(" ")[1];
                      let hora24 = Number(horaNum);
                      if (sufijoAmPm === "PM" && horaNum !== "12") {
                        hora24 += 12;
                      } else if (sufijoAmPm === "AM" && horaNum === "12") {
                        hora24 = 0;
                      }
                      return (
                        <option key={hora} value={`${String(hora24).padStart(2, "0")}:00:00`}>
                          {hora}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Especialidad / Motivo</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                    value={formCita.motivo}
                    onChange={(e) =>
                      setFormCita({
                        ...formCita,
                        motivo: e.target.value
                      })
                    }
                  >
                    <option value="Consulta general">Consulta general</option>
                    <option value="Control">Control</option>
                    <option value="Tratamiento">Tratamiento en Curso</option>
                    <option value="Ortodoncia">Primera Consulta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Servicio
                </label>

                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  value={formCita.servicio}
                  onChange={(e) =>
                    setFormCita({
                      ...formCita,
                      servicio: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="Limpieza Dental">Limpieza Dental</option>
                  <option value="Ortodoncia">Ortodoncia</option>
                  <option value="Endodoncia">Endodoncia</option>
                  <option value="Extracción">Extracción</option>
                  <option value="Blanqueamiento">Blanqueamiento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Consultorio
                </label>

                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  value={formCita.consultorio}
                  onChange={(e) =>
                    setFormCita({
                      ...formCita,
                      consultorio: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="Consultorio 1">Consultorio 1</option>
                  <option value="Consultorio 2">Consultorio 2</option>
                  <option value="Consultorio 3">Consultorio 3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Estado de la cita</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                  value={formCita.estado}
                  onChange={(e) =>
                    setFormCita({
                      ...formCita,
                      estado: e.target.value,
                    })
                  }
                >
                  <option value="Programada">Programada</option>
                  <option value="Confirmada">Confirmada</option>
                  <option value="Atendida">Atendida</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Asignar Odontólogo</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-700"
                  value={formCita.doctor}
                  onChange={(e) =>
                    setFormCita({
                      ...formCita,
                      doctor: e.target.value
                    })
                  }
                >
                  <option value="">Seleccionar odontólogo</option>
                  {doctoresDisponibles.map((doc) => (
                    <option key={doc.id} value={doc.nombre}>
                      {doc.nombre} — {doc.especialidad}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Observaciones
              </label>

              <textarea
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="Observaciones de la cita..."
                value={formCita.nota_cita}
                onChange={(e) =>
                  setFormCita({
                    ...formCita,
                    nota_cita: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex justify-between gap-2.5 mt-6 pt-4 border-t border-slate-100">
              {editandoCita ? (
                <button
                  type="button"
                  onClick={eliminarCita}
                  className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl border border-rose-100"
                >
                  Eliminar
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2.5">
                <button type="button" onClick={cerrarModalCita} className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm">
                  {editandoCita ? "Guardar Cambios" : "Agendar Cita"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}