export const PERMISOS_POR_ROL = {
  admin: ["inicio", "usuarios", "doctores", "reportes"],
  recepcionista: ["inicio", "pacientes", "agenda", "finanzas"],
  odontologo: ["inicio", "agenda"],
};

export const normalizarRol = (rol) => (rol || "").toLowerCase();

export const obtenerPermisosUsuario = () => {
  const rol = normalizarRol(localStorage.getItem("rol"));

  if (PERMISOS_POR_ROL[rol]) {
    return PERMISOS_POR_ROL[rol];
  }

  try {
    const guardados = JSON.parse(localStorage.getItem("permisos") || "[]");
    if (Array.isArray(guardados) && guardados.length > 0) {
      return guardados;
    }
  } catch {
    // ignorar JSON inválido
  }

  return PERMISOS_POR_ROL.recepcionista;
};

export const tienePermiso = (modulo) => obtenerPermisosUsuario().includes(modulo);
