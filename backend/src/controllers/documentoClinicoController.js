import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DocumentoClinico, Paciente } from "../models/index.js";
import { validarAccesoPaciente } from "./historiaController.js";

const DIRECTORIO_ARCHIVOS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads/documentos-clinicos",
);
const TIPOS_DOCUMENTO = new Set(["consentimiento", "prescripcion", "radiografia", "otro"]);
const METADATOS_PUBLICOS = [
  "id", "tipo", "nombre", "mime_type", "tamano", "descripcion",
  "fecha_documento", "creado_en", "visible_para_paciente",
];

const obtenerExtensionSegura = (file) => {
  const { mimetype, buffer } = file;
  if (mimetype === "application/pdf" && buffer.subarray(0, 5).toString() === "%PDF-") return ".pdf";
  if (
    mimetype === "image/jpeg" &&
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return ".jpg";
  if (
    mimetype === "image/png" &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return ".png";
  if (
    mimetype === "image/webp" &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  ) return ".webp";
  return null;
};

const limpiarNombre = (value) => String(value || "")
  .replace(/[\u0000-\u001f\u007f/\\]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 180);

const esNombreInternoValido = (value) => /^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(value || "");

const serializarDocumento = (documento) => Object.fromEntries(
  METADATOS_PUBLICOS.map((field) => [field, documento.get(field)]),
);

export const listarDocumentosClinicos = async (req, res) => {
  try {
    const patientId = Number(req.params.id);
    if (!Number.isSafeInteger(patientId) || patientId < 1) {
      return res.status(400).json({ error: "El identificador del paciente no es válido." });
    }
    const { paciente, odontologo } = await validarAccesoPaciente(req, patientId);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });

    const documentos = await DocumentoClinico.findAll({
      attributes: [...METADATOS_PUBLICOS, "url"],
      where: { paciente_id: paciente.id },
      order: [["creado_en", "DESC"]],
    });
    res.set("Cache-Control", "private, no-store");
    res.json(documentos.map((documento) => ({
      ...serializarDocumento(documento),
      archivoDisponible: esNombreInternoValido(documento.url),
    })));
  } catch (error) {
    console.error("Clinical document listing failed", { operation: "list" });
    res.status(500).json({ error: "No se pudieron cargar los documentos clínicos." });
  }
};

export const subirDocumentoClinico = async (req, res) => {
  let rutaArchivo;
  try {
    const patientId = Number(req.params.id);
    if (!Number.isSafeInteger(patientId) || patientId < 1) {
      return res.status(400).json({ error: "El identificador del paciente no es válido." });
    }
    const { paciente, odontologo } = await validarAccesoPaciente(req, patientId);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    if (!req.file) return res.status(400).json({ error: "Selecciona una imagen o un PDF para subir." });

    const tipo = String(req.body.tipo || "");
    if (!TIPOS_DOCUMENTO.has(tipo)) {
      return res.status(400).json({ error: "Selecciona si el archivo es un consentimiento, una prescripción, una radiografía u otro documento." });
    }
    const extension = obtenerExtensionSegura(req.file);
    if (!extension) {
      return res.status(400).json({ error: "El contenido del archivo no coincide con un PDF o una imagen JPG, PNG o WebP válida." });
    }

    const nombre = limpiarNombre(req.file.originalname);
    if (!nombre) return res.status(400).json({ error: "El archivo debe tener un nombre válido." });
    const descripcion = limpiarNombre(req.body.descripcion);
    const nombreInterno = `${randomUUID()}${extension}`;
    rutaArchivo = path.join(DIRECTORIO_ARCHIVOS, nombreInterno);
    await mkdir(DIRECTORIO_ARCHIVOS, { recursive: true, mode: 0o700 });
    await writeFile(rutaArchivo, req.file.buffer, { flag: "wx", mode: 0o600 });

    const documento = await DocumentoClinico.create({
      paciente_id: paciente.id,
      odontologo_id: odontologo.id,
      tipo,
      nombre,
      url: nombreInterno,
      mime_type: req.file.mimetype,
      tamano: req.file.size,
      descripcion: descripcion || null,
    });
    res.set("Cache-Control", "private, no-store");
    res.status(201).json({ ...serializarDocumento(documento), archivoDisponible: true });
  } catch (error) {
    if (rutaArchivo) {
      try {
        await unlink(rutaArchivo);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error("Clinical document cleanup failed", { operation: "remove-orphaned-upload" });
        }
      }
    }
    console.error("Clinical document upload failed", { operation: "upload" });
    res.status(500).json({ error: "No se pudo guardar el documento clínico." });
  }
};

export const obtenerArchivoClinico = async (req, res) => {
  try {
    const patientId = Number(req.params.id);
    const documentId = Number(req.params.documentoId);
    if (
      !Number.isSafeInteger(patientId) || patientId < 1 ||
      !Number.isSafeInteger(documentId) || documentId < 1
    ) return res.status(400).json({ error: "El identificador no es válido." });

    const { paciente, odontologo } = await validarAccesoPaciente(req, patientId);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    const documento = await DocumentoClinico.findOne({
      where: { id: documentId, paciente_id: paciente.id },
    });
    if (!documento || !esNombreInternoValido(documento.url)) {
      return res.status(404).json({ error: "No se encontró el archivo solicitado." });
    }

    const rutaArchivo = path.join(DIRECTORIO_ARCHIVOS, documento.url);
    res.set({
      "Content-Type": documento.mime_type,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    });
    res.sendFile(rutaArchivo, (error) => {
      if (error && !res.headersSent) {
        console.error("Clinical document retrieval failed", { operation: "read" });
        res.status(error.statusCode === 404 ? 404 : 500).json({
          error: error.statusCode === 404 ? "El archivo ya no está disponible." : "No se pudo abrir el archivo.",
        });
      }
    });
  } catch (error) {
    console.error("Clinical document retrieval failed", { operation: "read" });
    res.status(500).json({ error: "No se pudo abrir el archivo clínico." });
  }
};

export const obtenerArchivoAutorizadoPaciente = async (req, res) => {
  try {
    const paciente = await Paciente.findOne({ where: { usuario_id: req.user.id } });
    if (!paciente) return res.status(404).json({ error: "No hay una ficha de paciente vinculada a esta cuenta." });
    const documento = await DocumentoClinico.findOne({
      where: {
        id: req.params.documentoId,
        paciente_id: paciente.id,
        visible_para_paciente: true,
      },
    });
    if (!documento || !esNombreInternoValido(documento.url)) {
      return res.status(404).json({ error: "Documento no encontrado." });
    }

    const rutaArchivo = path.join(DIRECTORIO_ARCHIVOS, documento.url);
    res.set({
      "Content-Type": documento.mime_type,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    });
    res.sendFile(rutaArchivo, (error) => {
      if (error && !res.headersSent) {
        console.error("Patient clinical document retrieval failed");
        res.status(error.statusCode === 404 ? 404 : 500).json({
          error: error.statusCode === 404 ? "El archivo ya no está disponible." : "No se pudo abrir el archivo.",
        });
      }
    });
  } catch (error) {
    console.error("Patient clinical document retrieval failed");
    res.status(500).json({ error: "No se pudo abrir el documento." });
  }
};

export const actualizarVisibilidadDocumentoPaciente = async (req, res) => {
  try {
    const patientId = Number(req.params.id);
    if (!Number.isSafeInteger(patientId) || patientId < 1 || typeof req.body.visible_para_paciente !== "boolean") {
      return res.status(400).json({ error: "Indica un paciente y un valor de visibilidad válido." });
    }
    const { paciente, odontologo } = await validarAccesoPaciente(req, patientId);
    if (!odontologo) return res.status(403).json({ error: "No tienes acceso a este paciente." });
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado." });
    const documento = await DocumentoClinico.findOne({
      where: { id: req.params.documentoId, paciente_id: paciente.id },
    });
    if (!documento) return res.status(404).json({ error: "Documento no encontrado." });

    await documento.update({ visible_para_paciente: req.body.visible_para_paciente });
    res.json({ id: documento.id, visible_para_paciente: documento.visible_para_paciente });
  } catch (error) {
    console.error("Clinical document visibility update failed");
    res.status(500).json({ error: "No se pudo actualizar la autorización del documento." });
  }
};
