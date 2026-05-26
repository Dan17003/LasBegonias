import { useState } from "react";

export default function Configuracion() {
  // Estados para simular la persistencia de los parámetros del negocio
  const [datosClinica, setDatosClinica] = useState({
    nombre: "Clínica Dental Las Begonias S.A.C.",
    ruc: "20765432101",
    direccion: "Av. Las Begonias 450, San Isidro, Lima",
    telefono: "(01) 421-9876",
  });

  const [parametrosCita, setParametrosCita] = useState({
    duracionDefecto: "30",
    intervaloRecordatorio: "24",
  });

  const [guardado, setGuardado] = useState(false);

  const manejarGuardar = (e) => {
    e.preventDefault();
    setGuardado(true);
    // Simular un timeout para limpiar la alerta visual de guardado exitoso
    setTimeout(() => setGuardado(false), 3000);
  };

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
      
      {/* ENCABEZADO */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">⚙️ Configuración del Sistema</h2>
        <p className="text-xs text-slate-400 mt-1">
          Parámetros globales del sistema, datos fiscales de facturación y control de agendas.
        </p>
      </div>

      {/* ALERTA DE ÉXITO INTERACTIVA */}
      {guardado && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-2 animate-fade-in">
          <span>✓ ¡Los parámetros de la clínica se actualizaron correctamente en la base de datos local!</span>
        </div>
      )}

      <form onSubmit={manejarGuardar} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA Y CENTRAL: DATOS DE LA CLÍNICA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-5 pb-2 border-b border-slate-50 flex items-center gap-2">
              🏢 Información Institucional y Fiscal
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 mb-1">Razón Social</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-medium text-slate-800"
                  value={datosClinica.nombre}
                  onChange={(e) => setDatosClinica({ ...datosClinica, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Número de RUC</label>
                <input 
                  type="text" 
                  maxLength={11}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={datosClinica.ruc}
                  onChange={(e) => setDatosClinica({ ...datosClinica, ruc: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Teléfono de Contacto</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={datosClinica.telefono}
                  onChange={(e) => setDatosClinica({ ...datosClinica, telefono: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 mb-1">Dirección Legal</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none text-slate-800"
                  value={datosClinica.direccion}
                  onChange={(e) => setDatosClinica({ ...datosClinica, direccion: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PARÁMETROS OPERATIVOS */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-5 pb-2 border-b border-slate-50 flex items-center gap-2">
                ⏱️ Parámetros Clínicos (Agenda)
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Duración por Cita Médica</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-bold text-slate-700"
                    value={parametrosCita.duracionDefecto}
                    onChange={(e) => setParametrosCita({ ...parametrosCita, duracionDefecto: e.target.value })}
                  >
                    <option value="20">20 Minutos</option>
                    <option value="30">30 Minutos (Estándar)</option>
                    <option value="45">45 Minutos</option>
                    <option value="60">60 Minutos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Anticipación Recordatorios (WhatsApp)</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none font-bold text-slate-700"
                    value={parametrosCita.intervaloRecordatorio}
                    onChange={(e) => setParametrosCita({ ...parametrosCita, intervaloRecordatorio: e.target.value })}
                  >
                    <option value="12">12 horas antes</option>
                    <option value="24">24 horas antes (Recomendado)</option>
                    <option value="48">48 horas antes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BOTÓN DE ACCIÓN */}
            <div className="mt-8 pt-4 border-t border-slate-50">
              <button 
                type="submit"
                className="w-full bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold py-3 rounded-xl transition shadow-sm text-center"
              >
                Guardar Configuración Global
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}