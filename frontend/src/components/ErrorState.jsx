import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";

function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  onRetry,
}) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-16 px-6 border-red-500/20">
      <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4 text-red-300">
        <FiAlertCircle size={26} />
      </div>
      <h3 className="text-lg font-semibold text-white font-display">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 mt-2 max-w-sm">{description}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition"
        >
          <FiRefreshCw size={14} />
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorState;
