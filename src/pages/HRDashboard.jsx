import { useState, useEffect } from "react";
import { Candidates, OnboardingRecords, OfficerRecords, ClockRecords, Messages, Officers as OfficersEntity, Certifications } from "@/api/supabaseClient";
import { Users, CheckCircle, XCircle, Clock, ClipboardList, FileText, ChevronDown, ChevronUp, Brain, Video, AlertTriangle, X, UserPlus, Trash2, Plus, MessageSquare, Send } from "lucide-react";
import { createPageUrl } from "@/utils";

const STATUS_COLORS = {
  pending: "bg-gray-700 text-gray-400",
  in_progress: "bg-blue-900/40 text-blue-400",
  completed: "bg-purple-900/40 text-purple-400",
  approved: "bg-green-900/40 text-green-400",
  denied: "bg-red-900/40 text-red-400",
};

function AField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-gray-400 text-sm block mb-1">{label}</label>
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
    </div>
  );
}

export default function HRDashboard() {
  const [officer, setOfficer] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [records, setRecords] = useState([]);
  const [officerRecords, setOfficerRecords] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [tab, setTab] = useState("candidates");
  const [expanded, setExpanded] = useState(null);
  const [denyReason, setDenyReason] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [approveForm, setApproveForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCreateCand, setShowCreateCand] = useState(false);
  const [createCandForm, setCreateCandForm] = useState({});
  const [creatingCand, setCreatingCand] = useState(false);
  const [chatCand, setChatCand] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (!stored) { window.location.href = createPageUrl("OfficerLogin"); return; }
    const o = JSON.parse(stored);
    setOfficer(o);
    if (!["admin", "hr"].includes(o.role)) { window.location.href = createPageUrl("Dashboard"); return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    const stored = sessionStorage.getItem("secureops_officer");
    const me = stored ? JSON.parse(stored) : null;
    const cc = me?.company_code;

    const [cands, recs, orecs, ts, allMsgs] = await Promise.all([
      Candidates.list({ company_code: cc }),
      OnboardingRecords.list({ company_code: cc }),
      OfficerRecords.list({ company_code: cc }),
      ClockRecords.list({ company_code: cc }),
      Messages.list({ channel: "direct", company_code: cc }),
    ]);

    setCandidates(cands);
    setRecords(recs);
    setOfficerRecords(orecs);
    setTimesheets(ts);

    // Compute unread per candidate
    const unread = {};
    for (const cand of cands) {
      const key = `cand_${cand.id}`;
      const msgs = allMsgs.filter(m => m.site_id === key && m.sender_id === cand.id && !(m.read_by || []).includes(me?.id));
      if (msgs.length > 0) unread[cand.id] = msgs.length;
    }
    setUnreadCounts(unread);
    setLoading(false);
  };

  const getRecord = (candidateId) => records.find(r => r.candidate_id === candidateId);

  const openApproveModal = async (cand) => {
    const rec = getRecord(cand.id);
    const allOfficers = await OfficersEntity.list({ company_code: officer?.company_code });
    const nums = allOfficers
      .map(o => parseInt((o.employee_id || "").replace(/\D/g, ""), 10))
      .filter(n => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const nextId = `OFF${String(nextNum).padStart(3, "0")}`;

    const docs = rec?.documents_uploaded || [];
    const licenseDoc = docs.find(d => d.type === "guard_card" || d.label?.toLowerCase().includes("guard") || d.label?.toLowerCase().includes("license"));

    setApproveForm({
      full_name: cand.full_name,
      email: cand.email || "",
      phone: cand.phone || "",
      employee_id: nextId,
      pin: "1234",
      role: "officer",
      status: "active",
      hire_date: new Date().toISOString().split("T")[0],
      emergency_contact_name: cand.emergency_contact_name || "",
      emergency_contact_phone: cand.emergency_contact_phone || "",
      address: cand.address || "",
      date_of_birth: cand.date_of_birth || "",
      notes: `Onboarding: ${cand.candidate_id}. Test score: ${rec?.mock_test_score ?? "N/A"}%. Video: ${rec?.intro_video_status || "N/A"}. Docs uploaded: ${docs.length}.`,
      _licenseDoc: licenseDoc || null,
      _guardCardNumber: cand.guard_card_number || "",
      _hasGuardCard: cand.has_guard_card || false,
    });
    setApproveModal({ cand, rec });
  };

  const confirmApprove = async () => {
    setSaving(true);
    const { cand } = approveModal;
    const { _licenseDoc, _guardCardNumber, _hasGuardCard, ...officerData } = approveForm;

    const newOfficer = await OfficersEntity.create({ ...officerData, company_code: officer?.company_code });

    if (_hasGuardCard || _guardCardNumber || _licenseDoc) {
      await Certifications.create({
        officer_id: newOfficer.id,
        officer_name: officerData.full_name,
        type: "guard_license",
        title: "Guard Card",
        ...(_licenseDoc ? { file_url: _licenseDoc.file_url } : {}),
        status: "approved",
        company_code: officer?.company_code,
      });
    }

    await Candidates.update(cand.id, {
      onboarding_status: "approved",
      approved_by: officer.full_name,
    });

    setApproveModal(null);
    setSaving(false);
    await loadAll();
  };

  const openCreateCandidate = async () => {
    const allCands = await Candidates.list({ company_code: officer?.company_code });
    const nums = allCands
      .map(c => parseInt((c.candidate_id || "").replace(/\D/g, ""), 10))
      .filter(n => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const nextId = `CAND${String(nextNum).padStart(3, "0")}`;
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    setCreateCandForm({ candidate_id: nextId, pin, onboarding_status: "pending", onboarding_step: 0, onboarding_percentage: 0 });
    setShowCreateCand(true);
  };

  const handleCreateCandidate = async () => {
    setCreatingCand(true);
    const stored = sessionStorage.getItem("secureops_officer");
    const me = stored ? JSON.parse(stored) : null;
    await Candidates.create({ ...createCandForm, company_code: me?.company_code });
    setShowCreateCand(false);
    setCreatingCand(false);
    loadAll();
  };

  const openChat = async (cand) => {
    setChatCand(cand);
    const msgs = await Messages.list({ site_id: `cand_${cand.id}`, channel: "direct" });
    setChatMessages(msgs);
    setUnreadCounts(prev => ({ ...prev, [cand.id]: 0 }));
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    await Messages.create({
      sender_id: officer.id,
      sender_name: officer.full_name,
      recipient_id: chatCand.id,
      site_id: `cand_${chatCand.id}`,
      channel: "direct",
      content: chatInput.trim(),
      read_by: [officer.id],
      company_code: officer?.company_code,
    });
    setChatInput("");
    const msgs = await Messages.list({ site_id: `cand_${chatCand.id}`, channel: "direct" });
    setChatMessages(msgs);
  };

  const denyCandidate = async (cand) => {
    const reason = denyReason[cand.id] || "";
    setProcessingId(cand.id);
    await Candidates.update(cand.id, { onboarding_status: "denied", denial_reason: reason });
    await loadAll();
    setProcessingId(null);
    setDenyReason(d => ({ ...d, [cand.id]: "" }));
  };

  const deleteCandidate = async (e, cand) => {
    e.stopPropagation();
    if (!window.confirm(`Delete candidate "${cand.full_name}"?`)) return;
    await Candidates.delete(cand.id);
    const rec = getRecord(cand.id);
    if (rec) await OnboardingRecords.delete(rec.id);
    loadAll();
  };

  const deleteOfficerRecord = async (r) => {
    if (!window.confirm("Delete this record?")) return;
    await OfficerRecords.delete(r.id);
    loadAll();
  };

  if (loading) return <div className="text-gray-400 py-10 text-center">Loading HR Dashboard...</div>;

  const pendingCount = candidates.filter(c => ["pending", "in_progress", "completed"].includes(c.onboarding_status)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">HR Dashboard</h2>
          <p className="text-gray-500 text-sm">Manage candidates, disciplinary records, and timesheets</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-800/40 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" /> {pendingCount} pending review
          </div>
          <button onClick={openCreateCandidate} className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> New Candidate
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {[
          { id: "candidates", label: "Candidates", icon: Users },
          { id: "disciplinary", label: "Disciplinary", icon: AlertTriangle },
          { id: "timesheets", label: "Timesheets", icon: ClipboardList },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm whitespace-nowrap ${tab === t.id ? "text-blue-400 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* CANDIDATES TAB */}
      {tab === "candidates" && (
        <div className="space-y-4">
          {candidates.length === 0 && <p className="text-gray-500 text-sm">No candidates yet.</p>}
          {candidates.map(cand => {
            const rec = getRecord(cand.id);
            const isExpanded = expanded === cand.id;
            return (
              <div key={cand.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : cand.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-900/40 rounded-full flex items-center justify-center text-purple-400 font-bold">
                      {cand.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{cand.full_name}</p>
                      <p className="text-gray-500 text-xs">{cand.candidate_id} • {cand.email || "No email"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLORS[cand.onboarding_status] || STATUS_COLORS.pending}`}>
                      {cand.onboarding_status}
                    </span>
                    {rec && <span className="text-xs text-purple-400 font-bold">{rec.overall_percentage || 0}%</span>}
                    <button onClick={(e) => { e.stopPropagation(); openChat(cand); }} className="relative text-purple-400 hover:text-purple-300">
                      <MessageSquare className="w-4 h-4" />
                      {unreadCounts[cand.id] > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                          {unreadCounts[cand.id] > 9 ? "9+" : unreadCounts[cand.id]}
                        </span>
                      )}
                    </button>
                    {officer?.role === "admin" && (
                      <button onClick={(e) => deleteCandidate(e, cand)} className="text-red-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {isExpanded && rec && (
                  <div className="border-t border-gray-800 p-5 space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: "Intro Video", value: rec.intro_video_status, icon: Video, done: rec.intro_video_status === "complete" },
                        { label: "Questionnaire", value: rec.questionnaire_complete ? "Complete" : "Pending", icon: ClipboardList, done: rec.questionnaire_complete },
                        { label: "Documents", value: `${(rec.documents_uploaded || []).length} uploaded`, icon: FileText, done: (rec.documents_uploaded || []).length >= 2 },
                        { label: "Schedule", value: rec.schedule_acknowledged ? "Confirmed" : "Pending", icon: Clock, done: rec.schedule_acknowledged },
                        { label: "Assessment", value: rec.mock_test_completed_at ? `${rec.mock_test_score}%` : "Not taken", icon: Brain, done: !!rec.mock_test_completed_at },
                      ].map(item => (
                        <div key={item.label} className={`p-3 rounded-xl border text-center ${item.done ? "border-green-800/40 bg-green-900/10" : "border-gray-700 bg-gray-800"}`}>
                          <item.icon className={`w-4 h-4 mx-auto mb-1 ${item.done ? "text-green-400" : "text-gray-500"}`} />
                          <p className="text-xs text-gray-400">{item.label}</p>
                          <p className={`text-xs font-medium mt-0.5 ${item.done ? "text-green-400" : "text-gray-500"}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {rec.questionnaire_answers && Object.keys(rec.questionnaire_answers).length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Questionnaire Answers</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(rec.questionnaire_answers).map(([key, val]) => (
                            <div key={key} className="bg-gray-800 rounded-lg px-3 py-2">
                              <p className="text-gray-500 text-xs capitalize">{key.replace(/_/g, " ")}</p>
                              <p className="text-white text-sm">{val}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.mock_test_results && (
                      <div>
                        <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Assessment Results</p>
                        <div className="bg-gray-800 rounded-xl p-4">
                          <div className="flex items-center gap-4 mb-3">
                            <span className={`text-2xl font-bold ${rec.mock_test_score >= 70 ? "text-green-400" : "text-red-400"}`}>{rec.mock_test_score}%</span>
                            <div>
                              <p className="text-white text-sm">{rec.mock_test_results.score}/{rec.mock_test_results.total} correct</p>
                              <p className="text-gray-500 text-xs">{rec.mock_test_results.percentage >= 70 ? "Passed" : "Needs review"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {(rec.documents_uploaded || []).length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Uploaded Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.documents_uploaded.map((doc, i) => (
                            <a key={i} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-gray-800 border border-gray-700 text-blue-400 hover:underline px-3 py-1.5 rounded-lg flex items-center gap-1">
                              <FileText className="w-3 h-3" /> {doc.label || doc.file_name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {!["approved", "denied"].includes(cand.onboarding_status) && (
                      <div className="space-y-3 pt-2 border-t border-gray-800">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button onClick={() => openApproveModal(cand)} disabled={processingId === cand.id}
                            className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex-1 disabled:opacity-50">
                            <UserPlus className="w-4 h-4" /> Approve & Create Officer
                          </button>
                          <div className="flex gap-2 flex-1">
                            <input value={denyReason[cand.id] || ""} onChange={e => setDenyReason(d => ({ ...d, [cand.id]: e.target.value }))}
                              placeholder="Denial reason..."
                              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                            <button onClick={() => denyCandidate(cand)} disabled={processingId === cand.id}
                              className="flex items-center gap-1 bg-red-900/50 hover:bg-red-800 text-red-300 px-4 py-2 rounded-xl text-sm disabled:opacity-50">
                              <XCircle className="w-4 h-4" /> Deny
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {cand.onboarding_status === "approved" && (
                      <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-xl text-sm">
                        <CheckCircle className="w-4 h-4" /> Approved by {cand.approved_by}
                      </div>
                    )}
                    {cand.onboarding_status === "denied" && (
                      <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-xl text-sm">
                        <XCircle className="w-4 h-4" /> Denied — {cand.denial_reason || "No reason provided"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DISCIPLINARY TAB */}
      {tab === "disciplinary" && (
        <div className="space-y-3">
          {officerRecords.length === 0 && <p className="text-gray-500 text-sm">No disciplinary records.</p>}
          {officerRecords.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{r.officer_name}</p>
                  <p className="text-gray-400 text-sm capitalize">{r.type?.replace(/_/g, " ")} — {r.date}</p>
                  {r.reason && <p className="text-gray-500 text-xs mt-1">{r.reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    r.type === "commendation" || r.type === "promotion" ? "bg-green-900/40 text-green-400" :
                    r.type === "termination" ? "bg-red-900/40 text-red-400" :
                    "bg-yellow-900/40 text-yellow-400"
                  }`}>{r.type?.replace(/_/g, " ")}</span>
                  {officer?.role === "admin" && (
                    <button onClick={() => deleteOfficerRecord(r)} className="text-red-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE CANDIDATE MODAL */}
      {showCreateCand && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold flex items-center gap-2"><UserPlus className="w-5 h-5 text-purple-400" /> New Candidate</h3>
              <button onClick={() => setShowCreateCand(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Candidate ID</label>
                  <input value={createCandForm.candidate_id || ""} onChange={e => setCreateCandForm(f => ({ ...f, candidate_id: e.target.value.toUpperCase() }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">PIN (auto-generated)</label>
                  <input value={createCandForm.pin || ""} onChange={e => setCreateCandForm(f => ({ ...f, pin: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500" maxLength={4} />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Full Name *</label>
                <input value={createCandForm.full_name || ""} onChange={e => setCreateCandForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Email</label>
                <input type="email" value={createCandForm.email || ""} onChange={e => setCreateCandForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Phone</label>
                <input value={createCandForm.phone || ""} onChange={e => setCreateCandForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg p-3 text-xs text-purple-300">
                The candidate can log in at the <strong>Candidate Portal</strong> using their Candidate ID and PIN above.
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setShowCreateCand(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={handleCreateCandidate} disabled={creatingCand || !createCandForm.full_name}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {creatingCand ? "Creating..." : "Create Candidate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {chatCand && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg flex flex-col" style={{ height: "500px" }}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-white font-semibold text-sm">{chatCand.full_name}</span>
                <span className="text-gray-500 text-xs">{chatCand.candidate_id}</span>
              </div>
              <button onClick={() => setChatCand(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && <p className="text-gray-600 text-sm text-center pt-10">No messages yet. Start the conversation.</p>}
              {chatMessages.map(msg => {
                const isMe = msg.sender_id === officer.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${isMe ? "bg-purple-700 text-white" : "bg-gray-800 text-gray-200"}`}>
                      {!isMe && <p className="text-purple-400 text-xs mb-1 font-medium">{msg.sender_name}</p>}
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-800 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
              <button onClick={sendChatMessage} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE MODAL */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-white font-bold flex items-center gap-2"><UserPlus className="w-5 h-5 text-green-400" /> Create Officer Account</h3>
              <button onClick={() => setApproveModal(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-3 text-xs text-green-300">
                Approving <strong>{approveModal.cand.full_name}</strong>. Review and confirm the officer profile below. PIN defaults to 1234.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AField label="Full Name" value={approveForm.full_name} onChange={v => setApproveForm(f => ({ ...f, full_name: v }))} />
                <AField label="Employee ID" value={approveForm.employee_id} onChange={v => setApproveForm(f => ({ ...f, employee_id: v }))} />
                <AField label="Email" value={approveForm.email} onChange={v => setApproveForm(f => ({ ...f, email: v }))} />
                <AField label="Phone" value={approveForm.phone} onChange={v => setApproveForm(f => ({ ...f, phone: v }))} />
                <AField label="PIN" value={approveForm.pin} onChange={v => setApproveForm(f => ({ ...f, pin: v }))} />
                <AField label="Hire Date" value={approveForm.hire_date} onChange={v => setApproveForm(f => ({ ...f, hire_date: v }))} type="date" />
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Role</label>
                  <select value={approveForm.role} onChange={e => setApproveForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                    <option value="officer">Officer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="hr">HR</option>
                  </select>
                </div>
                <AField label="Address" value={approveForm.address} onChange={v => setApproveForm(f => ({ ...f, address: v }))} />
              </div>
              <div className="border-t border-gray-800 pt-3">
                <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <AField label="Name" value={approveForm.emergency_contact_name} onChange={v => setApproveForm(f => ({ ...f, emergency_contact_name: v }))} />
                  <AField label="Phone" value={approveForm.emergency_contact_phone} onChange={v => setApproveForm(f => ({ ...f, emergency_contact_phone: v }))} />
                </div>
              </div>
              {approveForm._hasGuardCard && (
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-300">
                  ✓ Guard card detected — will be added to certifications automatically.
                  {approveForm._licenseDoc && <span className="block text-blue-400 mt-1">Document: {approveForm._licenseDoc.label}</span>}
                </div>
              )}
              <div className="border-t border-gray-800 pt-3">
                <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Onboarding Notes (auto-generated)</p>
                <textarea value={approveForm.notes} onChange={e => setApproveForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-xs resize-none focus:outline-none" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setApproveModal(null)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={confirmApprove} disabled={saving}
                className="px-5 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? "Creating..." : "Confirm & Create Officer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TIMESHEETS TAB */}
      {tab === "timesheets" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left px-5 py-3">Officer</th>
                  <th className="text-left px-5 py-3">Site</th>
                  <th className="text-right px-5 py-3">Clock In</th>
                  <th className="text-right px-5 py-3">Hours</th>
                  <th className="text-right px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.slice(0, 50).map(r => (
                  <tr key={r.id} className="border-b border-gray-800/50 text-gray-300 hover:bg-gray-800/30">
                    <td className="px-5 py-3">{r.officer_name}</td>
                    <td className="px-5 py-3 text-gray-500">{r.site_name || "—"}</td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">{r.clock_in_time ? new Date(r.clock_in_time).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3 text-right">{r.total_hours?.toFixed(2) || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === "approved" ? "bg-green-900/40 text-green-400" :
                        r.status === "clocked_in" ? "bg-blue-900/40 text-blue-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}