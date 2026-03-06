import { useState } from "react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Shield, Clock, Users, Calendar, MapPin, FileText, Award, MessageSquare, BarChart2, Lock, ChevronRight, Zap, CheckCircle, Search } from "lucide-react";

const FEATURES = [
  { icon: Clock, title: "Clock In / Out", desc: "GPS-verified timekeeping for field officers with real-time status." },
  { icon: Calendar, title: "Scheduling", desc: "Drag-and-drop shift builder with recurring schedules and conflict detection." },
  { icon: Users, title: "Officer Management", desc: "Full HR profiles, certifications, records, and performance tracking." },
  { icon: MapPin, title: "Site Management", desc: "Multi-site coordination with supervisor assignments and SOPs." },
  { icon: FileText, title: "Events & Billing", desc: "Event-specific billing rates, plan of action, and incident reports." },
  { icon: Award, title: "Certifications", desc: "Track license expirations, upload docs, and manage approvals." },
  { icon: MessageSquare, title: "Messaging", desc: "Broadcast, site-channel, and direct messaging for your whole team." },
  { icon: BarChart2, title: "Timesheets & Audit", desc: "Automated timesheet approvals, overtime tracking, and full audit log." },
];

export default function Home() {
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [devError, setDevError] = useState("");
  const [wlCode, setWlCode] = useState("");
  const [wlError, setWlError] = useState("");
  const [showWlLogin, setShowWlLogin] = useState(false);
  const [wlLoading, setWlLoading] = useState(false);
  const [showRequestPortal, setShowRequestPortal] = useState(false);
  const [portalForm, setPortalForm] = useState({ name: "", email: "", company: "", users: "1-50" });

  const handleDevLogin = (e) => {
    e.preventDefault();
    if (devCode === "Decristo123") {
      sessionStorage.setItem("secureops_dev", "true");
      window.location.href = createPageUrl("DevPanel");
    } else {
      setDevError("Invalid developer code.");
    }
  };

  const handleWhitelabelLogin = async (e) => {
    e.preventDefault();
    setWlLoading(true);
    setWlError("");

    try {
      const configs = await base44.entities.WhitelabelConfig.filter({ code: wlCode.trim() }, "-created_date", 1);
      if (configs.length === 0) {
        setWlError("Invalid code. Please try again.");
        return;
      }

      const cfg = configs[0];
      if (!cfg.setup_complete) {
        window.location.href = `${createPageUrl("WhitelabelSetup")}?code=${cfg.code}`;
        return;
      }

      const defaultAdmin = {
        id: `wl_${cfg.code}`,
        full_name: cfg.default_admin_name || "John Smith",
        employee_id: cfg.default_admin_id || "ADMIN001",
        role: cfg.default_admin_role || "admin",
        status: "active",
        pin: cfg.default_admin_pin || "1234",
      };
      sessionStorage.setItem("secureops_officer", JSON.stringify(defaultAdmin));
      window.location.href = createPageUrl("Dashboard");
    } finally {
      setWlLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24">
          <div className="flex items-center justify-between mb-14">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">SecureOps</span>
          </div>
          <div className="flex items-center gap-3">

            <a href={createPageUrl("CandidateLogin")} className="text-gray-400 hover:text-white text-sm transition-colors hidden sm:block">Candidate Portal</a>
            <a href={createPageUrl("OfficerLogin")} className="text-gray-400 hover:text-white text-sm transition-colors hidden sm:block">Guard Login</a>
            <a href={createPageUrl("Discover")} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors border border-gray-700">
              <Search className="w-4 h-4 text-blue-400" /> Discover Companies
            </a>
            <button onClick={() => setShowWlLogin(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
              Get Started <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-800/60 text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3 h-3" /> Enterprise Security Management Platform
            </div>
            <h1 className="text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-6">
              The all-in-one ops platform for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">security teams</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-2xl">
              Manage officers, schedules, timesheets, certifications, and client sites — all in one sleek, powerful portal. Built for modern security companies.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => setShowRequestPortal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-colors shadow-xl shadow-blue-600/25">
                Request a Portal <ChevronRight className="w-5 h-5" />
              </button>
              <div className="flex flex-col sm:flex-row gap-3">

                <a href={createPageUrl("OfficerLogin")} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors border border-gray-700">
                  <Lock className="w-4 h-4 text-gray-400" /> Guard Login
                </a>
                <a href={createPageUrl("CandidateLogin")} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors border border-gray-700">
                  <Lock className="w-4 h-4 text-purple-400" /> Candidate Login
                </a>
                <a href={createPageUrl("Discover")} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors border border-gray-700">
                  <Search className="w-4 h-4 text-green-400" /> Discover
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Everything your team needs</h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">From daily clock-ins to full event billing — SecureOps handles every layer of your operation.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-gray-900 border border-gray-800 hover:border-blue-800/60 rounded-2xl p-5 transition-colors group">
              <div className="w-10 h-10 bg-blue-900/40 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-colors">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2 text-sm">{title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why section */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800/60">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Whitelabel — make it yours</h2>
            <p className="text-gray-400 leading-relaxed mb-6">Set up your own branded portal in minutes. Choose your features, add your team, configure your sites, and pick your colors. Your portal, your brand.</p>
            <ul className="space-y-3">
              {["Custom color themes", "Pick only the features you need", "Pre-load your officers and sites", "Tutorial walkthrough on first login"].map(item => (
                <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowWlLogin(true)} className="mt-8 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
              Enter setup code <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Officers Managed", val: "10,000+" },
              { label: "Shifts Logged", val: "500K+" },
              { label: "Uptime", val: "99.9%" },
              { label: "Sites Active", val: "2,000+" },
            ].map(({ label, val }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-2xl font-black text-blue-400">{val}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="text-white font-bold text-sm">SecureOps</span>
            <span className="text-gray-600 text-sm">© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-gray-600 text-xs">

            <a href={createPageUrl("OfficerLogin")} className="hover:text-gray-400">Officer Portal</a>
            <a href={createPageUrl("CandidateLogin")} className="hover:text-gray-400">Candidate Portal</a>
            <button
              onClick={() => setShowDevLogin(true)}
              className="hover:text-gray-400 transition-colors"
            >
              Developer
            </button>
          </div>
        </div>
      </footer>

      {/* Whitelabel Code Modal */}
      {showWlLogin && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-bold">Whitelabel Access</h3>
            </div>
            <p className="text-gray-500 text-xs mb-5">Enter your organization's access code to log in or continue setup.</p>
            <form onSubmit={handleWhitelabelLogin} className="space-y-4">
              <input
                type="text"
                value={wlCode}
                onChange={e => setWlCode(e.target.value)}
                placeholder="Enter access code (e.g. 1234)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm tracking-widest font-mono"
                autoFocus
              />
              {wlError && <p className="text-red-400 text-xs">{wlError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowWlLogin(false); setWlCode(""); setWlError(""); }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={wlLoading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {wlLoading ? "Loading..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dev Login Modal */}
      {showDevLogin && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-5 h-5 text-orange-400" />
              <h3 className="text-white font-bold">Developer Access</h3>
            </div>
            <form onSubmit={handleDevLogin} className="space-y-4">
              <input
                type="password"
                value={devCode}
                onChange={e => setDevCode(e.target.value)}
                placeholder="Enter developer code"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm"
                autoFocus
              />
              {devError && <p className="text-red-400 text-xs">{devError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDevLogin(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2.5 rounded-xl text-sm">Enter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Portal Modal */}
      {showRequestPortal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-bold text-lg">Request Your SecureOps Portal</h3>
              </div>
              <p className="text-gray-400 text-xs mt-1">Choose your plan and tell us about your security team</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Contact Form */}
              <div className="space-y-4">
                <input
                  type="text"
                  value={portalForm.name}
                  onChange={e => setPortalForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your Name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                />
                <input
                  type="email"
                  value={portalForm.email}
                  onChange={e => setPortalForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Company Email"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                />
                <input
                  type="text"
                  value={portalForm.company}
                  onChange={e => setPortalForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="Company Name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              {/* Pricing Plans */}
              <div>
                <p className="text-gray-400 text-sm font-semibold mb-3">Select Your Plan</p>
                <div className="space-y-3">
                  <PricingOption
                    title="Startup"
                    users="1 - 50 Officers"
                    price="$30/Month"
                    perUser="+ $4 per active user"
                    selected={portalForm.users === "1-50"}
                    onClick={() => setPortalForm(f => ({ ...f, users: "1-50" }))}
                  />
                  <PricingOption
                    title="Growth"
                    users="51 - 200 Officers"
                    price="$50/Month"
                    perUser="+ $4 per active user"
                    selected={portalForm.users === "51-200"}
                    onClick={() => setPortalForm(f => ({ ...f, users: "51-200" }))}
                  />
                  <PricingOption
                    title="Enterprise"
                    users="200+ Officers"
                    price="$100/Month"
                    perUser="+ $4 per active user"
                    selected={portalForm.users === "200+"}
                    onClick={() => setPortalForm(f => ({ ...f, users: "200+" }))}
                  />
                  <PricingOption
                    title="Whitelabel"
                    users="Custom Branding"
                    price="$150/Month"
                    perUser="+ $4 per active user + custom features"
                    selected={portalForm.users === "whitelabel"}
                    onClick={() => setPortalForm(f => ({ ...f, users: "whitelabel" }))}
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4 text-sm text-blue-300">
                <p className="font-semibold mb-1">✓ 14-day free trial included</p>
                <p className="text-xs text-blue-400">Our team will contact you within 24 hours to set up your portal</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3 sticky bottom-0 bg-gray-900">
              <button
                onClick={() => setShowRequestPortal(false)}
                className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await base44.entities.PortalRequest.create({
                    name: portalForm.name,
                    email: portalForm.email,
                    company: portalForm.company,
                    plan: portalForm.users,
                    status: "pending"
                  });
                  alert(`Thank you for your interest! We'll contact you at ${portalForm.email} soon.`);
                  setShowRequestPortal(false);
                  setPortalForm({ name: "", email: "", company: "", users: "1-50" });
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors"
              >
                Request Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PricingOption({ title, users, price, perUser, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border transition-all text-left ${
        selected
          ? "bg-blue-900/30 border-blue-500 ring-2 ring-blue-500"
          : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-semibold text-sm">{title}</p>
          <p className="text-gray-400 text-xs mt-0.5">{users}</p>
        </div>
        <div className="text-right">
          <p className={`font-bold text-sm ${selected ? "text-blue-400" : "text-white"}`}>{price}</p>
          <p className="text-gray-500 text-xs mt-0.5">{perUser}</p>
        </div>
      </div>
    </button>
  );
}