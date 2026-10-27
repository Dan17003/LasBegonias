/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import api from "../services/api";

const MAX_TAMANO_ARCHIVO = 12 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const TIPO_ETIQUETAS = {
  consentimiento: "Consentimiento",
  prescripcion: "Prescripción",
  radiografia: "Radiografía",
  otro: "Otro documento",
};
const SECCIONES_ARCHIVO = [
  ["consentimiento", "Consentimientos"],
  ["prescripcion", "Prescripciones"],
  ["radiografia", "Radiografías"],
  ["otro", "Otros archivos"],
];
const PLANTILLAS_PRESCRIPCION = [
  ["receta", "Receta / RE"],
  ["constancia-atencion", "Constancia de atención"],
  ["interconsulta", "Interconsulta médica"],
  ["orden-radiografica", "Orden radiográfica"],
  ["informe-radiografico", "Informe radiográfico"],
  ["descanso-medico", "Descanso médico"],
];
const nombrePaciente = (paciente) => [paciente?.nombres, paciente?.apellidos].filter(Boolean).join(" ") || "____________________________";
const documentoPaciente = (paciente) => paciente?.dni || "________________";
const contenidoInicialPlantilla = (plantilla, paciente) => {
  const nombre = nombrePaciente(paciente);
  if (plantilla === "interconsulta") {
    return `INTERCONSULTA MÉDICA

Paciente: ${nombre}

Ha sido programado(a) para realizar el siguiente procedimiento: ______________________________.

En la evaluación del hemograma se registran los siguientes hallazgos: ______________________________.

Se solicitan sugerencias y recomendaciones para la atención quirúrgica dental.

Fecha: ____________________

Atentamente,

________________________________
Odontólogo responsable`;
  }
  if (plantilla === "orden-radiografica") {
    return `ORDEN RADIOGRÁFICA

Paciente: ${nombre}
Diagnóstico: ______________________________________________
Tratamiento: ______________________________________________

TOMOGRAFÍA BIMAXILAR CON INFORME

Enviar con copia a: consultoriobegonias@gmail.com

IDM - INSTITUTO DE DIAGNÓSTICO MAXILOFACIAL

IDM SEDE SURCO
(511) 437-4709 / (511) 948 500 573
Calle Los Tulipanes 147 Of. 404
Urb. Monterrico Centro Empresarial Blu Building
L-V: 8 am - 8 pm / Sábados: 8 am - 6 pm

IDM SEDE MIRAFLORES
(511) 284-2967 / (511) 924 987 854
Calle Elías Aguirre 605, Of. 401
Centro Empresarial Angamos 600
L-V: 8 am - 8 pm / Sábados: 8 am - 6 pm

IDM SEDE JESÚS MARÍA
(511) 396-4199 / (511) 977 533 348
Av. Faustino Sánchez Carrión 615
Oficina 1006 Edificio Vértice 22
L-V: 8 am - 8 pm / Sábados: 8 am - 6 pm

Fecha: ____________________
Odontólogo responsable: ______________________________`;
  }
  if (plantilla === "descanso-medico") {
    return `CONSTANCIA DE DESCANSO MÉDICO

Por medio del presente, se deja constancia de que la paciente:

Nombre: ${nombre}
Documento de identidad: ${documentoPaciente(paciente)}

Fue sometida a un procedimiento de cirugía dental el día ____________________.

Debido al procedimiento realizado y con el fin de favorecer una adecuada recuperación y evitar complicaciones postoperatorias, se indica reposo relativo y restricción para realizar actividad física, incluyendo la práctica de yoga, desde la fecha de la cirugía hasta el ____________________, pudiendo retomar sus actividades habituales a partir del ____________________, siempre que su evolución clínica sea favorable.

Este documento se emite a solicitud de la paciente para ser presentado ante la institución correspondiente, con el fin de justificar su inasistencia a las clases de yoga y permitir la recuperación de las sesiones no realizadas durante el período de reposo indicado.

Atentamente,

________________________________
Odontólogo responsable
Fecha de emisión: ____________________`;
  }
  if (plantilla === "constancia-atencion") {
    return `CONSTANCIA DE ATENCIÓN

Por medio de la presente, se deja constancia de que ${nombre}, identificado(a) con documento de identidad ${documentoPaciente(paciente)}, recibió atención odontológica el día ____________________.

La presente constancia se expide a solicitud del/de la interesado(a) para los fines que estime convenientes.

Fecha de emisión: ____________________

Atentamente,

________________________________
Odontólogo responsable`;
  }
  if (plantilla === "informe-radiografico") {
    return `INFORME RADIOGRÁFICO

Paciente: ${nombre}
Fecha: ____________________
Estudio realizado: ______________________________
Pieza o región evaluada: ________________________

Hallazgos radiográficos:
________________________________________________
________________________________________________
________________________________________________

Impresión diagnóstica:
________________________________________________

________________________________
Profesional responsable`;
  }
  return `RECETA / RE

Paciente: ${nombre}
Documento: ${documentoPaciente(paciente)}
Fecha: ${new Date().toLocaleDateString("es-PE")}

Rp/

Odontólogo responsable: ______________________________
Firma y sello: ________________________________________`;
};

const formatearTamano = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Tamaño no disponible";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatearFecha = (fecha) => {
  if (!fecha) return "Fecha no disponible";
  const valor = new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T00:00:00` : fecha);
  return Number.isNaN(valor.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(valor);
};

export default function DocumentosClinicos({ pacienteId, paciente }) {
  const [documentos, setDocumentos] = useState([]);
  const [seccion, setSeccion] = useState("consentimiento");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [abriendo, setAbriendo] = useState(null);
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [plantilla, setPlantilla] = useState("");
  const [contenidoPlantilla, setContenidoPlantilla] = useState("");
  const [itemsReceta, setItemsReceta] = useState([{ medicamento: "", cantidad: "", indicacion: "", duracion: "" }]);
  const [notaReceta, setNotaReceta] = useState("");
  const selectorArchivo = useRef(null);

  const cargarDocumentos = useCallback(async () => {
    try {
      const { data } = await api.get(`/historia/pacientes/${pacienteId}/documentos`);
      setDocumentos(data);
      setErrorCarga("");
      setError("");
    } catch (err) {
      const mensajeCarga = err.response?.data?.error || "No se pudieron cargar los documentos.";
      setErrorCarga(mensajeCarga);
      setError(mensajeCarga);
    } finally {
      setCargando(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  useEffect(() => () => {
    if (previsualizacion?.url) URL.revokeObjectURL(previsualizacion.url);
  }, [previsualizacion]);

  const seleccionarArchivo = (event) => {
    const seleccionado = event.target.files?.[0] || null;
    setError("");
    setMensaje("");
    if (!seleccionado) {
      setArchivo(null);
      return;
    }
    if (!TIPOS_PERMITIDOS.has(seleccionado.type)) {
      setArchivo(null);
      event.target.value = "";
      setError("El formato debe ser JPG, PNG, WebP o PDF.");
      return;
    }
    if (seleccionado.size > MAX_TAMANO_ARCHIVO) {
      setArchivo(null);
      event.target.value = "";
      setError("El archivo supera el límite de 12 MB.");
      return;
    }
    setArchivo(seleccionado);
  };

  const guardarArchivo = async (file, categoria, nota = "") => {
    if (!file || subiendo) return false;
    setError("");
    setMensaje("");
    setSubiendo(true);
    try {
      const datos = new FormData();
      datos.append("archivo", file);
      datos.append("tipo", categoria);
      datos.append("descripcion", nota.trim());
      const { data } = await api.post(`/historia/pacientes/${pacienteId}/documentos`, datos);
      setDocumentos((actuales) => [data, ...actuales]);
      setMensaje(categoria === "prescripcion" ? "Documento generado y guardado en la historia clínica." : "Documento guardado correctamente.");
      return true;
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar el archivo. Inténtalo nuevamente.");
      return false;
    } finally {
      setSubiendo(false);
    }
  };

  const cambiarVisibilidadPaciente = async (documento) => {
    setError("");
    setMensaje("");
    try {
      const visible_para_paciente = !documento.visible_para_paciente;
      await api.put(
        `/historia/pacientes/${pacienteId}/documentos/${documento.id}/visibilidad-paciente`,
        { visible_para_paciente },
      );
      setDocumentos((actuales) => actuales.map((item) =>
        item.id === documento.id ? { ...item, visible_para_paciente } : item
      ));
      setMensaje(visible_para_paciente
        ? "Documento habilitado para consulta del paciente."
        : "Se retiró el acceso del paciente a este documento.");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar la autorización del documento.");
    }
  };

  const subir = async (event) => {
    event.preventDefault();
    const guardado = await guardarArchivo(archivo, seccion, descripcion);
    if (!guardado) return;
    setArchivo(null);
    setDescripcion("");
    if (selectorArchivo.current) selectorArchivo.current.value = "";
  };

  const seleccionarPlantilla = (id) => {
    setPlantilla(id);
    setContenidoPlantilla(id === "receta" ? "" : contenidoInicialPlantilla(id, paciente));
    setItemsReceta([{ medicamento: "", cantidad: "", indicacion: "", duracion: "" }]);
    setNotaReceta("");
    setError("");
    setMensaje("");
  };

  const generarPrescripcion = async () => {
    if (!plantilla || subiendo) return;
    const lineasReceta = itemsReceta.filter((item) => Object.values(item).some((value) => value.trim()));
    if (plantilla === "receta" && (lineasReceta.length === 0 || lineasReceta.some((item) =>
      !item.medicamento.trim() || !item.cantidad.trim() || !item.indicacion.trim() || !item.duracion.trim(),
    ))) {
      setError("Completa medicamento, cantidad, indicación y duración en cada línea de la receta.");
      return;
    }
    const texto = plantilla === "receta"
      ? `${contenidoInicialPlantilla(plantilla, paciente)}\n\n${lineasReceta.map((item, index) =>
        `${index + 1}. ${item.medicamento || "Medicamento: ____________________"}\n   Cantidad: ${item.cantidad || "________"}\n   Indicación: ${item.indicacion || "____________________"}\n   Duración: ${item.duracion || "________"}`,
      ).join("\n\n")}${notaReceta.trim() ? `\n\nIndicaciones adicionales: ${notaReceta.trim()}` : ""}`
      : contenidoPlantilla.trim();
    if (!texto) {
      setError("Revisa el contenido de la plantilla antes de generar el documento.");
      return;
    }

    setError("");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const marginX = 18;
    const marginTop = 20;
    const lineHeight = 5.6;
    let y = marginTop;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    texto.split("\n").forEach((line) => {
      pdf.splitTextToSize(line || " ", 174).forEach((wrappedLine) => {
        if (y > 278) {
          pdf.addPage();
          y = marginTop;
        }
        pdf.text(wrappedLine, marginX, y);
        y += lineHeight;
      });
    });
    const safeName = (PLANTILLAS_PRESCRIPCION.find(([id]) => id === plantilla)?.[1] || "Prescripción")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
    const patientName = nombrePaciente(paciente).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
    const file = new File([pdf.output("blob")], `${safeName}-${patientName || "paciente"}.pdf`, { type: "application/pdf" });
    const guardado = await guardarArchivo(
      file,
      "prescripcion",
      PLANTILLAS_PRESCRIPCION.find(([id]) => id === plantilla)?.[1] || "Prescripción",
    );
    if (guardado) {
      setPlantilla("");
      setContenidoPlantilla("");
    }
  };

  const obtenerArchivo = async (documento) => {
    setError("");
    setAbriendo(documento.id);
    try {
      const { data } = await api.get(
        `/historia/pacientes/${pacienteId}/documentos/${documento.id}/archivo`,
        { responseType: "blob" },
      );
      return URL.createObjectURL(data);
    } catch (err) {
      setError(err.response?.data?.error || `No se pudo abrir «${documento.nombre}».`);
      return null;
    } finally {
      setAbriendo(null);
    }
  };

  const previsualizar = async (documento) => {
    const url = await obtenerArchivo(documento);
    if (url) setPrevisualizacion({ documento, url });
  };

  const descargar = async (documento) => {
    const url = await obtenerArchivo(documento);
    if (!url) return;
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = documento.nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const actualizarDocumentos = () => {
    setCargando(true);
    cargarDocumentos();
  };

  const documentosFiltrados = documentos.filter((documento) => documento.tipo === seccion);
  const actualizarCampoReceta = (index, field, value) => setItemsReceta((actuales) =>
    actuales.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  );

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Archivo clínico</p>
          <h3 className="mt-1 text-lg font-bold text-slate-800">Consentimientos, prescripciones y radiografías</h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">Organiza archivos clínicos y genera documentos a partir de plantillas asociadas a este paciente.</p>
        </div>

        <nav aria-label="Categorías de documentos clínicos" className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-100 pb-2">
          {SECCIONES_ARCHIVO.map(([id, label]) => (
            <button key={id} type="button" onClick={() => {
              setSeccion(id);
              setArchivo(null);
              setDescripcion("");
              if (selectorArchivo.current) selectorArchivo.current.value = "";
              setError("");
              setMensaje("");
            }} aria-pressed={seccion === id} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition ${seccion === id ? "bg-[#11B9BB] text-white shadow-sm" : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-900"}`}>
              {label}
            </button>
          ))}
        </nav>

        {seccion === "prescripcion" && (
          <div className="mb-5 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 sm:p-5">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Plantillas</h4>
              <p className="mt-1 text-xs text-slate-500">Selecciona una plantilla, revisa y completa su contenido antes de guardarla. Los nombres y documentos se toman de la ficha actual.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLANTILLAS_PRESCRIPCION.map(([id, label]) => (
                <button key={id} type="button" onClick={() => seleccionarPlantilla(id)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${plantilla === id ? "border-cyan-400 bg-white text-cyan-900 shadow-sm" : "border-transparent bg-white/80 text-slate-700 hover:border-cyan-200 hover:bg-white"}`}>
                  {label}<span className="text-cyan-600" aria-hidden="true">⋮</span>
                </button>
              ))}
            </div>
            {plantilla && (
              <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">{PLANTILLAS_PRESCRIPCION.find(([id]) => id === plantilla)?.[1]}</h5>
                    <p className="mt-1 text-[11px] text-amber-700">Verifica todos los datos clínicos y completa los espacios antes de generar el documento.</p>
                  </div>
                  <button type="button" onClick={() => setPlantilla("")} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Cerrar</button>
                </div>
                {plantilla === "receta" ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left text-xs">
                        <thead className="bg-[#087f81] text-white"><tr><th className="px-3 py-2.5">Medicamento</th><th className="px-3 py-2.5">Cantidad</th><th className="px-3 py-2.5">Indicación</th><th className="px-3 py-2.5">Duración</th><th className="px-3 py-2.5"> </th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{itemsReceta.map((item, index) => <tr key={index}>
                          {["medicamento", "cantidad", "indicacion", "duracion"].map((field) => <td key={field} className="p-2">
                            <input value={item[field]} onChange={(event) => actualizarCampoReceta(index, field, event.target.value)} maxLength={field === "medicamento" ? 200 : 300} aria-label={`${field} del medicamento ${index + 1}`} className="w-full min-w-28 rounded-lg border border-slate-200 px-2.5 py-2 text-xs" />
                          </td>)}
                          <td className="p-2"><button type="button" aria-label={`Quitar medicamento ${index + 1}`} disabled={itemsReceta.length === 1} onClick={() => setItemsReceta((actuales) => actuales.filter((_, itemIndex) => itemIndex !== index))} className="rounded px-2 py-1 font-bold text-rose-600 disabled:opacity-30">×</button></td>
                        </tr>)}</tbody>
                      </table>
                    </div>
                    <button type="button" onClick={() => setItemsReceta((actuales) => [...actuales, { medicamento: "", cantidad: "", indicacion: "", duracion: "" }])} className="rounded-lg border border-cyan-200 px-3 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-50">＋ Añadir medicamento</button>
                    <label className="block text-xs font-semibold text-slate-600">Nota opcional<textarea value={notaReceta} onChange={(event) => setNotaReceta(event.target.value)} maxLength={2000} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
                    <p className="text-[11px] text-slate-500">La plataforma no sugiere ni completa medicamentos, dosis o indicaciones. El profesional debe verificar y prescribir el contenido.</p>
                  </div>
                ) : (
                  <label className="block text-xs font-semibold text-slate-600">Contenido editable<textarea value={contenidoPlantilla} onChange={(event) => setContenidoPlantilla(event.target.value)} maxLength={12000} rows={plantilla === "orden-radiografica" ? 20 : 12} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal leading-relaxed text-slate-700" /></label>
                )}
                <div className="flex justify-end">
                  <button type="button" onClick={generarPrescripcion} disabled={subiendo} className="rounded-xl bg-[#11B9BB] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0b9fa1] disabled:opacity-50">{subiendo ? "Guardando documento…" : "Generar y guardar PDF"}</button>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={subir} className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-2 sm:p-5">
          <label className="text-xs font-bold text-slate-600">
            Nota opcional
            <input value={descripcion} onChange={(event) => setDescripcion(event.target.value)} maxLength={180} disabled={subiendo} placeholder={seccion === "consentimiento" ? "Ej.: consentimiento para extracción" : seccion === "radiografia" ? "Ej.: radiografía periapical pieza 16" : "Describe el archivo"} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Archivo
            <input ref={selectorArchivo} type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={seleccionarArchivo} disabled={subiendo} className="mt-1.5 block w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-sm font-normal text-slate-600 file:mr-4 file:rounded-l-xl file:border-0 file:bg-cyan-50 file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-cyan-800 hover:file:bg-cyan-100" />
            <span className="mt-1.5 block font-normal text-slate-400">JPG, PNG, WebP o PDF · máximo 12 MB</span>
          </label>
          {archivo && <p className="text-xs text-slate-500 sm:col-span-2">{archivo.name} · {formatearTamano(archivo.size)}</p>}
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <p className="text-xs leading-relaxed text-slate-400">El archivo queda privado y asociado a la historia clínica de este paciente.</p>
            <button type="submit" disabled={!archivo || subiendo} className="shrink-0 rounded-xl bg-[#11B9BB] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0b9fa1] disabled:cursor-not-allowed disabled:opacity-50">{subiendo ? "Subiendo…" : "Subir archivo"}</button>
          </div>
        </form>

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {mensaje && <p role="status" className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-800">{SECCIONES_ARCHIVO.find(([id]) => id === seccion)?.[1]} del paciente</h3>
            <p className="mt-0.5 text-xs text-slate-500">{documentosFiltrados.length} {documentosFiltrados.length === 1 ? "archivo" : "archivos"}</p>
          </div>
          <button type="button" onClick={actualizarDocumentos} disabled={cargando} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">{cargando ? "Actualizando…" : "Actualizar"}</button>
        </div>

        {cargando ? (
          <p className="p-8 text-center text-sm text-slate-500">Cargando archivos…</p>
        ) : errorCarga ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No se pudo cargar el listado de archivos.</p>
            <button type="button" onClick={actualizarDocumentos} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Reintentar</button>
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-xl text-cyan-700" aria-hidden="true">＋</div>
            <p className="mt-3 text-sm font-semibold text-slate-700">Aún no hay archivos en esta sección</p>
            <p className="mt-1 text-xs text-slate-500">Los archivos que agregues en esta sección aparecerán aquí.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {documentosFiltrados.map((documento) => (
              <li key={documento.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-xs font-black uppercase text-cyan-800" aria-hidden="true">{documento.mime_type === "application/pdf" ? "PDF" : "IMG"}</div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-slate-800">{documento.nombre}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">{TIPO_ETIQUETAS[documento.tipo] || "Documento"}</span>
                      <span>{formatearFecha(documento.fecha_documento || documento.creado_en)}</span>
                      <span>{formatearTamano(Number(documento.tamano))}</span>
                    </div>
                    {documento.descripcion && <p className="mt-1 break-words text-xs text-slate-500">{documento.descripcion}</p>}
                    {!documento.archivoDisponible && <p className="mt-1 text-xs text-amber-700">Este registro antiguo no tiene un archivo adjunto en el sistema.</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-4">
                  {documento.archivoDisponible && <button type="button" onClick={() => cambiarVisibilidadPaciente(documento)} className={`rounded-lg px-3 py-2 text-xs font-bold ${documento.visible_para_paciente ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {documento.visible_para_paciente ? "Deshabilitar acceso del paciente" : "Habilitar para el paciente"}
                  </button>}
                  {documento.archivoDisponible && <>
                  <button type="button" onClick={() => previsualizar(documento)} disabled={abriendo === documento.id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{abriendo === documento.id ? "Abriendo…" : "Ver"}</button>
                  <button type="button" onClick={() => descargar(documento)} disabled={abriendo === documento.id} className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-100 disabled:opacity-50">Descargar</button>
                  </>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {previsualizacion && (
        <div role="dialog" aria-modal="true" aria-label={`Vista previa de ${previsualizacion.documento.nombre}`} className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6">
          <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="min-w-0 truncate text-sm font-bold text-slate-800">{previsualizacion.documento.nombre}</p>
              <button type="button" onClick={() => setPrevisualizacion(null)} aria-label="Cerrar vista previa" className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cerrar</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
              {previsualizacion.documento.mime_type === "application/pdf" ? (
                <iframe title={`Vista previa: ${previsualizacion.documento.nombre}`} src={previsualizacion.url} sandbox="allow-scripts" referrerPolicy="no-referrer" className="h-[75vh] w-full rounded-lg bg-white" />
              ) : (
                <img src={previsualizacion.url} alt={`Vista previa: ${previsualizacion.documento.nombre}`} className="mx-auto max-h-[75vh] max-w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
