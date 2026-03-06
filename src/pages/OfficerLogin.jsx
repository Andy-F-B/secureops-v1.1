import { useState } from "react";
import { WhitelabelConfig, Officers as OfficersEntity } from "@/api/supabaseClient";
import { Shield, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function OfficerLogin() {
  const [companyCode, setCompanyCode] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!companyCode || !employeeId || !pin) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const codeUpper = companyCode.trim().toUpperCase();
      const [configs, officers] = await Promise.all([
        WhitelabelConfig.list({ company_code: codeUpper, setup_complete: true }),
        OfficersEntity.list({ employee_id: employeeId.trim(), company_code: codeUpper }),
      ]);

      if (!configs || configs.length === 0) {
        setError("Company code not found.");
        return;
      }
      if (!officers || officers.length === 0) {
        setError("Employee ID not found for this company.");
        return;
      }

      const officer = officers[0];
      if (officer.pin !== pin) {
        setError("Incorrect PIN.");
        return;
      }
      if (officer.status !== "active") {
        setError("Account is inactive. Contact your administrator.");
        return;
      }

      sessionStorage.setItem("secureops_officer", JSON.stringify(officer));
      window.location.href = createPageUrl("Dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SecureOps</h1>
          <p className="text-gray-500 text-sm mt-1">Internal Security Portal</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-white font-semibold text-center mb-6">Officer Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Company Code</label>
              <input
                type="text"
                value={companyCode}
                onChange={e => setCompanyCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="e.g. APEX"
                autoComplete="off"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm font-mono tracking-widest uppercase"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="e.g. OFF001"
                autoComplete="off"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">PIN</label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength={8}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm pr-12"
                />
                <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-center text-xs">
          <p className="text-gray-600">
            Candidate? <a href={createPageUrl("CandidateLogin")} className="text-purple-400 hover:underline">Candidate Portal →</a>
          </p>
          <a href={createPageUrl("Home")} className="flex items-center justify-center gap-1 text-gray-600 hover:text-gray-400 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}