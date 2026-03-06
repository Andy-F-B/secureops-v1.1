import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Award, Plus, X, Upload, AlertTriangle, Check, Trash2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const CERT_TYPES = ["guard_license", "cpr", "armed", "first_aid", "other"];

export default function Certifications() {
  const [officer, setOfficer] = useState(null);
  const [certs, setCerts] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (stored) {
      const o = JSON.parse(stored);
      setOfficer(o);
      loadData(o);
    }
  }, []);

  const loadData = async (o) => {
    setLoading(true);
    const isAdmin = o.role === "admin" || o.role === "supervisor";
    const [c, of] = await Promise.all([
      isAdmin ? base44.entities.Certification.list("-created_date", 200) : base44.entities.Certification.filter({ officer_id: o.id }, "-created_date"),
      isAdmin ? base44.entities.Officer.filter({ status: "active" }, "full_name") : Promise.resolve([]),
    ]);
    setCerts(c);
    setOfficers(of);
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, file_url }));
    setUploading(false);
  };

  const handleCreate = async () => {
    await base44.entities.Certification.create({
      ...form,
      officer_id: officer.id,
      officer_name: officer.full_name,
      status: "pending",
    });
    setShowModal(false);
    loadData(officer);
  };

  const approveOrReject = async (cert, status) => {
    await base44.entities.Certification.update(cert.id, { status, approved_by: officer.full_name });
    loadData(officer);
  };

  const deleteCert = async (cert) => {
    if (!window.confirm(`Delete certification "${cert.title || cert.type}"?`)) return;
    await base44.entities.Certification.delete(cert.id);
    loadData(officer);
  };

  const getDaysUntilExpiry = (date) => date ? differenceInDays(new Date(date), new Date()) : null;

  const isAdmin = officer?.role === "admin" || officer?.role === "supervisor";

  const filtered = certs.filter(c => {
    if (filter === "expiring") {
      const days = getDaysUntilExpiry(c.expiration_date);
      return days !== null && days <= 30 && days >= 0;
    }
    if (filter === "pending") return c.status === "pending";
    if (filter === "expired") {
      const days = getDaysUntilExpiry(c.expiration_date);
      return days !== null && days < 0;
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading certifications...</p></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["all", "pending", "expiring", "expired"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`text-sm px-3 py-1.5 rounded-lg capitalize ${filter === f ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 border border-gray-800 hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => { setForm({ type: "guard_license" }); setShowModal(true); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Upload Cert
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(cert => {
          const days = getDaysUntilExpiry(cert.expiration_date);
          const isExpiringSoon = days !== null && days <= 30 && days >= 0;
          const isExpired = days !== null && days < 0;
          return (
            <div key={cert.id} className={`bg-gray-900 border rounded-2xl p-5 ${
              isExpired ? "border-red-800" : isExpiringSoon ? "border-yellow-800" : "border-gray-800"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <Award className={`w-5 h-5 ${
                  cert.status === "approved" ? "text-green-400" :
                  cert.status === "rejected" ? "text-red-400" : "text-yellow-400"
                }`} />
                <span className={`text-xs px-2 py-1 rounded-full ${
                  cert.status === "approved" ? "bg-green-900/50 text-green-400" :
                  cert.status === "rejected" ? "bg-red-900/50 text-red-400" :
                  cert.status === "expired" ? "bg-gray-700 text-gray-400" : "bg-yellow-900/50 text-yellow-400"
                }`}>{cert.status}</span>
              </div>
              <h3 className="text-white font-semibold">{cert.title || cert.type?.replace("_", " ")}</h3>
              {isAdmin && <p className="text-gray-400 text-sm mt-1">{cert.officer_name}</p>}
              <p className="text-gray-500 text-xs mt-1 capitalize">{cert.type?.replace(/_/g, " ")}</p>
              {cert.expiration_date && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${isExpired ? "text-red-400" : isExpiringSoon ? "text-yellow-400" : "text-gray-500"}`}>
                  {(isExpiringSoon || isExpired) && <AlertTriangle className="w-3 h-3" />}
                  {isExpired ? `Expired ${Math.abs(days)}d ago` : `Expires in ${days}d (${cert.expiration_date})`}
                </div>
              )}
              {cert.file_url && (
                <a href={cert.file_url} target="_blank" className="text-blue-400 text-xs hover:underline mt-2 block">View document</a>
              )}
              {isAdmin && cert.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => approveOrReject(cert, "approved")} className="flex-1 bg-green-800 hover:bg-green-700 text-green-300 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" /> Approve
                  </button>
                  <button onClick={() => approveOrReject(cert, "rejected")} className="flex-1 bg-red-900/50 hover:bg-red-800 text-red-400 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <X className="w-3 h-3" /> Reject
                  </button>
                </div>
              )}
              {officer?.role === "admin" && (
                <button onClick={() => deleteCert(cert)} className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-red-500 hover:text-red-400 py-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold">Upload Certification</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Type</label>
                <select value={form.type || ""} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  {CERT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Title / License Number</label>
                <input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Issue Date</label>
                  <input type="date" value={form.issue_date || ""} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Expiration Date</label>
                  <input type="date" value={form.expiration_date || ""} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Document</label>
                <label className="flex items-center gap-2 cursor-pointer bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 hover:border-blue-500">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">{uploading ? "Uploading..." : form.file_url ? "File uploaded ✓" : "Choose file..."}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={uploading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm disabled:opacity-50">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}