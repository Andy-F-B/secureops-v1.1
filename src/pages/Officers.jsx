import { useState, useEffect } from "react";
import { Officers as OfficersEntity, Sites, Certifications, ClockRecords } from "@/api/supabaseClient";
import { Plus, Search, X, Phone, Mail, Shield, FileText, Award, Trash2 } from "lucide-react";
import OfficerRecordTab from "../components/officers/OfficerRecordTab";

const ROLES = ["officer", "supervisor", "admin"];
const STATUSES = ["active", "inactive", "suspended"];

const certStatusColor = {
  approved: "text-green-400",
  pending: "text-yellow-400",
  rejected: "text-red-400",
  expired: "text-gray-500",
};

export default function Officers() {
  const [officer, setOfficer] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState("info");
  const [certifications, setCertifications] = useState([]);
  const [clockRecords, setClockRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState("active");

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (stored) {
      const o = JSON.parse(stored);
      setOfficer(o);
      loadOfficers(o);
    }
  }, []);

  const loadOfficers = async (o) => {
    setLoading(true);
    const cc = o?.company_code;
    const [of, s] = await Promise.all([
      OfficersEntity.list({ company_code: cc }),
      Sites.list({ status: "active", company_code: cc }),
    ]);
    setOfficers(of);
    setSites(s);
    setLoading(false);
  };

  const openCreate = () => {
    setSelected(null);
    setForm({ role: "officer", status: "active", assigned_sites: [], company_code: officer?.company_code });
    setTab("info");
    setCertifications([]);
    setClockRecords([]);
    setShowModal(true);
  };

  const openEdit = async (o) => {
    setSelected(o);
    setForm({ ...o });
    setTab("info");
    setShowModal(true);
    const [certs, cr] = await Promise.all([
      Certifications.list({ officer_id: o.id }),
      ClockRecords.list({ officer_id: o.id }),
    ]);
    setCertifications(certs);
    setClockRecords(cr);
  };

  const handleSave = async () => {
    if (selected) {
      await OfficersEntity.update(selected.id, form);
    } else {
      await OfficersEntity.create(form);
    }
    setShowModal(false);
    loadOfficers(officer);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete officer "${selected.full_name}"? This cannot be undone.`)) return;
    await OfficersEntity.delete(selected.id);
    setShowModal(false);
    loadOfficers(officer);
  };

  const handleTerminate = () => {
    loadOfficers(officer);
    setShowModal(false);
  };

  const activeOfficers = officers.filter(o => ["active", "suspended"].includes(o.status));
  const terminatedOfficers = officers.filter(o => o.status === "inactive");

  const filterList = (list) => list.filter(o =>
    o.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    o.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalHours = clockRecords.reduce((s, r) => s + (r.total_hours || 0), 0);
  const displayList = sectionFilter === "active" ? filterList(activeOfficers) : filterList(terminatedOfficers);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading officers...</p></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search officers..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Add Officer
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        <button onClick={() => setSectionFilter("active")} className={`text-sm px-4 py-1.5 rounded-lg ${sectionFilter === "active" ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"}`}>
          Active ({activeOfficers.length})
        </button>
        <button onClick={() => setSectionFilter("terminated")} className={`text-sm px-4 py-1.5 rounded-lg ${sectionFilter === "terminated" ? "bg-red-700 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"}`}>
          Terminated ({terminatedOfficers.length})
        </button>
      </div>

      {sectionFilter === "terminated" && terminatedOfficers.length === 0 && (
        <p className="text-gray-500 text-sm">No terminated officers.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayList.map(o => (
          <div key={o.id} onClick={() => openEdit(o)} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-blue-700 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${o.status === "inactive" ? "bg-gray-700" : "bg-blue-800"}`}>
                {o.full_name?.charAt(0)}
              </div>
              <div>
                <p className="text-white font-semibold">{o.full_name}</p>
                <p className="text-gray-500 text-xs">{o.employee_id} • {o.rank || o.role}</p>
              </div>
              <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                o.status === "active" ? "bg-green-900/50 text-green-400" :
                o.status === "suspended" ? "bg-red-900/50 text-red-400" :
                "bg-gray-700 text-gray-400"
              }`}>{o.status}</span>
            </div>
            <div className="text-gray-500 text-xs space-y-1">
              {o.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {o.email}</p>}
              {o.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {o.phone}</p>}
              <p className="flex items-center gap-1"><Shield className="w-3 h-3" /> <span className="capitalize">{o.role}</span></p>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold">{selected ? "Edit Officer" : "Add Officer"}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 overflow-x-auto">
              {[
                { key: "info", label: "Profile" },
                { key: "emergency", label: "Emergency Contact" },
                { key: "hours", label: "Hours" },
                ...(selected ? [{ key: "certifications", label: "Certifications" }, { key: "record", label: "Record" }] : []),
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-sm whitespace-nowrap flex items-center gap-1.5 ${tab === t.key ? "text-blue-400 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
                  {t.key === "certifications" && <Award className="w-3.5 h-3.5" />}
                  {t.key === "record" && <FileText className="w-3.5 h-3.5" />}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {tab === "info" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} />
                    <Field label="Employee ID" value={form.employee_id} onChange={v => setForm(f => ({ ...f, employee_id: v }))} />
                    <Field label="PIN" value={form.pin} onChange={v => setForm(f => ({ ...f, pin: v }))} placeholder="Set PIN" />
                    <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                    <Field label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                    <Field label="Rank" value={form.rank} onChange={v => setForm(f => ({ ...f, rank: v }))} />
                    <Field label="Hire Date" value={form.hire_date} onChange={v => setForm(f => ({ ...f, hire_date: v }))} type="date" />
                    <div>
                      <label className="text-gray-400 text-sm block mb-1">Role</label>
                      <select value={form.role || "officer"} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm block mb-1">Status</label>
                      <select value={form.status || "active"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <Field label="Address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
                  <Field label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
                </>
              )}

              {tab === "emergency" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Contact Name" value={form.emergency_contact_name} onChange={v => setForm(f => ({ ...f, emergency_contact_name: v }))} />
                  <Field label="Contact Phone" value={form.emergency_contact_phone} onChange={v => setForm(f => ({ ...f, emergency_contact_phone: v }))} />
                  <Field label="Relationship" value={form.emergency_contact_relation} onChange={v => setForm(f => ({ ...f, emergency_contact_relation: v }))} />
                </div>
              )}

              {tab === "hours" && selected && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-blue-400">{totalHours.toFixed(1)}</p>
                      <p className="text-gray-400 text-sm">Total Hours</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-green-400">{clockRecords.filter(r => r.status === "approved").length}</p>
                      <p className="text-gray-400 text-sm">Approved Shifts</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {clockRecords.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl text-sm">
                        <div>
                          <p className="text-white">{r.site_name}</p>
                          <p className="text-gray-400 text-xs">{r.clock_in_time ? new Date(r.clock_in_time).toLocaleDateString() : "–"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white">{r.total_hours?.toFixed(1) || "–"} hrs</p>
                          <span className={`text-xs ${r.status === "approved" ? "text-green-400" : "text-gray-500"}`}>{r.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "certifications" && selected && (
                <div className="space-y-3">
                  {certifications.length === 0 && <p className="text-gray-500 text-sm text-center py-6">No certifications on file.</p>}
                  {certifications.map(c => (
                    <div key={c.id} className="bg-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium text-sm">{c.title || c.type}</p>
                          <p className="text-gray-500 text-xs mt-1 capitalize">{c.type?.replace("_", " ")}</p>
                        </div>
                        <span className={`text-xs font-medium capitalize ${certStatusColor[c.status] || "text-gray-400"}`}>{c.status}</span>
                      </div>
                      <div className="flex justify-between mt-3 text-xs text-gray-500">
                        <span>Issued: {c.issue_date || "–"}</span>
                        <span>Expires: {c.expiration_date || "–"}</span>
                      </div>
                      {c.file_url && (
                        <a href={c.file_url} target="_blank" rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1 text-blue-400 text-xs hover:underline">
                          <FileText className="w-3 h-3" /> View Document
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tab === "record" && selected && (
                <OfficerRecordTab
                  officerId={selected.id}
                  officerName={selected.full_name}
                  onTerminate={handleTerminate}
                />
              )}
            </div>

            {tab !== "record" && (
              <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-800">
                <div>
                  {selected && officer?.role === "admin" && (
                    <button onClick={handleDelete}
                      className="flex items-center gap-1 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl text-sm">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
                  <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm">Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="text-gray-400 text-sm block mb-1">{label}</label>
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
    </div>
  );
}