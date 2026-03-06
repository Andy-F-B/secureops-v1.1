import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Shield, Lock, Trash2, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Plus, Bell, Check, X, TrendingUp } from "lucide-react";
import ConfigDetail from "@/components/devpanel/ConfigDetail";

export default function DevPanel() {
  const [authed, setAuthed] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [adminForms, setAdminForms] = useState({});
  const [newCode, setNewCode] = useState("");
  const [newCodeError, setNewCodeError] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("configurations");
  const [portalRequests, setPortalRequests] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [socialAnalytics, setSocialAnalytics] = useState(null);
  const [requestsLoading, setRequestsLoading] = useState(false);

  useEffect(() => {
    const dev = sessionStorage.getItem("secureops_dev");
    if (dev === "true") {
      setAuthed(true);
      loadConfigs();
      loadPortalRequests();
      loadBillingData();
      loadSocialAnalytics();
    }
  }, []);

  const loadPortalRequests = async () => {
    const requests = await base44.entities.PortalRequest.list("-created_date", 50);
    setPortalRequests(requests);
  };

  const loadBillingData = async () => {
    const data = await base44.entities.CustomerBilling.list("-created_date", 50);
    setBillingData(data);
  };

  const loadSocialAnalytics = async () => {
    const data = await base44.entities.SocialAnalytics.list("-metric_date", 1);
    if (data.length > 0) setSocialAnalytics(data[0]);
  };

  const loadConfigs = async () => {
    setLoading(true);
    const all = await base44.entities.WhitelabelConfig.list("-created_date", 50);
    setConfigs(all);
    setLoading(false);
  };

  const deleteConfig = async (cfg) => {
    if (!window.confirm(`Delete ALL data for code ${cfg.code} (${cfg.company_name || "unnamed"})? This cannot be undone.`)) return;
    setActionLoading(prev => ({ ...prev, [cfg.id]: "deleting" }));
    await base44.entities.WhitelabelConfig.delete(cfg.id);
    await loadConfigs();
    setActionLoading(prev => ({ ...prev, [cfg.id]: null }));
  };

  const resetConfig = async (cfg) => {
    if (!window.confirm(`Reset setup for code ${cfg.code}? This will clear all their answers and start fresh.`)) return;
    setActionLoading(prev => ({ ...prev, [cfg.id]: "resetting" }));
    await base44.entities.WhitelabelConfig.update(cfg.id, {
      setup_complete: false,
      setup_step: 0,
      answers: {},
      features_enabled: [],
      company_name: "",
      theme_color: "blue",
      theme_hex: "",
      initial_admins: [],
      initial_officers: [],
      initial_sites: [],
    });
    await loadConfigs();
    setActionLoading(prev => ({ ...prev, [cfg.id]: null }));
  };

  const saveAdminProfile = async (cfg, form) => {
    setActionLoading(prev => ({ ...prev, [cfg.id]: "saving" }));
    await base44.entities.WhitelabelConfig.update(cfg.id, {
      default_admin_name: form.name,
      default_admin_id: form.employee_id,
      default_admin_role: form.role,
      default_admin_pin: form.pin,
    });
    await loadConfigs();
    setActionLoading(prev => ({ ...prev, [cfg.id]: null }));
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const createCode = async (e) => {
    e.preventDefault();
    const trimmed = newCode.trim();
    if (!trimmed) { setNewCodeError("Please enter a code."); return; }
    if (configs.find(c => c.code === trimmed)) { setNewCodeError("This code already exists."); return; }
    setCreating(true);
    setNewCodeError("");
    await base44.entities.WhitelabelConfig.create({
      code: trimmed,
      setup_step: 0,
      setup_complete: false,
      features_enabled: [],
    });
    setNewCode("");
    await loadConfigs();
    setCreating(false);
  };

  const approveRequest = async (request) => {
    setRequestsLoading(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await base44.entities.PortalRequest.update(request.id, { status: "approved" });
    await base44.entities.WhitelabelConfig.create({
      code,
      company_name: request.company,
      setup_step: 0,
      setup_complete: false,
      features_enabled: [],
    });
    await base44.entities.CustomerBilling.create({
      company_code: code,
      company_name: request.company,
      plan: request.plan,
      monthly_charge: getPricingByPlan(request.plan),
      active_users: 0,
      status: "upcoming",
      next_charge_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    await loadPortalRequests();
    setRequestsLoading(false);
  };

  const denyRequest = async (request) => {
    setRequestsLoading(true);
    await base44.entities.PortalRequest.update(request.id, { status: "denied" });
    await loadPortalRequests();
    setRequestsLoading(false);
  };

  const getPricingByPlan = (plan) => {
    const pricing = { "1-50": 30, "51-200": 50, "200+": 100, "whitelabel": 150 };
    return pricing[plan] || 30;
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-900/30 border border-red-800 rounded-2xl p-8 text-center max-w-sm">
          <Lock className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm mb-5">You must log in via the developer portal on the home screen.</p>
          <a href={createPageUrl("Home")} className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm">← Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Developer Panel</h1>
              <p className="text-gray-500 text-xs">SecureOps Whitelabel Management</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { loadConfigs(); loadPortalRequests(); loadBillingData(); loadSocialAnalytics(); }} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm bg-gray-800 border border-gray-700 px-4 py-2 rounded-xl">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={() => { sessionStorage.removeItem("secureops_dev"); window.location.href = createPageUrl("Home"); }}
              className="text-sm bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 px-4 py-2 rounded-xl">
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-800">
          <button onClick={() => setActiveTab("configurations")} className={`px-4 py-3 font-semibold border-b-2 transition-colors ${activeTab === "configurations" ? "border-orange-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            Configurations
          </button>
          <button onClick={() => setActiveTab("requests")} className={`px-4 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "requests" ? "border-orange-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            <Bell className="w-4 h-4" /> Requests {portalRequests.filter(r => r.status === "pending").length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{portalRequests.filter(r => r.status === "pending").length}</span>}
          </button>
          <button onClick={() => setActiveTab("billing")} className={`px-4 py-3 font-semibold border-b-2 transition-colors ${activeTab === "billing" ? "border-orange-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            Billing
          </button>
          <button onClick={() => setActiveTab("analytics")} className={`px-4 py-3 font-semibold border-b-2 transition-colors ${activeTab === "analytics" ? "border-orange-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            Social Analytics
          </button>
        </div>

        {/* Configurations Tab */}
        {activeTab === "configurations" && (
        <>
        {/* Create New Code */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
          <h2 className="text-white font-semibold mb-3">Create New Setup Code</h2>
          <p className="text-gray-500 text-xs mb-4">Create a code that a customer can use at <span className="text-gray-300">/WhitelabelSetup</span> to configure their portal.</p>
          <form onSubmit={createCode} className="flex gap-3">
            <input
              value={newCode}
              onChange={e => { setNewCode(e.target.value); setNewCodeError(""); }}
              placeholder="e.g. APEX2024 or 7777"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm font-mono"
            />
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating..." : "Create Code"}
            </button>
          </form>
          {newCodeError && <p className="text-red-400 text-xs mt-2">{newCodeError}</p>}
        </div>

        {/* Config List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">All Configurations ({configs.length})</h2>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : configs.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <p className="text-gray-500">No configurations found. Codes have not been used yet.</p>
            </div>
          ) : (
            configs.map(cfg => (
              <div key={cfg.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black font-mono text-sm" style={{ background: cfg.theme_hex || "#2563eb" }}>
                      {cfg.code}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{cfg.company_name || <span className="text-gray-500 italic">No company name</span>}</p>
                      <p className="text-gray-500 text-xs">
                        Step {cfg.setup_step || 0} / 7 •{" "}
                        {cfg.setup_complete ? <span className="text-green-400">Complete</span> : <span className="text-yellow-400">In progress</span>}
                        {" "}• Created {cfg.created_date ? new Date(cfg.created_date).toLocaleDateString() : "unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resetConfig(cfg)}
                      disabled={actionLoading[cfg.id] === "resetting"}
                      className="flex items-center gap-1.5 text-xs bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 border border-yellow-800/50 px-3 py-2 rounded-xl disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {actionLoading[cfg.id] === "resetting" ? "Resetting..." : "Reset"}
                    </button>
                    <button
                      onClick={() => deleteConfig(cfg)}
                      disabled={actionLoading[cfg.id] === "deleting"}
                      className="flex items-center gap-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 px-3 py-2 rounded-xl disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      {actionLoading[cfg.id] === "deleting" ? "Deleting..." : "Delete"}
                    </button>
                    <button onClick={() => toggleExpand(cfg.id)} className="text-gray-500 hover:text-white p-2">
                      {expanded[cfg.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expanded[cfg.id] && (
                  <ConfigDetail
                    cfg={cfg}
                    form={adminForms[cfg.id] || {
                      name: cfg.default_admin_name || "John Smith",
                      employee_id: cfg.default_admin_id || "ADMIN001",
                      role: cfg.default_admin_role || "admin",
                      pin: cfg.default_admin_pin || "1234",
                    }}
                    setForm={(updates) => setAdminForms(prev => ({ ...prev, [cfg.id]: { ...(adminForms[cfg.id] || {}), ...updates } }))}
                    onSave={(form) => saveAdminProfile(cfg, form)}
                    saving={actionLoading[cfg.id] === "saving"}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Warning */}
        <div className="mt-8 bg-orange-900/20 border border-orange-800/40 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-orange-300 text-sm">Deleting a configuration removes all setup data for that code. Officers, sites, and records created in the main portal are <strong>not</strong> automatically deleted (shared database). To fully wipe a tenant's data, delete their officers and sites manually from the portal.</p>
        </div>
        </>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
        <div className="space-y-4">
          <h2 className="text-white font-semibold">Portal Requests</h2>
          {requestsLoading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : portalRequests.filter(r => r.status === "pending").length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <Bell className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No pending requests</p>
            </div>
          ) : (
            portalRequests.filter(r => r.status === "pending").map(req => (
              <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-semibold">{req.company}</p>
                    <p className="text-gray-500 text-xs mt-1">{req.name} • {req.email}</p>
                    <p className="text-gray-400 text-sm mt-2">Plan: <span className="text-blue-400">{req.plan === "1-50" ? "Startup (1-50)" : req.plan === "51-200" ? "Growth (51-200)" : req.plan === "200+" ? "Enterprise (200+)" : "Whitelabel"}</span></p>
                  </div>
                  <span className="bg-yellow-900/30 text-yellow-400 text-xs px-3 py-1 rounded-full">Pending</span>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => denyRequest(req)} disabled={requestsLoading} className="flex items-center gap-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 px-4 py-2 rounded-xl disabled:opacity-50">
                    <X className="w-3 h-3" /> Deny
                  </button>
                  <button onClick={() => approveRequest(req)} disabled={requestsLoading} className="flex items-center gap-1.5 text-xs bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-800/50 px-4 py-2 rounded-xl disabled:opacity-50">
                    <Check className="w-3 h-3" /> Approve & Create Code
                  </button>
                </div>
              </div>
            ))
          )}
          <div className="mt-8">
            <h3 className="text-white font-semibold mb-3">Recent Requests</h3>
            <div className="space-y-2">
              {portalRequests.slice(0, 5).map(req => (
                <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="text-sm">
                    <p className="text-gray-300">{req.company}</p>
                    <p className="text-gray-600 text-xs">{req.status}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${req.status === "approved" ? "bg-green-900/30 text-green-400" : req.status === "denied" ? "bg-red-900/30 text-red-400" : "bg-yellow-900/30 text-yellow-400"}`}>{req.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
        <div className="space-y-4">
          <h2 className="text-white font-semibold">Customer Billing</h2>
          {billingData.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <p className="text-gray-500">No billing data</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {billingData.map(bill => (
                <div key={bill.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-white font-semibold">{bill.company_name}</p>
                      <p className="text-gray-500 text-xs mt-1">{bill.plan}</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${bill.status === "paid" ? "bg-green-900/30 text-green-400" : bill.status === "late" ? "bg-red-900/30 text-red-400" : "bg-blue-900/30 text-blue-400"}`}>{bill.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Monthly Charge</p>
                      <p className="text-white font-semibold">${bill.monthly_charge}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Active Users</p>
                      <p className="text-white font-semibold">{bill.active_users}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Last Payment</p>
                      <p className="text-gray-400 text-xs">{bill.last_payment_date ? new Date(bill.last_payment_date).toLocaleDateString() : "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Next Charge</p>
                      <p className="text-gray-400 text-xs">{bill.next_charge_date ? new Date(bill.next_charge_date).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Social Analytics Tab */}
        {activeTab === "analytics" && (
        <div className="space-y-4">
          <h2 className="text-white font-semibold">SecureSocial Platform Analytics</h2>
          {!socialAnalytics ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No analytics data yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnalyticsCard label="Total Users" value={socialAnalytics.total_users || 0} />
              <AnalyticsCard label="Active Users" value={socialAnalytics.active_users || 0} />
              <AnalyticsCard label="Total Messages" value={socialAnalytics.total_messages || 0} />
              <AnalyticsCard label="Job Postings" value={socialAnalytics.total_job_postings || 0} />
              <AnalyticsCard label="Applications" value={socialAnalytics.total_applications || 0} />
              <AnalyticsCard label="Reviews" value={socialAnalytics.total_reviews || 0} />
              <AnalyticsCard label="New Companies" value={socialAnalytics.new_companies || 0} />
              <AnalyticsCard label="Last Updated" value={new Date(socialAnalytics.metric_date).toLocaleDateString()} isDate />
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsCard({ label, value, isDate }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
      <p className="text-gray-500 text-xs mb-2">{label}</p>
      <p className={`${isDate ? "text-gray-300 text-sm" : "text-white font-bold text-2xl"}`}>{value}</p>
    </div>
  );
}