import { useRef, useState } from "react";
import { FiUploadCloud, FiFileText, FiCheckCircle } from "react-icons/fi";

function UploadCard({ file, loading, onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handle = (f) => {
    if (f && !loading) onFile(f);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume: drop a PDF or DOCX file here, or press Enter to browse"
        onClick={() => !loading && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !loading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`relative flex flex-col items-center justify-center h-72 sm:h-80 rounded-3xl border-2 border-dashed card transition-all duration-300 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
          ${dragging ? "border-cyan-300 bg-cyan-400/10 scale-[1.02]" : "border-indigo-500/30 hover:border-indigo-400/60 hover:bg-white/[0.07]"}
          ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/15 blur-[140px] rounded-full" />

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          disabled={loading}
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = ""; // allow re-selecting the same file
          }}
          className="hidden"
        />

        <FiUploadCloud size={60} className={`z-10 mb-5 transition ${dragging ? "text-cyan-300" : "text-indigo-400"} drop-shadow-[0_0_25px_rgba(99,102,241,0.6)]`} />
        <h2 className="z-10 text-2xl sm:text-3xl font-bold text-white font-display text-center px-4">
          {dragging ? "Drop it here" : "Upload your resume"}
        </h2>
        <p className="z-10 text-slate-400 mt-2">Drag &amp; drop, or click to browse</p>
        <p className="z-10 text-slate-500 mt-1 text-sm">PDF or DOCX · up to 10 MB · text-based (not scanned)</p>

        {file && (
          <div className="mt-6 z-10 flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
            <FiCheckCircle size={20} className="text-emerald-400 shrink-0" />
            <FiFileText size={20} className="text-indigo-400 shrink-0" />
            <p className="text-slate-200 text-sm truncate max-w-[240px]">{file.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadCard;
