import api from "./api";

export const getHealth = () => api.get("/health", { __noRetry: true, timeout: 8000 });
export const getAIHealth = () => api.get("/health/ai", { __noRetry: true, timeout: 8000 });
export const testAIConnection = () => api.post("/ai/test", null, { timeout: 30000 });
