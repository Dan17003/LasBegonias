import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [isLogged, setIsLogged] = useState(() => Boolean(localStorage.getItem("token")));

  useEffect(() => {
    const cerrarSesionExpirada = () => setIsLogged(false);
    window.addEventListener("auth:expired", cerrarSesionExpirada);
    return () => window.removeEventListener("auth:expired", cerrarSesionExpirada);
  }, []);

  return isLogged
    ? <Dashboard setIsLogged={setIsLogged} />
    : <Login setIsLogged={setIsLogged} />;
}