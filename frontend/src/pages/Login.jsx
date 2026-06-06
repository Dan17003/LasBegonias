import { useState } from "react";
import api from "../services/api";

export default function Login({ setIsLogged }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

const handleLogin = async (e) => {
  e.preventDefault();

  try {
    setError("");

    const res = await api.post("/auth/login", {
      email,
      password,
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("rol", res.data.user.rol);

    setIsLogged(true);
  } catch (err) {
    console.error(err);
    setError("Credenciales incorrectas. Inténtalo de nuevo.");
  }
};



  return (
    <div className="flex h-screen w-screen font-sans overflow-hidden bg-white">
      
      <div className="w-1/2 flex flex-col justify-center items-center bg-white p-8 select-none">
        <div className="flex flex-col items-center">
          <svg 
            className="w-44 h-44 text-[#11B9BB] mb-4" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.2"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M12 3v18M3 12h18M12 3c2.5 4 4.5 6 7 9-2.5 3-4.5 5-7 9-2.5-4-4.5-6-7-9 2.5-3 4.5-5 7-9zM3 12c4 2.5 6 4.5 9 7 3-2.5 5-4.5 9-7-4-2.5-6-4.5-9-7-3 2.5-5 4.5-9 7z" 
            />
          </svg>
          <h1 className="text-4xl font-bold text-[#11B9BB] tracking-wide text-center leading-tight">
            Clínica<br />Las Begonias
          </h1>
        </div>
      </div>

      <div className="w-1/2 bg-[#11B9BB] flex flex-col justify-center px-20 text-white relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-md mx-auto">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold mb-2">
              ¡Bienvenido de vuelta!
            </h2>
            <div className="text-3xl animate-pulse">🦷</div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-95">Email</label>
              <input
                type="email"
                required
                className="w-full p-3 rounded-lg text-slate-800 placeholder-slate-400 mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-200 bg-white transition text-sm"
                placeholder="Ingresa tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium opacity-95">Contraseña</label>
                <a href="#" className="text-xs hover:underline opacity-80 transition">
                  ¿Has olvidado tu contraseña?
                </a>
              </div>
              <input
                type="password"
                required
                className="w-full p-3 rounded-lg text-slate-800 placeholder-slate-400 mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-200 bg-white transition text-sm"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 p-3 rounded-lg text-red-100 text-xs font-medium animate-shake">
                ⚠️ {error}
              </div>
            )}

            <div className="pt-2">
              <button 
                type="submit"
                className="w-full bg-[#3ae7e1] hover:bg-[#2bd4ce] active:scale-[0.99] text-teal-950 font-bold py-3.5 rounded-lg mt-2 transition duration-200 shadow-md shadow-teal-900/20 text-sm tracking-wide"
              >
                Iniciar sesión
              </button>
            </div>
          </form>

          <div className="text-center mt-8 text-xs opacity-85">
            <span>¿No tienes una cuenta? </span>
            <a href="#" className="font-bold hover:underline hover:text-cyan-100 transition">
              Crea una cuenta
            </a>
          </div>

        </div>
      </div>

    </div>
  );
}