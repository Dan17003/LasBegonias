import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const DIRECTORIO_ARCHIVOS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads/documentos-clinicos",
);
const usarS3 = () => process.env.DOCUMENT_STORAGE === "s3";
const bucketS3 = () => {
  if (!process.env.S3_BUCKET) throw new Error("S3_BUCKET must be configured when DOCUMENT_STORAGE=s3.");
  return process.env.S3_BUCKET;
};
const prefijoS3 = () => (process.env.S3_PREFIX || "documentos-clinicos").replace(/^\/+|\/+$/g, "");
let clienteS3;

const obtenerClienteS3 = () => {
  if (!process.env.AWS_REGION) throw new Error("AWS_REGION must be configured when DOCUMENT_STORAGE=s3.");
  clienteS3 ||= new S3Client({ region: process.env.AWS_REGION });
  return clienteS3;
};

const obtenerClaveS3 = (nombreArchivo) => `${prefijoS3()}/${nombreArchivo}`;

export const guardarArchivoClinico = async (nombreArchivo, contenido, tipoMime) => {
  if (usarS3()) {
    await obtenerClienteS3().send(new PutObjectCommand({
      Bucket: bucketS3(),
      Key: obtenerClaveS3(nombreArchivo),
      Body: contenido,
      ContentType: tipoMime,
      ServerSideEncryption: "AES256",
    }));
    return;
  }

  await mkdir(DIRECTORIO_ARCHIVOS, { recursive: true, mode: 0o700 });
  await writeFile(path.join(DIRECTORIO_ARCHIVOS, nombreArchivo), contenido, {
    flag: "wx",
    mode: 0o600,
  });
};

export const leerArchivoClinico = async (nombreArchivo) => {
  if (usarS3()) {
    try {
      const { Body } = await obtenerClienteS3().send(new GetObjectCommand({
        Bucket: bucketS3(),
        Key: obtenerClaveS3(nombreArchivo),
      }));
      if (!Body) throw new Error("S3 returned an empty clinical document.");
      return Buffer.from(await Body.transformToByteArray());
    } catch (error) {
      if (error.name === "NoSuchKey" || error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  try {
    return await readFile(path.join(DIRECTORIO_ARCHIVOS, nombreArchivo));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

export const eliminarArchivoClinico = async (nombreArchivo) => {
  if (usarS3()) {
    await obtenerClienteS3().send(new DeleteObjectCommand({
      Bucket: bucketS3(),
      Key: obtenerClaveS3(nombreArchivo),
    }));
    return;
  }

  await unlink(path.join(DIRECTORIO_ARCHIVOS, nombreArchivo));
};

export const validarAlmacenamientoClinico = () => {
  if (process.env.DOCUMENT_STORAGE && !["local", "s3"].includes(process.env.DOCUMENT_STORAGE)) {
    throw new Error("DOCUMENT_STORAGE must be either local or s3.");
  }
  if (usarS3()) {
    bucketS3();
    obtenerClienteS3();
  }
};
