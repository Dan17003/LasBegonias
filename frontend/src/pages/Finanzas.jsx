import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { corregirEncoding } from "../utils/texto";
import {
  toNumber,
  getPacienteId,
  calcularDeudas,
  formatearMoneda,
} from "../utils/finanzas";
import { exportarExcel, descargarPDF, imprimirHTML } from "../utils/exportar";

export default function Finanzas() {
    const [tab, setTab] = useState("presupuestos");
    const [pacientes, setPacientes] = useState([]);
    const [presupuestos, setPresupuestos] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [odontologos, setOdontologos] = useState([]);
    const [showPresupuestoModal, setShowPresupuestoModal] = useState(false);
    const [showPagoModal, setShowPagoModal] = useState(false);
    const [editandoPresupuesto, setEditandoPresupuesto] = useState(null);
    const [editandoPago, setEditandoPago] = useState(null);
    const [busquedaDeuda, setBusquedaDeuda] = useState("");
    const [montoFiltro, setMontoFiltro] = useState("");
    const [ordenDeuda, setOrdenDeuda] = useState("saldo_desc");

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
        obtenerOdontologos();
    }, []);

    const obtenerOdontologos = async () => {
        try {
            const res = await api.get("/odontologos");
            setOdontologos(
                (res.data || []).map((doc) => ({
                    ...doc,
                    nombre: corregirEncoding(doc.nombre),
                    turno: corregirEncoding(doc.turno),
                }))
            );
        } catch (error) {
            console.error(error);
        }
    };

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

    const formPresupuestoVacio = () => ({
        paciente_id: "",
        descripcion: "",
        monto: "",
        fecha_vigencia: "",
        doctor: "",
    });

    const formPagoVacio = () => ({
        paciente_id: "",
        presupuesto_id: "",
        monto: "",
        tipo_pago: "pago_total",
        metodo: "efectivo",
        descripcion: "",
        doctor: "",
    });

    const cerrarPresupuestoModal = () => {
        setShowPresupuestoModal(false);
        setEditandoPresupuesto(null);
        setFormPresupuesto(formPresupuestoVacio());
    };

    const cerrarPagoModal = () => {
        setShowPagoModal(false);
        setEditandoPago(null);
        setFormPago(formPagoVacio());
    };

    const abrirCrearPresupuesto = () => {
        setEditandoPresupuesto(null);
        setFormPresupuesto(formPresupuestoVacio());
        setShowPresupuestoModal(true);
    };

    const abrirEditarPresupuesto = (presupuesto) => {
        setEditandoPresupuesto(presupuesto);
        setFormPresupuesto({
            paciente_id: String(presupuesto.paciente_id),
            descripcion: presupuesto.descripcion,
            monto: String(presupuesto.monto),
            fecha_vigencia: presupuesto.fecha_vigencia?.substring(0, 10) || "",
            doctor: presupuesto.doctor,
        });
        setShowPresupuestoModal(true);
    };

    const saldoPresupuesto = (presupuestoId) => {
        const item = calcularDeudas(presupuestos, pagos).find(
            (deuda) => deuda.presupuesto.id === Number(presupuestoId)
        );
        return item ? item.saldo : 0;
    };

    const abrirCrearPago = () => {
        setEditandoPago(null);
        setFormPago(formPagoVacio());
        setShowPagoModal(true);
    };

    const abrirPagoDesdeDeuda = ({ presupuesto }) => {
        setEditandoPago(null);
        setFormPago({
            paciente_id: String(getPacienteId(presupuesto)),
            presupuesto_id: String(presupuesto.id),
            monto: String(saldoPresupuesto(presupuesto.id)),
            tipo_pago: "pago_parcial",
            metodo: "efectivo",
            descripcion: `Abono a: ${presupuesto.descripcion}`,
            doctor: presupuesto.doctor || "",
        });
        setShowPagoModal(true);
    };

    const abrirEditarPago = (pago) => {
        setEditandoPago(pago);
        setFormPago({
            paciente_id: String(pago.paciente_id),
            presupuesto_id: pago.presupuesto_id ? String(pago.presupuesto_id) : "",
            monto: String(pago.monto),
            tipo_pago: pago.tipo_pago || "pago_total",
            metodo: pago.metodo || "efectivo",
            descripcion: pago.descripcion || "",
            doctor: pago.doctor,
        });
        setShowPagoModal(true);
    };

    const guardarPresupuesto = async (e) => {
        e.preventDefault();

        if (
            !formPresupuesto.paciente_id ||
            !formPresupuesto.descripcion ||
            !formPresupuesto.monto ||
            !formPresupuesto.fecha_vigencia ||
            !formPresupuesto.doctor
        ) {
            return;
        }

        const payload = {
            paciente_id: Number(formPresupuesto.paciente_id),
            descripcion: formPresupuesto.descripcion,
            monto: Number(formPresupuesto.monto),
            fecha_vigencia: formPresupuesto.fecha_vigencia,
            doctor: formPresupuesto.doctor,
        };

        try {
            if (editandoPresupuesto) {
                await api.put(`/presupuestos/${editandoPresupuesto.id}`, payload);
            } else {
                await api.post("/presupuestos", payload);
            }

            obtenerPresupuestos();
            cerrarPresupuestoModal();
        } catch (error) {
            alert(error.response?.data?.error || "No se pudo guardar el presupuesto.");
        }
    };

    const eliminarPresupuesto = async (presupuesto) => {
        const confirmar = window.confirm(
            `¿Eliminar el presupuesto "${presupuesto.descripcion}"? Los pagos vinculados quedarán sin presupuesto.`
        );
        if (!confirmar) return;

        try {
            await api.delete(`/presupuestos/${presupuesto.id}`);
            obtenerPresupuestos();
            obtenerPagos();
        } catch (error) {
            alert(error.response?.data?.error || "No se pudo eliminar el presupuesto.");
        }
    };

    const guardarPago = async (e) => {
        e.preventDefault();

        const monto = Number(formPago.monto);
        if (formPago.presupuesto_id) {
            const saldo = saldoPresupuesto(formPago.presupuesto_id);
            const saldoAjustado = editandoPago
                ? saldo + toNumber(editandoPago.monto)
                : saldo;
            if (monto > saldoAjustado + 0.01) {
                alert(`El monto no puede superar el saldo pendiente (${formatearMoneda(saldoAjustado)}).`);
                return;
            }
        }

        const payload = {
            paciente_id: Number(formPago.paciente_id),
            presupuesto_id: formPago.presupuesto_id ? Number(formPago.presupuesto_id) : null,
            monto,
            tipo_pago: formPago.tipo_pago,
            metodo: formPago.metodo,
            descripcion: formPago.descripcion,
            doctor: formPago.doctor,
        };

        try {
            if (editandoPago) {
                await api.put(`/pagos/${editandoPago.id}`, payload);
            } else {
                await api.post("/pagos", payload);
            }

            obtenerPagos();
            obtenerPresupuestos();
            cerrarPagoModal();
        } catch (error) {
            alert(error.response?.data?.error || "No se pudo guardar el pago.");
        }
    };

    const eliminarPago = async (pago) => {
        const confirmar = window.confirm("¿Eliminar este pago? Esta acción no se puede deshacer.");
        if (!confirmar) return;

        try {
            await api.delete(`/pagos/${pago.id}`);
            obtenerPagos();
            obtenerPresupuestos();
        } catch (error) {
            alert(error.response?.data?.error || "No se pudo eliminar el pago.");
        }
    };

    const imprimirPresupuesto = (presupuesto) => {
        const paciente = pacientes.find(p => p.id === presupuesto.paciente_id);
        const saldo = saldoPresupuesto(presupuesto.id);
        const pagado = toNumber(presupuesto.monto) - saldo;

        imprimirHTML({
            titulo: "Presupuesto - Clinica Las Begonias",
            contenido: `
                <h1>Presupuesto - Clinica Las Begonias</h1>
                <div style="margin:24px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;">
                    <p><strong>Paciente:</strong> ${paciente?.nombres || ""} ${paciente?.apellidos || ""}</p>
                    <p><strong>Odontologo:</strong> ${presupuesto.doctor || "—"}</p>
                    <p><strong>Descripcion:</strong> ${presupuesto.descripcion}</p>
                    <p><strong>Vigencia:</strong> ${presupuesto.fecha_vigencia}</p>
                    <p style="font-size:20px;color:#11B9BB;margin-top:16px;"><strong>Monto total:</strong> ${formatearMoneda(presupuesto.monto)}</p>
                    <p><strong>Pagado:</strong> ${formatearMoneda(pagado)}</p>
                    <p><strong>Saldo pendiente:</strong> ${formatearMoneda(saldo)}</p>
                </div>
            `,
        });
    };

    const enviarPresupuesto = async (presupuesto) => {
        const paciente = pacientes.find(p => p.id === presupuesto.paciente_id);
        if (!paciente?.email) {
            alert("El paciente no tiene correo registrado.");
            return;
        }
        alert(`Presupuesto preparado para enviar a ${paciente.email}. (Funcionalidad de correo en desarrollo)`);
    };

    const deudasPendientes = useMemo(() => {
        const base = calcularDeudas(
            presupuestos,
            pagos,
            montoFiltro ? Number(montoFiltro) : 0
        );

        let lista = base.map((deuda) => {
            const paciente = pacientes.find(
                (p) => p.id === getPacienteId(deuda.presupuesto)
            );
            const nombreCompleto = `${paciente?.nombres || ""} ${paciente?.apellidos || ""}`.trim();
            const montoTotal = toNumber(deuda.presupuesto.monto);
            const porcentajePagado = montoTotal
                ? Math.min(Math.round((deuda.pagado / montoTotal) * 100), 100)
                : 0;
            const vencida = new Date(deuda.presupuesto.fecha_vigencia) < new Date();

            return { ...deuda, paciente, nombreCompleto, porcentajePagado, vencida };
        });

        if (busquedaDeuda.trim()) {
            const termino = busquedaDeuda.toLowerCase();
            lista = lista.filter(
                (d) =>
                    d.nombreCompleto.toLowerCase().includes(termino) ||
                    d.presupuesto.descripcion.toLowerCase().includes(termino)
            );
        }

        lista.sort((a, b) => {
            if (ordenDeuda === "saldo_desc") return b.saldo - a.saldo;
            if (ordenDeuda === "saldo_asc") return a.saldo - b.saldo;
            if (ordenDeuda === "vigencia") {
                return new Date(a.presupuesto.fecha_vigencia) - new Date(b.presupuesto.fecha_vigencia);
            }
            return b.saldo - a.saldo;
        });

        return lista;
    }, [presupuestos, pagos, montoFiltro, pacientes, busquedaDeuda, ordenDeuda]);

    const exportarDeudasExcel = () => {
        exportarExcel(
            [{
                nombre: "Deudas",
                datos: deudasPendientes.map((d) => ({
                    Paciente: d.nombreCompleto,
                    Descripcion: d.presupuesto.descripcion,
                    Odontologo: d.presupuesto.doctor,
                    Vigencia: d.presupuesto.fecha_vigencia,
                    "Monto total": toNumber(d.presupuesto.monto),
                    Pagado: d.pagado,
                    "Saldo pendiente": d.saldo,
                })),
            }],
            `deudas-begonias-${new Date().toISOString().slice(0, 10)}`
        );
    };

    const exportarDeudasPDF = () => {
        descargarPDF({
            titulo: "Reporte de Deudas - Clinica Las Begonias",
            periodo: new Date().toLocaleDateString("es-PE"),
            nombreArchivo: `deudas-begonias-${new Date().toISOString().slice(0, 10)}`,
            resumen: [
                { label: "Total pendiente", value: formatearMoneda(totalPendiente) },
                { label: "Presupuestos", value: deudasPendientes.length },
                { label: "Cobranza", value: `${porcentajeCobrado}%` },
            ],
            tablas: [{
                titulo: "Saldos pendientes por paciente",
                columnas: [
                    { header: "Paciente", key: "paciente" },
                    { header: "Descripcion", key: "descripcion" },
                    { header: "Total", key: "total" },
                    { header: "Pagado", key: "pagado" },
                    { header: "Saldo", key: "saldo" },
                ],
                filas: deudasPendientes.map((d) => ({
                    paciente: d.nombreCompleto,
                    descripcion: d.presupuesto.descripcion,
                    total: formatearMoneda(d.presupuesto.monto),
                    pagado: formatearMoneda(d.pagado),
                    saldo: formatearMoneda(d.saldo),
                })),
            }],
        });
    };
    const totalPresupuestado = presupuestos.reduce((sum, p) => sum + toNumber(p.monto), 0);
    const totalPagado = pagos.reduce((sum, p) => sum + toNumber(p.monto), 0);
    const totalPendiente = calcularDeudas(presupuestos, pagos).reduce((sum, item) => sum + item.saldo, 0);
    const porcentajeCobrado = totalPresupuestado
        ? Math.min(Math.round((totalPagado / totalPresupuestado) * 100), 100)
        : 0;

    const presupuestosDelPaciente = (pacienteId) =>
        presupuestos.filter(
            (presupuesto) => getPacienteId(presupuesto) === Number(pacienteId)
        );

    const tabs = [
        { id: "presupuestos", label: "Presupuestos" },
        { id: "pagos", label: "Pagos" },
        { id: "deudas", label: "Deudas" },
        
    ];

    return (
        <div className="p-8 w-full max-w-[1400px] mx-auto font-sans text-slate-700">
            <div className="mb-6 rounded-3xl bg-white border border-white shadow-xl shadow-slate-200/70 p-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#11B9BB]">Gestion financiera</p>
                        <h2 className="mt-2 text-3xl font-black text-slate-950">Finanzas</h2>
                        <p className="mt-1 text-sm text-slate-500">Presupuestos, pagos, saldos pendientes y seguimiento de cobranza en soles.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            ["Presupuestado", formatearMoneda(totalPresupuestado)],
                            ["Cobrado", formatearMoneda(totalPagado)],
                            ["Pendiente", formatearMoneda(totalPendiente)],
                            ["Cobranza", `${porcentajeCobrado}%`],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                                <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-5 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[#11B9BB]" style={{ width: `${porcentajeCobrado}%` }} />
                </div>
            </div>

            <div className="flex gap-2 mb-6 bg-white/80 border border-white p-1.5 rounded-2xl shadow-sm w-fit">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === t.id
                                ? "bg-[#11B9BB] text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
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
                                onClick={abrirCrearPresupuesto}
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
                                            <td className="px-4 py-3 font-semibold text-[#11B9BB]">{formatearMoneda(p.monto)}</td>
                                            <td className="px-4 py-3 text-slate-600">{p.doctor}</td>
                                            <td className="px-4 py-3 text-slate-500">{p.fecha_vigencia}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5 justify-center">
                                                    <button
                                                        onClick={() => abrirEditarPresupuesto(p)}
                                                        className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 border border-slate-200"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => eliminarPresupuesto(p)}
                                                        className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-100 border border-rose-100"
                                                    >
                                                        Eliminar
                                                    </button>
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
                                                </div>
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
                                onClick={abrirCrearPago}
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
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pagos.map((pago) => (
                                        <tr key={pago.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">{pacientes.find(p => p.id === pago.paciente_id)?.nombres || "N/A"}</td>
                                            <td className="px-4 py-3 font-semibold text-green-600">{formatearMoneda(pago.monto)}</td>
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
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5 justify-center">
                                                    <button
                                                        onClick={() => abrirEditarPago(pago)}
                                                        className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 border border-slate-200"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => eliminarPago(pago)}
                                                        className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-100 border border-rose-100"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
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
                        <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Control de Deudas</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {deudasPendientes.length} presupuesto{deudasPendientes.length !== 1 ? "s" : ""} con saldo pendiente
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={exportarDeudasExcel}
                                    className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 hover:bg-emerald-100"
                                >
                                    Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={exportarDeudasPDF}
                                    className="px-3 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-100 hover:bg-rose-100"
                                >
                                    PDF
                                </button>
                            </div>
                        </div>

                        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input
                                type="text"
                                placeholder="Buscar paciente o tratamiento..."
                                value={busquedaDeuda}
                                onChange={(e) => setBusquedaDeuda(e.target.value)}
                                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm md:col-span-2 focus:ring-2 focus:ring-[#11B9BB] outline-none"
                            />
                            <input
                                type="number"
                                placeholder="Monto minimo (S/)"
                                value={montoFiltro}
                                onChange={(e) => setMontoFiltro(e.target.value)}
                                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#11B9BB] outline-none"
                            />
                            <select
                                value={ordenDeuda}
                                onChange={(e) => setOrdenDeuda(e.target.value)}
                                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-[#11B9BB] outline-none"
                            >
                                <option value="saldo_desc">Mayor saldo primero</option>
                                <option value="saldo_asc">Menor saldo primero</option>
                                <option value="vigencia">Por vencimiento</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {deudasPendientes.map((deuda) => (
                                <div
                                    key={deuda.presupuesto.id}
                                    className={`rounded-2xl border p-5 transition hover:shadow-md ${
                                        deuda.vencida
                                            ? "border-rose-200 bg-gradient-to-br from-rose-50/80 to-white"
                                            : "border-slate-200 bg-gradient-to-br from-amber-50/40 to-white"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-slate-800">
                                                    {deuda.nombreCompleto || "Paciente no encontrado"}
                                                </h4>
                                                {deuda.vencida && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">
                                                        Vencido
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 mt-0.5">{deuda.presupuesto.descripcion}</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {deuda.presupuesto.doctor} · Vigencia: {deuda.presupuesto.fecha_vigencia}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] font-bold uppercase text-slate-400">Saldo</p>
                                            <p className="text-xl font-black text-rose-600">{formatearMoneda(deuda.saldo)}</p>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Cobrado: {formatearMoneda(deuda.pagado)}</span>
                                            <span>Total: {formatearMoneda(deuda.presupuesto.monto)}</span>
                                        </div>
                                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-[#0d8f91] to-[#11B9BB]"
                                                style={{ width: `${deuda.porcentajePagado}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 text-right">{deuda.porcentajePagado}% pagado</p>
                                    </div>

                                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => abrirPagoDesdeDeuda(deuda)}
                                            className="flex-1 px-3 py-2 bg-[#11B9BB] hover:bg-[#0ea5a7] text-white rounded-xl text-xs font-bold transition"
                                        >
                                            Registrar pago
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => imprimirPresupuesto(deuda.presupuesto)}
                                            className="px-3 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-100"
                                        >
                                            Imprimir
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {deudasPendientes.length === 0 && (
                            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                                <p className="text-slate-500 font-medium">No hay deudas pendientes</p>
                                <p className="text-xs text-slate-400 mt-1">Todos los presupuestos estan al dia o no coinciden con los filtros.</p>
                            </div>
                        )}
                    </div>
                )}

                
            </div>

            {showPresupuestoModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
                    <form onSubmit={guardarPresupuesto} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
                        <h3 className="text-base font-bold text-slate-800 mb-4">
                            {editandoPresupuesto ? "Editar Presupuesto" : "Crear Presupuesto"}
                        </h3>

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
                                    {odontologos.map((doc) => (
                                        <option key={doc.id} value={doc.nombre}>
                                            {doc.nombre} — {doc.especialidad}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={cerrarPresupuestoModal}
                                className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm"
                            >
                                {editandoPresupuesto ? "Guardar Cambios" : "Crear Presupuesto"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showPagoModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
                    <form onSubmit={guardarPago} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
                        <h3 className="text-base font-bold text-slate-800 mb-4">
                            {editandoPago ? "Editar Pago" : "Registrar Pago"}
                        </h3>

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
                                            {presupuesto.descripcion} - {formatearMoneda(presupuesto.monto)} (saldo: {formatearMoneda(saldoPresupuesto(presupuesto.id))})
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
                                    {odontologos.map((doc) => (
                                        <option key={doc.id} value={doc.nombre}>
                                            {doc.nombre} — {doc.especialidad}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={cerrarPagoModal}
                                className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-[#11B9BB] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm"
                            >
                                {editandoPago ? "Guardar Cambios" : "Registrar Pago"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
