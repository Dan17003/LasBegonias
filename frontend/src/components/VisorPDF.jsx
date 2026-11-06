import { useEffect, useRef, useState } from "react";

export default function VisorPDF({ src, nombre }) {
  const paginasRef = useRef(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    let tareaCarga;
    let documentoPdf;
    const tareasRender = [];

    const renderizar = async () => {
      setCargando(true);
      setError("");

      try {
        const [pdfjs, worker] = await Promise.all([
          import("pdfjs-dist/legacy/build/pdf.mjs"),
          import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
        ]);
        if (cancelado) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

        const respuesta = await fetch(src);
        if (!respuesta.ok) throw new Error("No se pudo leer el archivo PDF.");
        const datos = new Uint8Array(await respuesta.arrayBuffer());
        tareaCarga = pdfjs.getDocument({ data: datos });
        documentoPdf = await tareaCarga.promise;
        if (cancelado) return;

        const paginas = paginasRef.current;
        if (!paginas) return;
        paginas.replaceChildren();

        for (let numero = 1; numero <= documentoPdf.numPages; numero += 1) {
          if (cancelado) return;
          const paginaPdf = await documentoPdf.getPage(numero);
          const escala = 1.35;
          const viewport = paginaPdf.getViewport({ scale: escala });
          const contenedor = document.createElement("section");
          contenedor.className = "mx-auto mb-4 w-full max-w-4xl overflow-hidden rounded-lg bg-white p-2 shadow-sm";

          const canvas = document.createElement("canvas");
          canvas.setAttribute("aria-label", `Página ${numero} de ${documentoPdf.numPages}`);
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = "block h-auto w-full";
          contenedor.appendChild(canvas);
          paginas.appendChild(contenedor);

          const contexto = canvas.getContext("2d");
          if (!contexto) throw new Error("El navegador no pudo preparar el visor del PDF.");
          const tarea = paginaPdf.render({ canvasContext: contexto, viewport });
          tareasRender.push(tarea);
          await tarea.promise;
        }
      } catch {
        if (!cancelado) setError("No se pudo mostrar el PDF. Intenta descargarlo para abrirlo en tu dispositivo.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    renderizar();
    return () => {
      cancelado = true;
      tareasRender.forEach((tarea) => tarea.cancel());
      tareaCarga?.destroy();
    };
  }, [src]);

  return (
    <div className="h-[75vh] overflow-auto rounded-lg bg-slate-200 p-3">
      {cargando && <p role="status" className="py-8 text-center text-sm text-slate-500">Preparando vista previa…</p>}
      {error && <p role="alert" className="py-8 text-center text-sm text-rose-700">{error}</p>}
      <div ref={paginasRef} aria-label={`Vista previa de ${nombre}`} />
    </div>
  );
}
