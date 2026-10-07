import { useEffect, useState } from "react";
import { getAIHealth } from "../services/healthService";

/** Polls the backend for Gemini/Smart-Engine health (cheap, public endpoint). */
export default function useAIStatus(intervalMs = 30000) {
  const [status, setStatus] = useState(null);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await getAIHealth();
        if (alive) {
          setStatus(res.data.data);
          setUnreachable(false);
        }
      } catch {
        if (alive) setUnreachable(true);
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { status, unreachable };
}
