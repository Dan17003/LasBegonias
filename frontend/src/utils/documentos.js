export const esDocumentoPDF = (documento) =>
  documento?.mime_type?.split(";")[0].trim().toLowerCase() === "application/pdf" ||
  /\.pdf$/i.test(documento?.nombre || "");
