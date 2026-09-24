import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiFileText,
  FiTarget,
  FiMessageSquare,
  FiTrendingUp,
  FiUploadCloud,
  FiEdit3,
  FiMic,
  FiClock,
} from "react-icons/fi";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
} from "recharts";
import { getDashboardStats } from "../services/analyticsService";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { StatCardSkeleton, ChartCardSkeleton } from "../components/Skeleton";

const quickLinks = [
  { to: "/upload", label: "Upload Resume", icon: FiUploadCloud, accent: "from-indigo-500 to-indigo-400" },
  { to: "/jobdescription", label: "Match Job Description", icon: FiTarget, accent: "from-cyan-500 to-cyan-400" },
  { to: "/interview", label: "Generate Interview Qs", icon: FiMessageSquare, accent: "from-violet-500 to-violet-400" },
  { to: "/mock-interview", label: "Start Mock Interview", icon: FiMic, accent: "from-fuchsia-500 to-fuchsia-400" },
  { to: "/resume-builder", label: "Build a Resume", icon: FiEdit3, accent: "from-emerald-500 to-emerald-400" },
  { to: "/history", label: "View History", icon: FiClock, accent: "from-amber-500 to-amber-400" },
];

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = () => {
    setLoading(true);
    setError(false);
    getDashboardStats()
      .then((res) => setStats(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const trendData = (stats?.scoreTrend || []).map((d, i) => ({
    name: `#${i + 1}`,
    score: d.score,
  }));

  const radarData = stats?.scoreBreakdown
    ? Object.entries(stats.scoreBreakdown).map(([key, value]) => ({
        subject: key.charAt(0).toUpperCase() + key.slice(1),
        value,
        fullMark: 20,
      }))
    : [];

  const skillGapData = stats?.topMissingSkills || [];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card p-6 sm:p-8 bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
        </h2>
        <p className="text-slate-400 mt-2 max-w-xl">
          Here's a snapshot of your job search progress. Upload a resume,
          match it against a job description, or jump into a mock interview.
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FiFileText}
            label="Resumes Analyzed"
            value={stats?.totalResumes ?? "—"}
            accent="indigo"
          />
          <StatCard
            icon={FiTrendingUp}
            label="Average ATS Score"
            value={stats ? `${stats.averageAtsScore}%` : "—"}
            accent="cyan"
          />
          <StatCard
            icon={FiMic}
            label="Mock Interviews"
            value={stats?.totalInterviews ?? "—"}
            accent="violet"
          />
          <StatCard
            icon={FiTarget}
            label="Avg Interview Score"
            value={stats ? `${stats.averageInterviewScore}/10` : "—"}
            accent="emerald"
          />
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickLinks.map(({ to, label, icon: Icon, accent }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link
                to={to}
                className="card flex flex-col items-center justify-center gap-3 p-5 h-32 hover:-translate-y-1 hover:border-indigo-400/30 transition-all duration-300 group"
              >
                <div
                  className={`h-10 w-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <Icon className="text-white" size={18} />
                </div>
                <span className="text-xs text-center text-slate-300 font-medium leading-tight">
                  {label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCardSkeleton />
          </div>
          <ChartCardSkeleton />
          <div className="lg:col-span-2">
            <ChartCardSkeleton height={220} />
          </div>
          <ChartCardSkeleton height={220} />
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load your dashboard"
          description="We ran into a problem fetching your stats. Check your connection and try again."
          onRetry={fetchStats}
        />
      ) : stats && stats.totalResumes === 0 && stats.totalInterviews === 0 ? (
        <EmptyState
          icon={FiUploadCloud}
          title="No activity yet"
          description="Upload your first resume to get an instant AI-powered ATS score and start tracking your progress here."
          actionLabel="Upload Resume"
          actionTo="/upload"
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
              ATS Score Trend
            </h3>
            {trendData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "#0b0f1d",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={{ fill: "#818cf8", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm py-16 text-center">
                Upload resumes to see your score trend over time.
              </p>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
              Score Breakdown
            </h3>
            {radarData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                  <Radar
                    dataKey="value"
                    stroke="#22d3ee"
                    fill="#22d3ee"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm py-16 text-center">
                Analyze a resume to see your category breakdown.
              </p>
            )}
          </div>

          <div className="card p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
              Most Common Missing Skills
            </h3>
            {skillGapData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={skillGapData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="skill" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#0b0f1d",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="count" fill="#a78bfa" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm py-16 text-center">
                Match your resume against a job description to see skill gaps.
              </p>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
              Recent Activity
            </h3>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {(stats?.recentActivity || []).length ? (
                stats.recentActivity.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm border-b border-white/5 pb-3 last:border-0"
                  >
                    <span
                      className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        a.type === "resume" ? "bg-indigo-400" : "bg-cyan-400"
                      }`}
                    />
                    <div>
                      <p className="text-slate-200 font-medium leading-tight">
                        {a.title}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {a.detail}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm py-8 text-center">
                  No activity yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
