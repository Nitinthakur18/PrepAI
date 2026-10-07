import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiX, FiExternalLink, FiCalendar, FiBriefcase } from "react-icons/fi";
import Button from "../components/Button";
import ErrorState from "../components/ErrorState";
import ConfirmDialog from "../components/ConfirmDialog";
import Skeleton from "../components/Skeleton";
import { Chip } from "../components/ui";
import { listApplications, getApplicationStats, createApplication, updateApplication, deleteApplication, getApplication } from "../services/trackerService";
import { getErrorMessage } from "../services/api";

const COLUMNS = [
  { id: "wishlist", label: "Wishlist", tone: "from-slate-400/20", dot: "bg-slate-400" },
  { id: "applied", label: "Applied", tone: "from-indigo-400/20", dot: "bg-indigo-400" },
  { id: "interview", label: "Interview", tone: "from-amber-400/20", dot: "bg-amber-400" },
  { id: "offer", label: "Offer", tone: "from-emerald-400/20", dot: "bg-emerald-400" },
  { id: "rejected", label: "Rejected", tone: "from-rose-400/20", dot: "bg-rose-400" },
];
const inputCls =
  "w-full rounded-xl bg-[#0b0f1d] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/60";
const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function Editor({ item, onClose, onSave, onDelete }) {
  const [f, setF] = useState({
    company: item.company || "", title: item.title || "", status: item.status || "wishlist", url: item.url || "",
    location: item.location || "", salary: item.salary || "", notes: item.notes || "", nextStep: item.nextStep || "",
    nextStepAt: toInputDate(item.nextStepAt), jobDescription: item.jobDescription || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    if (!f.company.trim() || !f.title.trim()) return toast.error("Company and job title are required.");
    setSaving(true);
    await onSave({ ...f, nextStepAt: f.nextStepAt || null });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-[#0b0f1d]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Application details">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white font-display">{item._id ? "Edit application" : "Add application"}</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white"><FiX size={20} /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Company *" value={f.company} onChange={set("company")} maxLength={120} aria-label="Company" />
          <input className={inputCls} placeholder="Job title *" value={f.title} onChange={set("title")} maxLength={140} aria-label="Job title" />
          <select className={inputCls} value={f.status} onChange={set("status")} aria-label="Status">
            {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input className={inputCls} placeholder="Job link" value={f.url} onChange={set("url")} maxLength={500} aria-label="Job link" />
          <input className={inputCls} placeholder="Location" value={f.location} onChange={set("location")} maxLength={120} aria-label="Location" />
          <input className={inputCls} placeholder="Salary / range" value={f.salary} onChange={set("salary")} maxLength={80} aria-label="Salary" />
          <input className={inputCls} placeholder="Next step (e.g. HR call)" value={f.nextStep} onChange={set("nextStep")} maxLength={200} aria-label="Next step" />
          <input type="date" className={inputCls} value={f.nextStepAt} onChange={set("nextStepAt")} aria-label="Next step date" />
        </div>
        <textarea className={`${inputCls} mt-3`} rows={3} placeholder="Notes" value={f.notes} onChange={set("notes")} maxLength={4000} aria-label="Notes" />
        <div className="flex items-center justify-between mt-5">
          {item._id ? <Button variant="danger" icon={FiTrash2} onClick={onDelete} className="!py-2.5">Delete</Button> : <span />}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="!py-2.5">Cancel</Button>
            <Button loading={saving} onClick={save} className="!py-2.5">Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tracker() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [l, s] = await Promise.all([listApplications(), getApplicationStats()]);
      setItems(l.data.data || []);
      setStats(s.data.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshStats = () => getApplicationStats().then((s) => setStats(s.data.data)).catch(() => {});

  const move = async (id, status) => {
    const prev = items;
    setItems((cur) => cur.map((i) => (i._id === id ? { ...i, status } : i)));
    try {
      await updateApplication(id, { status });
      refreshStats();
    } catch (err) {
      setItems(prev);
      toast.error(getErrorMessage(err, "Couldn't move that card."));
    }
  };

  const openEditor = async (it) => {
    try {
      const res = await getApplication(it._id); // includes the job description
      setEditing(res.data.data);
    } catch {
      setEditing(it);
    }
  };

  const save = async (fields) => {
    try {
      if (editing._id) {
        const res = await updateApplication(editing._id, fields);
        setItems((cur) => cur.map((i) => (i._id === editing._id ? { ...i, ...res.data.data } : i)));
      } else {
        const res = await createApplication(fields);
        setItems((cur) => [res.data.data, ...cur]);
      }
      toast.success("Saved");
      setEditing(null);
      refreshStats();
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't save."));
    }
  };

  const remove = async () => {
    const id = confirmDel;
    setConfirmDel(null);
    try {
      await deleteApplication(id);
      setItems((cur) => cur.filter((i) => i._id !== id));
      setEditing(null);
      refreshStats();
      toast.success("Deleted");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete."));
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState title="Couldn't load your tracker" description={getErrorMessage(error)} onRetry={load} />;

  return (
    <div className="space-y-6">
      <ConfirmDialog open={!!confirmDel} title="Delete this application?" description="This can't be undone." confirmLabel="Delete" onConfirm={remove} onCancel={() => setConfirmDel(null)} />
      {editing && <Editor key={editing._id || "new"} item={editing} onClose={() => setEditing(null)} onSave={save} onDelete={() => setConfirmDel(editing._id)} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">Job <span className="text-gradient">tracker</span></h2>
          <p className="text-slate-400 mt-2">Drag cards between columns as your applications progress.</p>
        </div>
        <Button icon={FiPlus} onClick={() => setEditing({})}>Add application</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Tracked", stats.total],
            ["Applied", stats.applied],
            ["Interview rate", `${stats.responseRate}%`],
            ["Avg. match", stats.averageMatch != null ? `${stats.averageMatch}%` : "–"],
          ].map(([l, v]) => (
            <div key={l} className="card p-4"><p className="text-2xl font-bold font-display text-white">{v}</p><p className="text-xs text-slate-400 mt-0.5">{l}</p></div>
          ))}
        </div>
      )}
      {stats?.upcoming?.length > 0 && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100 flex flex-wrap gap-x-6 gap-y-1">
          <span className="flex items-center gap-2 font-semibold"><FiCalendar /> Coming up</span>
          {stats.upcoming.map((u) => (
            <span key={u.id}>{new Date(u.nextStepAt).toLocaleDateString()} · {u.nextStep || "Follow up"} — {u.company}</span>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="card p-10 text-center">
          <FiBriefcase className="mx-auto text-indigo-300" size={28} />
          <p className="text-white font-semibold mt-3">No applications yet</p>
          <p className="text-sm text-slate-400 mt-1">Add one here, or use “Save to tracker” on any Job Match report.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
              onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                const id = e.dataTransfer.getData("text/plain") || dragId;
                const it = items.find((i) => i._id === id);
                if (it && it.status !== col.id) move(id, col.id);
                setDragId(null);
              }}
              className={`rounded-3xl border p-3 min-h-[200px] transition bg-gradient-to-b ${col.tone} to-transparent ${overCol === col.id ? "border-cyan-300/60" : "border-white/5"}`}
              aria-label={`${col.label} column`}
            >
              <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-white"><span className={`h-2 w-2 rounded-full ${col.dot}`} />{col.label}</span>
                <span className="text-xs text-slate-500">{colItems.length}</span>
              </div>
              <div className="space-y-2.5">
                {colItems.map((it) => (
                  <div
                    key={it._id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", it._id); setDragId(it._id); }}
                    onDragEnd={() => setDragId(null)}
                    className={`rounded-2xl bg-[#0d1226] border border-white/10 p-3.5 cursor-grab active:cursor-grabbing hover:border-indigo-400/40 transition ${dragId === it._id ? "opacity-40" : ""}`}
                  >
                    <button className="text-left w-full" onClick={() => openEditor(it)}>
                      <p className="text-sm font-semibold text-white leading-snug">{it.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{it.company}{it.location ? ` · ${it.location}` : ""}</p>
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {typeof it.matchScore === "number" && <Chip tone={it.matchScore >= 65 ? "emerald" : it.matchScore >= 50 ? "amber" : "red"}>{it.matchScore}% match</Chip>}
                      {it.nextStepAt && <Chip tone="amber"><FiCalendar size={10} /> {new Date(it.nextStepAt).toLocaleDateString()}</Chip>}
                      {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" aria-label="Open job link" className="text-slate-500 hover:text-cyan-300 ml-auto"><FiExternalLink size={13} /></a>}
                    </div>
                    {/* keyboard / touch friendly move control */}
                    <select value={it.status} onChange={(e) => move(it._id, e.target.value)} aria-label={`Move ${it.title} to another column`} className="mt-2.5 w-full rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-400 px-2 py-1">
                      {COLUMNS.map((c) => <option key={c.id} value={c.id} className="bg-[#0b0f1d]">{c.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Tracker;
