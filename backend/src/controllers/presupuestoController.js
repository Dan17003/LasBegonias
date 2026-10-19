import { Op } from "sequelize";
import {
  Presupuesto, Paciente, Pago, PresupuestoDetalle, Servicio, ServicioSolicitado, Odontologo, Cita,
} from "../models/index.js";

export const crearPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.create({ ...req.body, origen: "recepcion" });
    res.status(201).json(presupuesto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const listarPresupuestos = async (req, res) => {
  try {
    const presupuestos = await Presupuesto.findAll({
      include: [
        {
          model: Paciente,
          attributes: ["id", "nombres", "apellidos"],
        },
        { model: PresupuestoDetalle },
        { model: Cita, attributes: ["id", "fecha", "hora_inicio", "motivo"] },
      ],
    });
    res.json(presupuestos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.findByPk(req.params.id, {
      include: [
        {
          model: Paciente,
          attributes: ["id", "nombres", "apellidos"],
        },
        { model: PresupuestoDetalle },
        { model: Cita, attributes: ["id", "fecha", "hora_inicio", "motivo"] },
      ],
    });
    if (!presupuesto) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }
    res.json(presupuesto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPresupuesto = async (req, res) => {
  try {
    const presupuesto = await Presupuesto.findByPk(req.params.id);
    if (!presupuesto) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }
    await presupuesto.update(req.body);
    res.json(presupuesto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const eliminarPresupuesto = async (req, res) => {
  try {
    const eliminado = await Presupuesto.sequelize.transaction(async (transaction) => {
      const presupuesto = await Presupuesto.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!presupuesto) return false;

      const detalles = await PresupuestoDetalle.findAll({
        attributes: ["id"],
        where: { presupuesto_id: presupuesto.id },
        transaction,
      });
      const detalleIds = detalles.map(({ id }) => id);

      await Pago.update(
        { presupuesto_id: null },
        { where: { presupuesto_id: presupuesto.id }, transaction }
      );

      if (detalleIds.length > 0) {
        const solicitudesVinculadas = await ServicioSolicitado.findAll({
          attributes: ["id"],
          where: { presupuesto_detalle_id: { [Op.in]: detalleIds } },
          transaction,
        });
        const solicitudIds = solicitudesVinculadas.map(({ id }) => id);

        await ServicioSolicitado.update(
          { presupuesto_detalle_id: null },
          { where: { presupuesto_detalle_id: { [Op.in]: detalleIds } }, transaction }
        );
        if (solicitudIds.length > 0) {
          await ServicioSolicitado.update(
            { estado: "pendiente" },
            { where: { id: { [Op.in]: solicitudIds }, estado: "cotizado" }, transaction }
          );
        }
        await PresupuestoDetalle.destroy({
          where: { presupuesto_id: presupuesto.id },
          transaction,
        });
      }

      await presupuesto.destroy({ transaction });
      return true;
    });

    if (!eliminado) return res.status(404).json({ error: "Presupuesto no encontrado" });
    res.json({ mensaje: "Presupuesto eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const parsearMontoCentimos = (value) => {
  if (typeof value === "string" && !/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const monto = Number(value);
  if (!Number.isFinite(monto) || monto <= 0 || monto > 99999999.99) return null;
  if (Math.abs(monto * 100 - Math.round(monto * 100)) > 1e-7) return null;
  return Math.round(monto * 100);
};

const parsearDescuentoBasisPoints = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "string" && !/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const descuento = Number(value);
  if (!Number.isFinite(descuento) || descuento < 0 || descuento >= 100) return null;
  if (Math.abs(descuento * 100 - Math.round(descuento * 100)) > 1e-7) return null;
  return Math.round(descuento * 100);
};

const montoDecimal = (centimos) => (centimos / 100).toFixed(2);

export const listarSolicitudesClinicas = async (_req, res) => {
  try {
    const solicitudes = await ServicioSolicitado.findAll({
      where: { estado: "pendiente" },
      include: [
        { model: Paciente, attributes: ["id", "nombres", "apellidos"] },
        { model: Odontologo, attributes: ["id", "nombre"] },
        { model: Cita, attributes: ["id", "fecha", "hora_inicio", "motivo"] },
      ],
      order: [["creado_en", "ASC"]],
    });
    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearPresupuestoDesdeSolicitudes = async (req, res) => {
  const { paciente_id: pacienteId, fecha_vigencia: fechaVigencia, solicitudes, titulo, nota_interna: notaInterna } = req.body;
  const doctorEnviado = req.body.doctor;
  if (!/^\d+$/.test(String(pacienteId)) || Number(pacienteId) < 1) {
    return res.status(400).json({ error: "paciente_id no válido." });
  }
  let fechaValida = null;
  if (fechaVigencia !== undefined && fechaVigencia !== null && fechaVigencia !== "") {
    const fechaParseada = typeof fechaVigencia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaVigencia)
      ? new Date(`${fechaVigencia}T00:00:00Z`)
      : null;
    if (!fechaParseada || Number.isNaN(fechaParseada.getTime()) ||
        fechaParseada.toISOString().slice(0, 10) !== fechaVigencia) {
      return res.status(400).json({ error: "fecha_vigencia debe ser una fecha válida." });
    }
    fechaValida = fechaVigencia;
  }
  if (titulo != null && (typeof titulo !== "string" || titulo.trim().length > 255)) {
    return res.status(400).json({ error: "El título no es válido." });
  }
  if (notaInterna != null && (typeof notaInterna !== "string" || notaInterna.length > 5000)) {
    return res.status(400).json({ error: "La nota interna no es válida." });
  }
  if (doctorEnviado != null && (typeof doctorEnviado !== "string" || doctorEnviado.trim().length > 255)) {
    return res.status(400).json({ error: "El odontólogo indicado no es válido." });
  }
  if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
    return res.status(400).json({ error: "Incluye al menos una solicitud clínica." });
  }
  const ids = solicitudes.map((linea) => Number(linea?.solicitud_id));
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length) {
    return res.status(400).json({ error: "Los identificadores de solicitud son inválidos o están duplicados." });
  }

  const lineasValidadas = [];
  for (const linea of solicitudes) {
    const cantidad = Number(linea.cantidad);
    const precioCentimos = parsearMontoCentimos(linea.precio_unitario);
    const descuentoBps = parsearDescuentoBasisPoints(linea.descuento_pct);
    if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 10000 ||
        precioCentimos === null || descuentoBps === null) {
      return res.status(400).json({ error: "Cada línea requiere cantidad y precio positivos, y descuento entre 0 y 99.99%." });
    }
    const brutoCentimos = precioCentimos * cantidad;
    const descuentoCentimos = Math.round(brutoCentimos * descuentoBps / 10000);
    const subtotalCentimos = brutoCentimos - descuentoCentimos;
    if (!Number.isSafeInteger(subtotalCentimos) || subtotalCentimos <= 0) {
      return res.status(400).json({ error: "El subtotal de cada servicio debe ser positivo." });
    }
    lineasValidadas.push({
      solicitud_id: Number(linea.solicitud_id),
      cantidad,
      precio_unitario: montoDecimal(precioCentimos),
      descuento_pct: (descuentoBps / 100).toFixed(2),
      subtotalCentimos,
      comentario: typeof linea.comentario === "string" ? linea.comentario.slice(0, 2000) : null,
    });
  }

  const totalCentimos = lineasValidadas.reduce((sum, linea) => sum + linea.subtotalCentimos, 0);
  if (!Number.isSafeInteger(totalCentimos) || totalCentimos <= 0 || totalCentimos > 9999999999) {
    return res.status(400).json({ error: "El total calculado está fuera del rango permitido." });
  }

  try {
    const created = await Presupuesto.sequelize.transaction(async (transaction) => {
      const solicitudesDb = await ServicioSolicitado.findAll({
        where: {
          id: { [Op.in]: ids },
          paciente_id: Number(pacienteId),
          estado: "pendiente",
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (solicitudesDb.length !== ids.length) {
        const error = new Error("Todas las solicitudes deben pertenecer al paciente indicado y seguir pendientes.");
        error.status = 400;
        throw error;
      }
      const citaIds = [...new Set(solicitudesDb.map((solicitud) => solicitud.cita_id).filter(Boolean))];
      if (citaIds.length > 1 || (citaIds.length === 1 && solicitudesDb.some((solicitud) => !solicitud.cita_id))) {
        const error = new Error("Agrupa en un presupuesto solo servicios asociados a la misma cita.");
        error.status = 400;
        throw error;
      }

      const solicitudPorId = new Map(solicitudesDb.map((item) => [item.id, item]));
      const lineasOrdenadas = lineasValidadas.map((linea) => ({
        ...linea,
        solicitud: solicitudPorId.get(linea.solicitud_id),
      }));
      const servicioKeys = lineasOrdenadas.map(({ solicitud }) =>
        solicitud.servicio_id ? `id:${solicitud.servicio_id}` : `nombre:${solicitud.nombre.toLocaleLowerCase("es-PE")}`
      );
      if (new Set(servicioKeys).size !== servicioKeys.length) {
        const error = new Error("El mismo servicio aparece más de una vez para esta cita.");
        error.status = 409;
        throw error;
      }
      const odontologoId = lineasOrdenadas[0].solicitud.odontologo_id;
      if (lineasOrdenadas.some(({ solicitud }) => solicitud.odontologo_id !== odontologoId)) {
        const error = new Error("Un presupuesto solo puede agrupar servicios del mismo odontólogo.");
        error.status = 400;
        throw error;
      }
      const nombres = lineasOrdenadas.map(({ solicitud }) => solicitud.nombre);
      const descripcion = titulo?.trim() || `Servicios odontológicos: ${[...new Set(nombres)].join(", ")}`.slice(0, 255);
      const odontologo = await Odontologo.findByPk(odontologoId, { transaction });
      const doctorRelacionado = odontologo?.nombre;
      if (doctorEnviado?.trim() && doctorEnviado.trim() !== doctorRelacionado) {
        const error = new Error("El odontólogo responsable debe coincidir con el asociado a las solicitudes.");
        error.status = 400;
        throw error;
      }
      const doctor = doctorRelacionado;
      if (!doctor) {
        const error = new Error("No se encontró el odontólogo asociado a las solicitudes.");
        error.status = 400;
        throw error;
      }

      const citaId = citaIds[0] || null;
      if (citaId) {
        const presupuestosExistentes = await Presupuesto.findAll({
          where: { cita_id: citaId },
          attributes: ["id"],
          transaction,
        });
        const presupuestoIds = presupuestosExistentes.map((item) => item.id);
        const servicioIds = lineasOrdenadas.map(({ solicitud }) => solicitud.servicio_id).filter(Boolean);
        const nombresPersonalizados = lineasOrdenadas
          .filter(({ solicitud }) => !solicitud.servicio_id)
          .map(({ solicitud }) => solicitud.nombre);
        const detalleDuplicado = presupuestoIds.length
          ? await PresupuestoDetalle.findOne({
            where: {
              presupuesto_id: presupuestoIds,
              [Op.or]: [
                ...(servicioIds.length ? [{ servicio_id: servicioIds }] : []),
                ...nombresPersonalizados.map((nombre) => ({ servicio_nombre: { [Op.iLike]: nombre } })),
              ],
            },
            transaction,
          })
          : null;
        if (detalleDuplicado) {
          const error = new Error("Uno de los servicios ya está incluido en un presupuesto de esta cita.");
          error.status = 409;
          throw error;
        }
      }

      const presupuesto = await Presupuesto.create({
        paciente_id: Number(pacienteId),
        cita_id: citaId,
        origen: "odontologia",
        descripcion,
        titulo: titulo?.trim() || null,
        nota_interna: notaInterna?.trim() || null,
        monto: montoDecimal(totalCentimos),
        fecha_vigencia: fechaValida,
        doctor,
      }, { transaction });

      const detalles = await PresupuestoDetalle.bulkCreate(lineasOrdenadas.map(({ solicitud, ...linea }) => ({
        presupuesto_id: presupuesto.id,
        servicio_id: solicitud.servicio_id,
        solicitud_id: solicitud.id,
        servicio_nombre: solicitud.nombre,
        categoria: solicitud.categoria,
        subcategoria: solicitud.subcategoria,
        cantidad: linea.cantidad,
        moneda: "PEN",
        precio_unitario: linea.precio_unitario,
        descuento_pct: linea.descuento_pct,
        subtotal: montoDecimal(linea.subtotalCentimos),
        comentario: linea.comentario ?? solicitud.comentario,
      })), { transaction, returning: true });

      for (let index = 0; index < solicitudesDb.length; index += 1) {
        await solicitudesDb[index].update(
          { estado: "cotizado", presupuesto_detalle_id: detalles.find((detalle) => detalle.solicitud_id === solicitudesDb[index].id).id },
          { transaction },
        );
      }
      return presupuesto;
    });
    const presupuesto = await Presupuesto.findByPk(created.id, { include: [{ model: PresupuestoDetalle }] });
    res.status(201).json(presupuesto);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const crearPresupuestoConItems = async (req, res) => {
  const {
    paciente_id: pacienteId,
    doctor,
    fecha_vigencia: fechaVigencia,
    titulo,
    nota_interna: notaInterna,
    cita_id: citaIdEnviado,
    items,
  } = req.body;
  if (!/^\d+$/.test(String(pacienteId)) || Number(pacienteId) < 1) {
    return res.status(400).json({ error: "paciente_id no válido." });
  }
  if (typeof doctor !== "string" || !doctor.trim() || doctor.trim().length > 255) {
    return res.status(400).json({ error: "doctor es obligatorio." });
  }
  let citaId = null;
  if (citaIdEnviado !== undefined && citaIdEnviado !== null && citaIdEnviado !== "") {
    if (!/^\d+$/.test(String(citaIdEnviado)) || Number(citaIdEnviado) < 1) {
      return res.status(400).json({ error: "cita_id no válido." });
    }
    citaId = Number(citaIdEnviado);
    const cita = await Cita.findOne({ where: { id: citaId, paciente_id: Number(pacienteId) } });
    if (!cita) return res.status(400).json({ error: "La cita debe pertenecer al paciente seleccionado." });
    if (cita.doctor !== doctor.trim()) {
      return res.status(400).json({ error: "El doctor responsable debe coincidir con el odontólogo asignado a la cita." });
    }
  }
  let fechaValida = null;
  if (fechaVigencia !== undefined && fechaVigencia !== null && fechaVigencia !== "") {
    const fechaParseada = typeof fechaVigencia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaVigencia)
      ? new Date(`${fechaVigencia}T00:00:00Z`)
      : null;
    if (!fechaParseada || Number.isNaN(fechaParseada.getTime()) ||
        fechaParseada.toISOString().slice(0, 10) !== fechaVigencia) {
      return res.status(400).json({ error: "fecha_vigencia debe ser una fecha válida." });
    }
    fechaValida = fechaVigencia;
  }
  if (titulo != null && (typeof titulo !== "string" || titulo.trim().length > 255)) {
    return res.status(400).json({ error: "El título no es válido." });
  }
  if (notaInterna != null && (typeof notaInterna !== "string" || notaInterna.length > 5000)) {
    return res.status(400).json({ error: "La nota interna no es válida." });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return res.status(400).json({ error: "Incluye entre 1 y 100 items." });
  }

  const lineas = [];
  const serviciosIncluidos = new Set();
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return res.status(400).json({ error: "Cada item debe ser un objeto válido." });
    }
    const cantidad = Number(item?.cantidad);
    const precioCentimos = parsearMontoCentimos(item?.precio_unitario);
    const descuentoBps = parsearDescuentoBasisPoints(item?.descuento_pct);
    if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 10000 ||
        precioCentimos === null || descuentoBps === null) {
      return res.status(400).json({ error: "Cada item requiere cantidad y precio positivos, y descuento entre 0 y 99.99%." });
    }
    if (item.comentario != null && (typeof item.comentario !== "string" || item.comentario.length > 2000)) {
      return res.status(400).json({ error: "El comentario de cada item no es válido." });
    }
    let nombre = item.nombre;
    let categoria = null;
    let subcategoria = null;
    let servicioId = null;
    if (item.service_id !== undefined && item.service_id !== null) {
      if (!/^\d+$/.test(String(item.service_id)) || Number(item.service_id) < 1) {
        return res.status(400).json({ error: "service_id no válido." });
      }
      const servicio = await Servicio.findByPk(Number(item.service_id));
      if (!servicio) return res.status(400).json({ error: "El servicio indicado no existe." });
      servicioId = servicio.id;
      nombre = servicio.nombre;
      categoria = servicio.categoria;
      subcategoria = servicio.subcategoria;
    }
    if (typeof nombre !== "string" || !nombre.trim() || nombre.trim().length > 200) {
      return res.status(400).json({ error: "Cada item requiere un nombre válido o un servicio existente." });
    }
    const claveServicio = servicioId
      ? `id:${servicioId}`
      : `nombre:${nombre.trim().toLocaleLowerCase("es-PE")}`;
    if (serviciosIncluidos.has(claveServicio)) {
      return res.status(400).json({ error: "No repitas el mismo servicio en dos líneas del presupuesto; ajusta su cantidad." });
    }
    serviciosIncluidos.add(claveServicio);
    const brutoCentimos = precioCentimos * cantidad;
    const subtotalCentimos = brutoCentimos - Math.round(brutoCentimos * descuentoBps / 10000);
    if (!Number.isSafeInteger(subtotalCentimos) || subtotalCentimos <= 0) {
      return res.status(400).json({ error: "El subtotal de cada item debe ser positivo." });
    }
    lineas.push({
      servicio_id: servicioId,
      servicio_nombre: nombre.trim(),
      categoria,
      subcategoria,
      cantidad,
      moneda: "PEN",
      precio_unitario: montoDecimal(precioCentimos),
      descuento_pct: (descuentoBps / 100).toFixed(2),
      subtotalCentimos,
      comentario: item.comentario?.trim() || null,
    });
  }
  const totalCentimos = lineas.reduce((sum, item) => sum + item.subtotalCentimos, 0);
  if (!Number.isSafeInteger(totalCentimos) || totalCentimos <= 0 || totalCentimos > 9999999999) {
    return res.status(400).json({ error: "El total calculado está fuera del rango permitido." });
  }

  try {
    const presupuesto = await Presupuesto.sequelize.transaction(async (transaction) => {
      if (citaId) {
        const solicitudesPendientes = await ServicioSolicitado.findAll({
          where: { cita_id: citaId, estado: "pendiente" },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const serviceIds = new Set(lineas.map((item) => item.servicio_id).filter(Boolean));
        const nombresPersonalizados = lineas.filter((item) => !item.servicio_id).map((item) => item.servicio_nombre);
        const nombresPersonalizadosNormalizados = new Set(
          nombresPersonalizados.map((nombre) => nombre.toLocaleLowerCase("es-PE"))
        );
        const solicitudDuplicada = solicitudesPendientes.find((solicitud) =>
          serviceIds.has(solicitud.servicio_id) ||
          (!solicitud.servicio_id && nombresPersonalizadosNormalizados.has(solicitud.nombre.toLocaleLowerCase("es-PE")))
        );
        if (solicitudDuplicada) {
          const error = new Error("La cita tiene solicitudes clínicas pendientes. Crea el presupuesto desde Solicitudes clínicas para evitar duplicados.");
          error.status = 409;
          throw error;
        }
        const presupuestosExistentes = await Presupuesto.findAll({
          where: { cita_id: citaId },
          attributes: ["id"],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const presupuestoIds = presupuestosExistentes.map((item) => item.id);
        const detalleDuplicado = presupuestoIds.length
          ? await PresupuestoDetalle.findOne({
            where: {
              presupuesto_id: presupuestoIds,
              [Op.or]: [
                ...(serviceIds.size ? [{ servicio_id: [...serviceIds] }] : []),
                ...nombresPersonalizados.map((nombre) => ({ servicio_nombre: { [Op.iLike]: nombre } })),
              ],
            },
            transaction,
          })
          : null;
        if (detalleDuplicado) {
          const error = new Error("Uno de los servicios ya está presupuestado para esta cita.");
          error.status = 409;
          throw error;
        }
      }
      const registro = await Presupuesto.create({
        paciente_id: Number(pacienteId),
        cita_id: citaId,
        origen: "recepcion",
        descripcion: titulo?.trim() || `Servicios odontológicos: ${[...new Set(lineas.map((item) => item.servicio_nombre))].join(", ")}`.slice(0, 255),
        titulo: titulo?.trim() || null,
        nota_interna: notaInterna?.trim() || null,
        monto: montoDecimal(totalCentimos),
        fecha_vigencia: fechaValida,
        doctor: doctor.trim(),
      }, { transaction });
      await PresupuestoDetalle.bulkCreate(lineas.map((item) => ({
        presupuesto_id: registro.id,
        servicio_id: item.servicio_id,
        servicio_nombre: item.servicio_nombre,
        categoria: item.categoria,
        subcategoria: item.subcategoria,
        cantidad: item.cantidad,
        moneda: item.moneda,
        precio_unitario: item.precio_unitario,
        descuento_pct: item.descuento_pct,
        subtotal: montoDecimal(item.subtotalCentimos),
        comentario: item.comentario,
      })), { transaction });
      return registro;
    });
    const resultado = await Presupuesto.findByPk(presupuesto.id, { include: [{ model: PresupuestoDetalle }] });
    res.status(201).json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
