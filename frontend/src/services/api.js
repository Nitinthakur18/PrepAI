import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// AI-backed endpoints can take a while (Gemini retries + fallbacks run server-side).
const api = axios.create({ baseURL, timeout: 120000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("prepai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE_STATUS = new Set([502, 503, 504]);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem("prepai_token");
      localStorage.removeItem("prepai_user");
    }

    // Idempotent reads survive brief network blips / cold starts / DB reconnects.
    const isGet = config && (config.method || "get").toLowerCase() === "get";
    const transient = !error.response || RETRYABLE_STATUS.has(status);
    if (isGet && transient && !config.__noRetry) {
      config.__retries = (config.__retries || 0) + 1;
      if (config.__retries <= 2) {
        await sleep(600 * config.__retries);
        return api(config);
      }
    }
    return Promise.reject(error);
  }
);

/** Turns any axios/network error into a short, human-friendly message. */
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.code === "ECONNABORTED") return "That took too long. Please try again in a moment.";
  if (!error.response) return "Can't reach the server. Check your connection and try again.";
  const data = error.response.data;
  if (data?.message) return data.message;
  if (error.response.status === 429) return "Too many requests — please wait a minute and try again.";
  if (error.response.status >= 500) return "The server hit a problem. Please try again shortly.";
  return fallback;
}

export default api;
