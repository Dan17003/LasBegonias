import { useState } from "react";

export default function Sidebar({ setView, currentView, setIsLogged }) {
  // Leemos el rol guardado en localStorage (y lo normalizamos a mayúsculas para evitar errores)
  const userRol = (localStorage.getItem("rol") || "Recepcionista").toUpperCase();

  const logout = () => {
    localStorage.clear();
    setIsLogged(false);
    window.location.reload();
  };

  // Toda la lista de menús con los permisos de rol correspondientes
  const menuItems = [
    { 
      id: "inicio", 
      label: "Inicio", 
      roles: ["ADMIN", "RECEPCIONISTA"],
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      id: "pacientes", 
      label: "Pacientes", 
      roles: ["ADMIN", "RECEPCIONISTA"],
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      id: "agenda", 
      label: "Agenda", 
      roles: ["ADMIN", "RECEPCIONISTA"],
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: "finanzas", 
      label: "Finanzas", 
      roles: ["ADMIN", "RECEPCIONISTA"],
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: "doctores", 
      label: "Doctores", 
      roles: ["ADMIN"], // 🔒 Solo Administrador
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      id: "usuarios", 
      label: "Usuarios", 
      roles: ["ADMIN"], // 🔒 Solo Administrador
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      id: "reportes", 
      label: "Reportes", 
      roles: ["ADMIN"], // 🔒 Solo Administrador
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      )
    },
    { 
      id: "configuracion", 
      label: "Configuración", 
      roles: ["ADMIN"], // 🔒 Solo Administrador
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  return (
    <aside className="w-64 min-h-screen bg-[#11B9BB] text-white flex flex-col justify-between flex-shrink-0 shadow-lg select-none">
      
      <div>
        {/* Logo de la Clínica */}
        <div className="p-5 flex items-center gap-3 border-b border-white/10 mb-6">
          <svg className="w-10 h-10 text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M12 3c2.5 4 4.5 6 7 9-2.5 3-4.5 5-7 9-2.5-4-4.5-6-7-9 2.5-3 4.5-5 7-9zM3 12c4 2.5 6 4.5 9 7 3-2.5 5-4.5 9-7-4-2.5-6-4.5-9-7-3 2.5-5 4.5-9 7z" />
          </svg>
          <div>
            <h1 className="font-bold text-sm leading-tight tracking-wide">Clínica</h1>
            <h1 className="font-extrabold text-base leading-tight tracking-wide">Las Begonias</h1>
          </div>
        </div>

        {/* Lista de Botones Filtrada por Rol */}
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            // Si el rol del usuario no está autorizado para este ítem, no lo renderizamos
            if (!item.roles.includes(userRol)) return null;

            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white/15 text-white shadow-xs font-bold"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className={`transition-transform duration-200 ${isActive ? "opacity-100" : "opacity-80"}`}>
                  {item.icon}
                </div>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer del Perfil y Desconexión */}
      <div className="p-4 border-t border-white/10 bg-black/5 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 text-white rounded-full flex items-center justify-center font-bold text-xs border border-white/10">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-left">
              {/* Muestra dinámicamente si es ADMIN o RECEPCIONISTA */}
              <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Sesión activa</p>
              <p className="text-sm font-bold leading-tight capitalize">{userRol.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full bg-white/10 hover:bg-white text-white hover:text-teal-950 font-bold py-2 rounded-xl transition duration-200 text-xs tracking-wide border border-white/20 hover:border-white"
        >
          Cerrar sesión
        </button>
      </div>

    </aside>
  );
}