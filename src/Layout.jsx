import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { WhitelabelConfig } from "@/api/supabaseClient";
import {
  LayoutDashboard, Calendar, Clock, Users, MapPin,
  FileText, Award, MessageSquare, ClipboardList,
  ChevronLeft, ChevronRight, Menu, X, Shield,
  LogOut, Bell, Star, Settings
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard", roles: ["admin", "supervisor", "officer", "hr"], feature: null },
  { label: "Schedule", icon: Calendar, page: "Schedule", roles: ["admin", "supervisor", "officer", "hr"], feature: "scheduling" },
  { label: "Clock In/Out", icon: Clock, page: "ClockIn", roles: ["admin", "supervisor", "officer"], feature: "clock_in" },
  { label: "Events", icon: Star, page: "Events", roles: ["admin", "supervisor"], feature: "events" },
  { label: "Timesheets", icon: ClipboardList, page: "Timesheets", roles: ["admin", "supervisor", "hr"], feature: "timesheets" },
  { label: "Officers", icon: Users, page: "Officers", roles: ["admin", "supervisor"], feature: null },
  { label: "Sites", icon: MapPin, page: "Sites", roles: ["admin", "supervisor"], feature: null },
  { label: "SOPs", icon: FileText, page: "SOPs", roles: ["admin", "supervisor", "officer"], feature: "sops" },
  { label: "Certifications", icon: Award, page: "Certifications", roles: ["admin", "supervisor", "officer"], feature: "certifications" },
  { label: "Messages", icon: MessageSquare, page: "Messages", roles: ["admin", "supervisor", "officer", "hr"], feature: "messaging" },
  { label: "HR Dashboard", icon: Users, page: "HRDashboard", roles: ["admin", "hr"], feature: "hr_dashboard" },
  { label: "Training", icon: FileText, page: "Training", roles: ["admin", "hr"], feature: "hr_dashboard" },
  { label: "Audit Log", icon: Shield, page: "AuditLog", roles: ["admin"], feature: "audit_log" },
  { label: "Settings", icon: Settings, page: "Settings", roles: ["admin"], feature: null },
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [officer, setOfficer] = useState(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    return stored ? JSON.parse(stored) : null;
  });
  const [themeHex, setThemeHex] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [featuresEnabled, setFeaturesEnabled] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (stored) setOfficer(JSON.parse(stored));
  }, [currentPageName]);

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (!stored) return;
    const o = JSON.parse(stored);
    if (!o.company_code) return;

    const loadConfig = async () => {
      const configs = await WhitelabelConfig.list({ company_code: o.company_code, setup_complete: true });
      if (configs.length > 0) {
        const cfg = configs[0];
        if (cfg.theme_hex) setThemeHex(cfg.theme_hex);
        if (cfg.company_name) setCompanyName(cfg.company_name);
        if (cfg.logo_url) setLogoUrl(cfg.logo_url);
        if (cfg.features_enabled?.length > 0) setFeaturesEnabled(cfg.features_enabled);
      }
    };

    loadConfig();
  }, []);

  const role = officer?.role || "officer";
  const filtered = navItems.filter(n => {
    if (!n.roles.includes(role)) return false;
    if (featuresEnabled && n.feature && !featuresEnabled.includes(n.feature)) return false;
    return true;
  });

  const handleLogout = () => {
    sessionStorage.removeItem("secureops_officer");
    window.location.href = createPageUrl("OfficerLogin");
  };

  if (["OfficerLogin", "CandidateLogin", "Onboarding", "Home", "WhitelabelSetup", "DevPanel", "Discover"].includes(currentPageName)) return <>{children}</>;

  if (!officer) {
    window.location.replace(createPageUrl("OfficerLogin"));
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <style>{`
      :root {
        --sidebar-w: ${collapsed ? "64px" : "220px"};
        --brand: ${themeHex || "#2563eb"};
      }
      body { background: #030712; color: #f9fafb; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: #111827; }
      ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
      `}</style>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 bg-gray-900 border-r border-gray-800
        flex flex-col transition-all duration-300
        ${collapsed ? "w-16" : "w-56"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 min-h-[64px]">
          {!collapsed && (
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="logo" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <Shield className="w-6 h-6 flex-shrink-0" style={{ color: themeHex || "#3b82f6" }} />
              )}
              <span className="font-bold text-white text-sm">{companyName || "SecureOps"}</span>
            </div>
          )}
          {collapsed && (
            logoUrl
              ? <img src={logoUrl} alt="logo" className="w-7 h-7 rounded-lg object-cover mx-auto" />
              : <Shield className="w-6 h-6 mx-auto" style={{ color: themeHex || "#3b82f6" }} />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white hidden lg:block"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filtered.map(item => {
            const active = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setMobileOpen(false)}
                style={active && themeHex ? { backgroundColor: themeHex } : {}}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group
                  ${active ? (themeHex ? "text-white" : "bg-blue-600 text-white") : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-800">
          {!collapsed && officer && (
            <div className="mb-2 px-2">
              <p className="text-white text-sm font-medium truncate">{officer.full_name}</p>
              <p className="text-gray-500 text-xs capitalize">{officer.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-red-900/30 hover:text-red-400 w-full transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? "lg:ml-16" : "lg:ml-56"}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center justify-between px-4 h-16">
          <button onClick={() => setMobileOpen(true)} className="text-gray-400 lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold">{currentPageName}</h1>
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-white relative">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: themeHex || "#2563eb" }}>
              {officer?.full_name?.charAt(0) || "?"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}