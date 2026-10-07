import api from "./api";

export const uploadResume = (file, onProgress, { force = false } = {}) => {
  const formData = new FormData();
  // text fields must precede the file so multer sees them
  if (force) formData.append("force", "true");
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

export const analyzeSampleResume = () => api.post("/resume/sample");
export const reanalyzeResume = (id) => api.post(`/resume/${id}/reanalyze`);
export const compareResumes = (a, b) => api.get("/resume/compare", { params: { a, b } });

export const matchJobDescription = (resumeId, jobDescription, extra = {}) =>
  api.post("/resume/match", { resumeId, jobDescription, ...extra });

export const getResumeHistory = () => api.get("/resume/history");
export const getResumeById = (id) => api.get(`/resume/${id}`);
export const deleteResume = (id) => api.delete(`/resume/${id}`);
