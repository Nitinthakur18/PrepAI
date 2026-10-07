import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FiUser, FiSave, FiLogOut, FiMail, FiCpu, FiLock, FiDownload, FiTrash2, FiActivity } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import * as authService from "../services/authService";
import useAIStatus from "../hooks/useAIStatus";
import AIStatusBadge from "../components/AIStatusBadge";
import { Chip } from "../components/ui";
import { testAIConnection } from "../services/healthService";
import { getResumeHistory } from "../services/resumeService";
import { getInterviewHistory } from "../services/interviewService";
import { listApplications } from "../services/trackerService";
import { getErrorMessage } from "../services/api";
import { downloadTextFile } from "../utils/pdfReport";

const fieldCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60";

function AIPanel() {
  const { status, unreachable } = useAIStatus(15000);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await testAIConnection();
      setResult(res.data);
    } catch (err) {
      setResult({ ok: false, reason: getErrorMessage(err) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-white font-display flex items-center gap-2"><FiCpu className="text-indigo-300" /> AI system status</h2>
        <AIStatusBadge />
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">
        PrepAI tries Gemini first, retries on busy signals, rotates through backup models, and finally uses its built-in
        Smart Engine — so analysis, matching and interviews keep working even when Gemini is overloaded.
      </p>
      {unreachable && <p className="text-sm text-red-300 mt-4">The server can&apos;t be reached right now.</p>}
      {status && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              ["Gemini calls", status.stats?.success ?? 0],
              ["Auto-fallbacks", status.stats?.fallbacks ?? 0],
              ["Cache hits", status.stats?.cacheHits ?? 0],
              ["Avg latency", status.stats?.avgLatencyMs ? `${(status.stats.avgLatencyMs / 1000).toFixed(1)}s` : "–"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-white/[0.03] border border-white/5 p-3"><p className="text-lg font-bold text-white font-display">{v}</p><p className="text-[11px] text-slate-400">{l}</p></div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {(status.models || []).map((m) => (
              <div key={m.name} className="flex items-center justify-between text-sm rounded-xl bg-white/[0.03] border border-white/5 px-4 py-2.5">
                <span className="text-slate-300 font-mono text-xs">{m.name}</span>
                <Chip tone={m.state === "ready" ? "emerald" : m.state === "cooling" ? "amber" : "red"}>
                  {m.state === "cooling" ? `cooling ${m.cooldownSeconds}s` : m.state}
                </Chip>
              </div>
            ))}
            {status.circuit?.state === "open" && <p className="text-xs text-amber-300">Circuit breaker open — retrying Gemini in ~{status.circuit.retryInSeconds}s. Requests are served instantly by the Smart Engine meanwhile.</p>}
            {!status.configured && <p className="text-xs text-cyan-300">No Gemini key configured on the server — everything runs on the Smart Engine.</p>}
          </div>
        </>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="ghost" icon={FiActivity} loading={testing} onClick={test}>Test AI connection</Button>
        {result && (
          <span className={`text-sm ${result.ok ? "text-emerald-300" : "text-amber-300"}`}>
            {result.ok ? `Gemini responded (${result.meta?.model}, ${(result.meta?.latencyMs / 1000).toFixed(1)}s).` : `Gemini didn't respond (${result.reason || "busy"}) — the Smart Engine will handle requests.`}
          </span>
        )}
      </div>
    </div>
  );
}

function PasswordPanel() {
  const [f, setF] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authService.changePassword(f);
      toast.success("Password updated.");
      setF({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change password."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card p-6 sm:p-8 space-y-4">
      <h2 className="text-lg font-semibold text-white font-display flex items-center gap-2"><FiLock className="text-indigo-300" /> Change password</h2>
      <input type="password" autoComplete="current-password" placeholder="Current password" className={fieldCls} value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} aria-label="Current password" required />
      <input type="password" autoComplete="new-password" placeholder="New password (8+ chars, letter & number)" className={fieldCls} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} aria-label="New password" required minLength={8} />
      <Button type="submit" loading={busy} icon={FiSave}>Update password</Button>
    </form>
  );
}

function DataPanel({ onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pw, setPw] = useState("");

  const exportData = async () => {
    setBusy(true);
    try {
      const [r, i, t] = await Promise.all([getResumeHistory(), getInterviewHistory(), listApplications()]);
      downloadTextFile(JSON.stringify({ exportedAt: new Date().toISOString(), resumes: r.data.data, interviews: i.data.data, applications: t.data.data }, null, 2), "prepai-my-data.json");
      toast.success("Your data was downloaded.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Export failed."));
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      await authService.deleteAccount({ password: pw });
      toast.success("Your account and data were deleted.");
      onDeleted();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the account."));
      setBusy(false);
    }
  };

  return (
    <div className="card p-6 sm:p-8 space-y-5">
      <h2 className="text-lg font-semibold text-white font-display">Your data</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400 max-w-md">Download everything PrepAI stores about you (resumes, interviews, applications) as JSON.</p>
        <Button variant="ghost" icon={FiDownload} loading={busy && !confirming} onClick={exportData}>Export my data</Button>
      </div>
      <div className="border-t border-white/5 pt-5">
        {!confirming ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400 max-w-md">Permanently delete your account and all associated data.</p>
            <Button variant="danger" icon={FiTrash2} onClick={() => setConfirming(true)}>Delete account</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300">This can&apos;t be undone. Enter your password to confirm.</p>
            <input type="password" autoComplete="current-password" className={fieldCls} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Confirm password" />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { setConfirming(false); setPw(""); }}>Cancel</Button>
              <Button variant="danger" icon={FiTrash2} loading={busy} disabled={!pw} onClick={del}>Delete everything</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || "",
    headline: user?.headline || "",
    role: user?.role || "Job Seeker",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await authService.updateProfile(form);
      updateUser(res.data.user);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">
          Settings
        </h1>
        <p className="text-slate-400 mt-2">
          Manage your PrepAI profile and account.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 sm:p-8"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {user?.name ? user.name[0].toUpperCase() : <FiUser size={24} />}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{user?.name}</p>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
              <FiMail size={13} /> {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 font-medium mb-2 block">
              Full Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 font-medium mb-2 block">
              Headline
            </label>
            <input
              name="headline"
              value={form.headline}
              onChange={handleChange}
              placeholder="e.g. Aspiring Frontend Developer"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 font-medium mb-2 block">
              Role
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/60"
            >
              <option className="bg-[#0b0f1d]">Job Seeker</option>
              <option className="bg-[#0b0f1d]">Student</option>
              <option className="bg-[#0b0f1d]">Career Switcher</option>
              <option className="bg-[#0b0f1d]">Recruiter</option>
            </select>
          </div>

          <Button type="submit" loading={saving} icon={FiSave}>
            Save Changes
          </Button>
        </form>
      </motion.div>

      <AIPanel />
      <PasswordPanel />
      <DataPanel onDeleted={handleLogout} />

      <div className="card p-6 sm:p-8 flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">Log out</p>
          <p className="text-sm text-slate-400 mt-0.5">
            End your current session on this device.
          </p>
        </div>
        <Button variant="danger" icon={FiLogOut} onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </div>
  );
}

export default Settings;
