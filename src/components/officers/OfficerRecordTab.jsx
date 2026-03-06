import { useState, useEffect } from "react";
import { OfficerRecords, Officers, uploadFile, getSignedUrl } from "@/api/supabaseClient";
import { Plus, X, FileText, Upload, Loader2 } from "lucide-react";

const RECORD_TYPES = [
  { value: "commendation", label: "Commendation", color: "text-green-400 bg-green-900/30" },
  { value: "written_warning", label: "Written Warning", color: "text-yellow-400 bg-yellow-900/30" },
  { value: "infraction", label: "Infraction", color: "text-orange-400 bg-orange-900/30" },
  { value: "final_notice", label: "Final Notice of Conduct", color: "text-red-400 bg-red-900/30" },
  { value: "promotion", label: "Promotion", color: "text-blue-400 bg-blue-900/30" },
  { value: "suspension", label: "Suspension", color: "text-purple-400 bg-purple-900/30" },
  { value: "termination", label: "Termination", color: "text-red-600 bg-red-900/50" },
];

export default function OfficerRecordTab({ officerId, officerName, companyCode, onTerminate }) {
  const [records, setRecords] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "commendation", date: new Date().toISOString().split("T")[0], written_by: "", reason: "" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [officerId]);

  const loadRecords = async () => {
    setLoading(true);
    const r = await OfficerRecords.list({ officer_id: officerId });
    setRecords(r);
    setLoading(false);
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${officerId}/${Date.now()}.${ext}`;
    const storagePath = await uploadFile("officer-records", file, path);
    setForm(f => ({ ...f, document_path: storagePath }));
    setUploading(false);
  };

  const handleViewDocument = async (path) => {
    const url = await getSignedUrl("officer-records", path);
    window.open(url, "_blank");
  };

  const handleSave = async () => {
    setSaving(true);
    await OfficerRecords.create({
      ...form,
      officer_id: officerId,
      officer_name: officerName,
      company_code: companyCode,
      document_url: form.document_path || null,
    });

    if (form.type === "termination") {
      await Officers.update(officerId, { status: "inactive" });
      onTerminate && onTerminate();
    }

    setShowAdd(false);
    setForm({ type: "commendation", date: new Date().toISOString().split("T")[0], written_by: "", reason: "" });
    setSaving(false);
    loadRecords();
  };

  const getTypeInfo = (type) => RECORD_TYPES.find(t => t.value === type) || RECORD_TYPES[0];

  if (loading) return <div className="text-gray-500 text-sm py-4">Loading records...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      {records.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-6">No records on file.</p>
      )}

      <div className="space-y-3">
        {records.map(r => {
          const info = getTypeInfo(r.type);
          return (
            <div key={r.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${info.color}`}>{info.label}</span>
                <span className="text-gray-500 text-xs">{r.date}</span>
              </div>
              {r.reason && <p className="text-gray-300 text-sm mt-2">{r.reason}</p>}
              <div className="flex items-center justify-between mt-3">
                <p className="text-gray-500 text-xs">{r.written_by ? `By: ${r.written_by}` : ""}</p>
                {r.document_url && (
                  <button onClick={() => handleViewDocument(r.document_url)}
                    className="flex items-center gap-1 text-blue-400 text-xs hover:underline">
                    <FileText className="w-3 h-3" /> View Document
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Record Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold">Add Record</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Record Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  {RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Written By</label>
                <input type="text" value={form.written_by || ""} onChange={e => setForm(f => ({ ...f, written_by: e.target.value }))}
                  placeholder="Name of issuing officer/supervisor"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Reason / Details</label>
                <textarea value={form.reason || ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Describe the reason for this record..."
                  rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Document (optional)</label>
                {form.document_path ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleViewDocument(form.document_path)} className="text-blue-400 text-sm flex items-center gap-1 hover:underline">
                      <FileText className="w-4 h-4" /> Document uploaded
                    </button>
                    <button onClick={() => setForm(f => ({ ...f, document_path: null }))} className="text-gray-500 hover:text-red-400 text-xs">Remove</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-700 rounded-lg px-4 py-3 hover:border-blue-600 transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
                    <span className="text-gray-500 text-sm">{uploading ? "Uploading..." : "Click to upload document"}</span>
                    <input type="file" className="hidden" disabled={uploading}
                      onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  </label>
                )}
              </div>

              {form.type === "termination" && (
                <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm font-medium">⚠️ Warning: This will set the officer's status to inactive and move them to the terminated section.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm flex items-center gap-2">
                {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
