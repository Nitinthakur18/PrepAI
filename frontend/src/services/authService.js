import api from "./api";

export const register = (payload) => api.post("/auth/register", payload);
export const login = (payload) => api.post("/auth/login", payload);
export const getMe = () => api.get("/auth/me");
export const updateProfile = (payload) => api.put("/auth/me", payload);
export const changePassword = (payload) => api.put("/auth/password", payload);
export const deleteAccount = (payload) => api.delete("/auth/me", { data: payload });
