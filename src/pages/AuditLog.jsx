import { useState, useEffect } from "react";
import { AuditLog as AuditLogEntity } from "@/api/supabaseClient";
import { Shield } from "lucide-react";
import { format } from "date-fns";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ entity: "", action: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    const l = await AuditLogEntity.list();
    setLogs(l);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (filter.entity && l.entity_type !== filter.entity) return false;
    if (filter.action && l.action !== filter.action) return false;
    return true;
  });

  const actionColor = {
    create: "bg-green-900/50 text-green-400",
    update: "bg-blue-900/50 text-blue-400",
    delete: "bg-red-900/50 text-red-400",
    approve: "bg-purple-900/50 text-purple-400",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading audit log...</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <select
          value={filter.entity}
          onChange={e => setFilter(f => ({ ...f, entity: e.target.value }))}
          className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="">All Entities</option>
          {["ClockRecord", "Shift", "Officer", "Event", "Certification", "SOP"].map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={filter.action}
          onChange={e => setFilter(f => ({ ...f, action: e.target.value }))}
          className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="">All Actions</option>
          {["create", "update", "delete", "approve"].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-4 py-3">Timestamp</th>
                <th className="text-left px-4 py-3">Changed By</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {log.timestamp ? format(new Date(log.timestamp), "MM/dd/yy HH:mm") : "–"}
                  </td>
                  <td className="px-4 py-3 text-white">{log.changed_by_name}</td>
                  <td className="px-4 py-3 text-gray-400">{log.entity_type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${actionColor[log.action] || "bg-gray-700 text-gray-400"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.changes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-600">
              <Shield className="w-8 h-8 mx-auto mb-2" />
              <p>No audit logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}