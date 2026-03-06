import { useState } from "react";
import { Calendar, CheckCircle } from "lucide-react";

const INTERVIEW_SLOTS = [
  "2026-03-10 09:00 AM", "2026-03-10 11:00 AM", "2026-03-11 10:00 AM",
  "2026-03-12 02:00 PM", "2026-03-13 09:00 AM", "2026-03-14 01:00 PM",
];

export default function OnboardingSchedule({ candidate, record, onUpdate }) {
  const [selected, setSelected] = useState(candidate?.interview_scheduled || "");
  const [saved, setSaved] = useState(!!candidate?.interview_scheduled);

  const handleSelect = async (slot) => {
    setSelected(slot);
    setSaved(false);
  };

  const handleConfirm = async () => {
    await onUpdate({ schedule_acknowledged: true });
    setSaved(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-white font-semibold mb-1">Interview Scheduling</h3>
        <p className="text-gray-400 text-sm">Select a time slot for your onboarding interview. Our team will confirm via the contact info on file.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INTERVIEW_SLOTS.map(slot => (
          <button key={slot} onClick={() => handleSelect(slot)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-sm ${selected === slot ? "border-purple-500 bg-purple-900/30 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:text-white hover:border-gray-500"}`}>
            <Calendar className={`w-4 h-4 flex-shrink-0 ${selected === slot ? "text-purple-400" : "text-gray-500"}`} />
            {slot}
          </button>
        ))}
      </div>
      {selected && !saved && (
        <button onClick={handleConfirm} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
          Confirm Selection
        </button>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-green-400 bg-green-900/20 border border-green-800/40 rounded-xl p-3">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">Interview slot confirmed: <strong>{selected}</strong></span>
        </div>
      )}
    </div>
  );
}