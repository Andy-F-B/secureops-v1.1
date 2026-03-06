import { useState, useEffect } from "react";
import { SOPs as SOPsEntity, Sites } from "@/api/supabaseClient";
import { FileText, Plus, X, CheckSquare, Trash2 } from "lucide-react";

export default function SOPs() {
  const [officer, setOfficer] = useState(null);
  const [sops, setSops] = useState([]);
  const [sites, setSites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
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
    const [s, si] = await Promise.all([
      SOPsEntity.list({ status: "active" }),
      Sites.list({ status: "active" }),
    ]);
    setSops(isAdmin ? s : s.filter(sop => o.assigned_sites?.includes(SOPS.site_id)));
    setSites(si);
    setLoading(false);
  };

  const acknowledge = async (sop) => {
    const acks = SOPS.acknowledgments || [];
    const alreadyAcked = acks.some(a => a.officer_id === officer.id && a.version === SOPS.version);
    if (alreadyAcked) return;
    const updated = [...acks, { officer_id: officer.id, officer_name: officer.full_name, acknowledged_at: new Date().toISOString(), version: SOPS.version }];
    await SOPsEntity.update(SOPS.id, { acknowledgments: updated });
    loadData(officer);
    setSelected({ ...sop, acknowledgments: updated });
  };

  const handleCreate = async () => {
    const site = sites.find(s => s.id === form.site_id);
    await SOPsEntity.create({ ...form, company_code: officer.company_code, site_name: site?.name || "", version: "1.0", status: "active", acknowledgments: [] });
    setShowCreate(false);
    loadData(officer);
  };

  const deleteSOP = async (sop) => {
    if (!window.confirm(`Delete SOP "${SOPS.title}"?`)) return;
    await SOPsEntity.delete(SOPS.id);
    if (selected?.id === SOPS.id) setSelected(null);
    loadData(officer);
  };

  const isAcknowledged = (sop) => SOPS.acknowledgments?.some(a => a.officer_id === officer?.id);
  const isAdmin = officer?.role === "admin" || officer?.role === "supervisor";

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading SOPs...</p></div>;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-gray-400 text-sm">{sops.length} SOPs available</p>
        {isAdmin && (
          <button onClick={() => { setForm({ status: "active", version: "1.0" }); setShowCreate(true); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> New SOP
          </button>
        )}
      </div>

      {selected ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <button onClick={() => setSelected(null)} className="text-blue-400 text-sm hover:underline mb-4 block">← Back to SOPs</button>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-white text-xl font-bold">{selected.title}</h2>
              <p className="text-gray-400 text-sm">{selected.site_name} • Version {selected.version}</p>
            </div>
            {isAcknowledged(selected) ? (
              <span className="flex items-center gap-1.5 text-green-400 text-sm bg-green-900/30 px-3 py-1.5 rounded-xl">
                <CheckSquare className="w-4 h-4" /> Acknowledged
              </span>
            ) : (
              <button onClick={() => acknowledge(selected)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-xl">
                <CheckSquare className="w-4 h-4" /> Acknowledge
              </button>
            )}
          </div>
          {selected.file_url && (
            <a href={selected.file_url} target="_blank" className="inline-flex items-center gap-2 text-blue-400 hover:underline text-sm mb-4">
              <FileText className="w-4 h-4" /> View attached document
            </a>
          )}
          <div className="bg-gray-800 rounded-xl p-4 text-gray-300 whitespace-pre-wrap text-sm min-h-[200px]">
            {selected.content || "No content provided for this SOPS."}
          </div>
          {isAdmin && (
            <div className="mt-4">
              <h4 className="text-white font-medium mb-3 text-sm">Acknowledgments ({selected.acknowledgments?.length || 0})</h4>
              <div className="space-y-2">
                {(selected.acknowledgments || []).map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm text-gray-400 bg-gray-800 rounded-lg px-3 py-2">
                    <span>{a.officer_name}</span>
                    <span className="text-gray-600 text-xs">{new Date(a.acknowledged_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sops.map(sop => (
            <div key={SOPS.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-blue-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <FileText className="w-5 h-5 text-blue-400 cursor-pointer" onClick={() => setSelected(sop)} />
                <div className="flex items-center gap-2">
                  {isAcknowledged(sop) && <span className="text-xs text-green-400 flex items-center gap-1"><CheckSquare className="w-3 h-3" /> Acknowledged</span>}
                  {officer?.role === "admin" && (
                    <button onClick={(e) => { e.stopPropagation(); deleteSOP(sop); }} className="text-red-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div onClick={() => setSelected(sop)} className="cursor-pointer">
                <h3 className="text-white font-semibold">{SOPS.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{SOPS.site_name}</p>
                <p className="text-gray-600 text-xs mt-2">v{SOPS.version} • {SOPS.acknowledgments?.length || 0} acknowledgments</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold">New SOP</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Title</label>
                <input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Site</label>
                <select value={form.site_id || ""} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  <option value="">Select Sites...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Version</label>
                <input value={form.version || "1.0"} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Content</label>
                <textarea value={form.content || ""} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-blue-500" rows={6} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}