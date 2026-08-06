import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FiUser, FiSave, FiLogOut, FiMail } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import * as authService from "../services/authService";

function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || "",
    headline: user?.headline || "",
    role: user?.role || "Job Seeker",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await authService.updateProfile(form);
      updateUser(res.data.user);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">
          Settings
        </h1>
        <p className="text-slate-400 mt-2">
          Manage your PrepAI profile and account.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 sm:p-8"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {user?.name ? user.name[0].toUpperCase() : <FiUser size={24} />}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{user?.name}</p>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
              <FiMail size={13} /> {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 font-medium mb-2 block">
              Full Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 font-medium mb-2 block">
              Headline
            </label>
            <input
              name="headline"
              value={form.headline}
              onChange={handleChange}
              placeholder="e.g. Aspiring Frontend Developer"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 font-medium mb-2 block">
              Role
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/60"
            >
              <option className="bg-[#0b0f1d]">Job Seeker</option>
              <option className="bg-[#0b0f1d]">Student</option>
              <option className="bg-[#0b0f1d]">Career Switcher</option>
              <option className="bg-[#0b0f1d]">Recruiter</option>
            </select>
          </div>

          <Button type="submit" loading={saving} icon={FiSave}>
            Save Changes
          </Button>
        </form>
      </motion.div>

      <div className="card p-6 sm:p-8 flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">Log out</p>
          <p className="text-sm text-slate-400 mt-0.5">
            End your current session on this device.
          </p>
        </div>
        <Button variant="danger" icon={FiLogOut} onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </div>
  );
}

export default Settings;
