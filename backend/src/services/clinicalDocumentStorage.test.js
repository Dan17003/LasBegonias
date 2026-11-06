import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import {
  eliminarArchivoClinico,
  guardarArchivoClinico,
  leerArchivoClinico,
  validarAlmacenamientoClinico,
} from "./clinicalDocumentStorage.js";

const storageOriginal = process.env.DOCUMENT_STORAGE;
const bucketOriginal = process.env.S3_BUCKET;
const regionOriginal = process.env.AWS_REGION;

after(() => {
  if (storageOriginal === undefined) delete process.env.DOCUMENT_STORAGE;
  else process.env.DOCUMENT_STORAGE = storageOriginal;
  if (bucketOriginal === undefined) delete process.env.S3_BUCKET;
  else process.env.S3_BUCKET = bucketOriginal;
  if (regionOriginal === undefined) delete process.env.AWS_REGION;
  else process.env.AWS_REGION = regionOriginal;
});

test("local clinical storage saves, reads and deletes a document", async () => {
  process.env.DOCUMENT_STORAGE = "local";
  const name = `${randomUUID()}.pdf`;
  const contents = Buffer.from("%PDF-test");

  await guardarArchivoClinico(name, contents, "application/pdf");
  try {
    assert.deepEqual(await leerArchivoClinico(name), contents);
  } finally {
    await eliminarArchivoClinico(name);
  }
  assert.equal(await leerArchivoClinico(name), null);
});

test("clinical storage rejects unsupported backends and incomplete S3 configuration", () => {
  process.env.DOCUMENT_STORAGE = "azure";
  assert.throws(() => validarAlmacenamientoClinico(), /DOCUMENT_STORAGE/);

  process.env.DOCUMENT_STORAGE = "s3";
  delete process.env.S3_BUCKET;
  delete process.env.AWS_REGION;
  assert.throws(() => validarAlmacenamientoClinico(), /S3_BUCKET/);

  process.env.S3_BUCKET = "test-bucket";
  assert.throws(() => validarAlmacenamientoClinico(), /AWS_REGION/);
});
