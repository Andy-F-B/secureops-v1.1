import { useState } from "react";
import { WhitelabelConfig, Officers as OfficersEntity, Candidates, Sites, uploadFile, getSignedUrl } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { Shield, ChevronRight, ChevronLeft, Check, Plus, X, Palette, Upload, Image } from "lucide-react";

const ALL_FEATURES = [
  { key: "scheduling", label: "Scheduling", desc: "Shift builder & calendar" },
  { key: "clock_in", label: "Clock In/Out", desc: "GPS-verified timekeeping" },
  { key: "events", label: "Events & Billing", desc: "Event management with billing" },
  { key: "timesheets", label: "Timesheets", desc: "Payroll-ready time tracking" },
  { key: "certifications", label: "Certifications", desc: "License & cert tracking" },
  { key: "messaging", label: "Messaging", desc: "Team communication" },
  { key: "sops", label: "SOPs", desc: "Standard operating procedures" },
  { key: "hr_dashboard", label: "HR Dashboard", desc: "Candidate onboarding & records" },
  { key: "audit_log", label: "Audit Log", desc: "Full activity history" },
];

const THEME_COLORS = [
  { key: "blue", label: "Ocean Blue", hex: "#2563eb" },
  { key: "purple", label: "Royal Purple", hex: "#7c3aed" },
  { key: "green", label: "Emerald", hex: "#059669" },
  { key: "red", label: "Crimson", hex: "#dc2626" },
  { key: "orange", label: "Sunset", hex: "#ea580c" },
  { key: "cyan", label: "Cyber Cyan", hex: "#0891b2" },
  { key: "pink", label: "Rose", hex: "#db2777" },
  { key: "yellow", label: "Amber", hex: "#d97706" },
];

const TOTAL_STEPS = 8;

export default function WhitelabelSetup() {
  const [phase, setPhase] = useState("code"); // code | wizard | done
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [config, setConfig] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Wizard state
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [features, setFeatures] = useState(ALL_FEATURES.map(f => f.key));
  const [admins, setAdmins] = useState([{ name: "", email: "", pin: "" }]);
  const [officers, setOfficers] = useState([{ name: "", pin: "" }]);
  const [sites, setSites] = useState([{ name: "", address: "" }]);
  const [themeColor, setThemeColor] = useState("blue");
  const [customHex, setCustomHex] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) { setCodeError("Please enter a code."); return; }
    const existing = await WhitelabelConfig.list({ code: code.trim() });
    if (existing.length === 0) {
      setCodeError("Invalid setup code. Please check your code and try again.");
      return;
    }
    const cfg = existing[0];
    setConfig(cfg);
    if (cfg.answers) {
      const a = cfg.answers;
      if (a.companyName) setCompanyName(a.companyName);
      if (a.companyCode) setCompanyCode(a.companyCode);
      if (a.features) setFeatures(a.features);
      if (a.admins) setAdmins(a.admins);
      if (a.officers) setOfficers(a.officers);
      if (a.sites) setSites(a.sites);
      if (a.themeColor) setThemeColor(a.themeColor);
      if (a.customHex) setCustomHex(a.customHex);
      if (a.logoUrl) setLogoUrl(a.logoUrl);
    }
    if (cfg.setup_complete) {
      setPhase("done");
      return;
    }
    setStep(cfg.setup_step || 0);
    setPhase("wizard");
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${code.trim() || "setup"}/${Date.now()}.${ext}`;
    const storagePath = await uploadFile("company-logos", file, path);
    // Generate a signed URL to preview the logo immediately
    const signedUrl = await getSignedUrl("company-logos", storagePath, 3600);
    setLogoUrl(signedUrl);
    setLogoUploading(false);
  };

  const saveProgress = async (nextStep) => {
    if (!config) return;
    const answers = { companyName, companyCode, features, admins, officers, sites, themeColor, customHex, logoUrl };
    await WhitelabelConfig.update(config.id, {
      setup_step: nextStep,
      answers,
      features_enabled: features,
      company_name: companyName,
      theme_color: themeColor,
      theme_hex: customHex,
      logo_url: logoUrl,
    });
  };

  const handleNext = async () => {
    setSaving(true);
    const next = step + 1;
    await saveProgress(next);
    setSaving(false);
    setStep(next);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setSubmitting(true);
    const code_upper = companyCode.trim().toUpperCase();
    const answers = { companyName, companyCode, features, admins, officers, sites, themeColor, customHex, logoUrl };

    await WhitelabelConfig.update(config.id, {
      setup_complete: true,
      setup_step: TOTAL_STEPS,
      answers,
      features_enabled: features,
      company_name: companyName,
      company_code: code_upper,
      theme_color: themeColor,
      theme_hex: customHex,
      logo_url: logoUrl,
      initial_admins: admins.filter(a => a.name),
      initial_officers: officers.filter(o => o.name),
      initial_sites: sites.filter(s => s.name),
    });

    // Create default admin officer (ADMIN001 / 1234) if not already exists
    const existingAdmin = await Officers.list({ employee_id: "ADMIN001", company_code: code_upper });
    if (existingAdmin.length === 0) {
      await Officers.create({
        employee_id: "ADMIN001",
        full_name: "Admin",
        pin: "1234",
        role: "admin",
        status: "active",
        company_code: code_upper,
      });
    }

    // Create default candidate (CAND001 / 1234) if not already exists
    const existingCand = await Candidates.list({ candidate_id: "CAND001", company_code: code_upper });
    if (existingCand.length === 0) {
      await Candidates.create({
        candidate_id: "CAND001",
        full_name: "Candidate",
        pin: "1234",
        company_code: code_upper,
        onboarding_status: "pending",
        onboarding_step: 0,
        onboarding_percentage: 0,
      });
    }

    // Create pre-loaded admins
    const namedAdmins = admins.filter(a => a.name);
    for (const a of namedAdmins) {
      const id = a.employee_id || `ADMIN${String(namedAdmins.indexOf(a) + 2).padStart(3, "0")}`;
      const exists = await Officers.list({ employee_id: id, company_code: code_upper });
      if (exists.length === 0) {
        await Officers.create({
          employee_id: id,
          full_name: a.name,
          pin: a.pin || "1234",
          role: "admin",
          status: "active",
          company_code: code_upper,
        });
      }
    }

    // Create pre-loaded officers
    const namedOfficers = officers.filter(o => o.name);
    for (let i = 0; i < namedOfficers.length; i++) {
      const o = namedOfficers[i];
      const id = o.employee_id || `OFF${String(i + 1).padStart(3, "0")}`;
      const exists = await Officers.list({ employee_id: id, company_code: code_upper });
      if (exists.length === 0) {
        await Officers.create({
          employee_id: id,
          full_name: o.name,
          pin: o.pin || "1234",
          role: "officer",
          status: "active",
          company_code: code_upper,
        });
      }
    }

    // Create pre-loaded sites
    const namedSites = sites.filter(s => s.name);
    for (const s of namedSites) {
      await Sites.create({
        name: s.name,
        address: s.address || "",
        company_code: code_upper,
        status: "active",
      });
    }

    setSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setPhase("done");
    }, 2500);
  };

  const toggleFeature = (key) => {
    setFeatures(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const pct = Math.round(((step) / TOTAL_STEPS) * 100);
  const selectedColor = THEME_COLORS.find(c => c.key === themeColor) || THEME_COLORS[0];

  if (phase === "done") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-600/30">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Your portal is ready!</h2>
          <p className="text-gray-400 mb-8">Setup for code <span className="text-white font-bold">{code || config?.code}</span> is complete.</p>
          <div className="flex flex-col gap-3">
            <a href={createPageUrl("OfficerLogin")} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl">
              Go to Officer Portal
            </a>
            <button onClick={() => setShowTutorial(true)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 px-6 rounded-xl text-sm">
              Take the tutorial
            </button>
          </div>
        </div>

        {showTutorial && (
          <TutorialOverlay onClose={() => setShowTutorial(false)} />
        )}
      </div>
    );
  }

  if (phase === "code") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">SecureOps Setup</h1>
            <p className="text-gray-500 text-sm mt-1">Enter your whitelabel code to get started</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Setup Code</label>
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value); setCodeError(""); }}
                  placeholder="Enter your code..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm tracking-widest font-mono"
                  autoFocus
                />
              </div>
              {codeError && <p className="text-red-400 text-xs">{codeError}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                Continue →
              </button>
            </form>
          </div>
          <p className="text-center text-gray-600 text-xs mt-4">
            <a href={createPageUrl("Home")} className="hover:text-gray-400">← Back to home</a>
          </p>
        </div>
      </div>
    );
  }

  // Wizard
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {showSuccess && <SuccessAnimation />}

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-white font-bold text-sm">SecureOps Setup</span>
          </div>
          <span className="text-gray-500 text-xs">Code: <span className="text-white font-mono">{code || config?.code}</span></span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs">Step {step + 1} of {TOTAL_STEPS + 1}</span>
            <span className="text-blue-400 text-xs font-semibold">{pct}% complete</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7">
          {/* Step 0: Company Name */}
          {step === 0 && (
            <WizardStep title="What's your company name?" desc="This will be displayed across your portal.">
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Security Group"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </WizardStep>
          )}

          {/* Step 1: Company Code */}
          {step === 1 && (
            <WizardStep title="Choose your company code" desc="Officers and candidates will enter this code at login to access your portal. It can be your company name or abbreviation (e.g. APEX).">
              <input
                value={companyCode}
                onChange={e => setCompanyCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="e.g. APEX"
                maxLength={20}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono text-lg tracking-widest uppercase"
                autoFocus
              />
              <p className="text-gray-500 text-xs mt-2">No spaces. Letters and numbers only. This cannot be changed after setup.</p>
              {companyCode && (
                <div className="mt-3 bg-blue-900/20 border border-blue-800/40 rounded-xl px-4 py-3 text-blue-300 text-sm">
                  Your login code will be: <span className="font-bold font-mono">{companyCode}</span>
                </div>
              )}
            </WizardStep>
          )}

          {/* Step 2: Features */}
          {step === 2 && (
            <WizardStep title="Which features do you need?" desc="Select the modules you want enabled in your portal. You can change these later.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_FEATURES.map(f => (
                  <button
                    key={f.key}
                    onClick={() => toggleFeature(f.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      features.includes(f.key)
                        ? "border-blue-600 bg-blue-900/20"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${features.includes(f.key) ? "border-blue-500 bg-blue-600" : "border-gray-600"}`}>
                      {features.includes(f.key) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{f.label}</p>
                      <p className="text-gray-500 text-xs">{f.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </WizardStep>
          )}

          {/* Step 3: Admin Users */}
          {step === 3 && (
            <WizardStep title="Add admin users" desc="Admins have full portal access. Login ID is auto-assigned but editable.">
              <div className="space-y-3">
                {admins.map((a, i) => {
                  const autoId = i === 0 ? "ADMIN001" : `ADMIN${String(i + 2).padStart(3, "0")}`;
                  return (
                    <div key={i} className="bg-gray-800 rounded-xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={a.name} onChange={e => { const n = [...admins]; n[i].name = e.target.value; setAdmins(n); }}
                          placeholder="Full name *" className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                        <input value={a.pin} onChange={e => { const n = [...admins]; n[i].pin = e.target.value; setAdmins(n); }}
                          placeholder="PIN" maxLength={6}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input value={a.employee_id !== undefined ? a.employee_id : autoId}
                          onChange={e => { const n = [...admins]; n[i].employee_id = e.target.value.toUpperCase().replace(/\s/g, ""); setAdmins(n); }}
                          placeholder="Login ID"
                          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-xs font-mono focus:outline-none focus:border-blue-500" />
                        <span className="text-gray-600 text-xs">Login ID</span>
                        {admins.length > 1 && (
                          <button onClick={() => setAdmins(admins.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setAdmins([...admins, { name: "", pin: "" }])}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
                  <Plus className="w-4 h-4" /> Add another admin
                </button>
              </div>
            </WizardStep>
          )}

          {/* Step 4: Officers */}
          {step === 4 && (
            <WizardStep title="Add initial officers" desc="Pre-load your security officers. Login ID is auto-assigned but editable.">
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {officers.map((o, i) => {
                  const autoId = `OFF${String(i + 1).padStart(3, "0")}`;
                  return (
                    <div key={i} className="bg-gray-800 rounded-xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={o.name} onChange={e => { const n = [...officers]; n[i].name = e.target.value; setOfficers(n); }}
                          placeholder="Full name *" className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                        <input value={o.pin} onChange={e => { const n = [...officers]; n[i].pin = e.target.value; setOfficers(n); }}
                          placeholder="PIN" maxLength={6}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input value={o.employee_id !== undefined ? o.employee_id : autoId}
                          onChange={e => { const n = [...officers]; n[i].employee_id = e.target.value.toUpperCase().replace(/\s/g, ""); setOfficers(n); }}
                          placeholder="Login ID"
                          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-xs font-mono focus:outline-none focus:border-blue-500" />
                        <span className="text-gray-600 text-xs">Login ID</span>
                        {officers.length > 1 && (
                          <button onClick={() => setOfficers(officers.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setOfficers([...officers, { name: "", pin: "" }])}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-3">
                <Plus className="w-4 h-4" /> Add another officer
              </button>
              <p className="text-gray-600 text-xs mt-2">You can skip this and add officers later.</p>
            </WizardStep>
          )}

          {/* Step 5: Sites */}
          {step === 5 && (
            <WizardStep title="Add your sites" desc="Enter your major client sites. You can add more from the Sites page later.">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {sites.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center bg-gray-800 rounded-xl p-3">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input value={s.name} onChange={e => { const n = [...sites]; n[i].name = e.target.value; setSites(n); }}
                        placeholder="Site name" className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                      <input value={s.address} onChange={e => { const n = [...sites]; n[i].address = e.target.value; setSites(n); }}
                        placeholder="Address" className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    {sites.length > 1 && (
                      <button onClick={() => setSites(sites.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setSites([...sites, { name: "", address: "" }])}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-3">
                <Plus className="w-4 h-4" /> Add another site
              </button>
              <p className="text-gray-600 text-xs mt-2">You can skip this step.</p>
            </WizardStep>
          )}

          {/* Step 6: Theme & Logo */}
          {step === 6 && (
            <WizardStep title="Brand your portal" desc="Pick a theme color and optionally upload your company logo.">
              {/* Logo Upload */}
              <div className="mb-6">
                <p className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2"><Image className="w-4 h-4" /> Company Logo</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
                    ) : (
                      <Shield className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm px-4 py-2 rounded-xl transition-colors">
                      <Upload className="w-4 h-4" />
                      {logoUploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={logoUploading} />
                    </label>
                    <p className="text-gray-600 text-xs mt-1">PNG, JPG or SVG. Shown in sidebar.</p>
                  </div>
                  {logoUrl && (
                    <button onClick={() => setLogoUrl("")} className="text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-800 pt-5 mb-5">
                <p className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2"><Palette className="w-4 h-4" /> Accent Color</p>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {THEME_COLORS.map(c => (
                    <button
                      key={c.key}
                      onClick={() => { setThemeColor(c.key); setCustomHex(""); }}
                      className={`rounded-xl p-3 flex flex-col items-center gap-2 border-2 transition-all ${themeColor === c.key && !customHex ? "border-white scale-105" : "border-transparent hover:border-gray-600"}`}
                      style={{ background: c.hex + "22" }}
                    >
                      <div className="w-8 h-8 rounded-full shadow-lg" style={{ background: c.hex }} />
                      <span className="text-xs text-gray-400 text-center leading-tight">{c.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customHex || selectedColor.hex}
                    onChange={e => { setCustomHex(e.target.value); setThemeColor("custom"); }}
                    className="w-12 h-12 rounded-xl border border-gray-700 cursor-pointer bg-gray-800"
                  />
                  <div>
                    <p className="text-white text-sm font-medium">{customHex || selectedColor.hex}</p>
                    <p className="text-gray-500 text-xs">Custom color</p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-gray-400 text-xs mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: logoUrl ? "transparent" : (customHex || selectedColor.hex) }}>
                    {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover rounded-lg" /> : <Shield className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">{companyName || "Your Company"}</p>
                    <p className="text-gray-500 text-xs">SecureOps Portal</p>
                  </div>
                  <div className="ml-auto px-3 py-1 rounded-lg text-white text-xs font-semibold" style={{ background: customHex || selectedColor.hex }}>
                    Dashboard
                  </div>
                </div>
              </div>
            </WizardStep>
          )}

          {/* Step 7: Review & Submit */}
          {step === 7 && (
            <WizardStep title="Review & launch" desc="Everything looks good? Submit to create your portal.">
              <div className="space-y-3 text-sm">
                <ReviewRow label="Company" value={companyName || "(not set)"} />
                <ReviewRow label="Company Code" value={<span className="font-mono">{companyCode || "(not set)"}</span>} />
                <ReviewRow label="Features" value={`${features.length} of ${ALL_FEATURES.length} enabled`} />
                <ReviewRow label="Admins" value={`${admins.filter(a => a.name).length} user(s)`} />
                <ReviewRow label="Officers" value={`${officers.filter(o => o.name).length} officer(s)`} />
                <ReviewRow label="Sites" value={`${sites.filter(s => s.name).length} site(s)`} />
                <ReviewRow label="Theme" value={
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: customHex || selectedColor.hex }} />
                    {customHex ? "Custom" : selectedColor.label}
                  </span>
                } />
                <ReviewRow label="Logo" value={logoUrl ? "✓ Uploaded" : "Using default"} />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-base transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/20"
              >
                {submitting ? "Creating your portal..." : "🚀 Launch Portal"}
              </button>
            </WizardStep>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="flex items-center gap-2 text-gray-400 hover:text-white disabled:opacity-30 text-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < 7 && (
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                {saving ? "Saving..." : "Continue"} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
    </div>
  );
}

function WizardStep({ title, desc, children }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
      <p className="text-gray-400 text-sm mb-6">{desc}</p>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-800">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function SuccessAnimation() {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-2xl shadow-green-600/40">
          <Check className="w-12 h-12 text-white" />
        </div>
        <p className="text-white text-2xl font-bold">Portal Created!</p>
        <p className="text-gray-400 mt-2">Setting everything up...</p>
      </div>
    </div>
  );
}

const TUTORIAL_STEPS = [
  { title: "Dashboard", desc: "Your home base — see active officers, today's shifts, and HR notifications at a glance.", page: "Dashboard" },
  { title: "Schedule", desc: "Build recurring or one-time shifts and assign officers to sites.", page: "Schedule" },
  { title: "Clock In/Out", desc: "Officers use this to clock in and out with GPS verification.", page: "ClockIn" },
  { title: "Officers", desc: "Manage your full team — profiles, certs, records, and more.", page: "Officers" },
  { title: "HR Dashboard", desc: "Review candidates, approve onboarding, and manage disciplinary records.", page: "HRDashboard" },
  { title: "Messages", desc: "Broadcast messages to your team or chat directly.", page: "Messages" },
];

function TutorialOverlay({ onClose }) {
  const [tStep, setTStep] = useState(0);
  const current = TUTORIAL_STEPS[tStep];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-6 sm:items-center">
      <div className="bg-gray-900 border border-blue-800/60 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-blue-400 text-xs font-semibold">{tStep + 1} / {TUTORIAL_STEPS.length}</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <h3 className="text-white font-bold text-lg mb-2">{current.title}</h3>
        <p className="text-gray-400 text-sm mb-6">{current.desc}</p>
        <div className="w-full h-1.5 bg-gray-800 rounded-full mb-6">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${((tStep + 1) / TUTORIAL_STEPS.length) * 100}%` }} />
        </div>
        <div className="flex gap-3">
          {tStep < TUTORIAL_STEPS.length - 1 ? (
            <>
              <a href={createPageUrl(current.page)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-center py-2.5 rounded-xl text-sm font-semibold">
                Go to {current.title}
              </a>
              <button onClick={() => setTStep(s => s + 1)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm">
                Next →
              </button>
            </>
          ) : (
            <button onClick={onClose} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm">
              Finish Tutorial ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
