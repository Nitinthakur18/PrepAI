import api from "./api";

export const uploadResume = (file, onProgress) => {
  const formData = new FormData();
  formData.append("resume", file);

  return api.post("/resume/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });
};

export const matchJobDescription = (resumeId, jobDescription) =>
  api.post("/resume/match", { resumeId, jobDescription });

export const getResumeHistory = () => api.get("/resume/history");
export const getResumeById = (id) => api.get(`/resume/${id}`);
export const deleteResume = (id) => api.delete(`/resume/${id}`);
