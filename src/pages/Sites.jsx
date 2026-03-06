import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, MapPin, X, Edit, Trash2 } from "lucide-react";

export default function Sites() {
  const [_officer, setOfficerState] = useState(null);
  const [sites, setSites] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (stored) {
      const o = JSON.parse(stored);
      setOfficerState(o);
      loadData(o);
    }
  }, []);

  const loadData = async (o) => {
    setLoading(true);
    const cc = o?.company_code;
    const [s, supervisors] = await Promise.all([
      cc ? base44.entities.Site.filter({ company_code: cc }, "name", 100) : base44.entities.Site.list("name", 100),
      cc ? base44.entities.Officer.filter({ company_code: cc }, "full_name", 200) : base44.entities.Officer.filter({}, "full_name", 200),
    ]);
    setSites(s);
    setOfficers(supervisors.filter(o => ["supervisor", "admin"].includes(o.role)));
    setLoading(false);
  };

  const openCreate = () => { setSelected(null); setForm({ status: "active", company_code: _officer?.company_code }); setShowModal(true); };
  const openEdit = (s) => { setSelected(s); setForm({ ...s }); setShowModal(true); };

  const handleSave = async () => {
    if (selected) await base44.entities.Site.update(selected.id, form);
    else await base44.entities.Site.create(form);
    setShowModal(false);
    loadData(_officer);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading sites...</p></div>;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Add Site
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sites.map(s => (
          <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-blue-700 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <MapPin className="w-5 h-5 text-blue-400" />
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${s.status === "active" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>{s.status}</span>
                <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="text-gray-500 hover:text-white"><Edit className="w-4 h-4" /></button>
                {_officer?.role === "admin" && (
                  <button onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm(`Delete site "${s.name}"?`)) return;
                    await base44.entities.Site.delete(s.id);
                    loadData(_officer);
                  }} className="text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
            <h3 className="text-white font-bold">{s.name}</h3>
            <p className="text-gray-400 text-sm mt-1">{s.address}{s.city ? `, ${s.city}` : ""}</p>
            {s.client_name && <p className="text-gray-500 text-xs mt-2">Client: {s.client_name}</p>}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold">{selected ? "Edit Site" : "New Site"}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[["name", "Site Name"], ["address", "Address"], ["city", "City"], ["state", "State"], ["zip", "ZIP"], ["client_name", "Client Name"], ["client_contact", "Client Contact"], ["client_phone", "Client Phone"]].map(([key, label]) => (
                <div key={key}>
                  <label className="text-gray-400 text-sm block mb-1">{label}</label>
                  <input value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div>
                <label className="text-gray-400 text-sm block mb-1">Supervisor</label>
                <select value={form.supervisor_id || ""} onChange={e => setForm(f => ({ ...f, supervisor_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  <option value="">None</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Status</label>
                <select value={form.status || "active"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}