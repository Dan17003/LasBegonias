import { obtenerPermisosUsuario, normalizarRol } from "../utils/permisos";
import LogoClinica from "./LogoClinica";

const iconClass = "w-5 h-5";

const menuItems = [
  {
    id: "inicio",
    label: "Inicio",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5z" />
      </svg>
    ),
  },
  {
    id: "usuarios",
    label: "Usuarios",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 14a4 4 0 0 1 4 4v1H4v-1a4 4 0 0 1 4-4m8-7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
      </svg>
    ),
  },
  {
    id: "doctores",
    label: "Doctores",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m3-8a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM5 22a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-7" />
      </svg>
    ),
  },
  {
    id: "pacientes",
    label: "Pacientes",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20a5 5 0 0 0-10 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7-1 2 2 3-4" />
      </svg>
    ),
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      </svg>
    ),
  },
  {
    id: "perfil",
    label: "Mi perfil",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19a6 6 0 0 0-6 0m3-8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
  {
    id: "mis-pacientes",
    label: "Mis pacientes",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20a5 5 0 0 0-10 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7-1 2 2 3-4" />
      </svg>
    ),
  },
  {
    id: "asistente-ia",
    label: "Asistente IA",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M8 9h8v6H8zM10 15v2m4-2v2" />
      </svg>
    ),
  },
  {
    id: "finanzas",
    label: "Finanzas",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m4-8a4 4 0 0 0-4-2c-2 0-3 .9-3 2s1 2 3 2 3 .9 3 2-1 2-3 2a4 4 0 0 1-4-2M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0z" />
      </svg>
    ),
  },
];

export default function Sidebar({ setView, currentView, setIsLogged, patientSections, sectionBadges = {} }) {
  const permisos = obtenerPermisosUsuario();
  const userRol = normalizarRol(localStorage.getItem("rol"));
  const etiquetasRol = {
    recepcionista: "Recepcionista",
    odontologo: "Odontólogo",
    administrador: "Administrador",
    admin: "Administrador",
  };
  const nombreUsuario = localStorage.getItem("nombre") || etiquetasRol[userRol] || "Usuario";
  const etiquetaRol = etiquetasRol[userRol] || (userRol === "paciente" ? "Paciente" : userRol) || "Usuario";
  const iconosPaciente = {
    resumen: "inicio",
    perfil: "perfil",
    citas: "agenda",
    documentos: "pacientes",
    finanzas: "finanzas",
    asistente: "asistente-ia",
  };
  const itemsVisibles = patientSections
    ? patientSections.map(([id, label]) => {
      const base = menuItems.find((item) => item.id === iconosPaciente[id]);
      return base ? { ...base, id, label } : { id, label, icon: menuItems[0].icon };
    })
    : menuItems.filter((item) =>
      item.id === "asistente-ia"
        ? userRol === "odontologo"
        : permisos.includes(item.id)
    );

  const logout = () => {
    localStorage.clear();
    setIsLogged(false);
    window.location.reload();
  };

  return (
    <aside className="flex h-screen max-h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-[#087f81]/20 bg-gradient-to-b from-[#11B9BB] via-[#10afb2] to-[#0e999b] text-white shadow-[8px_0_30px_rgba(8,127,129,0.12)]">
      <div className="shrink-0 border-b border-white/25 bg-[#38c7ca] px-5 py-5">
        <div className="flex items-center gap-4 px-1 py-1 text-left">
          <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[1.25rem] border border-white/80 bg-white p-2 shadow-xl shadow-[#075b5d]/20">
            <LogoClinica className="h-full w-full drop-shadow-[0_3px_7px_rgba(0,70,67,0.18)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase leading-snug tracking-[0.12em] text-white/75">
              Especialidades odontológicas
            </p>
            <h1 className="mt-1 text-xl font-extrabold leading-tight tracking-wide text-white drop-shadow-sm">
              Las Begonias
            </h1>
          </div>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          Menú principal
        </p>
          {itemsVisibles.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-white font-bold text-[#075b5d] shadow-md shadow-[#075b5d]/15"
                    : "font-medium text-white/85 hover:bg-white/15 hover:text-white"
                }`}
              >
                {isActive && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#087f81]" />}
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isActive ? "bg-[#e4f8f7] text-[#0e999b]" : "bg-white/10 text-white/90 group-hover:bg-white/20"
                }`}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {sectionBadges[item.id] > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-rose-500 text-white" : "bg-white text-[#087f81]"
                  }`}>
                    {sectionBadges[item.id]}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-white/20 bg-[#087f81]/15 p-4">
        <div className="rounded-2xl border border-white/25 bg-white/12 p-3.5 shadow-inner shadow-white/5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white text-sm font-extrabold text-[#087f81] shadow-md shadow-[#075b5d]/15">
              {nombreUsuario.trim().charAt(0).toLocaleUpperCase("es")}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/65">Sesión activa</p>
              <p className="mt-1 truncate text-sm font-bold leading-tight" title={nombreUsuario}>
                {nombreUsuario}
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/95">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" aria-hidden="true" />
                {etiquetaRol}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 py-2.5 text-xs font-bold tracking-wide text-white transition duration-200 hover:border-white hover:bg-white hover:text-[#087f81] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4m-4-4 4-4m0 0-4-4m4 4H3" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
