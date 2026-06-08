export const toNumber = (value) => Number(value) || 0;

export const getPacienteId = (item) => Number(item?.paciente_id);

export const calcularDeudas = (presupuestos, pagos, montoMinimo = 0) => {
  const saldos = presupuestos.map((presupuesto) => ({
    presupuesto,
    pagado: 0,
    saldo: toNumber(presupuesto.monto),
  }));

  pagos.forEach((pago) => {
    if (pago.presupuesto_id) {
      const item = saldos.find(
        (s) => s.presupuesto.id === Number(pago.presupuesto_id)
      );
      if (item) {
        const monto = toNumber(pago.monto);
        item.pagado += monto;
        item.saldo -= monto;
      }
    }
  });

  pagos
    .filter((pago) => !pago.presupuesto_id)
    .forEach((pago) => {
      let restante = toNumber(pago.monto);
      const pacienteId = getPacienteId(pago);

      saldos
        .filter(
          (s) => getPacienteId(s.presupuesto) === pacienteId && s.saldo > 0
        )
        .forEach((item) => {
          if (restante <= 0) return;
          const aplicado = Math.min(item.saldo, restante);
          item.pagado += aplicado;
          item.saldo -= aplicado;
          restante -= aplicado;
        });
    });

  return saldos.filter((s) => {
    if (montoMinimo) {
      return s.saldo >= montoMinimo;
    }
    return s.saldo > 0;
  });
};

export const getDeudaPaciente = (presupuestos, pagos, pacienteId) =>
  calcularDeudas(presupuestos, pagos)
    .filter((deuda) => getPacienteId(deuda.presupuesto) === Number(pacienteId))
    .reduce((sum, deuda) => sum + deuda.saldo, 0);

export const contarPresupuestosPendientes = (presupuestos, pagos, pacienteId) =>
  calcularDeudas(presupuestos, pagos).filter(
    (deuda) => getPacienteId(deuda.presupuesto) === Number(pacienteId)
  ).length;

export const formatearMoneda = (monto) =>
  `S/ ${toNumber(monto).toFixed(2)}`;

export const getTotalDeudas = (presupuestos, pagos) =>
  calcularDeudas(presupuestos, pagos).reduce((sum, deuda) => sum + deuda.saldo, 0);

export const contarPacientesConDeuda = (presupuestos, pagos) => {
  const ids = new Set(
    calcularDeudas(presupuestos, pagos).map((deuda) =>
      getPacienteId(deuda.presupuesto)
    )
  );
  return ids.size;
};

const getFechaPago = (pago) => new Date(pago.created_at || pago.createdAt);

export const getIngresosDelMes = (pagos, referencia = new Date()) => {
  const mes = referencia.getMonth();
  const anio = referencia.getFullYear();

  return pagos
    .filter((pago) => {
      const fecha = getFechaPago(pago);
      return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    })
    .reduce((sum, pago) => sum + toNumber(pago.monto), 0);
};

export const getIngresosSemanales = (pagos, referencia = new Date()) => {
  const hoy = new Date(referencia);
  hoy.setHours(0, 0, 0, 0);

  const diaSemana = hoy.getDay();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));

  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return dias.map((dia, index) => {
    const fechaDia = new Date(lunes);
    fechaDia.setDate(lunes.getDate() + index);

    const monto = pagos
      .filter((pago) => {
        const fecha = getFechaPago(pago);
        fecha.setHours(0, 0, 0, 0);
        return fecha.getTime() === fechaDia.getTime();
      })
      .reduce((sum, pago) => sum + toNumber(pago.monto), 0);

    return { dia, monto, fecha: fechaDia };
  });
};

export const contarPresupuestosPorVencer = (
  presupuestos,
  pagos,
  dias = 7,
  referencia = new Date()
) => {
  const hoy = new Date(referencia);
  hoy.setHours(0, 0, 0, 0);

  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + dias);

  return calcularDeudas(presupuestos, pagos).filter((deuda) => {
    const vigencia = new Date(deuda.presupuesto.fecha_vigencia);
    vigencia.setHours(0, 0, 0, 0);
    return vigencia >= hoy && vigencia <= limite;
  }).length;
};

