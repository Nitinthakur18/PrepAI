import { useState } from "react";
import toast from "react-hot-toast";
import { FiCopy, FiCheck } from "react-icons/fi";

function CopyButton({ text, label = "Copy", className = "" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast.error("Couldn't copy — select the text manually.");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition ${className}`}
    >
      {done ? <FiCheck size={13} className="text-emerald-400" /> : <FiCopy size={13} />}
      {done ? "Copied" : label}
    </button>
  );
}

export default CopyButton;
