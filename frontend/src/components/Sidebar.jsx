import { obtenerPermisosUsuario, normalizarRol } from "../utils/permisos";

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
    <aside className="w-72 min-h-screen bg-[#11B9BB] text-white flex flex-col justify-between flex-shrink-0 shadow-2xl select-none border-r border-white/20">
      <div>
        <div className="p-5 flex items-center gap-3 border-b border-white/15 mb-5 bg-white/10">
          <div className="w-11 h-11 rounded-2xl bg-white text-[#0b8f91] flex items-center justify-center shadow-lg shadow-cyan-950/20">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M12 3c2.5 4 4.5 6 7 9-2.5 3-4.5 5-7 9-2.5-4-4.5-6-7-9 2.5-3 4.5-5 7-9z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-xs leading-tight tracking-[0.18em] uppercase text-white/65">Clinica</p>
            <h1 className="font-extrabold text-base leading-tight tracking-wide">Las Begonias</h1>
          </div>
        </div>

        <nav className="px-3 space-y-1.5">
          {itemsVisibles.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white text-[#087f81] shadow-lg shadow-cyan-950/20 font-bold"
                    : "text-white/80 hover:bg-white/15 hover:text-white"
                }`}
              >
                <div className={isActive ? "text-[#11B9BB]" : "opacity-85"}>
                  {item.icon}
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                {sectionBadges[item.id] > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {sectionBadges[item.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/15 bg-black/5 flex flex-col gap-3">
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/10 p-3 shadow-inner shadow-white/5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-white text-sm font-extrabold text-[#087f81] shadow-md shadow-cyan-950/15">
              {nombreUsuario.trim().charAt(0).toLocaleUpperCase("es")}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Tu cuenta</p>
              <p className="mt-0.5 truncate text-sm font-bold leading-tight" title={nombreUsuario}>
                {nombreUsuario}
              </p>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" aria-hidden="true" />
                {etiquetaRol}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full bg-white/15 hover:bg-white text-white hover:text-[#087f81] font-bold py-2.5 rounded-xl transition duration-200 text-xs tracking-wide border border-white/20 hover:border-white"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
