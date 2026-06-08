import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "No autorizado" });

  try {
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    const decoded = jwt.verify(token, "secreto");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.rol?.toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Acceso denegado. Se requiere rol administrador." });
  }
  next();
};