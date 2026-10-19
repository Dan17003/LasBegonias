import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const MENSAJE_BIENVENIDA = "Puedo resumir la historia clínica y señalar opciones de procedimientos para que las valores según los hallazgos registrados. Las sugerencias son apoyo y no sustituyen tu evaluación.";
const PREGUNTAS_SUGERIDAS = [
  "Resume las últimas atenciones",
  "¿Qué antecedentes médicos debo considerar?",
  "¿Qué tratamientos están pendientes?",
  "¿Qué opciones de procedimientos podría valorar según los registros?",
];

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
    <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-5xl min-w-0 flex-col px-3 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b8f91]">Apoyo clínico</p>
          <h1 className="mt-1 text-xl font-black text-slate-800 sm:text-2xl">Asistente IA para Odontólogos</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Consulta la información clínica registrada y solicita opciones de procedimientos para valorar.</p>
        </div>
        <button
          type="button"
          onClick={iniciarNuevaConversacion}
          disabled={enviando}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-[#11B9BB] hover:text-[#087f81] disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Nueva conversación
        </button>
      </header>

      <section className="flex min-h-[440px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 p-3 sm:p-4">
          <label htmlFor="asistente-paciente" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Paciente seleccionado
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <select
              id="asistente-paciente"
              value={pacienteId}
              onChange={cambiarPaciente}
              disabled={cargandoPacientes || enviando || pacientes.length === 0}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#11B9BB] focus:ring-2 focus:ring-[#11B9BB]/20"
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
            {pacienteSeleccionado && (
              <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
                {[pacienteSeleccionado.nombres, pacienteSeleccionado.apellidos].filter(Boolean).join(" ")}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-5" aria-live="polite">
          {mensajes.length === 0 && (
            <div className="flex max-w-3xl items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-lg" aria-hidden="true">🤖</div>
              <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
                {pacienteId ? MENSAJE_BIENVENIDA : "Selecciona un paciente para comenzar."}
              </div>
            </div>
          )}
          {mensajes.map((mensaje, index) => (
            <div key={`${index}-${mensaje.role}`} className={`flex items-start gap-3 ${mensaje.role === "user" ? "justify-end" : ""}`}>
              {mensaje.role === "assistant" && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-lg" aria-hidden="true">🤖</div>}
              <div className={`max-w-[88%] min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] ${
                mensaje.role === "user"
                  ? "whitespace-pre-wrap rounded-tr-sm bg-[#11B9BB] text-white"
                  : "rounded-tl-sm bg-slate-100 text-slate-700"
              }`}>
                {mensaje.role === "user" && <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/75">Odontólogo</span>}
                {mensaje.role === "assistant" ? <MensajeMarkdown content={mensaje.content} /> : mensaje.content}
              </div>
              {mensaje.role === "user" && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-lg" aria-hidden="true">👨‍⚕️</div>}
            </div>
          ))}
          {enviando && (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50" aria-hidden="true">🤖</div>
              Analizando la información clínica...
            </div>
          )}
          <div ref={mensajesRef} />
        </div>

        {error && <p role="alert" className="mx-3 mb-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:mx-5">{error}</p>}

        {pacienteId && mensajes.length === 0 && (
          <div className="flex flex-wrap gap-2 px-3 pb-3 sm:px-5">
            {PREGUNTAS_SUGERIDAS.map((pregunta) => (
              <button
                key={pregunta}
                type="button"
                disabled={enviando}
                onClick={() => enviarConsulta(null, pregunta)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-[#11B9BB] hover:bg-cyan-50"
              >
                {pregunta}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={enviarConsulta} className="border-t border-slate-100 p-3 sm:p-4">
          <div className="flex items-end gap-2">
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
              rows={2}
              disabled={!pacienteId || enviando}
              placeholder={pacienteId ? "Escribe tu consulta... (Enter para enviar)" : "Selecciona un paciente para escribir"}
              className="min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#11B9BB] focus:ring-2 focus:ring-[#11B9BB]/20 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!pacienteId || !consulta.trim() || enviando}
              aria-label="Enviar consulta"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#11B9BB] text-xl font-bold text-white transition hover:bg-[#0b9fa1] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ➤
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-400">
            La información es de apoyo y no sustituye la valoración ni el criterio profesional del odontólogo.
          </p>
          <p className="mt-1 text-center text-[11px] leading-relaxed text-slate-400">
            Evita escribir nombres, DNI o datos de contacto en tus consultas.
          </p>
        </form>
      </section>
    </main>
  );
}
