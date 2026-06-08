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

export const exportarPDF = ({ titulo, periodo, resumen, tabla }) => {
  const ventana = window.open("", "_blank");
  if (!ventana) return;

  const filasTabla = tabla
    .map(
      (fila) => `
      <tr>
        <td>${fila.doctor}</td>
        <td>${fila.especialidad}</td>
        <td style="text-align:center">${fila.citas}</td>
        <td style="text-align:center">${fila.efectividad}</td>
        <td style="text-align:right">${fila.ingresos}</td>
      </tr>`
    )
    .join("");

  ventana.document.write(`
    <html>
      <head>
        <title>${titulo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #1e293b; }
          h1 { color: #11B9BB; margin-bottom: 4px; }
          .periodo { color: #64748b; font-size: 14px; margin-bottom: 24px; }
          .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
          .card span { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold; }
          .card strong { display: block; font-size: 22px; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
          th { background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>${titulo}</h1>
        <p class="periodo">Período: ${periodo}</p>
        <div class="cards">
          <div class="card"><span>Total recaudado</span><strong>${resumen.totalRecaudado}</strong></div>
          <div class="card"><span>Citas atendidas</span><strong>${resumen.citasAtendidas}</strong></div>
          <div class="card"><span>Inasistencias</span><strong>${resumen.tasaInasistencias}</strong></div>
        </div>
        <h3>Productividad por odontólogo</h3>
        <table>
          <thead>
            <tr>
              <th>Odontólogo</th>
              <th>Especialidad</th>
              <th>Citas</th>
              <th>Cumplimiento</th>
              <th>Ingresos</th>
            </tr>
          </thead>
          <tbody>${filasTabla}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  ventana.document.close();
};
