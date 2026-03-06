import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Star, Archive, DollarSign, Clock, Users, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import PlanOfAction from "../components/events/PlanOfAction";
import EventScheduleBuilder from "../components/events/EventScheduleBuilder";

export default function Events() {
  const [officer, setOfficer] = useState(null);
  const [events, setEvents] = useState([]);
  const [sites, setSites] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("active");
  const [form, setForm] = useState({});
  const [clockRecords, setClockRecords] = useState([]);
  const [eventShifts, setEventShifts] = useState([]);
  const [tab, setTab] = useState("overview");
  const [creating, setCreating] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({});

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (stored) {
      const o = JSON.parse(stored);
      setOfficer(o);
      loadData(o);
    }
  }, []);

  const loadData = async (o_ref) => {
    const cc = (o_ref || officer)?.company_code;
    const [e, s, o] = await Promise.all([
      cc ? base44.entities.Event.filter({ company_code: cc }, "-start_date", 100) : base44.entities.Event.list("-start_date", 100),
      cc ? base44.entities.Site.filter({ status: "active", company_code: cc }, "name") : base44.entities.Site.filter({ status: "active" }, "name"),
      cc ? base44.entities.Officer.filter({ status: "active", company_code: cc }, "full_name") : base44.entities.Officer.filter({ status: "active" }, "full_name"),
    ]);
    setEvents(e);
    setSites(s);
    setOfficers(o);
  };

  const openCreate = () => {
    setForm({ status: "upcoming", billing_rate: 25, overtime_multiplier: 1.5, assigned_officers: [] });
    setShowCreate(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    const site = sites.find(s => s.id === form.site_id);
    await base44.entities.Event.create({ ...form, site_name: site?.name || "", company_code: officer?.company_code });
    setShowCreate(false);
    setCreating(false);
    loadData();
  };

  const openEvent = async (ev) => {
    setSelected(ev);
    setTab("overview");
    const [cr, shifts] = await Promise.all([
      base44.entities.ClockRecord.filter({ event_id: ev.id }, "officer_name", 100),
      base44.entities.Shift.filter({ event_id: ev.id }, "date", 100),
    ]);
    setClockRecords(cr);
    setEventShifts(shifts);
  };

  const updateEvent = async (data) => {
    await base44.entities.Event.update(selected.id, data);
    setSelected(prev => ({ ...prev, ...data }));
    loadData();
  };

  const archiveEvent = async () => {
    await updateEvent({ status: "archived" });
    setSelected(null);
  };

  const deleteEvent = async () => {
    if (!window.confirm(`Delete event "${selected.name}"? This cannot be undone.`)) return;
    await base44.entities.Event.delete(selected.id);
    setSelected(null);
    loadData();
  };

  const savePOA = async (poaData) => {
    await updateEvent({ plan_of_action: JSON.stringify(poaData) });
  };

  const openEditShift = (shift) => {
    setEditShift(shift);
    setShiftForm({ ...shift });
  };

  const saveShift = async () => {
    await base44.entities.Shift.update(editShift.id, { ...shiftForm, shift_confirmation: {} });
    const officerNames = (shiftForm.assigned_officers || [])
      .map(id => officers.find(o => o.id === id)?.full_name || id).join(", ");
    await base44.entities.Message.create({
      sender_id: "system",
      sender_name: "SecureOps",
      channel: "broadcast",
      content: `⚠️ Schedule update for event "${selected.name}": ${shiftForm.date} shift (${shiftForm.start_time}–${shiftForm.end_time}) has been updated. Officers: ${officerNames}. Please confirm or deny your availability.`,
      read_by: [],
      company_code: officer?.company_code,
    });
    setEditShift(null);
    const shifts = await base44.entities.Shift.filter({ event_id: selected.id }, "date", 100);
    setEventShifts(shifts);
  };

  const respondToShift = async (shift, response, reason = "") => {
    const stored = sessionStorage.getItem("secureops_officer");
    const me = stored ? JSON.parse(stored) : null;
    if (!me) return;
    const updated = { ...(shift.shift_confirmation || {}), [me.id]: { response, reason, name: me.full_name } };
    await base44.entities.Shift.update(shift.id, { shift_confirmation: updated });
    if (response === "denied") {
      await base44.entities.Message.create({
        sender_id: me.id,
        sender_name: me.full_name,
        channel: "broadcast",
        content: `❌ ${me.full_name} denied shift on ${shift.date} for event "${selected.name}". Reason: ${reason || "Not provided"}`,
        read_by: [me.id],
        company_code: me.company_code,
      });
    }
    const shifts = await base44.entities.Shift.filter({ event_id: selected.id }, "date", 100);
    setEventShifts(shifts);
  };

  const filtered = events.filter(e => filter === "all" ? true : e.status === filter || (filter === "active" && ["upcoming", "active"].includes(e.status)));

  const totalBilling = clockRecords.reduce((sum, r) => {
    const rate = selected?.billing_rate || 0;
    const mult = selected?.overtime_multiplier || 1.5;
    return sum + Math.min(r.total_hours || 0, 8) * rate + Math.max((r.total_hours || 0) - 8, 0) * rate * mult;
  }, 0);
  const totalHours = clockRecords.reduce((s, r) => s + (r.total_hours || 0), 0);

  const statusColor = {
    upcoming: "bg-blue-900/50 text-blue-400",
    active: "bg-green-900/50 text-green-400",
    completed: "bg-gray-700 text-gray-400",
    archived: "bg-yellow-900/40 text-yellow-600",
  };

  const myId = officer?.id;
  const isAdmin = officer?.role === "admin" || officer?.role === "supervisor";

  const getParsedPOA = () => {
    if (!selected?.plan_of_action) return null;
    try { return JSON.parse(selected.plan_of_action); } catch { return null; }
  };

  return (
    <div className="space-y-5">
      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} className="text-blue-400 text-sm hover:underline mb-4 flex items-center gap-1">
            ← Back to Events
          </button>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-white text-xl font-bold">{selected.name}</h2>
              <p className="text-gray-400 text-sm">{selected.site_name} • {selected.start_date} – {selected.end_date}</p>
            </div>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${statusColor[selected.status]}`}>{selected.status}</span>
              {selected.status !== "archived" && (
                <button onClick={archiveEvent} className="flex items-center gap-1 text-xs bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 px-3 py-1 rounded-full">
                  <Archive className="w-3 h-3" /> Archive
                </button>
              )}
              {officer?.role === "admin" && (
                <button onClick={deleteEvent} className="flex items-center gap-1 text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 px-3 py-1 rounded-full">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
            </div>
          </div>

          <div className="flex border-b border-gray-800 mb-5 overflow-x-auto">
            {["overview", "schedule", "hours", "reports"].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm capitalize whitespace-nowrap ${tab === t ? "text-blue-400 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <BillingCard label="Total Hours" value={`${totalHours.toFixed(1)}h`} icon={Clock} color="blue" />
                <BillingCard label="Officers" value={clockRecords.length} icon={Users} color="green" />
                <BillingCard label="Billing Rate" value={`$${selected.billing_rate}/hr`} icon={DollarSign} color="purple" />
                <BillingCard label="Total Billing" value={`$${totalBilling.toFixed(2)}`} icon={DollarSign} color="yellow" />
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <PlanOfAction event={selected} existingPOA={getParsedPOA()} onSave={savePOA} />
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3">Notes</h3>
                <textarea
                  value={selected.notes || ""}
                  onChange={e => setSelected(s => ({ ...s, notes: e.target.value }))}
                  onBlur={e => updateEvent({ notes: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-gray-300 resize-none focus:outline-none focus:border-blue-500"
                  rows={3} placeholder="Event notes..."
                />
              </div>
            </div>
          )}

          {tab === "schedule" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Event Shifts</h3>
                {isAdmin && (
                  <EventScheduleBuilder
                    event={selected}
                    officers={officers}
                    onShiftsCreated={async () => {
                      const shifts = await base44.entities.Shift.filter({ event_id: selected.id }, "date", 100);
                      setEventShifts(shifts);
                    }}
                  />
                )}
              </div>
              {eventShifts.length === 0 && (
                <p className="text-gray-500 text-sm">No shifts yet. {isAdmin ? "Use \"Create Schedule\" to build the schedule day by day." : ""}</p>
              )}
              <div className="space-y-3">
                {eventShifts.map(shift => {
                  const myConfirmation = shift.shift_confirmation?.[myId];
                  const confirmations = shift.shift_confirmation || {};
                  return (
                    <div key={shift.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white font-medium">{shift.date}</p>
                          <p className="text-gray-400 text-sm">{shift.start_time} – {shift.end_time} • {shift.notes || shift.site_name}</p>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button onClick={() => openEditShift(shift)} className="text-gray-400 hover:text-white">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {officer?.role === "admin" && (
                              <button onClick={async () => {
                                if (!window.confirm("Delete this shift?")) return;
                                await base44.entities.Shift.delete(shift.id);
                                const shifts = await base44.entities.Shift.filter({ event_id: selected.id }, "date", 100);
                                setEventShifts(shifts);
                              }} className="text-red-500 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 mb-3">
                        {(shift.assigned_officers || []).map(oid => {
                          const o = officers.find(x => x.id === oid);
                          const conf = confirmations[oid];
                          return (
                            <div key={oid} className="flex items-center justify-between text-sm">
                              <span className="text-gray-300">{o?.full_name || oid}</span>
                              {conf ? (
                                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${conf.response === "confirmed" ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                                  {conf.response === "confirmed" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {conf.response}{conf.reason ? ` — ${conf.reason}` : ""}
                                </span>
                              ) : (
                                <span className="text-gray-600 text-xs">Pending</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {shift.assigned_officers?.includes(myId) && !isAdmin && (
                        myConfirmation ? (
                          <p className="text-xs text-gray-500">You responded: <span className={myConfirmation.response === "confirmed" ? "text-green-400" : "text-red-400"}>{myConfirmation.response}</span></p>
                        ) : (
                          <ShiftResponseButtons onConfirm={() => respondToShift(shift, "confirmed")} onDeny={(reason) => respondToShift(shift, "denied", reason)} />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "hours" && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-semibold">Hours & Billing by Guard</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-800">
                      <th className="text-left py-2">Officer</th>
                      <th className="text-right py-2">Hours</th>
                      <th className="text-right py-2">OT</th>
                      <th className="text-right py-2">Rate</th>
                      <th className="text-right py-2">Total</th>
                      <th className="text-right py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clockRecords.map(r => {
                      const rate = selected.billing_rate || 0;
                      const mult = selected.overtime_multiplier || 1.5;
                      const otHours = Math.max((r.total_hours || 0) - 8, 0);
                      const regHours = Math.min(r.total_hours || 0, 8);
                      const total = regHours * rate + otHours * rate * mult;
                      return (
                        <tr key={r.id} className="border-b border-gray-800/50 text-gray-300">
                          <td className="py-3">{r.officer_name}</td>
                          <td className="text-right">{r.total_hours?.toFixed(2) || "–"}</td>
                          <td className="text-right text-yellow-400">{otHours > 0 ? otHours.toFixed(2) : "–"}</td>
                          <td className="text-right">${rate}/hr</td>
                          <td className="text-right text-green-400">${total.toFixed(2)}</td>
                          <td className="text-right"><span className={`text-xs ${r.status === "approved" ? "text-green-400" : "text-gray-500"}`}>{r.status}</span></td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold text-white">
                      <td className="py-3">TOTAL</td>
                      <td className="text-right">{totalHours.toFixed(2)}</td>
                      <td></td><td></td>
                      <td className="text-right text-green-400">${totalBilling.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "reports" && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Incident Reports</h3>
                <button onClick={() => {
                  const reports = selected.incident_reports || [];
                  const updated = [...reports, { date: format(new Date(), "yyyy-MM-dd"), description: "", reported_by: officer?.full_name }];
                  updateEvent({ incident_reports: updated });
                  setSelected(s => ({ ...s, incident_reports: updated }));
                }} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Report
                </button>
              </div>
              {(selected.incident_reports || []).length === 0 ? (
                <p className="text-gray-500 text-sm">No incident reports filed.</p>
              ) : (
                <div className="space-y-3">
                  {(selected.incident_reports || []).map((report, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl p-4">
                      <p className="text-gray-400 text-xs mb-2">{report.date} • {report.reported_by}</p>
                      <textarea value={report.description}
                        onChange={e => {
                          const reports = [...(selected.incident_reports || [])];
                          reports[i] = { ...reports[i], description: e.target.value };
                          setSelected(s => ({ ...s, incident_reports: reports }));
                        }}
                        onBlur={() => updateEvent({ incident_reports: selected.incident_reports })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 resize-none focus:outline-none text-sm"
                        rows={3} placeholder="Describe the incident..." />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {["active", "completed", "archived", "all"].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`text-sm px-3 py-1.5 rounded-lg capitalize ${filter === f ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"}`}>{f}</button>
              ))}
            </div>
            <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm">
              <Plus className="w-4 h-4" /> New Event
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(ev => (
              <div key={ev.id} onClick={() => openEvent(ev)} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 cursor-pointer hover:border-blue-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <Star className="w-5 h-5 text-blue-400 mt-0.5" />
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColor[ev.status]}`}>{ev.status}</span>
                </div>
                <h3 className="text-white font-bold">{ev.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{ev.site_name || "No site"}</p>
                <p className="text-gray-500 text-xs mt-2">{ev.start_date} – {ev.end_date}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                  <span className="text-gray-400 text-xs">{ev.assigned_officers?.length || 0} officers</span>
                  <span className="text-green-400 text-xs">${ev.billing_rate}/hr</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Shift Modal */}
      {editShift && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold">Edit Shift — {editShift.date}</h3>
              <button onClick={() => setEditShift(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Date</label>
                <input type="date" value={shiftForm.date || ""} onChange={e => setShiftForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Start Time</label>
                  <input type="time" value={shiftForm.start_time || ""} onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">End Time</label>
                  <input type="time" value={shiftForm.end_time || ""} onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Assigned Officers</label>
                <div className="max-h-36 overflow-y-auto border border-gray-700 rounded-lg p-2 space-y-1">
                  {officers.map(o => (
                    <label key={o.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 px-2 py-1 rounded">
                      <input type="checkbox"
                        checked={shiftForm.assigned_officers?.includes(o.id)}
                        onChange={() => setShiftForm(f => {
                          const curr = f.assigned_officers || [];
                          return { ...f, assigned_officers: curr.includes(o.id) ? curr.filter(x => x !== o.id) : [...curr, o.id] };
                        })}
                        className="accent-blue-500" />
                      <span className="text-gray-300 text-sm">{o.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setEditShift(null)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={saveShift} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm">Save & Notify</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold">Create Event</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <EField label="Event Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
              <div>
                <label className="text-gray-400 text-sm block mb-1">Site</label>
                <select value={form.site_id || ""} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <EField label="Client Name" value={form.client_name} onChange={v => setForm(f => ({ ...f, client_name: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <EField label="Start Date" value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} type="date" />
                <EField label="End Date" value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))} type="date" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EField label="Billing Rate ($/hr)" value={form.billing_rate} onChange={v => setForm(f => ({ ...f, billing_rate: parseFloat(v) }))} type="number" />
                <EField label="OT Multiplier" value={form.overtime_multiplier} onChange={v => setForm(f => ({ ...f, overtime_multiplier: parseFloat(v) }))} type="number" />
              </div>

              <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-3 text-xs text-blue-300">
                ✓ After creating the event, go to the Schedule tab to build day-by-day shifts.<br />
                ✓ A group chat will be sent when you finalize the schedule.
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm">
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShiftResponseButtons({ onConfirm, onDeny }) {
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState("");
  if (denying) {
    return (
      <div className="mt-2 space-y-2">
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for denial..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
        <div className="flex gap-2">
          <button onClick={() => setDenying(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs">Cancel</button>
          <button onClick={() => { onDeny(reason); setDenying(false); }} className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs">Submit Denial</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 mt-2">
      <button onClick={onConfirm} className="flex items-center gap-1 px-3 py-1.5 bg-green-900/40 text-green-400 hover:bg-green-900/60 rounded-lg text-xs border border-green-800/50">
        <CheckCircle className="w-3 h-3" /> Confirm Shift
      </button>
      <button onClick={() => setDenying(true)} className="flex items-center gap-1 px-3 py-1.5 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded-lg text-xs border border-red-800/50">
        <XCircle className="w-3 h-3" /> Deny Shift
      </button>
    </div>
  );
}

function BillingCard({ label, value, icon: Icon, color }) {
  const c = { blue: "text-blue-400", green: "text-green-400", purple: "text-purple-400", yellow: "text-yellow-400" };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <Icon className={`w-4 h-4 ${c[color]} mb-2`} />
      <p className={`text-xl font-bold ${c[color]}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  );
}

function EField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-gray-400 text-sm block mb-1">{label}</label>
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
    </div>
  );
}