import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, CheckCircle } from "lucide-react";

const QUESTIONS = [
  { id: "comfortable_uncomfortable", label: "Are you comfortable in uncomfortable or high-pressure situations?", type: "choice", options: ["Yes, very comfortable", "Somewhat comfortable", "I'm working on it", "Not yet"] },
  { id: "has_guard_card", label: "Do you have a guard card?", type: "choice", options: ["Yes", "No", "In progress"] },
  { id: "guard_card_number", label: "If yes, please type your guard card number below:", type: "text", placeholder: "Guard card number (or N/A)", dependsOn: { id: "has_guard_card", value: "Yes" }, conditional: true },
  { id: "prior_security_experience", label: "Do you have prior security or law enforcement experience?", type: "choice", options: ["Yes — Security", "Yes — Law Enforcement", "Yes — Military", "No prior experience"] },
  { id: "availability", label: "What is your availability?", type: "choice", options: ["Full-time", "Part-time", "Weekends only", "On-call / flexible"] },
  { id: "physical_fitness", label: "Would you describe yourself as physically fit and able to stand for long periods?", type: "choice", options: ["Yes", "Mostly yes", "I have some limitations", "No"] },
  { id: "background_check", label: "Do you consent to a background check?", type: "choice", options: ["Yes, I consent", "No"] },
  { id: "transportation", label: "Do you have reliable transportation?", type: "choice", options: ["Yes", "No", "I use public transit"] },
  { id: "emergency_contact_name", label: "What is your emergency contact's name?", type: "text", placeholder: "Full name" },
  { id: "emergency_contact_phone", label: "Emergency contact's phone number?", type: "text", placeholder: "(555) 000-0000" },
];

export default function OnboardingQuestionnaire({ record, onUpdate }) {
  const saved = record?.questionnaire_answers || {};
  const [answers, setAnswers] = useState(saved);
  const [step, setStep] = useState(() => {
    const answeredKeys = Object.keys(saved);
    const firstUnanswered = QUESTIONS.findIndex(q => {
      if (q.conditional && answers[q.dependsOn?.id] !== q.dependsOn?.value) return false;
      return !answeredKeys.includes(q.id);
    });
    return firstUnanswered === -1 ? QUESTIONS.length : firstUnanswered;
  });
  const [done, setDone] = useState(record?.questionnaire_complete || false);
  const [inputVal, setInputVal] = useState("");

  const visibleQuestions = QUESTIONS.filter(q => {
    if (q.conditional) return answers[q.dependsOn?.id] === q.dependsOn?.value;
    return true;
  });

  const currentQ = visibleQuestions[step];
  const progress = Math.round((step / visibleQuestions.length) * 100);

  const handleAnswer = async (val) => {
    const newAnswers = { ...answers, [currentQ.id]: val };
    setAnswers(newAnswers);
    const nextStep = step + 1;
    const isComplete = nextStep >= visibleQuestions.length;
    setStep(nextStep);
    if (isComplete) {
      setDone(true);
      await onUpdate({ questionnaire_answers: newAnswers, questionnaire_complete: true });
    } else {
      await onUpdate({ questionnaire_answers: newAnswers });
    }
    setInputVal("");
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <CheckCircle className="w-16 h-16 text-green-400" />
        </motion.div>
        <h3 className="text-white font-bold text-xl">Questionnaire Complete!</h3>
        <p className="text-gray-400 text-sm">Your answers have been saved and will be reviewed by HR.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Question {step + 1} of {visibleQuestions.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div className="h-2 bg-purple-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentQ && (
          <motion.div key={currentQ.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-4">
            <h3 className="text-white text-lg font-semibold leading-snug">{currentQ.label}</h3>
            {currentQ.type === "choice" ? (
              <div className="space-y-2">
                {currentQ.options.map(opt => (
                  <button key={opt} onClick={() => handleAnswer(opt)}
                    className="w-full text-left bg-gray-800 hover:bg-purple-900/40 border border-gray-700 hover:border-purple-600 text-gray-300 hover:text-white px-4 py-3 rounded-xl transition-all text-sm flex items-center justify-between group">
                    {opt}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <input value={inputVal} onChange={e => setInputVal(e.target.value)}
                  placeholder={currentQ.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm"
                  onKeyDown={e => e.key === "Enter" && inputVal.trim() && handleAnswer(inputVal.trim())}
                />
                <button onClick={() => inputVal.trim() && handleAnswer(inputVal.trim())}
                  disabled={!inputVal.trim()}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}