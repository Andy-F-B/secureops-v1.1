import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, Plus, X, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameDay, isSameMonth, parseISO } from "date-fns";

export default function Schedule() {
  const [officer, setOfficer] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [sites, setSites] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [showModal, setShowModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [form, setForm] = useState({ site_id: "", site_name: "", date: "", start_time: "", end_time: "", assigned_officers: [], notes: "", status: "scheduled" });
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
    const cc = o.company_code;
    const [s, si, of] = await Promise.all([
      cc ? base44.entities.Shift.filter({ company_code: cc }, "-date", 200) : base44.entities.Shift.list("-date", 200),
      cc ? base44.entities.Site.filter({ status: "active", company_code: cc }, "name", 100) : base44.entities.Site.filter({ status: "active" }, "name", 100),
      cc ? base44.entities.Officer.filter({ status: "active", company_code: cc }, "full_name", 100) : base44.entities.Officer.filter({ status: "active" }, "full_name", 100),
    ]);
    const isAdmin = o.role === "admin" || o.role === "supervisor";
    setShifts(isAdmin ? s : s.filter(sh => sh.assigned_officers?.includes(o.id)));
    setSites(si);
    setOfficers(of);
    setLoading(false);
  };

  const isAdmin = officer?.role === "admin" || officer?.role === "supervisor";

  const daysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  };

  const getShiftsForDay = (day) => shifts.filter(s => s.date === format(day, "yyyy-MM-dd"));

  const openCreate = (date) => {
    if (!isAdmin) return;
    setSelectedShift(null);
    setForm({ site_id: "", site_name: "", date: format(date, "yyyy-MM-dd"), start_time: "", end_time: "", assigned_officers: [], notes: "", status: "scheduled" });
    setShowModal(true);
  };

  const openEdit = (shift) => {
    setSelectedShift(shift);
    setForm({ ...shift });
    setShowModal(true);
  };

  const handleSave = async () => {
    const site = sites.find(s => s.id === form.site_id);
    const data = { ...form, site_name: site?.name || form.site_name, company_code: officer?.company_code };
    if (selectedShift) {
      await base44.entities.Shift.update(selectedShift.id, data);
    } else {
      await base44.entities.Shift.create(data);
    }
    setShowModal(false);
    loadData(officer);
  };

  const handleDelete = async () => {
    if (selectedShift) {
      await base44.entities.Shift.delete(selectedShift.id);
      setShowModal(false);
      loadData(officer);
    }
  };

  const toggleOfficer = (id) => {
    const current = form.assigned_officers || [];
    setForm(f => ({
      ...f,
      assigned_officers: current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading schedule...</p></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="text-gray-400 hover:text-white p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-white font-bold text-lg">{format(currentDate, "MMMM yyyy")}</h2>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="text-gray-400 hover:text-white p-1">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="text-sm text-blue-400 hover:underline">Today</button>
          {isAdmin && (
            <button onClick={() => openCreate(new Date())} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg">
              <Plus className="w-4 h-4" /> New Shift
            </button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-gray-500 text-xs py-3 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {daysInMonth().map((day, i) => {
            const dayShifts = getShiftsForDay(day);
            const isToday = isSameDay(day, new Date());
            const inMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={i}
                onClick={() => openCreate(day)}
                className={`min-h-[80px] p-2 border-b border-r border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors ${!inMonth ? "opacity-40" : ""}`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-1 ${isToday ? "bg-blue-600 text-white font-bold" : "text-gray-400"}`}>
                  {format(day, "d")}
                </span>
                <div className="space-y-1">
                  {dayShifts.slice(0, 2).map(s => (
                    <div
                      key={s.id}
                      onClick={e => { e.stopPropagation(); openEdit(s); }}
                      className="text-xs bg-blue-900/60 text-blue-300 rounded px-1.5 py-0.5 truncate cursor-pointer hover:bg-blue-800"
                    >
                      {s.start_time} {s.site_name}
                    </div>
                  ))}
                  {dayShifts.length > 2 && <div className="text-xs text-gray-500">+{dayShifts.length - 2} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold">{selectedShift ? "Edit Shift" : "New Shift"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Site</label>
                <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">End Time</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Assign Officers</label>
                <div className="max-h-36 overflow-y-auto space-y-1 border border-gray-700 rounded-lg p-2">
                  {officers.map(o => (
                    <label key={o.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 px-2 py-1 rounded">
                      <input type="checkbox" checked={form.assigned_officers?.includes(o.id)} onChange={() => toggleOfficer(o.id)} className="accent-blue-500" />
                      <span className="text-gray-300 text-sm">{o.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none" rows={2} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              {selectedShift && (
                <button onClick={handleDelete} className="px-4 py-2 bg-red-900/40 hover:bg-red-800 text-red-400 rounded-lg text-sm">Delete</button>
              )}
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm ml-auto">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}