import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Star, MapPin, Shield, Clock, Users, TrendingUp, UserCheck, UserX, CheckCircle, Mail, Globe, Calendar } from "lucide-react";
import { computeScore } from "../../pages/Discover";

export default function CompanyProfileModal({ company, onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const name = company.company_name || company.group_name || "Unnamed";

  useEffect(() => {
    if (!company.share_analytics || !company.company_code) {
      setLoading(false);
      return;
    }
    Promise.all([
      base44.entities.ClockRecord.filter({ company_code: company.company_code }, "-created_date", 500),
      base44.entities.Officer.filter({ company_code: company.company_code, status: "active" }, "full_name", 200),
      base44.entities.Candidate.filter({ company_code: company.company_code }, "-created_date", 200),
      base44.entities.Shift.filter({ company_code: company.company_code }, "-date", 200),
    ]).then(([clocks, officers, candidates, shifts]) => {
      const completed = clocks.filter(r => ["clocked_out", "approved"].includes(r.status));
      const onTimeRate = completed.length > 0
        ? completed.filter(r => !(r.flags || []).includes("late")).length / completed.length
        : null;
      const approvalRate = completed.length > 0
        ? clocks.filter(r => r.status === "approved").length / completed.length
        : null;
      const hireRate = candidates.length > 0
        ? candidates.filter(c => c.onboarding_status === "approved").length / candidates.length
        : null;
      const denyRate = candidates.length > 0
        ? candidates.filter(c => c.onboarding_status === "denied").length / candidates.length
        : null;
      const missedRate = clocks.length > 0
        ? clocks.filter(r => r.status === "missed").length / clocks.length
        : null;
      const avgHours = completed.length > 0
        ? completed.reduce((s, r) => s + (r.total_hours || 0), 0) / completed.length
        : null;
      const score = computeScore(clocks, officers, candidates);

      setAnalytics({
        score,
        onTimeRate,
        approvalRate,
        hireRate,
        denyRate,
        missedRate,
        avgHours,
        totalOfficers: officers.length,
        totalShifts: shifts.length,
        totalClocks: clocks.length,
        totalCandidates: candidates.length,
      });
      setLoading(false);
    });
  }, [company]);

  const stars = analytics ? Math.round(analytics.score) : null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0"
                style={{ backgroundColor: company.theme_hex || "#2563eb" }}>
                {name.charAt(0)}
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">{name}</h2>
                {company.public_tagline && <p className="text-gray-400 text-sm mt-0.5">{company.public_tagline}</p>}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {company.founded_year && (
                    <span className="text-gray-500 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Est. {company.founded_year}</span>
                  )}
                  {company.contact_email && (
                    <a href={`mailto:${company.contact_email}`} className="text-blue-400 text-xs flex items-center gap-1 hover:underline"><Mail className="w-3 h-3" /> {company.contact_email}</a>
                  )}
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs flex items-center gap-1 hover:underline"><Globe className="w-3 h-3" /> Website</a>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Operating Areas & Services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(company.operating_areas || []).length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase mb-2 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Operating Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {company.operating_areas.map(a => (
                    <span key={a} className="text-xs text-gray-300 bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {(company.service_types || []).length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase mb-2 flex items-center gap-1.5"><Shield className="w-3 h-3" /> Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {company.service_types.map(s => (
                    <span key={s} className="text-xs text-blue-300 bg-blue-900/20 border border-blue-800/40 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Analytics */}
          {!company.share_analytics ? (
            <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 text-center">
              <Shield className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm font-medium">Analytics are private</p>
              <p className="text-gray-600 text-xs mt-1">This company has not opted in to public analytics sharing.</p>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : analytics ? (
            <>
              {/* Overall Score */}
              <div className="bg-gradient-to-br from-yellow-900/30 to-gray-900 border border-yellow-800/40 rounded-2xl p-5">
                <p className="text-gray-400 text-xs font-semibold uppercase mb-3">Overall Performance Score</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-7 h-7 ${i <= stars ? "text-yellow-400 fill-yellow-400" : "text-gray-700"}`} />
                    ))}
                  </div>
                  <div>
                    <span className="text-yellow-400 text-3xl font-black">{analytics.score.toFixed(1)}</span>
                    <span className="text-gray-500 text-sm"> / 5.0</span>
                  </div>
                </div>
                <p className="text-gray-500 text-xs mt-2">Based on punctuality, approval rate, hire rate, team size & shift completion.</p>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {analytics.onTimeRate !== null && (
                  <MetricCard
                    icon={Clock}
                    label="On-Time Rate"
                    value={`${(analytics.onTimeRate * 100).toFixed(0)}%`}
                    color={analytics.onTimeRate >= 0.85 ? "green" : analytics.onTimeRate >= 0.7 ? "yellow" : "red"}
                    sub="shifts started on time"
                  />
                )}
                {analytics.approvalRate !== null && (
                  <MetricCard
                    icon={CheckCircle}
                    label="Approval Rate"
                    value={`${(analytics.approvalRate * 100).toFixed(0)}%`}
                    color={analytics.approvalRate >= 0.7 ? "green" : "yellow"}
                    sub="timesheets approved"
                  />
                )}
                {analytics.hireRate !== null && (
                  <MetricCard
                    icon={UserCheck}
                    label="Hire Rate"
                    value={`${(analytics.hireRate * 100).toFixed(0)}%`}
                    color="blue"
                    sub="candidates approved"
                  />
                )}
                {analytics.denyRate !== null && (
                  <MetricCard
                    icon={UserX}
                    label="Decline Rate"
                    value={`${(analytics.denyRate * 100).toFixed(0)}%`}
                    color={analytics.denyRate <= 0.3 ? "green" : "red"}
                    sub="candidates declined"
                  />
                )}
                {analytics.missedRate !== null && (
                  <MetricCard
                    icon={TrendingUp}
                    label="Completion Rate"
                    value={`${((1 - analytics.missedRate) * 100).toFixed(0)}%`}
                    color={(1 - analytics.missedRate) >= 0.9 ? "green" : "yellow"}
                    sub="shifts completed"
                  />
                )}
                <MetricCard
                  icon={Users}
                  label="Active Officers"
                  value={analytics.totalOfficers}
                  color="purple"
                  sub="current team size"
                />
              </div>

              {analytics.avgHours !== null && (
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Avg shift length</span>
                  <span className="text-white font-bold">{analytics.avgHours.toFixed(1)} hrs</span>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, sub }) {
  const colors = {
    green: "text-green-400 bg-green-900/20 border-green-800/40",
    yellow: "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
    red: "text-red-400 bg-red-900/20 border-red-800/40",
    blue: "text-blue-400 bg-blue-900/20 border-blue-800/40",
    purple: "text-purple-400 bg-purple-900/20 border-purple-800/40",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <Icon className="w-4 h-4 mb-2 opacity-80" />
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-semibold mt-0.5 opacity-90">{label}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}