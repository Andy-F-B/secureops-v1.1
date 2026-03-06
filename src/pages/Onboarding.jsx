import { useState, useEffect } from "react";
import { OnboardingRecords, Messages as MessagesEntity } from "@/api/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Video, ClipboardList, FileText, Calendar, Brain, CheckCircle, Lock, ChevronRight, MessageSquare, Send, X } from "lucide-react";
import IntroVideo from "../components/onboarding/IntroVideo";
import OnboardingQuestionnaire from "../components/onboarding/OnboardingQuestionnaire";
import DocumentUploader from "../components/onboarding/DocumentUploader";
import OnboardingSchedule from "../components/onboarding/OnboardingSchedule";
import MockTest from "../components/onboarding/MockTest";
import { createPageUrl } from "@/utils";

const STEPS = [
  { id: "video", label: "Intro Video", icon: Video, description: "Watch the welcome video" },
  { id: "questionnaire", label: "Questionnaire", icon: ClipboardList, description: "Answer onboarding questions" },
  { id: "documents", label: "Documents", icon: FileText, description: "Upload required documents" },
  { id: "schedule", label: "Schedule", icon: Calendar, description: "Book your interview" },
  { id: "assessment", label: "Assessment", icon: Brain, description: "30-sec decision test" },
];

export default function Onboarding() {
  const [candidate, setCandidate] = useState(null);
  const [record, setRecord] = useState(null);
  const [activeStep, setActiveStep] = useState("video");
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_candidate");
    if (!stored) { window.location.href = createPageUrl("CandidateLogin"); return; }
    const cand = JSON.parse(stored);
    setCandidate(cand);
    loadRecord(cand);
  }, []);

  const loadRecord = async (cand) => {
    const records = await OnboardingRecords.list({ candidate_id: cand.id });
    if (records.length > 0) {
      setRecord(records[0]);
    } else {
      const newRecord = await OnboardingRecords.create({
        candidate_id: cand.id,
        candidate_name: cand.full_name,
        company_code: cand.company_code,
      });
      setRecord(newRecord);
    }
    setLoading(false);
  };

  const updateRecord = async (data) => {
    if (!record) return;
    const updated = { ...record, ...data };
    await OnboardingRecords.update(record.id, data);
    const pct = calcPercentage(updated);
    await OnboardingRecords.update(record.id, { overall_percentage: pct });
    setRecord({ ...updated, overall_percentage: pct });
  };

  const calcPercentage = (r) => {
    const checks = [
      r.intro_video_status === "complete",
      r.questionnaire_complete,
      (r.documents_uploaded || []).length >= 2,
      r.schedule_acknowledged,
      !!r.mock_test_completed_at,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  const getStepStatus = (stepId) => {
    if (!record) return "locked";
    switch (stepId) {
      case "video": return record.intro_video_status === "complete" ? "done" : "active";
      case "questionnaire": return record.questionnaire_complete ? "done" : "active";
      case "documents": return (record.documents_uploaded || []).length >= 2 ? "done" : "active";
      case "schedule": return record.schedule_acknowledged ? "done" : "active";
      case "assessment": return record.mock_test_completed_at ? "done" : "active";
      default: return "active";
    }
  };

  const openChat = async (cand) => {
    setShowChat(true);
    setUnreadCount(0);
    const msgs = await MessagesEntity.list({ site_id: `cand_${cand.id}`, channel: "direct" });
    setChatMessages(msgs);
  };

  // Note: Base44's real-time subscribe is not available in Supabase client helper.
  // To add real-time unread notifications, set up a Supabase Realtime channel here.

  const sendMessage = async () => {
    if (!chatInput.trim() || !candidate) return;
    await MessagesEntity.create({
      sender_id: candidate.id,
      sender_name: candidate.full_name,
      site_id: `cand_${candidate.id}`,
      channel: "direct",
      content: chatInput.trim(),
      read_by: [candidate.id],
      company_code: candidate.company_code,
    });
    setChatInput("");
    const msgs = await MessagesEntity.list({ site_id: `cand_${candidate.id}`, channel: "direct" });
    setChatMessages(msgs);
  };

  const pct = record?.overall_percentage || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading your onboarding portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">Welcome, {candidate?.full_name}</h1>
            <p className="text-gray-400 text-sm">Candidate ID: {candidate?.candidate_id}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => openChat(candidate)}
              className="relative flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm border border-purple-800/50 px-3 py-1.5 rounded-lg">
              <MessageSquare className="w-4 h-4" /> Message HR
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { sessionStorage.removeItem("secureops_candidate"); window.location.href = createPageUrl("CandidateLogin"); }}
              className="text-gray-500 hover:text-gray-300 text-sm">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Progress */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold">Onboarding Progress</span>
            <span className="text-purple-400 font-bold text-lg">{pct}%</span>
          </div>
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-3 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          {pct === 100 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" /> All steps complete! HR will review your application.
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar steps */}
          <div className="space-y-2">
            {STEPS.map(step => {
              const status = getStepStatus(step.id);
              const isActive = activeStep === step.id;
              return (
                <button key={step.id} onClick={() => setActiveStep(step.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    isActive ? "border-purple-600 bg-purple-900/20" : "border-gray-800 bg-gray-900 hover:border-gray-600"
                  }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    status === "done" ? "bg-green-900/40" : isActive ? "bg-purple-900/40" : "bg-gray-800"
                  }`}>
                    {status === "done"
                      ? <CheckCircle className="w-5 h-5 text-green-400" />
                      : <step.icon className={`w-5 h-5 ${isActive ? "text-purple-400" : "text-gray-500"}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isActive ? "text-white" : "text-gray-300"}`}>{step.label}</p>
                    <p className="text-xs text-gray-500 truncate">{step.description}</p>
                  </div>
                  {status === "done" && <span className="text-xs text-green-400 flex-shrink-0">✓</span>}
                </button>
              );
            })}
          </div>

          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div key={activeStep}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}>
                  {activeStep === "video" && <IntroVideo record={record} onUpdate={updateRecord} />}
                  {activeStep === "questionnaire" && <OnboardingQuestionnaire record={record} onUpdate={updateRecord} />}
                  {activeStep === "documents" && <DocumentUploader record={record} onUpdate={updateRecord} />}
                  {activeStep === "schedule" && <OnboardingSchedule candidate={candidate} record={record} onUpdate={updateRecord} />}
                  {activeStep === "assessment" && <MockTest record={record} onUpdate={updateRecord} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {getStepStatus(activeStep) === "done" && activeStep !== "assessment" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex justify-end">
                <button onClick={() => {
                  const idx = STEPS.findIndex(s => s.id === activeStep);
                  if (idx < STEPS.length - 1) setActiveStep(STEPS[idx + 1].id);
                }}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                  Continue Onboarding <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* CHAT MODAL */}
      {showChat && candidate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md flex flex-col" style={{ height: "420px" }}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-white font-semibold text-sm">HR Support</span>
              </div>
              <button onClick={() => setShowChat(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-gray-600 text-sm text-center pt-10">Send a message to HR. They'll respond shortly.</p>
              )}
              {chatMessages.map(msg => {
                const isMe = msg.sender_id === candidate.id;
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
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Message HR..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
              <button onClick={sendMessage} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}