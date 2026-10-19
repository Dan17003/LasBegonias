import multer from "multer";

const MAX_TAMANO_ARCHIVO = 12 * 1024 * 1024;
const TIPOS_MIME_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const recibirArchivo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TAMANO_ARCHIVO, files: 1, fields: 2, fieldSize: 2048 },
  fileFilter: (_req, file, callback) => {
    if (!TIPOS_MIME_PERMITIDOS.has(file.mimetype)) {
      callback(new Error("Formato no permitido. Sube una imagen JPG, PNG, WebP o un PDF."));
      return;
    }
    callback(null, true);
  },
}).single("archivo");

export const cargarArchivoClinico = (req, res, next) => {
  recibirArchivo(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "El archivo supera el límite de 12 MB." });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: "No se pudo recibir el archivo. Intenta con un único archivo." });
    }
    return res.status(400).json({
      error: error.message || "No se pudo recibir el archivo.",
    });
  });
};
