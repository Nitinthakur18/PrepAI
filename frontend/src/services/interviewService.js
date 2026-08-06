import api from "./api";

export const generateQuestions = (payload) =>
  api.post("/interview/questions", payload);

export const startMockInterview = (payload) =>
  api.post("/interview/mock/start", payload);

export const submitAnswer = (payload) =>
  api.post("/interview/mock/answer", payload);

export const finishMockInterview = (payload) =>
  api.post("/interview/mock/finish", payload);

export const getInterviewHistory = () => api.get("/interview/history");
export const getInterviewById = (id) => api.get(`/interview/${id}`);
export const deleteInterview = (id) => api.delete(`/interview/${id}`);
