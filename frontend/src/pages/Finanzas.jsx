import { useState, useEffect } from "react";
import api from "../services/api";
import {
  toNumber,
  getPacienteId,
  calcularDeudas,
} from "../utils/finanzas";

export default function Finanzas() {
    const [tab, setTab] = useState("presupuestos");
    const [pacientes, setPacientes] = useState([]);
    const [presupuestos, setPresupuestos] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [showPresupuestoModal, setShowPresupuestoModal] = useState(false);
    const [showPagoModal, setShowPagoModal] = useState(false);
    const [filtroDeuda, setFiltroDeuda] = useState("");
    const [montoFiltro, setMontoFiltro] = useState("");

    const [formPresupuesto, setFormPresupuesto] = useState({
        paciente_id: "",
        descripcion: "",
        monto: "",
        fecha_vigencia: "",
        doctor: "",
    });

    const [formPago, setFormPago] = useState({
        paciente_id: "",
        presupuesto_id: "",
        monto: "",
        tipo_pago: "pago_total",
        metodo: "efectivo",
        descripcion: "",
        doctor: "",
    });

    useEffect(() => {
        obtenerPacientes();
        obtenerPresupuestos();
        obtenerPagos();
    }, []);

    const obtenerPacientes = async () => {
        try {
            const res = await api.get("/pacientes");
            setPacientes(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const obtenerPresupuestos = async () => {
        try {
            const res = await api.get("/presupuestos");
            setPresupuestos(res.data || []);
        } catch (error) {
            console.error("Presupuestos no disponibles:", error);
            setPresupuestos([]);
        }
    };

    const obtenerPagos = async () => {
        try {
            const res = await api.get("/pagos");
            setPagos(res.data || []);
        } catch (error) {
            console.error("Pagos no disponibles:", error);
            setPagos([]);
        }
    };

    const crearPresupuesto = async (e) => {
        e.preventDefault();

        if (
            !formPresupuesto.paciente_id ||
            !formPresupuesto.descripcion ||
            !formPresupuesto.monto ||
            !formPresupuesto.fecha_vigencia ||
            !formPresupuesto.doctor
        ) {
            console.error("Faltan datos");
            return;
        }

        try {
            await api.post("/presupuestos", {
                paciente_id: Number(formPresupuesto.paciente_id),
                descripcion: formPresupuesto.descripcion,
                monto: Number(formPresupuesto.monto),
                fecha_vigencia: formPresupuesto.fecha_vigencia,
                doctor: formPresupuesto.doctor,
            });

            obtenerPresupuestos();
            setShowPresupuestoModal(false);

            setFormPresupuesto({
                paciente_id: "",
                descripcion: "",
                monto: "",
                fecha_vigencia: "",
                doctor: "",
            });

        } catch (error) {
            console.error("ERROR BACKEND:", error.response?.data || error.message);
        }
    };

    const registrarPago = async (e) => {
        e.preventDefault();
        try {
            await api.post("/pagos", {
                paciente_id: Number(formPago.paciente_id),
                presupuesto_id: Number(formPago.presupuesto_id),
                monto: Number(formPago.monto),
                tipo_pago: formPago.tipo_pago,
                metodo: formPago.metodo,
                descripcion: formPago.descripcion,
                doctor: formPago.doctor,
            });
            obtenerPagos();
            obtenerPresupuestos();
            setShowPagoModal(false);
            setFormPago({
                paciente_id: "",
                presupuesto_id: "",
                monto: "",
                tipo_pago: "pago_total",
                metodo: "efectivo",
                descripcion: "",
                doctor: "",
            });
        } catch (error) {
            console.error(error);
        }
    };

    const imprimirPresupuesto = (presupuesto) => {
        const paciente = pacientes.find(p => p.id === presupuesto.paciente_id);
        const ventana = window.open("", "", "width=800,height=600");
        ventana.document.write(`
      <html>
        <head>
          <title>Presupuesto</title>
          <style>
            body { font-family: Arial; margin: 20px; }
            h1 { text-align: center; }
            .header { border-bottom: 2px solid #11B9BB; padding-bottom: 10px; }
            .details { margin: 20px 0; }
            .details p { margin: 5px 0; }
            .amount { font-size: 18px; font-weight: bold; color: #11B9BB; margin-top: 20px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Presupuesto - Clínica Las Begonias</h1>
          </div>
          <div class="details">
            <p><strong>Paciente:</strong> ${paciente?.nombres} ${paciente?.apellidos}</p>
            <p><strong>Descripción:</strong> ${presupuesto.descripcion}</p>
            <p><strong>Vigencia:</strong> ${presupuesto.fecha_vigencia}</p>
            <p class="amount">Monto: $${presupuesto.monto}</p>
          </div>
          <div class="footer">
            <p>Generado el ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `);
        ventana.document.close();
        ventana.print();
    };

    const enviarPresupuesto = (presupuesto) => {
        alert(`Presupuesto enviado a ${pacientes.find(p => p.id === presupuesto.paciente_id)?.nombres} al correo registrado`);
    };

    const deudasPendientes = calcularDeudas(
        presupuestos,
        pagos,
        montoFiltro ? Number(montoFiltro) : 0
    );

    const presupuestosDelPaciente = (pacienteId) =>
        presupuestos.filter(
            (presupuesto) => getPacienteId(presupuesto) === Number(pacienteId)
        );

    const saldoPresupuesto = (presupuestoId) => {
        const item = calcularDeudas(presupuestos, pagos).find(
            (deuda) => deuda.presupuesto.id === Number(presupuestoId)
        );
        return item ? item.saldo : 0;
    };

    const tabs = [
        { id: "presupuestos", label: "Presupuestos" },
        { id: "pagos", label: "Pagos" },
        { id: "deudas", label: "Deudas" },
        
    ];

    return (
        <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
                <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-2xl font-bold text-slate-800">Finanzas</h2>
            </div>

            <div className="flex gap-2 mb-6 border-b border-slate-200">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2.5 text-sm font-semibold transition-all ${tab === t.id
                                ? "border-b-2 border-[#11B9BB] text-[#11B9BB]"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                {tab === "presupuestos" && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Gestión de Presupuestos</h3>
                            <button
                                onClick={() => setShowPresupuestoModal(true)}
                                className="bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Nuevo Presupuesto
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Paciente</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Descripción</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Monto</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Odontólogo</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Vigencia</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {presupuestos.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">{pacientes.find(pc => pc.id === p.paciente_id)?.nombres || "N/A"}</td>
                                            <td className="px-4 py-3">{p.descripcion}</td>
                                            <td className="px-4 py-3 font-semibold text-[#11B9BB]">${p.monto}</td>
                                            <td className="px-4 py-3 text-slate-600">{p.doctor}</td>
                                            <td className="px-4 py-3 text-slate-500">{p.fecha_vigencia}</td>
                                            <td className="px-4 py-3 text-center flex gap-2 justify-center">
                                                <button
                                                    onClick={() => imprimirPresupuesto(p)}
                                                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100"
                                                >
                                                    Imprimir
                                                </button>
                                                <button
                                                    onClick={() => enviarPresupuesto(p)}
                                                    className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100"
                                                >
                                                    Enviar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === "pagos" && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Registro de Pagos</h3>
                            <button
                                onClick={() => setShowPagoModal(true)}
                                className="bg-[#11B9BB] hover:bg-[#0ea5a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Registrar Pago
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Paciente</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Monto</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Tipo</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Método</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Presupuesto</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Odontólogo</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pagos.map((pago) => (
                                        <tr key={pago.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">{pacientes.find(p => p.id === pago.paciente_id)?.nombres || "N/A"}</td>
                                            <td className="px-4 py-3 font-semibold text-green-600">${pago.monto}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                                                    {pago.tipo_pago === "pago_total" ? "Pago Total" : pago.tipo_pago === "pago_parcial" ? "Pago Parcial" : "Adelanto"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 capitalize">{pago.metodo}</td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {pago.Presupuesto?.descripcion || "Sin vincular"}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{pago.doctor}</td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {new Date(pago.created_at || pago.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === "deudas" && (
                    <div>
                        <div className="mb-6 flex gap-3">
                            <input
                                type="number"
                                placeholder="Filtrar por monto mínimo..."
                                value={montoFiltro}
                                onChange={(e) => setMontoFiltro(e.target.value)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm flex-1"
                            />
                            <button
                                onClick={() => setMontoFiltro("")}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
                            >
                                Limpiar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {deudasPendientes.map(({ presupuesto, pagado, saldo }) => {
                                const paciente = pacientes.find(
                                    (p) => p.id === getPacienteId(presupuesto)
                                );

                                return (
                                    <div key={presupuesto.id} className="border border-slate-200 rounded-xl p-4 bg-red-50/30">
                                        <h4 className="font-bold text-slate-800 mb-1">
                                            {paciente?.nombres} {paciente?.apellidos}
                                        </h4>
                                        <p className="text-sm text-slate-500 mb-2">{presupuesto.descripcion}</p>
                                        <div className="space-y-1 text-sm text-slate-700">
                                            <p><span className="font-semibold">Monto Total:</span> ${toNumber(presupuesto.monto).toFixed(2)}</p>
                                            <p><span className="font-semibold">Pagado:</span> ${pagado.toFixed(2)}</p>
                                            <p className="text-red-600 font-bold text-base">Saldo Pendiente: ${saldo.toFixed(2)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {deudasPendientes.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <p>No hay pacientes con deuda</p>
                            </div>
                        )}
                    </div>
                )}

                
            </div>

            {showPresupuestoModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
                    <form onSubmit={crearPresupuesto} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Crear Presupuesto</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Paciente</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={formPresupuesto.paciente_id}
                                    onChange={(e) =>
                                        setFormPresupuesto({
                                            ...formPresupuesto,
                                            paciente_id: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Seleccionar paciente</option>
                                    {pacientes.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombres} {p.apellidos}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="Ej: Limpieza dental"
                                    value={formPresupuesto.descripcion}
                                    onChange={(e) =>
                                        setFormPresupuesto({
                                            ...formPresupuesto,
                                            descripcion: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Monto</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="0.00"
                                    value={formPresupuesto.monto}
                                    onChange={(e) =>
                                        setFormPresupuesto({
                                            ...formPresupuesto,
                                            monto: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Vigencia</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={formPresupuesto.fecha_vigencia}
                                    onChange={(e) =>
                                        setFormPresupuesto({
                                            ...formPresupuesto,
                                            fecha_vigencia: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Odontólogo</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={formPresupuesto.doctor}
                                    onChange={(e) =>
                                        setFormPresupuesto({
                                            ...formPresupuesto,
                                            doctor: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Seleccionar odontólogo</option>
                                    <option value="Dr. Carlos Ruiz">Dr. Carlos Ruiz</option>
                                    <option value="Dra. Tania Mamani">Dra. Tania Mamani</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowPresupuestoModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm"
                            >
                                Crear Presupuesto
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showPagoModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
                    <form onSubmit={registrarPago} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Registrar Pago</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Paciente</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={formPago.paciente_id}
                                    onChange={(e) =>
                                        setFormPago({
                                            ...formPago,
                                            paciente_id: e.target.value,
                                            presupuesto_id: "",
                                        })
                                    }
                                >
                                    <option value="">Seleccionar paciente</option>
                                    {pacientes.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombres} {p.apellidos}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Presupuesto</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={formPago.presupuesto_id}
                                    onChange={(e) =>
                                        setFormPago({
                                            ...formPago,
                                            presupuesto_id: e.target.value,
                                        })
                                    }
                                    disabled={!formPago.paciente_id}
                                >
                                    <option value="">
                                        {formPago.paciente_id
                                            ? "Seleccionar presupuesto"
                                            : "Primero selecciona un paciente"}
                                    </option>
                                    {presupuestosDelPaciente(formPago.paciente_id).map((presupuesto) => (
                                        <option key={presupuesto.id} value={presupuesto.id}>
                                            {presupuesto.descripcion} - ${toNumber(presupuesto.monto).toFixed(2)} (saldo: ${saldoPresupuesto(presupuesto.id).toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Monto</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="0.00"
                                    value={formPago.monto}
                                    onChange={(e) =>
                                        setFormPago({
                                            ...formPago,
                                            monto: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Tipo de Pago</label>
                                <select
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={formPago.tipo_pago}
                                    onChange={(e) =>
                                        setFormPago({
                                            ...formPago,
                                            tipo_pago: e.target.value,
                                        })
                                    }
                                >
                                    <option value="pago_total">Pago Total</option>
                                    <option value="pago_parcial">Pago Parcial</option>
                                    <option value="adelanto">Adelanto</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Método de Pago</label>
                                <select
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={formPago.metodo}
                                    onChange={(e) =>
                                        setFormPago({
                                            ...formPago,
                                            metodo: e.target.value,
                                        })
                                    }
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Descripción (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="Observaciones..."
                                    value={formPago.descripcion}
                                    onChange={(e) =>
                                        setFormPago({
                                            ...formPago,
                                            descripcion: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Odontólogo</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={formPago.doctor}
                                    onChange={(e) =>
                                        setFormPago({
                                            ...formPago,
                                            doctor: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Seleccionar odontólogo</option>
                                    <option value="Dr. Carlos Ruiz">Dr. Carlos Ruiz</option>
                                    <option value="Dra. Tania Mamani">Dra. Tania Mamani</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowPagoModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm"
                            >
                                Registrar Pago
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
