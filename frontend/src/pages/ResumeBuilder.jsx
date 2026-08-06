import { useRef, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiEdit3,
  FiDownload,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import Button from "../components/Button";

const emptyExperience = () => ({
  id: crypto.randomUUID(),
  role: "",
  company: "",
  duration: "",
  description: "",
});

const emptyEducation = () => ({
  id: crypto.randomUUID(),
  degree: "",
  school: "",
  year: "",
});

function ResumeBuilder() {
  const previewRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    skills: "",
    experience: [emptyExperience()],
    education: [emptyEducation()],
  });

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateItem = (listKey, id, field, value) => {
    setForm((f) => ({
      ...f,
      [listKey]: f[listKey].map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = (listKey, factory) =>
    setForm((f) => ({ ...f, [listKey]: [...f[listKey], factory()] }));

  const removeItem = (listKey, id) =>
    setForm((f) => ({
      ...f,
      [listKey]: f[listKey].filter((item) => item.id !== id),
    }));

  const skillsArray = form.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    try {
      setDownloading(true);
      const [{ default: html2canvas }, { default: jsPDF }] =
        await Promise.all([import("html2canvas"), import("jspdf")]);

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${form.name || "resume"}.pdf`);
      toast.success("Resume downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 text-indigo-300 mb-3">
          <FiEdit3 size={20} />
          <span className="uppercase text-xs tracking-widest font-semibold">
            Resume Builder
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white font-display">
          Build a Clean, ATS-Friendly Resume
        </h1>
        <p className="text-slate-400 mt-3">
          Fill in your details on the left and watch the live preview update.
          Export straight to PDF when you're ready.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* FORM */}
        <div className="card p-6 sm:p-8 space-y-6 no-print">
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
            <input
              placeholder="Professional Title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
            <input
              placeholder="Location"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60 sm:col-span-2"
            />
          </div>

          <textarea
            rows={4}
            placeholder="Professional summary..."
            value={form.summary}
            onChange={(e) => update("summary", e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none"
          />

          <input
            placeholder="Skills (comma separated)"
            value={form.skills}
            onChange={(e) => update("skills", e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60"
          />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">
                Experience
              </h3>
              <button
                onClick={() => addItem("experience", emptyExperience)}
                className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
              >
                <FiPlus size={14} /> Add
              </button>
            </div>
            <div className="space-y-4">
              {form.experience.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-2 relative"
                >
                  <button
                    onClick={() => removeItem("experience", exp.id)}
                    className="absolute top-3 right-3 text-slate-500 hover:text-red-400"
                  >
                    <FiTrash2 size={14} />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      placeholder="Role"
                      value={exp.role}
                      onChange={(e) =>
                        updateItem("experience", exp.id, "role", e.target.value)
                      }
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
                    />
                    <input
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) =>
                        updateItem("experience", exp.id, "company", e.target.value)
                      }
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                  <input
                    placeholder="Duration (e.g. Jan 2023 - Present)"
                    value={exp.duration}
                    onChange={(e) =>
                      updateItem("experience", exp.id, "duration", e.target.value)
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                  <textarea
                    rows={2}
                    placeholder="Key achievements..."
                    value={exp.description}
                    onChange={(e) =>
                      updateItem(
                        "experience",
                        exp.id,
                        "description",
                        e.target.value
                      )
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">
                Education
              </h3>
              <button
                onClick={() => addItem("education", emptyEducation)}
                className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
              >
                <FiPlus size={14} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {form.education.map((edu) => (
                <div
                  key={edu.id}
                  className="bg-white/[0.03] border border-white/10 rounded-xl p-4 grid sm:grid-cols-3 gap-2 relative"
                >
                  <button
                    onClick={() => removeItem("education", edu.id)}
                    className="absolute top-3 right-3 text-slate-500 hover:text-red-400"
                  >
                    <FiTrash2 size={14} />
                  </button>
                  <input
                    placeholder="Degree"
                    value={edu.degree}
                    onChange={(e) =>
                      updateItem("education", edu.id, "degree", e.target.value)
                    }
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                  <input
                    placeholder="School"
                    value={edu.school}
                    onChange={(e) =>
                      updateItem("education", edu.id, "school", e.target.value)
                    }
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                  <input
                    placeholder="Year"
                    value={edu.year}
                    onChange={(e) =>
                      updateItem("education", edu.id, "year", e.target.value)
                    }
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleDownload}
            loading={downloading}
            icon={FiDownload}
            className="w-full"
          >
            {downloading ? "Preparing PDF..." : "Download as PDF"}
          </Button>
        </div>

        {/* LIVE PREVIEW */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:sticky lg:top-24"
        >
          <div
            ref={previewRef}
            className="bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-10 min-h-[600px]"
          >
            <h1 className="text-3xl font-bold">{form.name || "Your Name"}</h1>
            <p className="text-indigo-600 font-medium mt-1">
              {form.title || "Professional Title"}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {[form.email, form.phone, form.location]
                .filter(Boolean)
                .join("  •  ")}
            </p>

            {form.summary && (
              <div className="mt-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-2">
                  Summary
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {form.summary}
                </p>
              </div>
            )}

            {skillsArray.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-2">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skillsArray.map((s, i) => (
                    <span
                      key={i}
                      className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {form.experience.some((e) => e.role || e.company) && (
              <div className="mt-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-2">
                  Experience
                </h2>
                <div className="space-y-4 mt-2">
                  {form.experience.map(
                    (exp) =>
                      (exp.role || exp.company) && (
                        <div key={exp.id}>
                          <div className="flex justify-between items-baseline">
                            <p className="font-semibold text-sm">
                              {exp.role}{" "}
                              {exp.company && (
                                <span className="text-slate-500 font-normal">
                                  · {exp.company}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400">
                              {exp.duration}
                            </p>
                          </div>
                          {exp.description && (
                            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      )
                  )}
                </div>
              </div>
            )}

            {form.education.some((e) => e.degree || e.school) && (
              <div className="mt-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-2">
                  Education
                </h2>
                <div className="space-y-2 mt-2">
                  {form.education.map(
                    (edu) =>
                      (edu.degree || edu.school) && (
                        <div
                          key={edu.id}
                          className="flex justify-between items-baseline"
                        >
                          <p className="text-sm font-medium">
                            {edu.degree}{" "}
                            {edu.school && (
                              <span className="text-slate-500 font-normal">
                                · {edu.school}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{edu.year}</p>
                        </div>
                      )
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ResumeBuilder;
