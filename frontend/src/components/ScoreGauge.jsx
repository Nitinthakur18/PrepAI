function ScoreGauge({ score = 0, size = 160, label = "ATS Score", suffix = "%" }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 75 ? "#34d399" : clamped >= 50 ? "#facc15" : "#f87171";

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span className="text-4xl font-bold text-white font-display">
          {clamped}
          {suffix}
        </span>
        <span className="text-xs text-slate-400 mt-1">{label}</span>
      </div>
    </div>
  );
}

export default ScoreGauge;
