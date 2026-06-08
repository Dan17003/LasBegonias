import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Inicio from "./Inicio";
import Pacientes from "./Pacientes";
import Agenda from "./Agenda";
import Finanzas from "./Finanzas";

import Usuarios from "./Usuarios";
import Doctores from "./Doctores";
import Reportes from "./Reportes";

export default function Dashboard({ setIsLogged }) {
    const [view, setView] = useState("inicio");

    return (
        <div className="flex h-screen bg-[#f5f7fb] text-[17px]">
            
            <Sidebar setView={setView} currentView={view} setIsLogged={setIsLogged} />

            {/* Contenedor dinámico de pantallas */}
            <div className="flex-1 overflow-auto">
                {view === "inicio" && <Inicio />}
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