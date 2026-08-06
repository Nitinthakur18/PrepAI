import api from "./api";

export const getDashboardStats = () => api.get("/analytics/dashboard");
