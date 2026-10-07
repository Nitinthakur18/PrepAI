import api from "./api";

export const listApplications = () => api.get("/tracker");
export const getApplicationStats = () => api.get("/tracker/stats");
export const getApplication = (id) => api.get(`/tracker/${id}`);
export const createApplication = (payload) => api.post("/tracker", payload);
export const updateApplication = (id, payload) => api.put(`/tracker/${id}`, payload);
export const deleteApplication = (id) => api.delete(`/tracker/${id}`);
