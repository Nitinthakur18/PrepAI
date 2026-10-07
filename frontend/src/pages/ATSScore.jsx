import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiBriefcase, FiCheckCircle, FiDownload, FiBookmark, FiEdit3, FiMic, FiCompass, FiTrendingUp,
  FiExternalLink, FiTarget,
} from "react-icons/fi";
import ScoreGauge from "../components/ScoreGauge";
import SourceBadge from "../components/SourceBadge";
import Button from "../components/Button";
import CopyButton from "../components/CopyButton";
import EmptyState from "../components/EmptyState";
import { Chip, Bar, StatusIcon, Panel, BulletList } from "../components/ui";
import { createApplication } from "../services/trackerService";
import { getErrorMessage } from "../services/api";
import { downloadMatchPDF } from "../utils/pdfReport";

function load() {
  try {
    return JSON.parse(sessionStorage.getItem("prepai_match") || "null");
  } catch {
    return null;
  }
}

const IMPORTANCE_TONE = { required: "red", preferred: "slate", mentioned: "amber" };

function ATSScore() {
  const navigate = useNavigate();
  const [stored] = useState(load);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!stored?.result) {
    return (
      <EmptyState
        icon={FiTarget}
        title="No match report yet"
        description="Choose a resume and paste a job description to see how well you match."
        actionLabel="Match a job"
        actionTo="/jobdescription"
      />
    );
  }

  const { result: r, meta, resumeId, resumeName, jobDescription } = stored;
  const insights = r.insights || {};
  const roadmap = r.roadmap;
  const req = r.requirements || {};
  const role = r.jobTitle || "";

  const saveToTracker = async () => {
    setSaving(true);
    try {
      await createApplication({
        company: r.company || "Company",
        title: role || "Role",
        jobDescription,
        matchScore: r.atsScore,
        resumeId,
        status: "wishlist",
      });
      setSaved(true);
      toast.success("Saved to your Job Tracker");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="card p-6 sm:p-8 grid gap-8 lg:grid-cols-[auto,1fr] items-center">
        <div className="mx-auto">
          <ScoreGauge score={r.atsScore} size={190} label="Job match" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Chip tone={r.atsScore >= 65 ? "emerald" : r.atsScore >= 50 ? "amber" : "red"}>{r.verdict}</Chip>
            {r.coverage != null && <Chip>{r.coverage}% keyword coverage</Chip>}
            <SourceBadge meta={meta} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
            {role || "Job match report"}
            {r.company ? <span className="text-slate-400 font-normal"> @ {r.company}</span> : null}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Resume: {resumeName}</p>
          <p className="text-slate-300 mt-3 leading-relaxed">{insights.fitSummary}</p>
          <div className="flex flex-wrap gap-3 mt-5 no-print">
            <Button variant="ghost" icon={FiDownload} onClick={() => downloadMatchPDF(r, resumeName)}>PDF report</Button>
            <Button variant="ghost" icon={FiBookmark} loading={saving} disabled={saved} onClick={saveToTracker}>
              {saved ? "Saved to tracker" : "Save to tracker"}
            </Button>
            <Button variant="ghost" icon={FiEdit3} onClick={() => navigate("/career-tools", { state: { jobDescription, jobTitle: role, company: r.company || "", tab: "cover" } })}>
              Write cover letter
            </Button>
            <Button variant="ghost" icon={FiMic} onClick={() => navigate("/interview", { state: { role, jobDescription } })}>
              Practise interview
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Score breakdown" icon={FiTarget}>
          <div className="space-y-4">
            <Bar value={r.breakdown.skills} label="Skills (weighted by importance)" right={`${r.breakdown.skills}%`} />
            {r.breakdown.keywords != null && <Bar value={r.breakdown.keywords} label="Job-specific keywords" right={`${r.breakdown.keywords}%`} />}
            <Bar value={r.breakdown.experience} label="Experience requirement" right={`${r.breakdown.experience}%`} />
            <Bar value={r.breakdown.education} label="Education requirement" right={`${r.breakdown.education}%`} />
            <Bar value={r.breakdown.semantic} label="Overall text similarity" right={`${r.breakdown.semantic}%`} />
          </div>
          <p className="text-xs text-slate-500 mt-4">This score is rule-based and reproducible — the same resume and job always give the same result.</p>
        </Panel>

        <Panel title="Requirements check" icon={FiCheckCircle}>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <StatusIcon status={req.experience?.status === "meets" ? "pass" : req.experience?.status === "close" ? "warn" : req.experience ? "fail" : "warn"} />
              <div>
                <p className="font-semibold text-white">Experience</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {req.experience ? `Asks for ${req.experience.label}; your resume shows about ${req.experience.candidate} year(s).` : "No explicit years of experience in the posting."}
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <StatusIcon status={req.education?.status === "meets" ? "pass" : req.education ? "warn" : "pass"} />
              <div>
                <p className="font-semibold text-white">Education</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {req.education ? `Asks for ${req.education.required}; found: ${req.education.candidate || "not detected"}.` : "No explicit degree requirement found."}
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <StatusIcon status={r.titleMatch === false ? "warn" : "pass"} />
              <div>
                <p className="font-semibold text-white">Job title alignment</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {r.titleMatch === false ? `“${r.jobTitle}” doesn't appear in your resume — echo it in your headline/summary.` : r.titleMatch ? "Your resume reflects the job title." : "Title could not be detected."}
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Matched skills (${r.matchedSkills.length})`} icon={FiCheckCircle}>
          <div className="flex flex-wrap gap-2">
            {(r.matchedSkillsDetail || []).map((s) => (
              <Chip key={s.skill} tone="emerald" className="">
                {s.skill}
                <span className="opacity-60 text-[10px]">{s.importance}</span>
              </Chip>
            ))}
            {!r.matchedSkills.length && <p className="text-sm text-slate-500">No skills from the job post were found on your resume.</p>}
          </div>
          {(r.additionalSkills || []).length > 0 && (
            <>
              <p className="text-xs text-slate-500 mt-5 mb-2">Extra strengths not asked for:</p>
              <div className="flex flex-wrap gap-1.5">{r.additionalSkills.map((s) => <Chip key={s}>{s}</Chip>)}</div>
            </>
          )}
        </Panel>

        <Panel title={`Missing skills (${r.missingSkills.length})`} icon={FiTrendingUp}>
          <div className="flex flex-wrap gap-2">
            {(r.missingSkillsDetail || []).map((s) => (
              <Chip key={s.skill} tone={IMPORTANCE_TONE[s.importance]}>
                {s.skill}
                <span className="opacity-60 text-[10px]">{s.importance}</span>
              </Chip>
            ))}
            {!r.missingSkills.length && <p className="text-sm text-emerald-300">You cover every skill mentioned. 🎉</p>}
          </div>
          {(r.keywordsMissing || []).length > 0 && (
            <>
              <p className="text-xs text-slate-500 mt-5 mb-2">Keywords from the posting not on your resume:</p>
              <div className="flex flex-wrap gap-1.5">{r.keywordsMissing.map((k) => <Chip key={k.term} tone="amber">{k.term}</Chip>)}</div>
            </>
          )}
        </Panel>
      </div>

      {(insights.gaps || []).length > 0 && (
        <Panel title="How to close each gap" icon={FiCompass}>
          <div className="grid gap-3 md:grid-cols-2">
            {insights.gaps.map((g) => (
              <div key={g.skill} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                <p className="font-semibold text-white text-sm">{g.skill}</p>
                {g.why && <p className="text-xs text-slate-400 mt-1">{g.why}</p>}
                {g.howToShow && <p className="text-xs text-indigo-200/90 mt-2 leading-relaxed">💡 {g.howToShow}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {(insights.tailoredBullets || []).length > 0 && (
          <Panel title="Bullets you could add (if true)" icon={FiEdit3}>
            <div className="space-y-3">
              {insights.tailoredBullets.map((b, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex justify-between gap-3 items-start">
                  <p className="text-sm text-slate-200 leading-relaxed">{b.bullet}</p>
                  <CopyButton text={b.bullet} />
                </div>
              ))}
              <p className="text-[11px] text-slate-500">Replace [brackets] with real facts — never claim experience you don&apos;t have.</p>
            </div>
          </Panel>
        )}
        <div className="space-y-6">
          <Panel title="Recommendations" icon={FiTrendingUp}>
            <BulletList items={r.recommendations || []} tone="indigo" />
          </Panel>
          {(insights.interviewFocus || []).length > 0 && (
            <Panel title="Prepare for these interview topics" icon={FiMic}>
              <div className="flex flex-wrap gap-2">{insights.interviewFocus.map((t) => <Chip key={t} tone="violet">{t}</Chip>)}</div>
            </Panel>
          )}
        </div>
      </div>

      {roadmap?.items?.length > 0 && (
        <Panel
          title="Learning roadmap for your gaps"
          icon={FiBriefcase}
          right={<span className="text-xs text-slate-400">≈ {roadmap.totalHours} h · {roadmap.totalWeeks} week(s) at {roadmap.hoursPerWeek} h/week</span>}
        >
          <div className="flex flex-wrap gap-2 mb-5">
            {roadmap.phases.map((p) => (
              <div key={p.label} className="rounded-xl bg-indigo-500/10 border border-indigo-400/20 px-3 py-2 text-xs">
                <b className="text-indigo-200">{p.label}</b>
                <span className="text-slate-400"> · {p.skills.join(", ")}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {roadmap.items.map((it) => (
              <div key={it.skill} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">{it.skill}</p>
                  <div className="flex gap-1.5">
                    <Chip tone={it.priority === "High" ? "red" : it.priority === "Medium" ? "amber" : "slate"}>{it.priority}</Chip>
                    <Chip>~{it.estimatedHours}h</Chip>
                  </div>
                </div>
                <ol className="list-decimal list-inside text-xs text-slate-400 mt-3 space-y-1.5">
                  {it.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                {it.resources.map((res) => (
                  <a key={res.url} href={res.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 mt-3">
                    <FiExternalLink size={12} /> {res.title}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="text-center no-print">
        <Link to="/jobdescription" className="text-sm text-slate-400 hover:text-white">← Try another job description</Link>
      </div>
    </div>
  );
}

export default ATSScore;
