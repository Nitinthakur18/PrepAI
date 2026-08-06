function StatCard({ icon: Icon, label, value, hint, accent = "indigo" }) {
  const accents = {
    indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-300",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-300",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-300",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
  };

  return (
    <div className="card p-5 flex items-start gap-4">
      <div
        className={`h-11 w-11 rounded-xl bg-gradient-to-br ${accents[accent]} flex items-center justify-center shrink-0`}
      >
        {Icon && <Icon size={20} />}
      </div>
      <div>
        <p className="text-2xl font-bold text-white font-display leading-tight">
          {value}
        </p>
        <p className="text-sm text-slate-400 mt-0.5">{label}</p>
        {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      </div>
    </div>
  );
}

export default StatCard;
