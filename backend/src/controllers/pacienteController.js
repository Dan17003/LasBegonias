import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Op } from "sequelize";
import {
  AntecedenteOdontologico,
  Atencion,
  AtencionDiagnostico,
  Cita,
  Consentimiento,
  DocumentoClinico,
  HistoriaAlergia,
  HistoriaAntecedenteCambio,
  HistoriaClinicaPerfil,
  HistoriaDiagnostico,
  HistoriaDiagnosticoCambio,
  HistoriaMedicamento,
  Notificacion,
  OdontogramaCambio,
  OdontogramaPieza,
  Pago,
  PasswordResetToken,
  Paciente,
  PeriodontogramaEvaluacion,
  PeriodontogramaMedicion,
  PlanTratamiento,
  Presupuesto,
  PresupuestoDetalle,
  ProcedimientoRealizado,
  RespuestaPresupuestoPaciente,
  Servicio,
  ServicioSolicitado,
  SolicitudPagoPaciente,
  Usuario,
  sequelize,
} from "../models/index.js";
import { esEmailValido } from "../utils/email.js";

const DIRECTORIO_ARCHIVOS_CLINICOS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads/documentos-clinicos",
);
const NOMBRE_ARCHIVO_CLINICO = /^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/;

const rechazarOdontologoAdministrativo = (req, res) => {
  if (req.user?.rol?.toLowerCase() === "odontologo") {
    res.status(403).json({ error: "El odontólogo debe consultar pacientes desde Mis pacientes." });
    return true;
  }
  return false;
};

export const crearPaciente = async (req, res) => {
  try {
    if (rechazarOdontologoAdministrativo(req, res)) return;
    if (!esEmailValido(req.body.email)) {
      return res.status(400).json({ error: "Ingrese un email valido." });
    }

    const dni = String(req.body.dni || "").trim();
    if (!dni) return res.status(400).json({ error: "El DNI es obligatorio." });
    const pacienteExistente = await Paciente.findOne({ where: { dni } });
    if (pacienteExistente) {
      return res.status(409).json({ error: "Ya existe un paciente registrado con ese DNI." });
    }

    const paciente = await Paciente.create({
      ...req.body,
      dni,
      email: String(req.body.email).trim().toLowerCase(),
    });
    res.status(201).json(paciente);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe un paciente registrado con ese DNI." });
    }
    res.status(400).json({ error: error.message });
  }
};

export const listarPacientes = async (req, res) => {
  try {
    if (rechazarOdontologoAdministrativo(req, res)) return;
    const pacientes = await Paciente.findAll();
    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPaciente = async (req, res) => {
  try {
    if (rechazarOdontologoAdministrativo(req, res)) return;
    if (!esEmailValido(req.body.email)) {
      return res.status(400).json({ error: "Ingrese un email valido." });
    }

    const paciente = await Paciente.findByPk(req.params.id);

    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    const cambios = { ...req.body };
    delete cambios.usuario_id;
    if (cambios.dni !== undefined) cambios.dni = String(cambios.dni || "").trim();
    if (cambios.email !== undefined) cambios.email = String(cambios.email || "").trim().toLowerCase();
    await sequelize.transaction(async (transaction) => {
      if (cambios.email && cambios.email !== paciente.email?.toLowerCase()) {
        const usuarioConCorreo = await Usuario.findOne({
          where: { email: cambios.email },
          transaction,
        });
        if (usuarioConCorreo && usuarioConCorreo.id !== paciente.usuario_id) {
          const error = new Error("Ese correo electrónico ya está asociado a otra cuenta.");
          error.status = 409;
          throw error;
        }
      }

      await paciente.update(cambios, { transaction });
      if (paciente.usuario_id) {
        const usuario = await Usuario.findByPk(paciente.usuario_id, { transaction });
        if (usuario) {
          await usuario.update({
            ...(cambios.email !== undefined ? { email: cambios.email } : {}),
            ...(cambios.nombres !== undefined || cambios.apellidos !== undefined
              ? { nombre: `${cambios.nombres ?? paciente.nombres} ${cambios.apellidos ?? paciente.apellidos ?? ""}`.trim() }
              : {}),
          }, { transaction });
        }
      }
    });
    res.json(paciente);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError" || error.status === 409) {
      return res.status(409).json({
        error: error.name === "SequelizeUniqueConstraintError" && error.fields?.dni
          ? "Ya existe un paciente registrado con ese DNI."
          : "Ese correo electrónico ya está asociado a otra cuenta.",
      });
    }
    res.status(400).json({ error: error.message });
  }
};

export const eliminarPaciente = async (req, res) => {
  try {
    if (rechazarOdontologoAdministrativo(req, res)) return;
    const pacienteId = Number(req.params.id);
    if (!Number.isSafeInteger(pacienteId) || pacienteId < 1) {
      return res.status(400).json({ error: "El identificador del paciente no es válido." });
    }

    const archivosClinicos = await sequelize.transaction(async (transaction) => {
      const paciente = await Paciente.findByPk(pacienteId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!paciente) return null;

      const opciones = { transaction };
      const obtenerIds = async (Modelo) => (
        await Modelo.findAll({
          ...opciones,
          attributes: ["id"],
          where: { paciente_id: pacienteId },
        })
      ).map(({ id }) => id);
      const atencionIds = await obtenerIds(Atencion);
      const citaIds = await obtenerIds(Cita);
      const diagnosticoIds = await obtenerIds(HistoriaDiagnostico);
      const evaluacionIds = await obtenerIds(PeriodontogramaEvaluacion);
      const presupuestoIds = await obtenerIds(Presupuesto);
      const documentos = await DocumentoClinico.findAll({
        ...opciones,
        attributes: ["url"],
        where: { paciente_id: pacienteId },
      });

      if (citaIds.length) {
        await Atencion.update(
          { proxima_cita_id: null },
          { ...opciones, where: { proxima_cita_id: { [Op.in]: citaIds } } },
        );
      }
      if (atencionIds.length) {
        await Cita.update(
          { atencion_origen_id: null },
          { ...opciones, where: { atencion_origen_id: { [Op.in]: atencionIds } } },
        );
      }
      if (evaluacionIds.length) {
        await PeriodontogramaEvaluacion.update(
          { evaluacion_origen_id: null },
          { ...opciones, where: { evaluacion_origen_id: { [Op.in]: evaluacionIds } } },
        );
      }
      await PeriodontogramaMedicion.destroy({
        ...opciones,
        where: {
          [Op.or]: [
            { paciente_id: pacienteId },
            ...(evaluacionIds.length ? [{ evaluacion_id: { [Op.in]: evaluacionIds } }] : []),
          ],
        },
      });
      await PeriodontogramaEvaluacion.destroy({
        ...opciones,
        where: { paciente_id: pacienteId },
      });
      if (atencionIds.length || diagnosticoIds.length) {
        await AtencionDiagnostico.destroy({
          ...opciones,
          where: {
            [Op.or]: [
              ...(atencionIds.length ? [{ atencion_id: { [Op.in]: atencionIds } }] : []),
              ...(diagnosticoIds.length ? [{ diagnostico_id: { [Op.in]: diagnosticoIds } }] : []),
            ],
          },
        });
      }

      const modelosPaciente = [
        ProcedimientoRealizado,
        ServicioSolicitado,
        Pago,
        RespuestaPresupuestoPaciente,
        SolicitudPagoPaciente,
        Notificacion,
        OdontogramaCambio,
        OdontogramaPieza,
        HistoriaDiagnosticoCambio,
        PlanTratamiento,
        HistoriaMedicamento,
        HistoriaAlergia,
        AntecedenteOdontologico,
        Consentimiento,
        DocumentoClinico,
        HistoriaAntecedenteCambio,
        HistoriaClinicaPerfil,
      ];
      for (const Modelo of modelosPaciente) {
        await Modelo.destroy({ ...opciones, where: { paciente_id: pacienteId } });
      }
      if (citaIds.length) {
        await Notificacion.destroy({
          ...opciones,
          where: { cita_id: { [Op.in]: citaIds } },
        });
      }

      if (presupuestoIds.length) {
        await PresupuestoDetalle.destroy({
          ...opciones,
          where: { presupuesto_id: { [Op.in]: presupuestoIds } },
        });
      }
      if (paciente.usuario_id) {
        await Notificacion.destroy({ ...opciones, where: { usuario_id: paciente.usuario_id } });
        await PasswordResetToken.destroy({ ...opciones, where: { usuario_id: paciente.usuario_id } });
        await Servicio.update(
          { creado_por: null },
          { ...opciones, where: { creado_por: paciente.usuario_id } },
        );
      }
      await HistoriaDiagnostico.destroy({ ...opciones, where: { paciente_id: pacienteId } });
      await Atencion.destroy({ ...opciones, where: { paciente_id: pacienteId } });
      await Presupuesto.destroy({ ...opciones, where: { paciente_id: pacienteId } });
      await Cita.destroy({ ...opciones, where: { paciente_id: pacienteId } });
      await paciente.destroy(opciones);
      if (paciente.usuario_id) {
        await Usuario.destroy({ ...opciones, where: { id: paciente.usuario_id } });
      }

      return documentos
        .map(({ url }) => url)
        .filter((url) => NOMBRE_ARCHIVO_CLINICO.test(url || ""));
    });

    if (archivosClinicos === null) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    const erroresArchivo = [];
    for (const nombreArchivo of archivosClinicos) {
      try {
        await unlink(path.join(DIRECTORIO_ARCHIVOS_CLINICOS, nombreArchivo));
      } catch (error) {
        if (error.code !== "ENOENT") erroresArchivo.push(error);
      }
    }
    if (erroresArchivo.length) {
      console.error("No se pudieron eliminar algunos archivos clínicos del paciente.", {
        cantidad: erroresArchivo.length,
      });
    }
    res.json({
      message: "Paciente y sus registros relacionados eliminados definitivamente.",
      ...(erroresArchivo.length
        ? { advertencia: "No se pudieron eliminar algunos archivos clínicos. Contacta al administrador." }
        : {}),
    });
  } catch (error) {
    console.error("Patient deletion failed:", error);
    res.status(500).json({ error: error.message });
  }
};
