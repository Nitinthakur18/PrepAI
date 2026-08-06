import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FiMail, FiLock, FiZap, FiArrowRight } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/25 blur-[150px] rounded-full" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] w-[450px] h-[450px] bg-cyan-500/15 blur-[150px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card w-full max-w-md p-8 sm:p-10 relative z-10"
      >
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <FiZap className="text-white" size={20} />
          </div>
          <span className="font-display font-bold text-xl text-white">
            Prep<span className="text-gradient">AI</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white font-display">
          Welcome back
        </h1>
        <p className="text-slate-400 text-sm mt-1.5 mb-8">
          Log in to continue optimizing your job search.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <FiMail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email address"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50 transition"
            />
          </div>

          <div className="relative">
            <FiLock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50 transition"
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full py-3.5 mt-2"
            icon={FiArrowRight}
          >
            Log In
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-8">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-indigo-300 hover:text-indigo-200 font-semibold"
          >
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default Login;
