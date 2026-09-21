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
    id: "finanzas",
    label: "Finanzas",
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m4-8a4 4 0 0 0-4-2c-2 0-3 .9-3 2s1 2 3 2 3 .9 3 2-1 2-3 2a4 4 0 0 1-4-2M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0z" />
      </svg>
    ),
  },
];

export default function Sidebar({ setView, currentView, setIsLogged }) {
  const permisos = obtenerPermisosUsuario();
  const userRol = normalizarRol(localStorage.getItem("rol"));
  const nombreUsuario = localStorage.getItem("nombre") || userRol;
  const itemsVisibles = menuItems.filter((item) => permisos.includes(item.id));

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
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/15 bg-black/5 flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-2xl bg-white/12 px-3 py-3 border border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white text-[#0b8f91] rounded-xl flex items-center justify-center font-bold text-xs shadow-sm">
              {nombreUsuario.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-[10px] text-white/65 font-semibold uppercase tracking-wider">Sesion activa</p>
              <p className="text-sm font-bold leading-tight capitalize truncate max-w-[140px]">
                {nombreUsuario}
              </p>
              <p className="text-[10px] text-white/65 capitalize">{userRol}</p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full bg-white/15 hover:bg-white text-white hover:text-[#087f81] font-bold py-2.5 rounded-xl transition duration-200 text-xs tracking-wide border border-white/20 hover:border-white"
        >
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
