import { FiCheckCircle, FiAlertTriangle, FiXCircle } from "react-icons/fi";

export function Chip({ children, tone = "slate", className = "" }) {
  const tones = {
    slate: "bg-white/5 border-white/10 text-slate-300",
    indigo: "bg-indigo-500/10 border-indigo-400/30 text-indigo-200",
    emerald: "bg-emerald-500/10 border-emerald-400/30 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-400/30 text-amber-200",
    red: "bg-red-500/10 border-red-400/30 text-red-200",
    cyan: "bg-cyan-500/10 border-cyan-400/30 text-cyan-200",
    violet: "bg-violet-500/10 border-violet-400/30 text-violet-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${tones[tone] || tones.slate} ${className}`}>
      {children}
    </span>
  );
}

export function Bar({ value, max = 100, label, right, tone }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const auto = pct >= 75 ? "from-emerald-400 to-emerald-500" : pct >= 50 ? "from-amber-300 to-amber-400" : "from-rose-400 to-rose-500";
  const toneCls = tone === "indigo" ? "from-indigo-400 to-violet-500" : auto;
  return (
    <div>
      {(label || right) && (
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-slate-300">{label}</span>
          <span className="text-slate-400 tabular-nums">{right}</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneCls} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 overflow-x-auto no-print" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
            active === t.id ? "bg-gradient-to-r from-indigo-500/30 to-violet-500/20 text-white border border-indigo-400/30" : "text-slate-400 hover:text-white"
          }`}
        >
          {t.label}
          {t.count != null && <span className="ml-2 text-xs text-slate-500">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function StatusIcon({ status, size = 18 }) {
  if (status === "pass" || status === "meets") return <FiCheckCircle size={size} className="text-emerald-400 shrink-0" />;
  if (status === "warn" || status === "close") return <FiAlertTriangle size={size} className="text-amber-400 shrink-0" />;
  return <FiXCircle size={size} className="text-rose-400 shrink-0" />;
}

export function Panel({ title, icon: Icon, right, children, className = "" }) {
  return (
    <section className={`card p-6 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-semibold text-white font-display flex items-center gap-2">
            {Icon && <Icon className="text-indigo-300" size={18} />}
            {title}
          </h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function BulletList({ items, tone = "slate" }) {
  const dot = { emerald: "bg-emerald-400", rose: "bg-rose-400", indigo: "bg-indigo-400", amber: "bg-amber-400", slate: "bg-slate-500" }[tone];
  return (
    <ul className="space-y-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
          <span className={`mt-2 h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
