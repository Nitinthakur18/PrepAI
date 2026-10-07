import { FiCpu, FiZap, FiAlertTriangle } from "react-icons/fi";
import useAIStatus from "../hooks/useAIStatus";

const STYLES = {
  operational: { dot: "bg-emerald-400", text: "text-emerald-300", ring: "border-emerald-400/30 bg-emerald-400/10", label: "Gemini online", Icon: FiZap },
  degraded: { dot: "bg-amber-400", text: "text-amber-300", ring: "border-amber-400/30 bg-amber-400/10", label: "AI under load", Icon: FiAlertTriangle },
  offline_engine: { dot: "bg-cyan-400", text: "text-cyan-300", ring: "border-cyan-400/30 bg-cyan-400/10", label: "Smart Engine active", Icon: FiCpu },
};

/** Compact live indicator of the AI pipeline (Gemini → fallback → Smart Engine). */
function AIStatusBadge({ className = "" }) {
  const { status, unreachable } = useAIStatus();
  if (unreachable) {
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-red-400/30 bg-red-400/10 text-red-300 ${className}`} title="Cannot reach the server">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        Server unreachable
      </span>
    );
  }
  if (!status) return null;
  const s = STYLES[status.status] || STYLES.offline_engine;
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${s.ring} ${s.text} ${className}`}
      title={status.message}
    >
      <span className="relative flex h-2 w-2">
        {status.status === "operational" && <span className={`absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60 animate-ping`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}

export default AIStatusBadge;
