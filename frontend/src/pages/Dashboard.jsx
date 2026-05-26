import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Inicio from "./Inicio";
import Pacientes from "./Pacientes";
import Agenda from "./Agenda";

// ⚡ 1. Importamos los nuevos módulos del Administrador
import Usuarios from "./Usuarios";
import Doctores from "./Doctores";
import Reportes from "./Reportes";
import Configuracion from "./Configuracion";

export default function Dashboard({ setIsLogged }) {
    const [view, setView] = useState("inicio");

    return (
        <div className="flex h-screen bg-[#f5f7fb] text-[17px]">
            
            {/* Sidebar de navegación */}
            <Sidebar setView={setView} setIsLogged={setIsLogged} />

            {/* Contenedor dinámico de pantallas */}
            <div className="flex-1 overflow-auto">
                {view === "inicio" && <Inicio />}
                {view === "pacientes" && <Pacientes />}
                {view === "agenda" && <Agenda />}
                
                {/* ⚡ 2. Agregamos las condicionales para renderizar los nuevos módulos */}
                {view === "usuarios" && <Usuarios />}
                {view === "doctores" && <Doctores />}
                {view === "reportes" && <Reportes />}
                {view === "configuracion" && <Configuracion />}
            </div>

        </div>
    );
}