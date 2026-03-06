import { useState, useEffect } from "react";
import { Shifts, ClockRecords, Officers as OfficersEntity, Candidates } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, Users, AlertTriangle, Calendar, CheckCircle, TrendingUp, MapPin, Bell, MessageSquare, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const [officer, setOfficer] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [clockRecords, setClockRecords] = useState([]);
  const [allOfficers, setAllOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hrNotifications, setHrNotifications] = useState([]);

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

    if (["admin", "supervisor"].includes(o.role)) {
      const [s, cr, officers] = await Promise.all([
        Shifts.list({ status: "scheduled", company_code: cc }),
        ClockRecords.list({ status: "clocked_in", company_code: cc }),
        OfficersEntity.list({ status: "active", company_code: cc }),
      ]);
      setShifts(s);
      setClockRecords(cr);
      setAllOfficers(officers);
    }

    if (["admin", "hr"].includes(o.role)) {
      const cands = await Candidates.list({ company_code: cc });
      const pending = cands.filter(c => ["pending", "in_progress", "completed"].includes(c.onboarding_status));
      const approved = cands.filter(c => c.onboarding_status === "approved").slice(0, 3);
      const denied = cands.filter(c => c.onboarding_status === "denied").slice(0, 3);
      const notifs = [
        ...pending.map(c => ({ type: "pending", name: c.full_name, id: c.candidate_id, status: c.onboarding_status })),
        ...approved.map(c => ({ type: "approved", name: c.full_name, id: c.candidate_id, status: "approved" })),
        ...denied.map(c => ({ type: "denied", name: c.full_name, id: c.candidate_id, status: "denied" })),
      ];
      setHrNotifications(notifs.slice(0, 8));
    }

    if (!["admin", "supervisor"].includes(o.role)) {
      const s = await Shifts.list({ company_code: cc });
      const mine = s.filter(sh => sh.assigned_officers?.includes(o.id));
      setShifts(mine);
      const cr = await ClockRecords.list({ officer_id: o.id });
      setClockRecords(cr);
    }

    setLoading(false);
  };

  const isAdmin = ["admin", "supervisor"].includes(officer?.role);
  const today = format(new Date(), "yyyy-MM-dd");
  const todayShifts = shifts.filter(s => s.date === today);
  const weekHours = clockRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0);
  const activeClockedIn = clockRecords.filter(r => r.status === "clocked_in").length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400">Loading dashboard...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-900/40 to-gray-900 border border-blue-800/50 rounded-2xl p-6">
        <p className="text-blue-400 text-sm mb-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        <h2 className="text-2xl font-bold text-white">Welcome back, {officer?.full_name?.split(" ")[0]}</h2>
        <p className="text-gray-400 text-sm mt-1 capitalize">{officer?.role} • {officer?.rank || "SecureOps"}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin ? (
          <>
            <StatCard icon={Users} label="Active Now" value={activeClockedIn} color="blue" />
            <StatCard icon={Calendar} label="Today's Shifts" value={todayShifts.length} color="green" />
            <StatCard icon={AlertTriangle} label="Late Officers" value={0} color="red" />
            <StatCard icon={TrendingUp} label="Total Officers" value={allOfficers.length} color="purple" />
          </>
        ) : (
          <>
            <StatCard icon={Clock} label="Hours This Week" value={weekHours.toFixed(1)} color="blue" />
            <StatCard icon={Calendar} label="Upcoming Shifts" value={shifts.length} color="green" />
            <StatCard icon={CheckCircle} label="Completed" value={clockRecords.filter(r => r.status === "clocked_out").length} color="purple" />
            <StatCard icon={AlertTriangle} label="Missed" value={clockRecords.filter(r => r.status === "missed").length} color="red" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Shifts / Next Shift */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            {isAdmin ? "Today's Shifts" : "Upcoming Shifts"}
          </h3>
          {todayShifts.length === 0 && shifts.length === 0 ? (
            <p className="text-gray-500 text-sm">No shifts scheduled.</p>
          ) : (
            <div className="space-y-3">
              {(isAdmin ? todayShifts : shifts).slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">{s.site_name}</p>
                    <p className="text-gray-400 text-xs">{s.start_time} – {s.end_time}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    s.status === "active" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-300"
                  }`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
          <Link to={createPageUrl("Schedule")} className="mt-4 block text-blue-400 text-sm hover:underline">
            View full schedule →
          </Link>
        </div>

        {/* Clocked In Officers (admin) / Recent Activity (officer) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-400" />
            {isAdmin ? "Currently Clocked In" : "Recent Clock Records"}
          </h3>
          {clockRecords.length === 0 ? (
            <p className="text-gray-500 text-sm">No active records.</p>
          ) : (
            <div className="space-y-3">
              {clockRecords.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">{isAdmin ? r.officer_name : r.site_name}</p>
                    <p className="text-gray-400 text-xs">
                      In: {r.clock_in_time ? format(new Date(r.clock_in_time), "HH:mm") : "–"}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    r.status === "clocked_in" ? "bg-green-900/50 text-green-400" :
                    r.status === "approved" ? "bg-blue-900/50 text-blue-400" :
                    "bg-gray-700 text-gray-300"
                  }`}>{r.status?.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
          <Link
            to={createPageUrl(isAdmin ? "Timesheets" : "ClockIn")}
            className="mt-4 block text-blue-400 text-sm hover:underline"
          >
            {isAdmin ? "Manage timesheets →" : "Go to Clock In →"}
          </Link>
        </div>
      </div>

      {/* HR Notifications Widget */}
      {["admin", "hr"].includes(officer?.role) && hrNotifications.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-400" />
              HR Notifications
              {hrNotifications.filter(n => n.type === "pending").length > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {hrNotifications.filter(n => n.type === "pending").length}
                </span>
              )}
            </h3>
            <Link to={createPageUrl("HRDashboard")} className="text-purple-400 text-sm hover:underline">
              Open HR Dashboard →
            </Link>
          </div>
          <div className="space-y-2">
            {hrNotifications.map((n, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${
                n.type === "pending" ? "bg-yellow-900/10 border-yellow-800/40" :
                n.type === "approved" ? "bg-green-900/10 border-green-800/40" :
                "bg-red-900/10 border-red-800/40"
              }`}>
                <div className="flex items-center gap-3">
                  {n.type === "pending" ? (
                    <MessageSquare className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  ) : n.type === "approved" ? (
                    <UserCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <UserX className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-white text-sm font-medium">{n.name}</p>
                    <p className="text-gray-500 text-xs">{n.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                  n.type === "pending" ? "bg-yellow-900/40 text-yellow-400" :
                  n.type === "approved" ? "bg-green-900/40 text-green-400" :
                  "bg-red-900/40 text-red-400"
                }`}>{n.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-900/30 text-blue-400 border-blue-800/50",
    green: "bg-green-900/30 text-green-400 border-green-800/50",
    red: "bg-red-900/30 text-red-400 border-red-800/50",
    purple: "bg-purple-900/30 text-purple-400 border-purple-800/50",
  };
  return (
    <div className={`rounded-2xl p-4 border ${colors[color]}`}>
      <Icon className="w-5 h-5 mb-2" />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  );
}