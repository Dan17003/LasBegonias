import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const MENSAJE_BIENVENIDA = "Puedo resumir antecedentes, revisar tratamientos y relacionar hallazgos de la historia clínica para apoyar tu valoración.";
const PREGUNTAS_SUGERIDAS = [
  "Resume las últimas atenciones",
  "¿Qué antecedentes médicos debo considerar?",
  "¿Qué tratamientos están pendientes?",
  "¿Qué opciones de procedimientos podría valorar según los registros?",
];
const COLORES_PREGUNTAS = [
  "border-cyan-100 bg-cyan-50/80 text-cyan-800 hover:border-cyan-300",
  "border-teal-100 bg-teal-50/80 text-teal-800 hover:border-teal-300",
  "border-sky-100 bg-sky-50/80 text-sky-800 hover:border-sky-300",
  "border-indigo-100 bg-indigo-50/80 text-indigo-800 hover:border-indigo-300",
];

function IconoDiente({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7.2 4.5c1.8-1 3-.2 4.8-.2s3-.8 4.8.2c2.4 1.3 2.2 4.5 1.3 7.1-.7 2-1.5 4.8-2.5 6.7-.7 1.3-1.9 1.2-2.3-.2l-.8-3.2c-.2-.8-.8-1.3-1.5-1.3s-1.3.5-1.5 1.3l-.8 3.2c-.4 1.4-1.6 1.5-2.3.2-1-1.9-1.8-4.7-2.5-6.7-.9-2.6-1.1-5.8 1.3-7.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconoPregunta({ index }) {
  const iconos = [
    <><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h3m-3 4h6" /></>,
    <><path d="M7.2 4.5c1.8-1 3-.2 4.8-.2s3-.8 4.8.2c2.4 1.3 2.2 4.5 1.3 7.1-.7 2-1.5 4.8-2.5 6.7-.7 1.3-1.9 1.2-2.3-.2l-.8-3.2c-.2-.8-.8-1.3-1.5-1.3s-1.3.5-1.5 1.3l-.8 3.2c-.4 1.4-1.6 1.5-2.3.2-1-1.9-1.8-4.7-2.5-6.7-.9-2.6-1.1-5.8 1.3-7.1Z" /></>,
    <><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M14 4v4h4M8 12h8M8 16h6" /></>,
    <><path d="M9 18h6m-5 3h4m-2-19a7 7 0 0 0-4 12.7c.5.4 1 1.2 1 2.3h4c0-1.1.5-1.9 1-2.3A7 7 0 0 0 12 2Z" /></>,
  ];

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {iconos[index % iconos.length]}
    </svg>
  );
}

const separarCeldasTabla = (line) => line
  .trim()
  .replace(/^\|/, "")
  .replace(/\|$/, "")
  .split(/(?<!\\)\|/)
  .map((cell) => cell.trim().replace(/\\\|/g, "|"));

const esSeparadorTabla = (line) => {
  const cells = separarCeldasTabla(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

function TextoMarkdown({ text }) {
  const partes = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|<br\s*\/?>)/gi);
  return partes.map((parte, index) => {
    if (/^<br\s*\/?>$/i.test(parte)) return <br key={index} />;
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={index} className="font-bold text-slate-800">{parte.slice(2, -2)}</strong>;
    }
    if (parte.startsWith("*") && parte.endsWith("*")) {
      return <em key={index}>{parte.slice(1, -1)}</em>;
    }
    if (parte.startsWith("`") && parte.endsWith("`")) {
      return <code key={index} className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[0.9em]">{parte.slice(1, -1)}</code>;
    }
    return parte;
  });
}

function MensajeMarkdown({ content }) {
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && lines[index].includes("|") && esSeparadorTabla(lines[index + 1])) {
      const headers = separarCeldasTabla(lines[index]);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(separarCeldasTabla(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="my-3 max-w-full overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs leading-relaxed">
            <thead className="bg-[#087f81] text-white">
              <tr>
                {headers.map((header, cellIndex) => (
                  <th key={cellIndex} className="border-b border-white/15 px-3 py-2.5 font-bold">
                    <TextoMarkdown text={header} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 ? "bg-white" : "bg-slate-50/70"}>
                  {headers.map((_, cellIndex) => (
                    <td key={cellIndex} className="align-top border-b border-slate-100 px-3 py-2.5">
                      <TextoMarkdown text={row[cellIndex] || ""} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const trimmedLine = lines[index].trim();
    if (/^[-*]\s+/.test(trimmedLine)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`list-${index}`} className="my-2 list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => <li key={itemIndex}><TextoMarkdown text={item} /></li>)}
        </ul>,
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmedLine)) {
      const items = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ordered-${index}`} className="my-2 list-decimal space-y-1 pl-5">
          {items.map((item, itemIndex) => <li key={itemIndex}><TextoMarkdown text={item} /></li>)}
        </ol>,
      );
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !(index + 1 < lines.length && lines[index].includes("|") && esSeparadorTabla(lines[index + 1])) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+[.)]\s+/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${index}`} className="my-2 first:mt-0 last:mb-0">
        <TextoMarkdown text={paragraph.join(" ")} />
      </p>,
    );
  }

  return <div className="whitespace-normal break-words">{blocks}</div>;
}

export default function AsistenteOdontologo() {
  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteId] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [consulta, setConsulta] = useState("");
  const [cargandoPacientes, setCargandoPacientes] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const mensajesRef = useRef(null);

  useEffect(() => {
    let activo = true;
    api.get("/odontologo/ai/pacientes")
      .then(({ data }) => {
        if (activo) setPacientes(data || []);
      })
      .catch((err) => {
        if (activo) setError(err.response?.data?.error || "No se pudieron cargar tus pacientes.");
      })
      .finally(() => {
        if (activo) setCargandoPacientes(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    mensajesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, enviando]);

  const iniciarNuevaConversacion = () => {
    setPacienteId("");
    setMensajes([]);
    setConsulta("");
    setError("");
  };

  const enviarConsulta = async (event, texto = consulta) => {
    event?.preventDefault();
    const mensaje = texto.trim();
    if (!pacienteId || !mensaje || enviando) return;

    const historial = mensajes.slice(-12).map(({ role, content }) => ({ role, content }));
    setMensajes((actuales) => [...actuales, { role: "user", content: mensaje }]);
    setConsulta("");
    setError("");
    setEnviando(true);
    try {
      const { data } = await api.post("/odontologo/ai/chat", {
        patientId: Number(pacienteId),
        message: mensaje,
        conversation: historial,
      });
      setMensajes((actuales) => [...actuales, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo obtener una respuesta. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  const cambiarPaciente = (event) => {
    setPacienteId(event.target.value);
    setMensajes([]);
    setError("");
  };

  const pacienteSeleccionado = pacientes.find((paciente) => String(paciente.id) === pacienteId);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-7xl min-w-0 flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="relative isolate grid min-h-[166px] grid-cols-1 items-center gap-2 overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-r from-[#d6f8f6] via-[#e5fbf9] to-[#c6f2ef] px-5 py-5 shadow-[0_18px_45px_-28px_rgba(8,127,129,0.38)] sm:px-7 md:grid-cols-[minmax(0,1fr)_auto] md:gap-4 lg:px-9">
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-16 -top-28 h-64 w-64 rounded-full bg-white/35 blur-2xl" />
          <div className="absolute -bottom-36 left-[38%] h-64 w-64 rounded-full bg-cyan-100/70 blur-3xl" />
          <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-30">
            <path d="M0 166C180 109 268 194 452 140S736 28 892 88s214 64 308 18v114H0Z" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#078b91] shadow-sm">
            <IconoDiente className="h-4 w-4" />
            Apoyo clínico
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#103c68] sm:text-2xl lg:text-[1.7rem]">
            Asistente IA para odontólogos
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#174b70]">
            Consulta la información clínica registrada para apoyar tu valoración profesional.
          </p>
        </div>

        <button
          type="button"
          onClick={iniciarNuevaConversacion}
          disabled={enviando}
          className="relative z-10 inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/90 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#174558] shadow-[0_8px_20px_-12px_rgba(8,71,100,0.45)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:justify-self-end"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[#078b91]" aria-hidden="true">
            <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2 1-4.2A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M8 11.5h8M8 8.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Nueva conversación
        </button>
      </header>

      <section className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_18px_55px_-35px_rgba(15,76,120,0.35)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-sky-100 bg-gradient-to-r from-white via-[#fbfeff] to-cyan-50/80 px-4 py-3 sm:px-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 text-[#087f91] shadow-[inset_0_0_0_1px_rgba(255,255,255,.9)] ring-1 ring-cyan-200/70" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M10 12v1a5 5 0 0 0 10 0v-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="20" cy="10" r="2" fill="currentColor" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-extrabold text-[#153c68]">Asistente clínico</span>
            <span className="mt-0.5 block text-xs text-[#58779a]">Orientación basada en la historia clínica disponible</span>
          </span>

          <div className="flex w-full items-center gap-2 rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-white p-2 shadow-[0_4px_14px_-10px_rgba(8,127,145,.45)] sm:w-auto sm:min-w-[280px] sm:max-w-xs">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 text-[#078b91]" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6">
                <circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 17v-1.2A4.8 4.8 0 0 1 8.8 11h2.4a4.8 4.8 0 0 1 4.8 4.8V17H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <label htmlFor="asistente-paciente" className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#079ba0]">
                Paciente
              </label>
              <select
                id="asistente-paciente"
                value={pacienteId}
                onChange={cambiarPaciente}
                disabled={cargandoPacientes || enviando || pacientes.length === 0}
                className="w-full appearance-none border-0 bg-transparent py-0.5 pr-5 text-sm font-semibold text-[#153c68] outline-none focus:ring-0 disabled:text-slate-400"
              >
                <option value="">
                  {cargandoPacientes ? "Cargando pacientes..." : pacientes.length ? "Seleccionar paciente..." : "No tienes pacientes relacionados"}
                </option>
                {pacientes.map((paciente) => (
                  <option key={paciente.id} value={paciente.id}>
                    {[paciente.nombres, paciente.apellidos].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
            </span>
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-[#174558]" aria-hidden="true">
              <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div
          className={`relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[radial-gradient(ellipse_at_top,#f0fcff_0%,#ffffff_55%,#f2fbff_100%)] p-4 sm:p-6 ${mensajes.length === 0 ? "justify-center" : "space-y-4"}`}
          aria-live="polite"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-8 h-44 w-44 rounded-full bg-cyan-100/40 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-32 w-48 rounded-tr-full bg-teal-100/30 blur-2xl" />
          {mensajes.length === 0 && (
            <div className="relative z-10 flex flex-col items-center py-3 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-teal-100 text-[#078b91] shadow-sm" aria-hidden="true">
                <IconoDiente className="h-8 w-8" />
              </span>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#153c68]">¡Hola, doctor!</h2>
              <p className="mt-1 text-sm font-medium text-[#55749a]">¿En qué puedo ayudarte hoy?</p>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-500">
                {pacienteSeleccionado ? MENSAJE_BIENVENIDA : "Selecciona un paciente para consultar su información clínica."}
              </p>
            </div>
          )}

          {mensajes.map((mensaje, index) => (
            <div key={`${index}-${mensaje.role}`} className={`relative z-10 flex items-start gap-3 ${mensaje.role === "user" ? "justify-end" : ""}`}>
              {mensaje.role === "assistant" && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 text-[#087f91]" aria-hidden="true">
                  <IconoDiente className="h-5 w-5" />
                </span>
              )}
              <div className={`max-w-[88%] min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[0_8px_24px_-18px_rgba(8,127,129,0.4)] sm:max-w-[78%] ${
                mensaje.role === "user"
                  ? "whitespace-pre-wrap rounded-tr-sm bg-gradient-to-br from-[#11b9bb] to-[#079b9e] text-white"
                  : "rounded-tl-sm border border-white bg-white/95 text-slate-700"
              }`}>
                {mensaje.role === "user" && <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/75">Consulta</span>}
                {mensaje.role === "assistant" ? <MensajeMarkdown content={mensaje.content} /> : mensaje.content}
              </div>
              {mensaje.role === "user" && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-[#315b83]" aria-label="Odontólogo">
                  OD
                </span>
              )}
            </div>
          ))}
          {enviando && (
            <div className="relative z-10 flex items-center gap-3 text-sm text-slate-500">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 text-[#087f91]" aria-hidden="true">
                <IconoDiente />
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white bg-white px-4 py-3 shadow-sm">
                <span className="mr-1 text-xs">Analizando la información clínica</span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#11b9bb]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#11b9bb] [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#11b9bb] [animation-delay:240ms]" />
              </div>
            </div>
          )}
          <div ref={mensajesRef} />
        </div>

        {error && <p role="alert" className="mx-4 mb-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:mx-6">{error}</p>}

        {pacienteSeleccionado && mensajes.length === 0 && (
          <div className="relative z-10 border-t border-sky-50 bg-white/90 px-4 py-3 sm:px-6">
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#64829e]">Consultas sugeridas</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {PREGUNTAS_SUGERIDAS.map((pregunta, index) => (
                <button
                  key={pregunta}
                  type="button"
                  disabled={enviando}
                  onClick={() => enviarConsulta(null, pregunta)}
                  className={`group flex min-h-[58px] items-center gap-2.5 rounded-full border px-3 py-2 text-left text-xs font-semibold leading-snug shadow-[0_6px_18px_-15px_rgba(15,76,88,0.5)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${COLORES_PREGUNTAS[index]}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-current shadow-sm transition-transform group-hover:scale-105">
                    <IconoPregunta index={index} />
                  </span>
                  <span className="min-w-0 flex-1">{pregunta}</span>
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                    <path d="m7.5 4 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={enviarConsulta} className="relative z-10 border-t border-sky-50 bg-white/95 p-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 rounded-full border border-sky-100 bg-white p-2 shadow-[0_8px_24px_-16px_rgba(8,127,145,.35)] transition focus-within:border-cyan-300 focus-within:ring-4 focus-within:ring-cyan-100/70">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-[#315b83]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12.5 12.5 8.8 16.2a3.2 3.2 0 0 1-4.5-4.5l7.2-7.2a4.5 4.5 0 0 1 6.4 6.4l-7.6 7.6a5.8 5.8 0 0 1-8.2-8.2l7.2-7.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" transform="translate(2 1)" />
              </svg>
            </span>
            <textarea
              value={consulta}
              onChange={(event) => setConsulta(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  enviarConsulta();
                }
              }}
              maxLength={2000}
              rows={1}
              disabled={!pacienteId || enviando}
              placeholder={pacienteId ? "Escribe tu consulta aquí..." : "Selecciona un paciente para comenzar"}
              className="min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-slate-700 outline-none placeholder:text-[#7890aa] focus:ring-0 disabled:bg-transparent"
            />
            <button
              type="submit"
              disabled={!pacienteId || !consulta.trim() || enviando}
              aria-label="Enviar consulta"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#16c4c5] to-[#079b9e] text-white shadow-[0_7px_16px_-8px_rgba(8,127,129,.8)] transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="m3 11 18-8-7 18-3.2-7.8L3 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M10.8 13.2 21 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">
            Apoyo a tu criterio profesional · Evita incluir datos identificativos del paciente
          </p>
        </form>
      </section>
    </main>
  );
}
