import { Link } from "react-router-dom";
import { FiZap, FiArrowLeft } from "react-icons/fi";

function NotFound() {
  return (
    <div className="min-h-screen bg-bg bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 blur-[150px] rounded-full" />

      <div className="card p-10 text-center max-w-md relative z-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
            <FiZap className="text-white" size={20} />
          </div>
          <span className="font-display font-bold text-xl text-white">
            Prep<span className="text-gradient">AI</span>
          </span>
        </div>
        <h1 className="text-6xl font-bold text-white font-display">404</h1>
        <p className="text-slate-400 mt-3">
          This page doesn't exist or has moved.
        </p>
        <Link
          to="/dashboard"
          className="btn-primary inline-flex items-center gap-2 mt-8 px-5 py-3 rounded-xl text-sm font-semibold text-white"
        >
          <FiArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
