import { useState } from "react";
import { Link } from "react-router-dom";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from "recharts";
import {
  FiDownload, FiZap, FiTarget, FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiInfo,
  FiBriefcase, FiEdit3,
} from "react-icons/fi";
import ScoreGauge from "./ScoreGauge";
import SourceBadge from "./SourceBadge";
import Button from "./Button";
import CopyButton from "./CopyButton";
import { Chip, Bar, Tabs, StatusIcon, Panel, BulletList } from "./ui";
import { downloadAnalysisPDF } from "../utils/pdfReport";

const BREAKDOWN_LABELS = {
  formatting: "Formatting & contact",
  keywords: "Keywords & impact words",
  skills: "Skills coverage",
  projects: "Experience & achievements",
  education: "Education & credentials",
};

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
      <p className="text-2xl font-bold font-display text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function AnalysisReport({ analysis, meta, resumeId, name, onReanalyze, reanalyzing, initialTab = "overview" }) {
  const [tab, setTab] = useState(initialTab);
  if (!analysis) return null;

  const source = meta || analysis.meta;
  const degraded = source?.source === "local";
  const stats = analysis.stats || {};
  const checks = analysis.checks || [];
  const counts = checks.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] || 0) + 1 }), {});
  const radarData = Object.entries(analysis.scoreBreakdown || {}).map(([k, v]) => ({
    category: (BREAKDOWN_LABELS[k] || k).split(" ")[0],
    value: v,
    full: 20,
  }));
  const model = analysis.scoreModel;
  const byCat = Object.entries(analysis.skillsByCategory || {});

  return (
    <div className="space-y-6">
      {degraded && (
        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3 no-print">
          <FiInfo className="text-cyan-300 shrink-0" size={20} />
          <p className="text-sm text-cyan-100 flex-1">
            Gemini is busy right now, so this report was produced by PrepAI&apos;s built-in <b>Smart Engine</b> — a rule-based analyzer that always works.
            You can upgrade it with AI insights whenever Gemini is available.
          </p>
          {onReanalyze && (
            <Button variant="ghost" icon={FiZap} loading={reanalyzing} onClick={onReanalyze} className="shrink-0">
              Enhance with AI
            </Button>
          )}
        </div>
      )}

      {/* Hero */}
      <div className="card p-6 sm:p-8 grid gap-8 lg:grid-cols-[auto,1fr] items-center">
        <div className="mx-auto">
          <ScoreGauge score={analysis.atsScore || 0} size={190} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {analysis.experienceLevel && <Chip tone="indigo">{analysis.experienceLevel}</Chip>}
            {stats.yearsExperience > 0 && <Chip>{stats.yearsExperience} yrs experience</Chip>}
            <SourceBadge meta={source} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display">{name || "Your resume"}</h2>
          <p className="text-slate-300 mt-2 leading-relaxed">{analysis.summary}</p>
          <div className="flex flex-wrap gap-3 mt-5 no-print">
            <Button icon={FiDownload} variant="ghost" onClick={() => downloadAnalysisPDF(analysis, name)}>
              Download PDF report
            </Button>
            {resumeId && (
              <Link to="/jobdescription" className="btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold">
                <FiBriefcase size={16} /> Match to a job
              </Link>
            )}
            {!degraded && onReanalyze && (
              <Button variant="ghost" icon={FiZap} loading={reanalyzing} onClick={onReanalyze}>
                Re-run analysis
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatTile label="Words" value={stats.wordCount ?? "–"} hint={`≈ ${stats.pages ?? "–"} pages`} />
        <StatTile label="Technical skills" value={stats.skillCount ?? 0} />
        <StatTile label="Quantified bullets" value={`${stats.quantifiedPct ?? 0}%`} hint={`${stats.quantified ?? 0} of ${stats.statements ?? 0}`} />
        <StatTile label="Action-verb bullets" value={`${stats.actionVerbPct ?? 0}%`} />
        <StatTile label="Projects found" value={stats.projects ?? 0} />
        <StatTile label="ATS checks passed" value={`${counts.pass || 0}/${checks.length}`} />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "checks", label: "ATS checks", count: checks.length },
          { id: "skills", label: "Skills", count: (analysis.technicalSkills || []).length },
          { id: "roles", label: "Career fit" },
          { id: "rewrite", label: "Rewrites" },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Score breakdown" icon={FiTarget}>
            <div className="h-56 -mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 20]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#818cf8" fill="#6366f1" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-2">
              {Object.entries(analysis.scoreBreakdown || {}).map(([k, v]) => (
                <Bar key={k} value={v} max={20} label={BREAKDOWN_LABELS[k] || k} right={`${v}/20`} />
              ))}
            </div>
            {model && (
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                <b className="text-slate-400">How this is scored:</b> rule-based checks ({model.local}/100)
                {model.ai != null ? ` blended 65/35 with Gemini's content-quality review (${model.ai}/100)` : " — Gemini's review is not included in this run"}.
                The same resume always gets the same rule-based score.
              </p>
            )}
          </Panel>

          <div className="space-y-6">
            <Panel title="Strengths" icon={FiCheckCircle}>
              <BulletList items={analysis.strengths || []} tone="emerald" />
            </Panel>
            <Panel title="Weaknesses" icon={FiAlertTriangle}>
              <BulletList items={analysis.weaknesses || []} tone="rose" />
            </Panel>
          </div>

          <Panel title="Top suggestions" icon={FiTrendingUp} className="lg:col-span-2">
            <ol className="grid gap-3 md:grid-cols-2">
              {(analysis.suggestions || []).map((s, i) => (
                <li key={i} className="flex gap-3 rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-sm text-slate-300 leading-relaxed">
                  <span className="h-6 w-6 shrink-0 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}

      {tab === "checks" && (
        <Panel
          title="ATS compatibility checks"
          icon={FiTarget}
          right={
            <div className="flex gap-2">
              <Chip tone="emerald">{counts.pass || 0} pass</Chip>
              <Chip tone="amber">{counts.warn || 0} warn</Chip>
              <Chip tone="red">{counts.fail || 0} fail</Chip>
            </div>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {[...checks].sort((a, b) => ({ fail: 0, warn: 1, pass: 2 }[a.status] - { fail: 0, warn: 1, pass: 2 }[b.status])).map((c) => (
              <div key={c.id} className="flex gap-3 rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                <StatusIcon status={c.status} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{c.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.detail}</p>
                  {c.tip && <p className="text-xs text-indigo-200/90 mt-2 leading-relaxed">💡 {c.tip}</p>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "skills" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Technical skills by area">
            {byCat.length ? (
              <div className="space-y-4">
                {byCat.map(([cat, list]) => (
                  <div key={cat}>
                    <p className="text-xs text-slate-400 mb-2">{cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {list.map((s) => <Chip key={s} tone="indigo">{s}</Chip>)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(analysis.technicalSkills || []).map((s) => <Chip key={s} tone="indigo">{s}</Chip>)}
              </div>
            )}
          </Panel>
          <div className="space-y-6">
            <Panel title="Soft skills">
              <div className="flex flex-wrap gap-2">
                {(analysis.softSkills || []).length
                  ? analysis.softSkills.map((s) => <Chip key={s} tone="violet">{s}</Chip>)
                  : <p className="text-sm text-slate-500">No soft skills evidenced — show them through results, not adjectives.</p>}
              </div>
            </Panel>
            {(analysis.actionVerbs || []).length > 0 && (
              <Panel title="Action verbs you use">
                <div className="flex flex-wrap gap-2">
                  {analysis.actionVerbs.map((v) => <Chip key={v} tone="emerald">{v}</Chip>)}
                </div>
              </Panel>
            )}
            {((analysis.weakPhrases || []).length > 0 || (analysis.buzzwords || []).length > 0) && (
              <Panel title="Phrases to replace">
                <div className="flex flex-wrap gap-2">
                  {[...(analysis.weakPhrases || []), ...(analysis.buzzwords || [])].map((v) => <Chip key={v} tone="red">“{v}”</Chip>)}
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}

      {tab === "roles" && (
        <Panel title="Which roles does this resume fit best?" icon={FiBriefcase}>
          <div className="grid gap-5 md:grid-cols-2">
            {(analysis.roleFit || []).map((r) => (
              <div key={r.role} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                <Bar value={r.fit} label={<b className="text-white">{r.role}</b>} right={`${r.fit}% fit`} />
                {r.matched?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {r.matched.slice(0, 8).map((s) => <Chip key={s} tone="emerald">{s}</Chip>)}
                  </div>
                )}
                {r.missing?.length > 0 && (
                  <>
                    <p className="text-xs text-slate-500 mt-4 mb-1.5">Add to strengthen this path:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.missing.slice(0, 5).map((s) => <Chip key={s} tone="amber">{s}</Chip>)}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          {(analysis.aiTargetRoles || []).length > 0 && (
            <p className="text-sm text-slate-400 mt-5">
              Gemini also suggests: {analysis.aiTargetRoles.join(" · ")}
            </p>
          )}
        </Panel>
      )}

      {tab === "rewrite" && (
        <div className="grid gap-6">
          {analysis.improvedSummary && (
            <Panel title="Suggested professional summary" icon={FiEdit3} right={<CopyButton text={analysis.improvedSummary} />}>
              <p className="text-slate-200 leading-relaxed">{analysis.improvedSummary}</p>
            </Panel>
          )}
          {(analysis.bulletRewrites || []).length > 0 && (
            <Panel title="Stronger bullet points" icon={FiEdit3}>
              <div className="space-y-4">
                {analysis.bulletRewrites.map((b, i) => (
                  <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-sm">
                    <p className="text-rose-200/80 line-through decoration-rose-400/40">{b.original}</p>
                    <div className="flex items-start justify-between gap-3 mt-2">
                      <p className="text-emerald-200">{b.improved}</p>
                      <CopyButton text={b.improved} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
          {!analysis.improvedSummary && !(analysis.bulletRewrites || []).length && (
            <Panel title="Rewrite suggestions">
              <p className="text-sm text-slate-400 leading-relaxed">
                AI-written rewrites appear here when Gemini is available. In the meantime the <b>Career Tools</b> page has an
                offline Bullet Improver that fixes weak openers and adds impact placeholders.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <Link to="/career-tools" className="btn-primary inline-flex px-5 py-2.5 rounded-xl text-sm">Open Career Tools</Link>
                {onReanalyze && <Button variant="ghost" icon={FiZap} loading={reanalyzing} onClick={onReanalyze}>Enhance with AI</Button>}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalysisReport;
