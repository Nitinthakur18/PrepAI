import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowUp, FiArrowDown, FiMinus, FiGitMerge } from "react-icons/fi";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import { Chip, Panel } from "../components/ui";
import { compareResumes } from "../services/resumeService";
import { getErrorMessage } from "../services/api";

const LABELS = { formatting: "Formatting & contact", keywords: "Keywords", skills: "Skills", projects: "Experience & achievements", education: "Education" };

function Delta({ v, suffix = "" }) {
  if (!v) return <span className="inline-flex items-center gap-1 text-slate-500"><FiMinus size={12} /> no change</span>;
  const up = v > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${up ? "text-emerald-300" : "text-rose-300"}`}>
      {up ? <FiArrowUp size={13} /> : <FiArrowDown size={13} />} {up ? "+" : ""}{v}{suffix}
    </span>
  );
}

function Compare() {
  const [params] = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!a || !b) return;
    let alive = true;
    compareResumes(a, b)
      .then((res) => alive && setData(res.data.data))
      .catch((err) => alive && setError(err));
    return () => {
      alive = false;
    };
  }, [a, b]);

  if (!a || !b) {
    return <EmptyState icon={FiGitMerge} title="Pick two resumes to compare" description="In History, tick two resumes and press Compare to see what changed between versions." actionLabel="Go to History" actionTo="/history" />;
  }
  if (error) return <ErrorState title="Couldn't compare these resumes" description={getErrorMessage(error)} />;
  if (!data) return <Skeleton className="h-96 w-full" />;

  const { a: A, b: B, delta } = data;
  const [older, newer] = new Date(A.createdAt) <= new Date(B.createdAt) ? [A, B] : [B, A];
  const sign = older === A ? 1 : -1;
  const d = (v) => v * sign;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/history" className="text-sm text-slate-400 hover:text-white">← Back to history</Link>

      <div className="card p-6 sm:p-8">
        <div className="grid sm:grid-cols-[1fr,auto,1fr] gap-6 items-center text-center">
          <div>
            <p className="text-xs text-slate-500">Earlier</p>
            <p className="text-sm text-slate-300 truncate">{older.name}</p>
            <p className="text-5xl font-bold font-display text-white mt-2">{older.atsScore}</p>
          </div>
          <div className="text-2xl"><Delta v={d(delta.score)} /></div>
          <div>
            <p className="text-xs text-slate-500">Later</p>
            <p className="text-sm text-slate-300 truncate">{newer.name}</p>
            <p className="text-5xl font-bold font-display text-white mt-2">{newer.atsScore}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Category changes">
          <div className="space-y-3">
            {Object.entries(delta.breakdown).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{LABELS[k] || k}</span>
                <span className="flex items-center gap-4 tabular-nums text-slate-400">
                  {older.breakdown[k] ?? 0} → {newer.breakdown[k] ?? 0} <Delta v={d(v)} />
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5">
              <span className="text-slate-300">Quantified bullets</span><Delta v={d(delta.quantified)} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Word count</span><Delta v={d(delta.words)} />
            </div>
          </div>
        </Panel>

        <Panel title="Skills">
          <p className="text-xs text-slate-500 mb-2">Added in the later version</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {(sign === 1 ? delta.skillsAdded : delta.skillsRemoved).map((s) => <Chip key={s} tone="emerald">+ {s}</Chip>)}
            {!(sign === 1 ? delta.skillsAdded : delta.skillsRemoved).length && <span className="text-sm text-slate-500">None</span>}
          </div>
          <p className="text-xs text-slate-500 mb-2">Dropped</p>
          <div className="flex flex-wrap gap-2">
            {(sign === 1 ? delta.skillsRemoved : delta.skillsAdded).map((s) => <Chip key={s} tone="red">− {s}</Chip>)}
            {!(sign === 1 ? delta.skillsRemoved : delta.skillsAdded).length && <span className="text-sm text-slate-500">None</span>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default Compare;
