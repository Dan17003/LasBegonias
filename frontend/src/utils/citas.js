export const parseFecha = (fecha) => {
  if (!fecha) return null;

  if (typeof fecha === "string") {
    const [y, m, d] = fecha.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const date = new Date(fecha);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const formatearFechaCorta = (fecha) => {
  const date = parseFecha(fecha);
  if (!date) return "—";

  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const diasDesdeHoy = (fecha) => {
  const date = parseFecha(fecha);
  if (!date) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((date - hoy) / (1000 * 60 * 60 * 24));
};

export const textoRelativoPasado = (fecha) => {
  const dias = diasDesdeHoy(fecha);
  if (dias === null) return "Sin cita";
  if (dias === 0) return "Hoy";
  if (dias === -1) return "Ayer";
  if (dias < -1) return `Hace ${Math.abs(dias)} días`;
  return formatearFechaCorta(fecha);
};

export const getResumenCitas = (citas, pacienteId) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const citasPaciente = citas
    .filter((cita) => Number(cita.paciente_id) === Number(pacienteId))
    .filter((cita) => cita.estado !== "Cancelada")
    .map((cita) => ({ ...cita, fechaDate: parseFecha(cita.fecha) }))
    .filter((cita) => cita.fechaDate);

  const pasadas = citasPaciente
    .filter((cita) => cita.fechaDate < hoy)
    .sort((a, b) => b.fechaDate - a.fechaDate);

  const futuras = citasPaciente
    .filter((cita) => cita.fechaDate >= hoy)
    .sort((a, b) => a.fechaDate - b.fechaDate);

  return {
    ultima: pasadas[0] || null,
    proxima: futuras[0] || null,
  };
};

export const esMismaFecha = (fecha, referencia = new Date()) => {
  const fechaCita = parseFecha(fecha);
  const fechaRef = new Date(referencia);
  fechaRef.setHours(0, 0, 0, 0);
  if (!fechaCita) return false;
  return fechaCita.getTime() === fechaRef.getTime();
};

export const formatearHora = (hora) => {
  if (!hora) return "—";

  const [horas, minutos = "00"] = hora.split(":");
  const horaNum = Number(horas);
  const ampm = horaNum >= 12 ? "PM" : "AM";
  const hora12 = horaNum % 12 || 12;

  return `${hora12}:${minutos.substring(0, 2)} ${ampm}`;
};

export const getCitasDelDia = (citas, referencia = new Date()) =>
  citas
    .filter(
      (cita) =>
        esMismaFecha(cita.fecha, referencia) && cita.estado !== "Cancelada"
    )
    .sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));

export const getNombrePacienteCita = (cita, pacientes = []) => {
  if (cita.Paciente) {
    return `${cita.Paciente.nombres || ""} ${cita.Paciente.apellidos || ""}`.trim();
  }

  const paciente = pacientes.find(
    (p) => Number(p.id) === Number(cita.paciente_id)
  );

  if (!paciente) return "Paciente no registrado";
  return `${paciente.nombres || ""} ${paciente.apellidos || ""}`.trim();
};

export const getCitasDelMes = (citas, referencia = new Date()) => {
  const mes = referencia.getMonth();
  const anio = referencia.getFullYear();

  return citas.filter((cita) => {
    const fecha = parseFecha(cita.fecha);
    if (!fecha) return false;
    return fecha.getMonth() === mes && fecha.getFullYear() === anio;
  });
};

export const getDoctorDestacado = (citas, referencia = new Date()) => {
  const conteo = {};

  getCitasDelMes(citas, referencia)
    .filter((cita) => cita.estado !== "Cancelada")
    .forEach((cita) => {
      if (!cita.doctor) return;
      conteo[cita.doctor] = (conteo[cita.doctor] || 0) + 1;
    });

  const ranking = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  return ranking[0] || null;
};

export const getPorcentajeInasistencias = (citas, referencia = new Date()) => {
  const citasMes = getCitasDelMes(citas, referencia);
  if (!citasMes.length) return 0;

  const canceladas = citasMes.filter(
    (cita) => cita.estado === "Cancelada"
  ).length;

  return (canceladas / citasMes.length) * 100;
};

