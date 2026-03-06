import { useState, useEffect } from "react";
import { WhitelabelConfig, ClockRecords, Officers as OfficersEntity, Candidates } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { Shield, MapPin, Search, Star, ArrowLeft, ChevronRight, Zap } from "lucide-react";
import CompanyProfileModal from "../components/discover/CompanyProfileModal";

export default function Discover() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    WhitelabelConfig.list({ public_listing: true, setup_complete: true }).then(res => {
      setCompanies(res);
      setLoading(false);
    });
  }, []);

  const allAreas = [...new Set(companies.flatMap(c => c.operating_areas || []))].sort();
  const allServices = [...new Set(companies.flatMap(c => c.service_types || []))].sort();

  const filtered = companies.filter(c => {
    const name = c.company_name || c.group_name || "";
    if (search && !name.toLowerCase().includes(search.toLowerCase()) &&
      !(c.operating_areas || []).some(a => a.toLowerCase().includes(search.toLowerCase()))) return false;
    if (areaFilter && !(c.operating_areas || []).includes(areaFilter)) return false;
    if (serviceFilter && !(c.service_types || []).includes(serviceFilter)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href={createPageUrl("Home")} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-white">SecureOps</span>
            <span className="text-gray-600 mx-2">/</span>
            <span className="text-gray-300 text-sm">Discover Companies</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-800/50 text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <Zap className="w-3 h-3" /> Live Directory
          </div>
          <h1 className="text-4xl font-black mb-3">Find Your Security Partner</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Browse verified security companies, compare performance scores, and find the right team for your event.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by company name or location..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">All Areas</option>
            {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">All Services</option>
            {allServices.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
                <div className="w-12 h-12 bg-gray-800 rounded-xl mb-4" />
                <div className="h-4 bg-gray-800 rounded mb-2 w-3/4" />
                <div className="h-3 bg-gray-800 rounded mb-4 w-1/2" />
                <div className="h-3 bg-gray-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No companies found</p>
            <p className="text-gray-600 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-5">
              {filtered.length} company{filtered.length !== 1 ? "ies" : "y"} listed
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(company => (
                <CompanyCard key={company.id} company={company} onClick={() => setSelected(company)} />
              ))}
            </div>
          </>
        )}
      </div>

      {selected && (
        <CompanyProfileModal company={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function CompanyCard({ company, onClick }) {
  const name = company.company_name || company.group_name || "Unnamed Company";
  const initial = name.charAt(0).toUpperCase();
  const areas = (company.operating_areas || []).slice(0, 3);
  const services = (company.service_types || []).slice(0, 2);

  return (
    <button onClick={onClick} className="bg-gray-900 border border-gray-800 hover:border-blue-700 rounded-2xl p-6 text-left transition-all group w-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
          style={{ backgroundColor: company.theme_hex || "#2563eb" }}>
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold truncate">{name}</h3>
          {company.public_tagline && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{company.public_tagline}</p>}
          {company.founded_year && <p className="text-gray-600 text-xs mt-0.5">Est. {company.founded_year}</p>}
        </div>
        {company.share_analytics && <StarScore companyCode={company.company_code} small />}
      </div>

      {areas.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
          {areas.map(a => (
            <span key={a} className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{a}</span>
          ))}
          {(company.operating_areas || []).length > 3 && (
            <span className="text-xs text-gray-600">+{company.operating_areas.length - 3}</span>
          )}
        </div>
      )}

      {services.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {services.map(s => (
            <span key={s} className="text-xs text-blue-400 bg-blue-900/20 border border-blue-800/40 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-800">
        <span className="text-xs text-gray-600">{company.share_analytics ? "Analytics shared" : "Private company"}</span>
        <span className="text-xs text-blue-400 group-hover:underline flex items-center gap-1">
          View Profile <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

function StarScore({ companyCode, small }) {
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (!companyCode) return;
    Promise.all([
      ClockRecords.list({ company_code: companyCode }),
      OfficersEntity.list({ company_code: companyCode, status: "active" }),
      Candidates.list({ company_code: companyCode }),
    ]).then(([clocks, officers, candidates]) => {
      setScore(computeScore(clocks, officers, candidates));
    });
  }, [companyCode]);

  if (score === null) return null;

  const stars = Math.round(score);
  if (small) {
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
        <span className="text-yellow-400 text-xs font-bold">{score.toFixed(1)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-5 h-5 ${i <= stars ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`} />
      ))}
      <span className="text-yellow-400 font-bold ml-1">{score.toFixed(1)}</span>
    </div>
  );
}

export function computeScore(clocks, officers, candidates) {
  let total = 0;
  let count = 0;

  const completed = clocks.filter(r => ["clocked_out", "approved"].includes(r.status));
  if (completed.length > 0) {
    const onTime = completed.filter(r => !(r.flags || []).includes("late")).length;
    total += (onTime / completed.length) * 5;
    count++;
  }

  if (completed.length > 0) {
    const approved = clocks.filter(r => r.status === "approved").length;
    total += Math.min((approved / Math.max(completed.length, 1)) * 5 * 2, 5);
    count++;
  }

  if (candidates.length > 0) {
    const hired = candidates.filter(c => c.onboarding_status === "approved").length;
    const hireRate = hired / candidates.length;
    const hireScore = hireRate > 0.1 && hireRate < 0.7 ? 5 : hireRate >= 0.7 ? 3 : 2;
    total += hireScore;
    count++;
  }

  if (officers.length > 0) {
    total += Math.min((officers.length / 20) * 5, 5);
    count++;
  }

  if (clocks.length > 0) {
    const missed = clocks.filter(r => r.status === "missed").length;
    const completionRate = 1 - (missed / clocks.length);
    total += completionRate * 5;
    count++;
  }

  if (count === 0) return 3.0;
  return Math.min(Math.max(total / count, 1), 5);
}