import { Servicio } from "../models/index.js";

// Imported USD values were converted to PEN at the confirmed 3.4 exchange rate.
// Startup only inserts missing rows; later catalog edits are never overwritten.
export const SERVICIOS_INICIALES = [
  { categoria: "Consulta", subcategoria: "General", nombre: "Consulta", precio: 150 },
  { categoria: "Consulta", subcategoria: "General", nombre: "Tomografía Computarizada Cone Beam", precio: 250 },
  { categoria: "Consulta", subcategoria: "General", nombre: "Control", precio: 150 },
  { categoria: "Consulta", subcategoria: "Periodoncia", nombre: "Consulta periodontal especializada", precio: 40 },
  { categoria: "Consulta", subcategoria: "Rehabilitación", nombre: "Retiro de puente + confección de provisionales", precio: 200 },
  { categoria: "Implantes", subcategoria: "Cirugía", nombre: "Cirugía de implante dental con regeneración ósea (Incluye implante, hueso y membrana)", precio: 2720 },
  { categoria: "Implantes", subcategoria: "Rehabilitación", nombre: "Puente de 3 piezas sobre 2 implantes (Zirconio)", precio: 5100 },
  { categoria: "Cirugía", subcategoria: "Periodoncia", nombre: "Cirugía de injerto de tejido conectivo", precio: 800 },
  { categoria: "Implantes", subcategoria: "Cirugía", nombre: "Cirugía de segunda fase + injerto de tejido conectivo", precio: 510 },
  { categoria: "Rehabilitación", subcategoria: "General", nombre: "Reconstrucción de muñón", precio: 350 },
  { categoria: "Rehabilitación", subcategoria: "Estética", nombre: "Blanqueamiento de consultorio", precio: 500 },
  { categoria: "Rehabilitación", subcategoria: "General", nombre: "Incrustación de Zirconio", precio: 1100 },
  { categoria: "Rehabilitación", subcategoria: "General", nombre: "Corona de Zirconio", precio: 1100 },
  { categoria: "Rehabilitación", subcategoria: "Implantes", nombre: "Corona sobre implante de Zirconio", precio: 2380 },
  { categoria: "Rehabilitación", subcategoria: "Implantes", nombre: "Corona sobre implante con pilar personalizado de Zirconio", precio: 3060 },
  { categoria: "Perio", subcategoria: "Periodoncia", nombre: "Tratamiento periodontal especializado", precio: 200 },
  { categoria: "Perio", subcategoria: "Periodoncia", nombre: "Raspado y alisado radicular maxilar superior e inferior", precio: 250 },
  { categoria: "Perio", subcategoria: "Periodoncia", nombre: "Raspado y alisado radicular maxilar inferior", precio: 250 },
  { categoria: "Perio", subcategoria: "Periodoncia", nombre: "Raspado y alisado radicular maxilar superior", precio: 250 },
  { categoria: "Cirugía", subcategoria: "Exodoncia", nombre: "Exodoncia compleja : tercera molar", precio: 450 },
  { categoria: "Cirugía", subcategoria: "Periodoncia", nombre: "Alargamiento de corona clínica maxilar superior", precio: 1000 },
  { categoria: "Rehabilitación", subcategoria: "Implantes", nombre: "Provisional s/implantes maxilar inferior (mini-híbrida)", precio: 2720 },
  { categoria: "Rehabilitación Oral", subcategoria: "Implantes", nombre: "Prótesis mini-híbrida maxila inferior", precio: 10200 },
];

export const seedServicios = async () => {
  for (const servicio of SERVICIOS_INICIALES) {
    await Servicio.findOrCreate({
      where: {
        nombre: servicio.nombre,
        categoria: servicio.categoria,
        subcategoria: servicio.subcategoria,
      },
      defaults: { ...servicio, moneda: "PEN", activo: true, creado_por: null },
    });
  }
};
