import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

// Route-level code splitting: each page is only downloaded when the user
// actually navigates to it, instead of all pages (plus their dependencies
// like recharts, jspdf/html2canvas) being bundled into one initial chunk.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UploadResume = lazy(() => import("./pages/UploadResume"));
const JobDescription = lazy(() => import("./pages/JobDescription"));
const Interview = lazy(() => import("./pages/Interview"));
const MockInterview = lazy(() => import("./pages/MockInterview"));
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"));
const ATSScore = lazy(() => import("./pages/ATSScore"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#05070f]">
      <span className="h-10 w-10 rounded-full border-4 border-white/10 border-t-indigo-400 animate-spin" />
    </div>
  );
}

function RootRedirect() {
  const { user, initializing } = useAuth();
  const hasToken = !!localStorage.getItem("prepai_token");

  if (initializing) return null;
  return <Navigate to={user || hasToken ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  );
}

export default App;
