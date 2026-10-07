import api from "./api";

export const generateCoverLetter = (payload) => api.post("/tools/cover-letter", payload);
export const improveBullets = (payload) => api.post("/tools/bullets", payload);
export const generateLinkedIn = (payload) => api.post("/tools/linkedin", payload);
export const generatePitch = (payload) => api.post("/tools/pitch", payload);
export const buildRoadmap = (payload) => api.post("/tools/roadmap", payload);
