import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Inicio from "./Inicio";
import Pacientes from "./Pacientes";
import Agenda from "./Agenda";

export default function Dashboard({ setIsLogged }) {
    const [view, setView] = useState("inicio");

    return (
        <div className="flex h-screen bg-[#f5f7fb] text-[17px]">
            

            { }
            <Sidebar setView={setView} setIsLogged={setIsLogged} />

            { }
            <div className="flex-1 overflow-auto">
                {view === "inicio" && <Inicio />}
                {view === "pacientes" && <Pacientes />}
                {view === "agenda" && <Agenda />}
            </div>

        </div>
    );
}