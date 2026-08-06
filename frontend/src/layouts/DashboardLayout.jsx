import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const titles = {
  "/dashboard": "Dashboard",
  "/upload": "Upload Resume",
  "/jobdescription": "Job Description Match",
  "/ats": "ATS Score",
  "/interview": "Interview Question Generator",
  "/mock-interview": "AI Mock Interview",
  "/resume-builder": "Resume Builder",
  "/history": "History",
  "/settings": "Settings",
};

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title =
    titles[location.pathname] ||
    (location.pathname.startsWith("/mock-interview")
      ? "AI Mock Interview"
      : "PrepAI");

  return (
    <div className="min-h-screen flex bg-bg bg-grid">
      <div className="pointer-events-none fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 blur-[140px] rounded-full" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[-5%] w-[450px] h-[450px] bg-cyan-500/10 blur-[140px] rounded-full" />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 relative">
        <Navbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="px-4 sm:px-8 py-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
