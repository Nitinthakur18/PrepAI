import { FiWifiOff } from "react-icons/fi";
import useAIStatus from "../hooks/useAIStatus";

/** Shown only when the API server itself can't be reached (not when Gemini is busy). */
function ConnectionBanner() {
  const { unreachable } = useAIStatus(15000);
  if (!unreachable) return null;
  return (
    <div role="alert" className="flex items-center justify-center gap-2 bg-red-500/15 border-b border-red-400/30 text-red-200 text-sm px-4 py-2">
      <FiWifiOff /> Can&apos;t reach the PrepAI server. Retrying automatically — your work on this page is not lost.
    </div>
  );
}

export default ConnectionBanner;
