import { useCallback, useEffect, useState } from "react";
import { getResumeHistory } from "../services/resumeService";

const KEY = "prepai_resume_id";

/** Loads the user's resumes and keeps a "selected" resume id (persisted). */
export default function useResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedIdState] = useState(() => localStorage.getItem(KEY) || "");

  const setSelectedId = useCallback((id) => {
    setSelectedIdState(id);
    if (id) localStorage.setItem(KEY, id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getResumeHistory();
      const list = res.data.data || [];
      setResumes(list);
      setSelectedIdState((cur) => {
        const valid = list.some((r) => r._id === cur);
        const next = valid ? cur : list[0]?._id || "";
        if (next) localStorage.setItem(KEY, next);
        return next;
      });
    } catch {
      setResumes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = resumes.find((r) => r._id === selectedId) || null;
  return { resumes, loading, selectedId, setSelectedId, selected, reload: load };
}
