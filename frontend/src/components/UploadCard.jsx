import { FiUploadCloud, FiFileText, FiCheckCircle } from "react-icons/fi";

function UploadCard({ file, loading, onFileChange }) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <label
        className={`relative flex flex-col items-center justify-center h-72 sm:h-80 rounded-3xl border-2 border-dashed border-indigo-500/30 card
          transition-all duration-300
          hover:border-indigo-400/60 hover:bg-white/[0.07] hover:scale-[1.01]
          cursor-pointer overflow-hidden
          ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/20 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/15 blur-[140px] rounded-full"></div>

        <input
          type="file"
          accept=".pdf,.docx"
          disabled={loading}
          onChange={onFileChange}
          className="hidden"
        />

        <div className="z-10">
          <FiUploadCloud
            size={64}
            className="text-indigo-400 drop-shadow-[0_0_25px_rgba(99,102,241,0.6)] mb-5"
          />
        </div>

        <h2 className="z-10 text-2xl sm:text-3xl font-bold text-white font-display text-center px-4">
          Upload Your Resume
        </h2>

        <p className="z-10 text-slate-400 mt-2 text-base">
          Drag & Drop or Click Anywhere
        </p>

        <p className="z-10 text-slate-500 mt-1 text-sm">
          Supports PDF and DOCX files
        </p>

        {file && (
          <div className="mt-8 z-10 flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5">
            <FiCheckCircle size={22} className="text-emerald-400 shrink-0" />
            <FiFileText size={22} className="text-indigo-400 shrink-0" />
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Resume Ready</p>
              <p className="text-slate-400 text-xs truncate max-w-[220px]">
                {file.name}
              </p>
            </div>
          </div>
        )}

        {!file && (
          <div className="mt-8 z-10">
            <p className="text-slate-500 text-xs">Maximum file size: 10 MB</p>
          </div>
        )}
      </label>
    </div>
  );
}

export default UploadCard;
