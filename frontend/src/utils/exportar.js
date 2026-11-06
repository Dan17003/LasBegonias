import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const exportarCSV = (filas, nombreArchivo) => {
  if (!filas.length) return;

  const encabezados = Object.keys(filas[0]);
  const lineas = [
    encabezados.join(","),
    ...filas.map((fila) =>
      encabezados
        .map((col) => {
          const valor = String(fila[col] ?? "").replace(/"/g, '""');
          return `"${valor}"`;
        })
        .join(",")
    ),
  ];

  const blob = new Blob(["\uFEFF" + lineas.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nombreArchivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportarExcel = (hojas, nombreArchivo) => {
  if (!hojas?.length) return;

  const wb = XLSX.utils.book_new();
  const generado = new Date().toLocaleString("es-PE");
  hojas.forEach(({ nombre, datos, formatos = {} }) => {
    if (!datos?.length) return;

    const encabezados = Object.keys(datos[0]);
    const ws = XLSX.utils.aoa_to_sheet([
      [nombre],
      [`Generado: ${generado}`],
      [],
      encabezados,
      ...datos.map((fila) => encabezados.map((key) => fila[key] ?? "")),
    ]);
    const ultimaColumna = encabezados.length - 1;
    const ultimaFila = datos.length + 3;
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: ultimaColumna } }];
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 3, c: 0 },
        e: { r: ultimaFila, c: ultimaColumna },
      }),
    };
    ws["!cols"] = encabezados.map((key) => ({
      wch: Math.min(
        44,
        Math.max(
          14,
          key.length + 2,
          ...datos.map((fila) => String(fila[key] ?? "").length + 2),
        ),
      ),
    }));

    encabezados.forEach((key, columnIndex) => {
      const formato = formatos[key] === "moneda"
        ? '"S/ " #,##0.00'
        : formatos[key] === "porcentaje"
          ? "0.0%"
          : null;
      if (!formato) return;

      datos.forEach((_, rowIndex) => {
        const cell = ws[XLSX.utils.encode_cell({ r: rowIndex + 4, c: columnIndex })];
        if (cell && typeof cell.v === "number") cell.z = formato;
      });
    });

    XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));
  });

  if (wb.SheetNames.length === 0) return;
  wb.Props = {
    Title: "Reporte de Clínica Las Begonias",
    Subject: "Indicadores y actividad de la clínica",
    Creator: "Clínica Las Begonias",
    CreatedDate: new Date(),
  };
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
};

export const descargarPDF = ({ titulo, periodo, resumen = [], tablas = [], nombreArchivo }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generado = new Date().toLocaleString("es-PE");

  doc.setFillColor(8, 127, 129);
  doc.rect(0, 0, pageWidth, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(8, 76, 80);
  const tituloLineas = doc.splitTextToSize(titulo, pageWidth - 28);
  doc.text(tituloLineas, 14, 17);

  const periodoY = 18 + tituloLineas.length * 7;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Periodo: ${periodo || "Sin periodo"}`, 14, periodoY);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${generado}`, 14, periodoY + 6);

  let yPos = periodoY + 13;

  if (resumen.length) {
    const cardW = (pageWidth - 28 - (resumen.length - 1) * 4) / resumen.length;
    resumen.forEach((item, i) => {
      const x = 14 + i * (cardW + 4);
      doc.setDrawColor(207, 230, 229);
      doc.setFillColor(244, 251, 250);
      doc.roundedRect(x, yPos, cardW, 24, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      const labelLineas = doc.splitTextToSize(String(item.label).toUpperCase(), cardW - 8);
      doc.text(labelLineas.slice(0, 2), x + 4, yPos + 6);
      doc.setFontSize(11);
      doc.setTextColor(15, 54, 68);
      const valor = String(item.value ?? "");
      while (doc.getTextWidth(valor) > cardW - 8 && doc.getFontSize() > 8) {
        doc.setFontSize(doc.getFontSize() - 0.5);
      }
      doc.text(valor, x + 4, yPos + 19);
    });
    yPos += 32;
  }

  tablas.forEach(({ titulo: tituloTabla, columnas, filas }) => {
    if (!columnas?.length) return;
    if (yPos > pageHeight - 48) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(8, 76, 80);
    const tituloTablaLineas = doc.splitTextToSize(tituloTabla, pageWidth - 28);
    doc.text(tituloTablaLineas, 14, yPos);
    yPos += tituloTablaLineas.length * 5 + 2;

    autoTable(doc, {
      startY: yPos,
      head: [columnas.map((c) => c.header)],
      body: filas.length
        ? filas.map((fila) => columnas.map((c) => fila[c.key] ?? ""))
        : [columnas.map((_, index) => index === 0 ? "Sin datos para este periodo" : "")],
      theme: "striped",
      headStyles: { fillColor: [8, 127, 129], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85], cellPadding: 2.5, lineColor: [226, 232, 240] },
      alternateRowStyles: { fillColor: [243, 249, 249] },
      margin: { top: 14, bottom: 20, left: 14, right: 14 },
      rowPageBreak: "avoid",
      styles: { overflow: "linebreak", valign: "middle" },
    });

    yPos = doc.lastAutoTable.finalY + 12;
  });

  const totalPaginas = doc.internal.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 13, pageWidth - 14, pageHeight - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Clínica Las Begonias · Reporte administrativo", 14, pageHeight - 8);
    doc.text(`Página ${pagina} de ${totalPaginas}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  }

  doc.save(`${nombreArchivo}.pdf`);
};

export const exportarPDF = ({ titulo, periodo, resumen, tabla, nombreArchivo }) => {
  descargarPDF({
    titulo,
    periodo,
    nombreArchivo: nombreArchivo || "reporte-begonias",
    resumen: [
      { label: "Total recaudado", value: resumen.totalRecaudado },
      { label: "Citas atendidas", value: resumen.citasAtendidas },
      { label: "Inasistencias", value: resumen.tasaInasistencias },
    ],
    tablas: [
      {
        titulo: "Productividad por odontologo",
        columnas: [
          { header: "Odontologo", key: "doctor" },
          { header: "Especialidad", key: "especialidad" },
          { header: "Citas", key: "citas" },
          { header: "Cumplimiento", key: "efectividad" },
          { header: "Ingresos", key: "ingresos" },
        ],
        filas: tabla,
      },
    ],
  });
};

export const imprimirHTML = ({ titulo, contenido }) => {
  const ventana = window.open("", "_blank");
  if (!ventana) {
    alert("Permite ventanas emergentes para imprimir el documento.");
    return;
  }

  ventana.document.write(`
    <html>
      <head>
        <title>${titulo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #1e293b; }
          h1 { color: #11B9BB; margin-bottom: 4px; font-size: 22px; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
          th { background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #64748b; }
        </style>
      </head>
      <body>
        ${contenido}
        <div class="footer">Clinica Las Begonias — ${new Date().toLocaleDateString("es-PE")}</div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  ventana.document.close();
};
