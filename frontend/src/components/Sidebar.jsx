import { NavLink } from "react-router-dom";
import {
  FiGrid,
  FiUploadCloud,
  FiBriefcase,
  FiTarget,
  FiMic,
  FiFileText,
  FiClock,
  FiSettings,
  FiX,
  FiZap,
} from "react-icons/fi";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: FiGrid },
  { to: "/upload", label: "Upload Resume", icon: FiUploadCloud },
  { to: "/jobdescription", label: "JD Match", icon: FiBriefcase },
  { to: "/ats", label: "ATS Score", icon: FiTarget },
  { to: "/interview", label: "Interview Prep", icon: FiMic },
  { to: "/resume-builder", label: "Resume Builder", icon: FiFileText },
  { to: "/history", label: "History", icon: FiClock },
  { to: "/settings", label: "Settings", icon: FiSettings },
];

function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 z-50 shrink-0 border-r border-white/5 bg-[#070a15]/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <FiZap className="text-white" size={18} />
            </div>
            <span className="text-xl font-display font-bold text-white">
              Prep<span className="text-gradient">AI</span>
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <FiX size={22} />
          </button>
        </div>

        <nav className="px-4 space-y-1 mt-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500/20 to-cyan-400/10 text-white border border-indigo-400/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-400">
              Powered by <span className="text-cyan-400 font-semibold">Gemini AI</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
