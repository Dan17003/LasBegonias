import { useState } from "react";

export default function Inicio() {
  // Obtenemos el rol del localStorage de forma segura
  const userRol = (localStorage.getItem("rol") || "Recepcionista").toUpperCase();

  // 📈 Datos extras del Administrador para las tarjetas métricas dinámicas
  const cardsResumen = [
    { 
      id: 1, 
      label: userRol === "ADMIN" ? "Ingresos del Mes" : "Citas hoy", 
      count: userRol === "ADMIN" ? "S/ 14,850" : 12, 
      bg: "bg-cyan-50/60 border-cyan-100", 
      textColor: "text-cyan-700", 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          {userRol === "ADMIN" ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          )}
        </svg>
      )
    },
    { 
      id: 2, 
      label: "Pacientes registrados", 
      count: 253, 
      bg: "bg-teal-50/60 border-teal-100", 
      textColor: "text-teal-700", 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      id: 3, 
      label: userRol === "ADMIN" ? "Rendimiento Doctores" : "Nuevos pacientes", 
      count: userRol === "ADMIN" ? "94%" : 8, 
      bg: "bg-sky-50/60 border-sky-100", 
      textColor: "text-sky-700", 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    { 
      id: 4, 
      label: userRol === "ADMIN" ? "Inasistencias Promedio" : "Tareas pendientes", 
      count: userRol === "ADMIN" ? "4.2%" : 5, 
      bg: userRol === "ADMIN" ? "bg-rose-50/60 border-rose-100" : "bg-slate-50 border-slate-200/60", 
      textColor: userRol === "ADMIN" ? "text-rose-700" : "text-slate-700", 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  const proximasCitas = [
    { hora: "09:00 AM", paciente: "María José Torres", motivo: "Limpieza dental" },
    { hora: "09:30 AM", paciente: "Carlos Ruiz", motivo: "Consulta general" },
    { hora: "10:00 AM", paciente: "Paula Gálvez", motivo: "Control" },
    { hora: "10:30 AM", paciente: "Diego Ramírez", motivo: "Tratamiento" }
  ];

  const recordatorios = [
    { titulo: "Confirmar citas del día", desc: "3 pendientes", color: "text-amber-500 bg-amber-50" },
    { titulo: "Verificar autorizaciones", desc: "2 pendientes", color: "text-blue-500 bg-blue-50" },
    { titulo: "Actualizar información de pacientes", desc: "1 pendiente", color: "text-purple-500 bg-purple-50" },
    { titulo: "Facturación del día", desc: "Pendiente", color: "text-emerald-500 bg-emerald-50" }
  ];

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
      
      {/* HEADER DINÁMICO */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">
          ¡Bienvenido, {userRol === "ADMIN" ? "Administrador" : "Recepcionista"}!
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {userRol === "ADMIN" 
            ? "Resumen de control analítico, financiero y de personal." 
            : "Este es el resumen general de la clínica operativa."}
        </p>
      </div>

      {/* TARJETAS RESUMEN INTEGRADAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cardsResumen.map((card) => (
          <div key={card.id} className={`p-4 rounded-2xl border ${card.bg} flex items-center justify-between shadow-2xs`}>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{card.count}</p>
            </div>
            <div className={`p-2.5 rounded-xl bg-white shadow-3xs ${card.textColor}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN INTERMEDIA: GRÁFICO SÓLO PARA EL ADMINISTRADOR */}
      {userRol === "ADMIN" && (
        <div className="mb-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
            <svg className="w-4 h-4 text-[#11B9BB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            Estadística de Ingresos Semanales de la Clínica
          </h3>
          <div className="flex items-end justify-between h-40 pt-4 px-4 border-b border-slate-100">
            {[
              { dia: "Lun", alt: "h-20", monto: "S/ 2,400" },
              { dia: "Mar", alt: "h-32", monto: "S/ 3,800" },
              { dia: "Mié", alt: "h-16", monto: "S/ 1,900" },
              { dia: "Jue", alt: "h-36", monto: "S/ 4,100" },
              { dia: "Vie", alt: "h-28", monto: "S/ 3,200" },
              { dia: "Sáb", alt: "h-14", monto: "S/ 1,500" },
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-2 group w-16">
                <span className="text-[9px] bg-slate-800 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition dynamic-popover pointer-events-none">
                  {b.monto}
                </span>
                <div className={`${b.alt} w-full bg-[#11B9BB]/80 group-hover:bg-[#11B9BB] rounded-t-lg transition-all duration-300 shadow-3xs`}></div>
                <span className="text-xs text-slate-400 font-semibold">{b.dia}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLAS Y RECORDATORIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Próximas Citas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#11B9BB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Próximas citas en sala
            </h3>
            <button className="text-xs font-bold text-[#11B9BB] hover:underline">Ver agenda completa</button>
          </div>

          <div className="divide-y divide-slate-50">
            {proximasCitas.map((cita, index) => (
              <div key={index} className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-xl transition group">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-[#11B9BB] bg-teal-50 px-2.5 py-1 rounded-lg font-mono">
                    {cita.hora}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{cita.paciente}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{cita.motivo}</p>
                  </div>
                </div>
                <button className="text-slate-300 group-hover:text-slate-500 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recordatorios */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
            <svg className="w-4 h-4 text-[#11B9BB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Recordatorios del Sistema
          </h3>

          <div className="space-y-4">
            {recordatorios.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                <div className={`p-2 rounded-lg ${rec.color} mt-0.5`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">{rec.titulo}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{rec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}