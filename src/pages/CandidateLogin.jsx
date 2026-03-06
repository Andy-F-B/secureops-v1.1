import { useState } from "react";
import { WhitelabelConfig, Candidates } from "@/api/supabaseClient";
import { Shield, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function CandidateLogin() {
  const [companyCode, setCompanyCode] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const codeUpper = companyCode.trim().toUpperCase();
    const idUpper = candidateId.trim().toUpperCase();

    if (!codeUpper || !idUpper || !pin) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      // Verify company code exists and setup is complete
      const configs = await WhitelabelConfig.list({ company_code: codeUpper, setup_complete: true });
      if (!configs || configs.length === 0) {
        setError("Company code not found. Please check with your administrator.");
        setLoading(false);
        return;
      }

      // Find candidate by ID and company code
      const results = await Candidates.list({ candidate_id: idUpper, company_code: codeUpper });
      if (!results || results.length === 0) {
        setError("Candidate not found for this company.");
        setLoading(false);
        return;
      }

      const candidate = results[0];
      if (candidate.pin !== pin) {
        setError("Incorrect PIN.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("secureops_candidate", JSON.stringify(candidate));
      window.location.href = createPageUrl("Onboarding");
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Candidate Portal</h1>
          <p className="text-gray-400 text-sm mt-1">SecureOps Onboarding</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Company Code</label>
              <input
                value={companyCode}
                onChange={e => setCompanyCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="e.g. APEX"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 font-mono tracking-widest uppercase"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Candidate ID</label>
              <input
                value={candidateId}
                onChange={e => setCandidateId(e.target.value.toUpperCase())}
                placeholder="CAND001"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">PIN</label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                />
                <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-3.5 text-gray-500">
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Enter Portal"}
            </button>
          </form>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-center text-xs">
          <p className="text-gray-600">
            Staff? <a href={createPageUrl("OfficerLogin")} className="text-blue-400 hover:underline">Officer Login →</a>
          </p>
          <a href={createPageUrl("Home")} className="flex items-center justify-center gap-1 text-gray-600 hover:text-gray-400 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}