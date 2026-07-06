import { parseFecha } from "./citas";

const toNumber = (valor) => Number(valor) || 0;

export const formatearSoles = (monto) =>
  `S/ ${toNumber(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const obtenerMesesDisponibles = (citas = [], pagos = []) => {
  const meses = new Map();

  const registrar = (fecha) => {
    const date = parseFecha(fecha);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
    meses.set(key, label.charAt(0).toUpperCase() + label.slice(1));
  };

  citas.forEach((c) => registrar(c.fecha));
  pagos.forEach((p) => registrar(p.created_at));

  if (meses.size === 0) {
    const hoy = new Date();
    const key = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    const label = hoy.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
    meses.set(key, label.charAt(0).toUpperCase() + label.slice(1));
  }

  return Array.from(meses.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([value, label]) => ({ value, label }));
};

const perteneceAlMes = (fecha, mesKey) => {
  const date = parseFecha(fecha);
  if (!date || !mesKey) return false;
  const [anio, mes] = mesKey.split("-").map(Number);
  return date.getFullYear() === anio && date.getMonth() + 1 === mes;
};

export const filtrarCitasMes = (citas, mesKey) =>
  citas.filter((c) => perteneceAlMes(c.fecha, mesKey));

export const filtrarPagosMes = (pagos, mesKey) =>
  pagos.filter((p) => perteneceAlMes(p.created_at || p.createdAt, mesKey));

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const obtenerMesesSemestre = (anio, semestre) => {
  const inicio = semestre === 1 ? 0 : 6;
  return Array.from({ length: 6 }, (_, i) => {
    const mes = inicio + i;
    const value = `${anio}-${String(mes + 1).padStart(2, "0")}`;
    const label = `${MESES_CORTOS[mes]} ${anio}`;
    return { value, label, mes, anio };
  });
};

export const calcularTendenciaSemestre = (pagos, anio, semestre) => {
  const meses = obtenerMesesSemestre(anio, semestre);
  return meses.map((mes) => {
    const total = pagos
      .filter((pago) => {
        const fecha = parseFecha(pago.created_at || pago.createdAt);
        if (!fecha) return false;
        return fecha.getFullYear() === anio && fecha.getMonth() === mes.mes;
      })
      .reduce((sum, pago) => sum + toNumber(pago.monto), 0);
    return { ...mes, total };
  });
};

export const calcularResumenMes = (citas, pagos, mesKey) => {
  const citasMes = filtrarCitasMes(citas, mesKey);
  const pagosMes = filtrarPagosMes(pagos, mesKey);

  const totalRecaudado = pagosMes.reduce((sum, p) => sum + toNumber(p.monto), 0);
  const canceladas = citasMes.filter((c) => c.estado === "Cancelada").length;
  const atendidas = citasMes.filter(
    (c) => c.estado !== "Cancelada" && c.estado !== "Programada"
  ).length;
  const citasActivas = citasMes.length - canceladas;
  const tasaExito = citasMes.length
    ? Math.round((citasActivas / citasMes.length) * 100)
    : 0;
  const tasaInasistencias = citasMes.length
    ? Math.round((canceladas / citasMes.length) * 1000) / 10
    : 0;

  return {
    totalRecaudado,
    citasAtendidas: atendidas || citasActivas,
    citasTotal: citasMes.length,
    tasaExito,
    tasaInasistencias,
    pagosCount: pagosMes.length,
  };
};

export const calcularRendimientoDoctores = (odontologos, citas, pagos, mesKey) => {
  const citasMes = filtrarCitasMes(citas, mesKey);
  const pagosMes = filtrarPagosMes(pagos, mesKey);

  const doctoresBase = odontologos.length
    ? odontologos
    : [...new Set(citasMes.map((c) => c.doctor).filter(Boolean))].map((nombre) => ({
        nombre,
        especialidad: "—",
      }));

  return doctoresBase.map((doc) => {
    const citasDoctor = citasMes.filter((c) => c.doctor === doc.nombre);
    const canceladas = citasDoctor.filter((c) => c.estado === "Cancelada").length;
    const citasActivas = citasDoctor.length - canceladas;
    const efectividad = citasDoctor.length
      ? Math.round((citasActivas / citasDoctor.length) * 100)
      : 0;
    const ingresos = pagosMes
      .filter((p) => p.doctor === doc.nombre)
      .reduce((sum, p) => sum + toNumber(p.monto), 0);

    return {
      doctor: doc.nombre,
      especialidad: doc.especialidad || "—",
      citas: citasDoctor.length,
      efectividad: `${efectividad}%`,
      ingresos: formatearSoles(ingresos),
      ingresosNum: ingresos,
    };
  }).sort((a, b) => b.ingresosNum - a.ingresosNum);
};
