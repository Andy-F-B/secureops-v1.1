import { useState, useEffect } from "react";
import { ClockRecords, Officers as OfficersEntity, Sites, AuditLog } from "@/api/supabaseClient";
import { Edit2, Check, X, Download } from "lucide-react";
import { format } from "date-fns";

export default function Timesheets() {
  const [officer, setOfficer] = useState(null);
  const [records, setRecords] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [sites, setSites] = useState([]);
  const [filters, setFilters] = useState({ officerId: "", siteId: "", dateFrom: "", dateTo: "", status: "" });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
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
    const cc = o?.company_code;
    const [cr, of, si] = await Promise.all([
      ClockRecords.list({ company_code: cc }),
      OfficersEntity.list({ status: "active", company_code: cc }),
      Sites.list({ company_code: cc }),
    ]);
    setRecords(cr);
    setOfficers(of);
    setSites(si);
    setLoading(false);
  };

  const startEdit = (r) => {
    setEditId(r.id);
    setEditForm({
      clock_in_time: r.clock_in_time ? r.clock_in_time.slice(0, 16) : "",
      clock_out_time: r.clock_out_time ? r.clock_out_time.slice(0, 16) : "",
      notes: r.notes || "",
      status: r.status || "clocked_out",
    });
  };

  const saveEdit = async (r) => {
    const inT = new Date(editForm.clock_in_time);
    const outT = editForm.clock_out_time ? new Date(editForm.clock_out_time) : null;
    const total_hours = outT ? Math.round((outT - inT) / 36000) / 100 : r.total_hours;

    const updated = { ...editForm, total_hours, clock_in_time: inT.toISOString(), clock_out_time: outT?.toISOString() };
    await ClockRecords.update(r.id, updated);

    await AuditLog.create({
      company_code: OfficersEntity.company_code,
      entity_type: "ClockRecord", entity_id: r.id, action: "update",
      changed_by: OfficersEntity.id, changed_by_name: OfficersEntity.full_name,
      changes: JSON.stringify({ before: { clock_in_time: r.clock_in_time, clock_out_time: r.clock_out_time }, after: editForm }),
      timestamp: new Date().toISOString(),
    });

    setEditId(null);
    loadData(officer);
  };

  const approveRecord = async (r) => {
    await ClockRecords.update(r.id, { status: "approved", approved_by: OfficersEntity.full_name, approved_at: new Date().toISOString() });
    await AuditLog.create({
      company_code: OfficersEntity.company_code,
      entity_type: "ClockRecord", entity_id: r.id, action: "approve",
      changed_by: OfficersEntity.id, changed_by_name: OfficersEntity.full_name,
      changes: JSON.stringify({ status: "approved" }),
      timestamp: new Date().toISOString(),
    });
    loadData(officer);
  };

  const filtered = records.filter(r => {
    if (filters.officerId && r.officer_id !== filters.officerId) return false;
    if (filters.siteId && r.site_id !== filters.siteId) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.dateFrom && r.clock_in_time < filters.dateFrom) return false;
    if (filters.dateTo && r.clock_in_time > filters.dateTo + "T23:59") return false;
    return true;
  });

  const totalHours = filtered.reduce((s, r) => s + (r.total_hours || 0), 0);

  const exportCSV = () => {
    const rows = [["Officer", "Site", "Clock In", "Clock Out", "Hours", "Status", "Flags"]];
    filtered.forEach(r => rows.push([
      r.officer_name, r.site_name,
      r.clock_in_time ? format(new Date(r.clock_in_time), "yyyy-MM-dd HH:mm") : "",
      r.clock_out_time ? format(new Date(r.clock_out_time), "yyyy-MM-dd HH:mm") : "",
      r.total_hours?.toFixed(2) || "",
      r.status, (r.flags || []).join(", ")
    ]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "timesheets.csv";
    a.click();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading timesheets...</p></div>;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SCard label="Total Records" value={filtered.length} />
        <SCard label="Total Hours" value={totalHours.toFixed(1) + "h"} />
        <SCard label="Approved" value={filtered.filter(r => r.status === "approved").length} />
        <SCard label="Pending" value={filtered.filter(r => r.status === "clocked_out").length} />
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={filters.officerId} onChange={e => setFilters(f => ({ ...f, officerId: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">All Officers</option>
            {officers.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
          </select>
          <select value={filters.siteId} onChange={e => setFilters(f => ({ ...f, siteId: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">All Sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          <div className="flex gap-2">
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">All Status</option>
              <option value="clocked_in">Active</option>
              <option value="clocked_out">Clocked Out</option>
              <option value="approved">Approved</option>
              <option value="missed">Missed</option>
            </select>
            <button onClick={exportCSV} className="bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800 bg-gray-900/80">
                <th className="text-left px-4 py-3">Officer</th>
                <th className="text-left px-4 py-3">Site</th>
                <th className="text-left px-4 py-3">Clock In</th>
                <th className="text-left px-4 py-3">Clock Out</th>
                <th className="text-left px-4 py-3">Hours</th>
                <th className="text-left px-4 py-3">Flags</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  {editId === r.id ? (
                    <>
                      <td className="px-4 py-2 text-white">{r.officer_name}</td>
                      <td className="px-4 py-2 text-gray-400">{r.site_name}</td>
                      <td className="px-4 py-2">
                        <input type="datetime-local" value={editForm.clock_in_time} onChange={e => setEditForm(f => ({ ...f, clock_in_time: e.target.value }))}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs w-36" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="datetime-local" value={editForm.clock_out_time} onChange={e => setEditForm(f => ({ ...f, clock_out_time: e.target.value }))}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs w-36" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes"
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs w-24" />
                      </td>
                      <td colSpan={2}></td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(r)} className="p-1 bg-green-700 hover:bg-green-600 text-white rounded"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setEditId(null)} className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-white font-medium">{r.officer_name}</td>
                      <td className="px-4 py-3 text-gray-400">{r.site_name}</td>
                      <td className="px-4 py-3 text-gray-300 text-xs">{r.clock_in_time ? format(new Date(r.clock_in_time), "MM/dd HH:mm") : "–"}</td>
                      <td className="px-4 py-3 text-gray-300 text-xs">{r.clock_out_time ? format(new Date(r.clock_out_time), "MM/dd HH:mm") : "–"}</td>
                      <td className="px-4 py-3 text-white">{r.total_hours?.toFixed(2) || "–"}</td>
                      <td className="px-4 py-3">
                        {(r.flags || []).map(f => (
                          <span key={f} className={`text-xs px-1.5 py-0.5 rounded mr-1 ${f === "late" ? "bg-yellow-900/50 text-yellow-400" : "bg-red-900/50 text-red-400"}`}>{f}</span>
                        ))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          r.status === "approved" ? "bg-green-900/50 text-green-400" :
                          r.status === "clocked_in" ? "bg-blue-900/50 text-blue-400" :
                          r.status === "missed" ? "bg-red-900/50 text-red-400" : "bg-gray-700 text-gray-400"
                        }`}>{r.status?.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(r)} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded" title="Edit"><Edit2 className="w-3 h-3" /></button>
                          {r.status === "clocked_out" && (
                            <button onClick={() => approveRecord(r)} className="p-1.5 bg-green-900/50 hover:bg-green-800 text-green-400 rounded" title="Approve"><Check className="w-3 h-3" /></button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SCard({ label, value }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </div>
  );
}