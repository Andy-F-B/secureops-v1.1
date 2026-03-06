import { useState, useEffect } from "react";
import { WhitelabelConfig } from "@/api/supabaseClient";
import { Settings as SettingsIcon, Globe, Shield, Palette, Tag, MapPin, Building, Save, Check, ChevronDown, ChevronUp, Briefcase } from "lucide-react";

const SERVICE_OPTIONS = [
  "Corporate Events", "Concerts & Festivals", "Retail Security", "Nightlife & Venues",
  "Residential Patrol", "Construction Sites", "Healthcare", "Government", "Transportation",
  "VIP / Executive Protection", "Hotels & Hospitality", "Sports Events",
];

const AREA_SUGGESTIONS = [
  "Los Angeles, CA", "New York, NY", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
  "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
  "Miami, FL", "Atlanta, GA", "Seattle, WA", "Denver, CO", "Las Vegas, NV",
];

export default function Settings() {
  const [officer, setOfficer] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({});
  const [areaInput, setAreaInput] = useState("");
  const [openSection, setOpenSection] = useState("company");

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (!stored) return;
    const o = JSON.parse(stored);
    setOfficer(o);
    if (!o.company_code) { setLoading(false); return; }

    const loadConfig = async () => {
      const res = await WhitelabelConfig.list({ company_code: o.company_code, setup_complete: true });
      if (res.length > 0) {
        setConfig(res[0]);
        const c = res[0];
        setForm({
          company_name: c.company_name || "",
          public_tagline: c.public_tagline || "",
          contact_email: c.contact_email || "",
          website: c.website || "",
          founded_year: c.founded_year || "",
          public_listing: c.public_listing || false,
          share_analytics: c.share_analytics || false,
          operating_areas: c.operating_areas || [],
          service_types: c.service_types || [],
          theme_hex: c.theme_hex || "#2563eb",
          default_admin_pin: c.default_admin_pin || "",
        });
      }
      setLoading(false);
    };

    loadConfig();
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    await WhitelabelConfig.update(config.id, form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleService = (s) => {
    setForm(f => ({
      ...f,
      service_types: f.service_types.includes(s)
        ? f.service_types.filter(x => x !== s)
        : [...f.service_types, s],
    }));
  };

  const addArea = (a) => {
    const trimmed = a.trim();
    if (!trimmed || form.operating_areas.includes(trimmed)) return;
    setForm(f => ({ ...f, operating_areas: [...f.operating_areas, trimmed] }));
    setAreaInput("");
  };

  const removeArea = (a) => setForm(f => ({ ...f, operating_areas: f.operating_areas.filter(x => x !== a) }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Loading settings...</div>
    </div>
  );

  if (!config) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 text-sm text-center">
        <SettingsIcon className="w-8 h-8 mx-auto mb-2 text-gray-700" />
        No portal configuration found for your account.
      </div>
    </div>
  );

  if (officer?.role !== "admin") return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 text-sm text-center">
        <Shield className="w-8 h-8 mx-auto mb-2 text-gray-700" />
        Only admins can access portal settings.
      </div>
    </div>
  );

  const sections = [
    { id: "company", label: "Company Info", icon: Building },
    { id: "directory", label: "Public Directory", icon: Globe },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "access", label: "Access & Security", icon: Shield },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Portal Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your company portal configuration</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
          } disabled:opacity-50`}
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      {sections.map(sec => (
        <div key={sec.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}
            className="w-full flex items-center justify-between px-5 py-4 text-white hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <sec.icon className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm">{sec.label}</span>
            </div>
            {openSection === sec.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {openSection === sec.id && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-800">
              {/* Company Info */}
              {sec.id === "company" && (
                <>
                  <Field label="Company Name" value={form.company_name} onChange={v => setForm(f => ({ ...f, company_name: v }))} placeholder="e.g. Apex Security Group" />
                  <Field label="Contact Email" value={form.contact_email} onChange={v => setForm(f => ({ ...f, contact_email: v }))} placeholder="contact@example.com" type="email" />
                  <Field label="Website" value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} placeholder="https://yourcompany.com" />
                  <Field label="Founded Year" value={form.founded_year} onChange={v => setForm(f => ({ ...f, founded_year: v }))} placeholder="e.g. 2015" />
                </>
              )}

              {/* Directory */}
              {sec.id === "directory" && (
                <>
                  <div className="pt-4">
                    <Toggle
                      label="List company in public directory"
                      description="Your company will appear on the Discover page for potential clients to find."
                      checked={form.public_listing}
                      onChange={v => setForm(f => ({ ...f, public_listing: v }))}
                    />
                  </div>
                  <Toggle
                    label="Share performance analytics"
                    description="Show on-time rate, hire rate, and team stats publicly on your profile."
                    checked={form.share_analytics}
                    onChange={v => setForm(f => ({ ...f, share_analytics: v }))}
                  />
                  <Field label="Public tagline" value={form.public_tagline} onChange={v => setForm(f => ({ ...f, public_tagline: v }))} placeholder="e.g. Professional security for any occasion" />

                  {/* Operating Areas */}
                  <div>
                    <label className="text-gray-400 text-xs font-semibold uppercase block mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Operating Areas
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={areaInput}
                        onChange={e => setAreaInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addArea(areaInput))}
                        placeholder="Type a city/region and press Enter"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                      />
                      <button onClick={() => addArea(areaInput)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-sm transition-colors">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.operating_areas.map(a => (
                        <span key={a} className="flex items-center gap-1 text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-full">
                          {a}
                          <button onClick={() => removeArea(a)} className="text-gray-500 hover:text-red-400 ml-1">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {AREA_SUGGESTIONS.filter(a => !form.operating_areas.includes(a)).slice(0, 8).map(a => (
                        <button key={a} onClick={() => addArea(a)} className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800/60 px-2 py-0.5 rounded-full border border-gray-700/50 transition-colors">
                          + {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <label className="text-gray-400 text-xs font-semibold uppercase block mb-2 flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" /> Service Types
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_OPTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => toggleService(s)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            form.service_types.includes(s)
                              ? "bg-blue-600/30 border-blue-600 text-blue-300"
                              : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Branding */}
              {sec.id === "branding" && (
                <>
                  <div className="pt-4">
                    <label className="text-gray-400 text-xs font-semibold uppercase block mb-2 flex items-center gap-1.5">
                      <Palette className="w-3 h-3" /> Brand Color
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={form.theme_hex}
                        onChange={e => setForm(f => ({ ...f, theme_hex: e.target.value }))}
                        className="w-12 h-12 rounded-xl border border-gray-700 bg-gray-800 cursor-pointer p-1"
                      />
                      <div>
                        <p className="text-white text-sm font-medium" style={{ color: form.theme_hex }}>{form.theme_hex}</p>
                        <p className="text-gray-500 text-xs mt-0.5">Used in sidebar, buttons, and badges</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: form.theme_hex }}>
                        A
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {["#2563eb", "#7c3aed", "#db2777", "#16a34a", "#d97706", "#dc2626", "#0891b2", "#374151"].map(c => (
                        <button key={c} onClick={() => setForm(f => ({ ...f, theme_hex: c }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${form.theme_hex === c ? "border-white scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Access */}
              {sec.id === "access" && (
                <>
                  <div className="pt-4 bg-gray-800/40 rounded-xl p-4 border border-gray-700/60">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm font-medium">Portal Company Code</span>
                    </div>
                    <p className="text-white text-lg font-mono font-bold tracking-widest">{config.company_code}</p>
                    <p className="text-gray-500 text-xs mt-1">Officers use this code to log in. Share it securely.</p>
                  </div>
                  <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/60">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm font-medium">Whitelabel Access Code</span>
                    </div>
                    <p className="text-white text-lg font-mono font-bold tracking-widest">{config.code}</p>
                    <p className="text-gray-500 text-xs mt-1">Used to access the setup wizard. Keep this private.</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-semibold uppercase block mb-2">Default Admin PIN</label>
                    <input
                      type="password"
                      value={form.default_admin_pin}
                      onChange={e => setForm(f => ({ ...f, default_admin_pin: e.target.value }))}
                      placeholder="Set a new admin PIN"
                      maxLength={8}
                      className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm w-full font-mono"
                    />
                    <p className="text-gray-600 text-xs mt-1">This is the PIN used for the default admin login on the home page.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="pt-4">
      <label className="text-gray-400 text-xs font-semibold uppercase block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
      />
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-700"}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}