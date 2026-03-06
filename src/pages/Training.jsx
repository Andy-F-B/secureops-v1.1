import { useState, useEffect } from "react";
import { TrainingModules, uploadFile, getSignedUrl } from "@/api/supabaseClient";
import { Plus, Video, FileText, Brain, BookOpen, Upload, X, Play, Trash2 } from "lucide-react";
import { createPageUrl } from "@/utils";

const TYPE_ICONS = { video: Video, document: FileText, quiz: Brain, article: BookOpen };
const TYPE_COLORS = { video: "text-blue-400 bg-blue-900/30", document: "text-yellow-400 bg-yellow-900/30", quiz: "text-purple-400 bg-purple-900/30", article: "text-green-400 bg-green-900/30" };

export default function Training() {
  const [officer, setOfficer] = useState(null);
  const [modules, setModules] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", type: "video", is_required: true, visible_to: ["admin", "hr"], status: "active" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (!stored) { window.location.href = createPageUrl("OfficerLogin"); return; }
    const o = JSON.parse(stored);
    setOfficer(o);
    if (!["admin", "hr"].includes(o.role)) { window.location.href = createPageUrl("Dashboard"); return; }
    loadModules(o);
  }, []);

  const loadModules = async (o) => {
    const mods = await TrainingModules.list({ company_code: o.company_code });
    setModules(mods);
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${officer.company_code}/${Date.now()}.${ext}`;
    const storagePath = await uploadFile("sop-files", file, path);
    setForm(f => ({ ...f, content_path: storagePath }));
    setUploading(false);
  };

  const handleViewContent = async (path) => {
    const url = await getSignedUrl("sop-files", path);
    window.open(url, "_blank");
  };

  const handleSave = async () => {
    setSaving(true);
    if (selected) {
      await TrainingModules.update(selected.id, form);
    } else {
      await TrainingModules.create({ ...form, company_code: officer.company_code, order: modules.length + 1 });
    }
    setSaving(false);
    setShowCreate(false);
    setSelected(null);
    setForm({ title: "", description: "", type: "video", is_required: true, visible_to: ["admin", "hr"], status: "active" });
    loadModules(officer);
  };

  const handleDelete = async (mod) => {
    await TrainingModules.delete(mod.id);
    loadModules(officer);
  };

  const openEdit = (mod) => {
    setSelected(mod);
    setForm({ ...mod });
    setShowCreate(true);
  };

  const toggleVisibility = (role) => {
    const curr = form.visible_to || [];
    setForm(f => ({ ...f, visible_to: curr.includes(role) ? curr.filter(r => r !== role) : [...curr, role] }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">Training Modules</h2>
          <p className="text-gray-500 text-sm">Manage training content, videos, quizzes, and documents</p>
        </div>
        <button onClick={() => { setSelected(null); setForm({ title: "", description: "", type: "video", is_required: true, visible_to: ["admin", "hr"], status: "active" }); setShowCreate(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Add Module
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map(mod => {
          const Icon = TYPE_ICONS[mod.type] || FileText;
          const colorClass = TYPE_COLORS[mod.type] || "text-gray-400 bg-gray-800";
          return (
            <div key={mod.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(mod)} className="text-gray-500 hover:text-white text-xs px-2 py-1 rounded-lg border border-gray-700 hover:border-gray-500">Edit</button>
                  <button onClick={() => handleDelete(mod)} className="text-gray-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-white font-semibold">{mod.title}</h3>
              <p className="text-gray-400 text-xs mt-1">{mod.description}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${colorClass}`}>{mod.type}</span>
                {mod.is_required && <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">Required</span>}
                {mod.duration_minutes && <span className="text-xs text-gray-500">{mod.duration_minutes}min</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(mod.visible_to || []).map(role => (
                  <span key={role} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{role}</span>
                ))}
              </div>
              {mod.content_path && (
                <button onClick={() => handleViewContent(mod.content_path)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 hover:underline">
                  <Play className="w-3 h-3" /> View Content
                </button>
              )}
            </div>
          );
        })}
        {modules.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-600">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No training modules yet. Add one to get started.</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold">{selected ? "Edit Module" : "New Training Module"}</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Description</label>
                <textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="quiz">Quiz</option>
                  <option value="article">Article</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Duration (minutes)</label>
                <input type="number" value={form.duration_minutes || ""} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              {form.type === "article" && (
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Article Content</label>
                  <textarea value={form.content_text || ""} onChange={e => setForm(f => ({ ...f, content_text: e.target.value }))} rows={5}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none text-sm resize-none" />
                </div>
              )}
              <div>
                <label className="text-gray-400 text-sm block mb-2">Upload File {form.type === "video" ? "(MP4, MOV)" : "(PDF, DOC)"}</label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400 text-sm">{uploading ? "Uploading..." : form.content_path ? "File uploaded ✓ — Replace?" : "Click to upload"}</span>
                  <input type="file" className="hidden" disabled={uploading}
                    accept={form.type === "video" ? "video/*" : ".pdf,.doc,.docx,.jpg,.png"}
                    onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                </label>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Visible to (roles)</label>
                <div className="flex flex-wrap gap-2">
                  {["admin", "hr", "officer", "candidate"].map(role => (
                    <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={(form.visible_to || []).includes(role)} onChange={() => toggleVisibility(role)} className="accent-blue-500" />
                      <span className="text-gray-300 text-sm capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="required" checked={form.is_required} onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} className="accent-blue-500" />
                <label htmlFor="required" className="text-gray-300 text-sm">Required module</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.title} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm disabled:opacity-50">
                {saving ? "Saving..." : "Save Module"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
