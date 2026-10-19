import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import {
  Atencion,
  Odontologo,
  PeriodontogramaEvaluacion,
  PeriodontogramaMedicion,
} from "../models/index.js";
import { validarAccesoPaciente } from "./historiaController.js";
import {
  validarFechaEvaluacionPeriodontal,
  validarMedicionPeriodontal,
  validarLotePeriodontal,
} from "../services/periodontogramaService.js";

const esIdEvaluacionUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const crearIdEvaluacionLegada = (fecha, odontologoId) => `legacy-${fecha}-${odontologoId}`;

const agruparEvaluaciones = (rows, odontologoActualId) => {
  const groups = new Map();
  for (const row of rows) {
    const json = row.toJSON();
    const fecha = json.fecha_evaluacion || String(json.creado_en).slice(0, 10);
    const legacy = !json.evaluacion_id;
    const id = json.evaluacion_id || crearIdEvaluacionLegada(fecha, json.odontologo_id);
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        fecha,
        legado: legacy,
        atencion_id: json.atencion_id || null,
        odontologo_id: json.odontologo_id,
        odontologo: json.Odontologo?.nombre || "Odontólogo",
        puede_editar: Number(json.odontologo_id) === Number(odontologoActualId),
        mediciones: [],
      });
    }
    groups.get(id).mediciones.push({
      id: json.id,
      pieza: json.pieza,
      sitio: json.sitio,
      profundidad_sondaje: json.profundidad_sondaje,
      margen_gingival: json.margen_gingival,
      nivel_insercion: json.nivel_insercion,
      sangrado: json.sangrado,
      placa: json.placa,
      supuracion: json.supuracion,
      movilidad: json.movilidad,
      furcacion: json.furcacion,
      notas: json.notas,
      actualizado_en: json.actualizado_en,
    });
  }
  return [...groups.values()].sort((a, b) => b.fecha.localeCompare(a.fecha));
};

const obtenerAcceso = async (req, res) => {
  const patientId = Number(req.params.id);
  if (!Number.isSafeInteger(patientId) || patientId < 1) {
    res.status(400).json({ error: "El identificador del paciente no es válido." });
    return null;
  }
  const { paciente, odontologo } = await validarAccesoPaciente(req, patientId);
  if (!odontologo) {
    res.status(403).json({ error: "No tienes acceso periodontal a este paciente." });
    return null;
  }
  if (!paciente) {
    res.status(404).json({ error: "Paciente no encontrado." });
    return null;
  }
  return { paciente, odontologo };
};

export const listarEvaluacionesPeriodontales = async (req, res) => {
  try {
    const acceso = await obtenerAcceso(req, res);
    if (!acceso) return;
    const rows = await PeriodontogramaMedicion.findAll({
      where: { paciente_id: acceso.paciente.id },
      include: [{ model: Odontologo, attributes: ["id", "nombre"] }],
      order: [["fecha_evaluacion", "DESC"], ["creado_en", "DESC"], ["pieza", "ASC"], ["sitio", "ASC"]],
    });
    res.set("Cache-Control", "private, no-store");
    res.json({ evaluaciones: agruparEvaluaciones(rows, acceso.odontologo.id) });
  } catch (error) {
    console.error("Periodontal evaluation listing failed", { operation: "list" });
    res.status(500).json({ error: "No se pudieron cargar las evaluaciones periodontales." });
  }
};

export const crearEvaluacionPeriodontal = async (req, res) => {
  try {
    const acceso = await obtenerAcceso(req, res);
    if (!acceso) return;
    const fecha = validarFechaEvaluacionPeriodontal(req.body?.fecha);
    if (fecha.error) return res.status(400).json({ error: fecha.error });
    let atencion = null;
    if (req.body?.atencion_id !== undefined && req.body.atencion_id !== null && req.body.atencion_id !== "") {
      if (!/^\d+$/.test(String(req.body.atencion_id))) {
        return res.status(400).json({ error: "La atención seleccionada no es válida." });
      }
      atencion = await Atencion.findOne({
        where: {
          id: Number(req.body.atencion_id),
          paciente_id: acceso.paciente.id,
          odontologo_id: acceso.odontologo.id,
        },
      });
      if (!atencion) return res.status(400).json({ error: "La atención seleccionada no pertenece a este paciente u odontólogo." });
    }
    const measurements = validarLotePeriodontal(req.body?.mediciones);
    if (measurements.error) return res.status(400).json({ error: measurements.error });

    const evaluacionId = randomUUID();
    const transaction = await PeriodontogramaMedicion.sequelize.transaction();
    let rows;
    try {
      await PeriodontogramaEvaluacion.create({
        id: evaluacionId,
        paciente_id: acceso.paciente.id,
        odontologo_id: acceso.odontologo.id,
        fecha: fecha.value,
        estado: "borrador",
      }, { transaction });
      rows = await PeriodontogramaMedicion.bulkCreate(
        measurements.value.map((medicion) => ({
          ...medicion,
          paciente_id: acceso.paciente.id,
          odontologo_id: acceso.odontologo.id,
          atencion_id: atencion?.id || null,
          evaluacion_id: evaluacionId,
          fecha_evaluacion: fecha.value,
        })),
        { transaction, returning: true, validate: true },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ error: "La evaluación contiene un sitio duplicado. Revisa las piezas y vuelve a guardar." });
      }
      throw error;
    }

    res.set("Cache-Control", "private, no-store");
    res.status(201).json({
      id: evaluacionId,
      fecha: fecha.value,
      atencion_id: atencion?.id || null,
      legado: false,
      odontologo_id: acceso.odontologo.id,
      odontologo: acceso.odontologo.nombre,
      puede_editar: true,
      mediciones: rows.map((row) => ({
        id: row.id,
        pieza: row.pieza,
        sitio: row.sitio,
        profundidad_sondaje: row.profundidad_sondaje,
        margen_gingival: row.margen_gingival,
        nivel_insercion: row.nivel_insercion,
        sangrado: row.sangrado,
        placa: row.placa,
        supuracion: row.supuracion,
        movilidad: row.movilidad,
        furcacion: row.furcacion,
        notas: row.notas,
        actualizado_en: row.actualizado_en,
      })),
    });
  } catch (error) {
    console.error("Periodontal evaluation creation failed", {
      operation: "create",
      name: error.name,
      message: error.message,
      code: error.original?.code,
      constraint: error.original?.constraint,
    });
    res.status(500).json({ error: "No se pudo guardar la evaluación periodontal." });
  }
};

export const actualizarMedicionPeriodontal = async (req, res) => {
  try {
    const acceso = await obtenerAcceso(req, res);
    if (!acceso) return;
    const evaluationId = String(req.params.evaluationId || "");
    const measurementId = Number(req.params.measurementId);
    const legacyMatch = /^legacy-(\d{4}-\d{2}-\d{2})-(\d+)$/.exec(evaluationId);
    if (
      (!esIdEvaluacionUuid(evaluationId) && !legacyMatch) ||
      !Number.isSafeInteger(measurementId) ||
      measurementId < 1
    ) return res.status(400).json({ error: "El identificador de evaluación o sitio no es válido." });
    if (legacyMatch && Number(legacyMatch[2]) !== Number(acceso.odontologo.id)) {
      return res.status(404).json({ error: "La evaluación legada no existe o no tienes permiso para modificarla." });
    }
    const legacyStart = legacyMatch ? new Date(`${legacyMatch[1]}T00:00:00.000Z`) : null;
    if (legacyStart && Number.isNaN(legacyStart.getTime())) {
      return res.status(400).json({ error: "La fecha de la evaluación legada no es válida." });
    }

    const row = await PeriodontogramaMedicion.findOne({
      where: {
        id: measurementId,
        paciente_id: acceso.paciente.id,
        odontologo_id: acceso.odontologo.id,
        ...(legacyMatch
          ? {
            evaluacion_id: null,
            creado_en: { [Op.gte]: legacyStart, [Op.lt]: new Date(legacyStart.getTime() + 86400000) },
          }
          : { evaluacion_id: evaluationId }),
      },
    });
    if (!row) return res.status(404).json({ error: "El sitio no existe o no tienes permiso para modificarlo." });

    const campo = (name, current) => Object.hasOwn(req.body || {}, name) ? req.body[name] : current;
    const medicion = validarMedicionPeriodontal({
      pieza: campo("pieza", row.pieza),
      sitio: campo("sitio", row.sitio),
      profundidad_sondaje: campo("profundidad_sondaje", row.profundidad_sondaje),
      margen_gingival: campo("margen_gingival", row.margen_gingival),
      sangrado: campo("sangrado", row.sangrado),
      placa: campo("placa", row.get("placa")),
      supuracion: campo("supuracion", row.get("supuracion")),
      movilidad: campo("movilidad", row.movilidad),
      furcacion: campo("furcacion", row.furcacion),
      notas: campo("notas", row.notas),
    }, { permitirTemporal: Number(String(row.pieza)[0]) >= 5 });
    if (medicion.error) return res.status(400).json({ error: medicion.error });

    const transaction = await PeriodontogramaMedicion.sequelize.transaction();
    let updatedEvaluationId = evaluationId;
    try {
      if (legacyMatch) {
        const [, legacyDate] = legacyMatch;
        const legacyRows = await PeriodontogramaMedicion.findAll({
          attributes: ["id"],
          where: {
            paciente_id: acceso.paciente.id,
            odontologo_id: acceso.odontologo.id,
            evaluacion_id: null,
            creado_en: { [Op.gte]: legacyStart, [Op.lt]: new Date(legacyStart.getTime() + 86400000) },
          },
          transaction,
        });
        updatedEvaluationId = randomUUID();
        await PeriodontogramaEvaluacion.create({
          id: updatedEvaluationId,
          paciente_id: acceso.paciente.id,
          odontologo_id: acceso.odontologo.id,
          fecha: legacyDate,
          estado: "borrador",
        }, { transaction });
        await PeriodontogramaMedicion.update(
          { evaluacion_id: updatedEvaluationId, fecha_evaluacion: legacyDate },
          { where: { id: [...new Set([...legacyRows.map((legacyRow) => legacyRow.id), row.id])] }, transaction },
        );
      }
      await row.update({
        ...medicion.value,
        ...(legacyMatch ? { evaluacion_id: updatedEvaluationId, fecha_evaluacion: legacyMatch[1] } : {}),
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    res.set("Cache-Control", "private, no-store");
    res.json({ ...row.toJSON(), evaluacion_id: updatedEvaluationId });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ese sitio ya existe en la evaluación. Revisa los datos e inténtalo de nuevo." });
    }
    console.error("Periodontal site update failed", { operation: "update" });
    res.status(500).json({ error: "No se pudo actualizar el sitio periodontal." });
  }
};
