import { useNavigate } from "react-router-dom";
import { FiMenu, FiLogOut, FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8 py-4 border-b border-white/5 bg-[#05070f]/80 backdrop-blur-xl">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-300 hover:text-white"
      >
        <FiMenu size={22} />
      </button>

      <div className="hidden lg:block">
        <p className="text-sm text-slate-400">
          Welcome back{user?.name ? "," : ""}{" "}
          <span className="text-white font-semibold">{user?.name}</span> 👋
        </p>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white/5 border border-white/10">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.name ? user.name[0].toUpperCase() : <FiUser size={14} />}
          </div>
          <span className="text-sm text-slate-200 hidden sm:block pr-1">
            {user?.name || "Guest"}
          </span>
        </div>

        <button
          onClick={handleLogout}
          title="Logout"
          className="p-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 transition"
        >
          <FiLogOut size={17} />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
