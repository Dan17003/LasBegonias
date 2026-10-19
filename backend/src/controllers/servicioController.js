import { Servicio } from "../models/index.js";

const textoRequerido = (value, maxLength) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;

export const listarServicios = async (_req, res) => {
  try {
    const servicios = await Servicio.findAll({
      where: { activo: true },
      attributes: ["id", "nombre", "categoria", "subcategoria", "precio", "activo"],
      order: [["categoria", "ASC"], ["nombre", "ASC"]],
    });
    res.json(servicios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearServicio = async (req, res) => {
  const { nombre, categoria, subcategoria, precio } = req.body;
  if (!textoRequerido(nombre, 160) || !textoRequerido(categoria, 100) ||
      !textoRequerido(subcategoria, 100) || !Number.isFinite(Number(precio)) ||
      Number(precio) <= 0 || Number(precio) > 99999999.99) {
    return res.status(400).json({ error: "Nombre, categoría, subcategoría y un precio PEN positivo son obligatorios." });
  }
  try {
    const servicio = await Servicio.create({
      nombre: nombre.trim(),
      categoria: categoria.trim(),
      subcategoria: subcategoria.trim(),
      precio: Number(precio).toFixed(2),
      moneda: "PEN",
      activo: true,
      creado_por: req.user.id,
    });
    res.status(201).json({
      id: servicio.id,
      nombre: servicio.nombre,
      categoria: servicio.categoria,
      subcategoria: servicio.subcategoria,
      precio: servicio.precio,
      activo: servicio.activo,
    });
  } catch (error) {
    res.status(error.name === "SequelizeUniqueConstraintError" ? 409 : 400).json({ error: error.message });
  }
};
