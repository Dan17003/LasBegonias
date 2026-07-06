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
  hojas.forEach(({ nombre, datos }) => {
    if (!datos?.length) return;
    const ws = XLSX.utils.json_to_sheet(datos);
    const colWidths = Object.keys(datos[0]).map((key) => ({
      wch: Math.max(key.length, ...datos.map((f) => String(f[key] ?? "").length)) + 2,
    }));
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));
  });

  if (wb.SheetNames.length === 0) return;
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
};

export const descargarPDF = ({ titulo, periodo, resumen = [], tablas = [], nombreArchivo }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setTextColor(17, 185, 187);
  doc.text(titulo, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periodo: ${periodo}`, 14, 28);
  doc.text(`Generado: ${new Date().toLocaleString("es-PE")}`, 14, 34);

  let yPos = 42;

  if (resumen.length) {
    const cardW = (pageWidth - 28 - (resumen.length - 1) * 4) / resumen.length;
    resumen.forEach((item, i) => {
      const x = 14 + i * (cardW + 4);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, yPos, cardW, 22, 2, 2, "FD");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(item.label.toUpperCase(), x + 4, yPos + 7);
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(String(item.value), x + 4, yPos + 17);
    });
    yPos += 30;
  }

  tablas.forEach(({ titulo: tituloTabla, columnas, filas }) => {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(tituloTabla, 14, yPos);
    yPos += 4;

    autoTable(doc, {
      startY: yPos,
      head: [columnas.map((c) => c.header)],
      body: filas.map((fila) => columnas.map((c) => fila[c.key] ?? "")),
      theme: "grid",
      headStyles: { fillColor: [17, 185, 187], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    yPos = doc.lastAutoTable.finalY + 12;
  });

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
