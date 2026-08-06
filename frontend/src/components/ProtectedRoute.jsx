import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const hasToken = !!localStorage.getItem("prepai_token");

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <span className="h-10 w-10 rounded-full border-4 border-white/10 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!user && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
