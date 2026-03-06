import { Save } from "lucide-react";

export default function ConfigDetail({ cfg, form, setForm, onSave, saving }) {
  return (
    <div className="border-t border-gray-800 p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
      <div>
        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Features Enabled</p>
        <div className="flex flex-wrap gap-1.5">
          {(cfg.features_enabled || []).length === 0
            ? <span className="text-gray-600">None</span>
            : (cfg.features_enabled || []).map(f => (
              <span key={f} className="bg-blue-900/30 text-blue-300 text-xs px-2 py-0.5 rounded-full">{f.replace(/_/g, " ")}</span>
            ))}
        </div>
      </div>
      <div>
        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Staff Pre-loaded</p>
        <p className="text-gray-300">{(cfg.initial_admins || []).filter(a => a.name).length} admin(s), {(cfg.initial_officers || []).filter(o => o.name).length} officer(s)</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Sites</p>
        <p className="text-gray-300">{(cfg.initial_sites || []).filter(s => s.name).length} site(s)</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Theme</p>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full" style={{ background: cfg.theme_hex || "#2563eb" }} />
          <span className="text-gray-300">{cfg.theme_hex || cfg.theme_color || "blue"}</span>
        </div>
      </div>
      {cfg.answers && Object.keys(cfg.answers).length > 0 && (
        <div className="sm:col-span-2">
          <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Raw Answers (debug)</p>
          <pre className="text-gray-600 text-xs bg-gray-800 rounded-lg p-3 overflow-x-auto max-h-40">
            {JSON.stringify(cfg.answers, null, 2)}
          </pre>
        </div>
      )}
      {/* Default Admin Profile */}
      <div className="sm:col-span-2 border-t border-gray-800 pt-4">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Default Admin Login (Whitelabel Auto-Login)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Full Name</label>
            <input value={form.name} onChange={e => setForm({ name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Employee ID</label>
            <input value={form.employee_id} onChange={e => setForm({ employee_id: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({ role: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="hr">HR</option>
              <option value="officer">Officer</option>
            </select>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">PIN</label>
            <input value={form.pin} onChange={e => setForm({ pin: e.target.value })} maxLength={8}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
          </div>
        </div>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="mt-3 flex items-center gap-1.5 text-xs bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/50 px-4 py-2 rounded-xl disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          {saving ? "Saving..." : "Save Admin Profile"}
        </button>
      </div>
    </div>
  );
}