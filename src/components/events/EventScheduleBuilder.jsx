import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, ChevronDown, ChevronUp, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react";
import { format, eachDayOfInterval, parseISO } from "date-fns";

// Preset shift types
const PRESET_SHIFTS = [
  { key: "day", label: "Day Shift", defaultStart: "06:00", defaultEnd: "14:00", color: "text-yellow-400 border-yellow-700" },
  { key: "afternoon", label: "Afternoon / PM Shift", defaultStart: "14:00", defaultEnd: "22:00", color: "text-orange-400 border-orange-700" },
  { key: "overnight", label: "Overnight Shift", defaultStart: "22:00", defaultEnd: "06:00", color: "text-blue-400 border-blue-700" },
];

function makeBlankSlot(defaultStart, defaultEnd) {
  return { start_time: defaultStart, end_time: defaultEnd, quantity: 1, notes: "", assigned_officers: [] };
}

function ShiftSlot({ slot, idx, officers, onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white text-xs font-semibold">Shift #{idx + 1}</span>
        <div className="flex gap-2">
          <button onClick={() => setOpen(v => !v)} className="text-gray-500 hover:text-white">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="text-gray-500 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Start Time</label>
              <input type="time" value={slot.start_time} onChange={e => onChange({ ...slot, start_time: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm" />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">End Time</label>
              <input type="time" value={slot.end_time} onChange={e => onChange({ ...slot, end_time: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Quantity (# of identical shifts)</label>
            <input type="number" min={1} max={20} value={slot.quantity} onChange={e => onChange({ ...slot, quantity: parseInt(e.target.value) || 1 })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Special Notes</label>
            <input type="text" placeholder="Optional notes for this shift..." value={slot.notes} onChange={e => onChange({ ...slot, notes: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm placeholder-gray-600" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Assign Officers</label>
            <div className="max-h-28 overflow-y-auto border border-gray-700 rounded-lg p-1.5 space-y-1 bg-gray-900">
              {officers.map(o => (
                <label key={o.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 px-2 py-0.5 rounded">
                  <input type="checkbox" className="accent-blue-500"
                    checked={(slot.assigned_officers || []).includes(o.id)}
                    onChange={() => {
                      const curr = slot.assigned_officers || [];
                      onChange({ ...slot, assigned_officers: curr.includes(o.id) ? curr.filter(x => x !== o.id) : [...curr, o.id] });
                    }} />
                  <span className="text-gray-300 text-xs">{o.full_name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DayScheduleRow({ date, dayPlan, officers, onChange }) {
  const [collapsed, setCollapsed] = useState(false);

  const togglePreset = (key) => {
    const preset = PRESET_SHIFTS.find(p => p.key === key);
    const updated = { ...dayPlan };
    if (updated[key]) {
      delete updated[key];
    } else {
      updated[key] = [makeBlankSlot(preset.defaultStart, preset.defaultEnd)];
    }
    onChange(updated);
  };

  const addSlot = (key, defaultStart, defaultEnd) => {
    const updated = { ...dayPlan };
    updated[key] = [...(updated[key] || []), makeBlankSlot(defaultStart, defaultEnd)];
    onChange(updated);
  };

  const updateSlot = (key, idx, slot) => {
    const updated = { ...dayPlan };
    updated[key] = updated[key].map((s, i) => i === idx ? slot : s);
    onChange(updated);
  };

  const removeSlot = (key, idx) => {
    const updated = { ...dayPlan };
    updated[key] = updated[key].filter((_, i) => i !== idx);
    if (updated[key].length === 0) delete updated[key];
    onChange(updated);
  };

  const addCustom = () => {
    const updated = { ...dayPlan };
    const customKeys = Object.keys(updated).filter(k => k.startsWith("custom_"));
    const newKey = `custom_${Date.now()}`;
    updated[newKey] = [makeBlankSlot("08:00", "16:00")];
    onChange(updated);
  };

  const displayDate = (() => {
    try { return format(parseISO(date), "EEEE, MMMM d, yyyy"); } catch { return date; }
  })();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <button onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-white font-semibold">{displayDate}</span>
          <span className="text-gray-500 text-xs">
            {Object.values(dayPlan).flat().length} shift slot(s)
          </span>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-800 pt-4">
          {/* Preset toggles */}
          <div className="flex flex-wrap gap-2">
            {PRESET_SHIFTS.map(preset => {
              const active = !!dayPlan[preset.key];
              return (
                <button key={preset.key} onClick={() => togglePreset(preset.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${active ? `bg-gray-700 ${preset.color}` : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"}`}>
                  <span className={`w-3 h-3 rounded-sm border ${active ? "bg-current border-current" : "border-gray-600"}`} />
                  {preset.label}
                </button>
              );
            })}
            <button onClick={addCustom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-all">
              <Plus className="w-3 h-3" /> Custom Shift
            </button>
          </div>

          {/* Preset shift slots */}
          {PRESET_SHIFTS.map(preset => {
            if (!dayPlan[preset.key]) return null;
            return (
              <div key={preset.key}>
                <div className={`flex items-center justify-between mb-2`}>
                  <span className={`text-xs font-bold uppercase tracking-wide ${preset.color.split(" ")[0]}`}>{preset.label}</span>
                  <button onClick={() => addSlot(preset.key, preset.defaultStart, preset.defaultEnd)}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Shift
                  </button>
                </div>
                <div className="space-y-2">
                  {dayPlan[preset.key].map((slot, idx) => (
                    <ShiftSlot key={idx} slot={slot} idx={idx} officers={officers}
                      onChange={(s) => updateSlot(preset.key, idx, s)}
                      onRemove={() => removeSlot(preset.key, idx)} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Custom shift slots */}
          {Object.keys(dayPlan).filter(k => k.startsWith("custom_")).map(key => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-purple-400">Custom Shift</span>
                <div className="flex gap-3">
                  <button onClick={() => addSlot(key, "08:00", "16:00")}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Shift
                  </button>
                  <button onClick={() => { const u = { ...dayPlan }; delete u[key]; onChange(u); }}
                    className="text-xs text-red-400 hover:underline">Remove</button>
                </div>
              </div>
              <div className="space-y-2">
                {(dayPlan[key] || []).map((slot, idx) => (
                  <ShiftSlot key={idx} slot={slot} idx={idx} officers={officers}
                    onChange={(s) => updateSlot(key, idx, s)}
                    onRemove={() => removeSlot(key, idx)} />
                ))}
              </div>
            </div>
          ))}

          {Object.keys(dayPlan).length === 0 && (
            <p className="text-gray-600 text-xs italic">No shifts added for this day. Toggle a shift type above.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function EventScheduleBuilder({ event, officers, onShiftsCreated }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [schedule, setSchedule] = useState({}); // { "yyyy-MM-dd": { day: [...slots], afternoon: [...], overnight: [...], custom_xxx: [...] } }
  const [saving, setSaving] = useState(false);

  const days = (() => {
    if (!event?.start_date || !event?.end_date) return [];
    try {
      return eachDayOfInterval({ start: parseISO(event.start_date), end: parseISO(event.end_date) })
        .map(d => format(d, "yyyy-MM-dd"));
    } catch { return []; }
  })();

  const updateDay = (date, dayPlan) => {
    setSchedule(s => ({ ...s, [date]: dayPlan }));
  };

  const handleSave = async () => {
    setSaving(true);
    const promises = [];

    for (const date of days) {
      const dayPlan = schedule[date] || {};
      for (const [key, slots] of Object.entries(dayPlan)) {
        for (const slot of slots) {
          for (let q = 0; q < (slot.quantity || 1); q++) {
            promises.push(base44.entities.Shift.create({
              site_id: event.site_id,
              site_name: event.site_name,
              event_id: event.id,
              date,
              start_time: slot.start_time,
              end_time: slot.end_time,
              assigned_officers: slot.assigned_officers || [],
              status: "scheduled",
              notes: [
                key.startsWith("custom_") ? "Custom Shift" : key.charAt(0).toUpperCase() + key.slice(1) + " Shift",
                slot.notes
              ].filter(Boolean).join(" — "),
              shift_confirmation: {},
            }));
          }
        }
      }
    }

    // Send group chat message
    const allOfficerIds = [...new Set(Object.values(schedule).flatMap(day =>
      Object.values(day).flatMap(slots => slots.flatMap(s => s.assigned_officers || []))
    ))];
    const officerNames = allOfficerIds.map(id => officers.find(o => o.id === id)?.full_name || id).join(", ");

    if (officerNames) {
      promises.push(base44.entities.Message.create({
        sender_id: "system",
        sender_name: "SecureOps",
        channel: "broadcast",
        content: `📋 Schedule created for event "${event.name}" (${event.start_date} – ${event.end_date}). Assigned officers: ${officerNames}. Please confirm your shifts.`,
        read_by: [],
      }));
    }

    await Promise.all(promises);
    setSaving(false);
    setShowBuilder(false);
    onShiftsCreated();
  };

  if (!showBuilder) {
    return (
      <button onClick={() => setShowBuilder(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
        <Plus className="w-4 h-4" /> Create Schedule
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-white font-bold">Schedule Builder</h4>
          <p className="text-gray-400 text-xs">{days.length} day(s) • {event.start_date} – {event.end_date}</p>
        </div>
        <button onClick={() => setShowBuilder(false)} className="text-gray-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {days.map(date => (
          <DayScheduleRow
            key={date}
            date={date}
            dayPlan={schedule[date] || {}}
            officers={officers}
            onChange={(plan) => updateDay(date, plan)}
          />
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={() => setShowBuilder(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2">
          {saving ? "Saving..." : "Save Schedule & Notify"}
        </button>
      </div>
    </div>
  );
}