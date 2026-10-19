import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000/api" : "/api"),
});

api.interceptors.request.use((config) => {
  if (import.meta.env.PROD) {
    const apiUrl = config.baseURL || "";
    const isLocalDevelopmentHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    if (
      apiUrl.startsWith("http://") ||
      (window.location.protocol !== "https:" && !isLocalDevelopmentHost)
    ) {
      return Promise.reject(new Error("La API debe utilizar HTTPS fuera del entorno local."));
    }
  }

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
