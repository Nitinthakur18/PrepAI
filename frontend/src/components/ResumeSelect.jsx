import { Link } from "react-router-dom";

/** Dropdown of the user's resumes (replaces the old "last uploaded only" localStorage trick). */
function ResumeSelect({ resumes, selectedId, onChange, loading, label = "Resume" }) {
  if (loading) {
    return <div className="h-12 rounded-xl bg-white/5 animate-pulse" aria-busy="true" />;
  }
  if (!resumes.length) {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
        You haven&apos;t uploaded a resume yet.{" "}
        <Link to="/upload" className="underline font-semibold">
          Upload one
        </Link>{" "}
        or try the demo resume.
      </div>
    );
  }
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-[#0b0f1d] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-400/60"
      >
        {resumes.map((r) => (
          <option key={r._id} value={r._id}>
            {(r.originalName || r.filename)} — {r.analysis?.atsScore ?? "?"}% · {new Date(r.createdAt).toLocaleDateString()}
          </option>
        ))}
      </select>
    </label>
  );
}

export default ResumeSelect;
