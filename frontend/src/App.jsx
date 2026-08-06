import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import UploadResume from "./pages/UploadResume";
import JobDescription from "./pages/JobDescription";
import Interview from "./pages/Interview";
import MockInterview from "./pages/MockInterview";
import ResumeBuilder from "./pages/ResumeBuilder";
import ATSScore from "./pages/ATSScore";
import History from "./pages/History";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

function RootRedirect() {
  const { user, initializing } = useAuth();
  const hasToken = !!localStorage.getItem("prepai_token");

  if (initializing) return null;
  return <Navigate to={user || hasToken ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadResume />} />
          <Route path="/jobdescription" element={<JobDescription />} />
          <Route path="/ats" element={<ATSScore />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/mock-interview" element={<MockInterview />} />
          <Route path="/resume-builder" element={<ResumeBuilder />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
