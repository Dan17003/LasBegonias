import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Inicio from "./Inicio";
import Pacientes from "./Pacientes";
import Agenda from "./Agenda";
import Finanzas from "./Finanzas";

import Usuarios from "./Usuarios";
import Doctores from "./Doctores";
import Reportes from "./Reportes";
import Notificaciones from "../components/Notificaciones";

export default function Dashboard({ setIsLogged }) {
    const [view, setView] = useState("inicio");

    return (
        <div className="flex h-screen bg-slate-100 text-[17px] text-slate-800">
            
            <Sidebar setView={setView} currentView={view} setIsLogged={setIsLogged} />

            {/* Contenedor dinámico de pantallas */}
            <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,#e0f7f7_0,#f8fafc_34%,#eef2f7_100%)]">
                <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/70 px-8 py-3 flex justify-end shadow-sm">
                    <Notificaciones />
                </div>
                {view === "inicio" && <Inicio setView={setView} />}
                {view === "pacientes" && <Pacientes />}
                {view === "agenda" && <Agenda />}
                {view === "finanzas" && <Finanzas />}
                
                {view === "usuarios" && <Usuarios />}
                {view === "doctores" && <Doctores />}
                {view === "reportes" && <Reportes />}
            </div>

        </div>
    );
}
