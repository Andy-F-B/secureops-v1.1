import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const QUESTIONS = [
  { id: 1, question: "An aggressive individual is approaching a crowd. What do you do FIRST?", options: ["Call for backup immediately", "Intervene physically", "Create a barrier and de-escalate verbally", "Ignore and monitor"], answer: 2 },
  { id: 2, question: "You spot a suspicious unattended bag near the entrance. Your priority is?", options: ["Open the bag to inspect it", "Clear the area and notify security/authorities", "Take photos and post online", "Leave it, it's probably fine"], answer: 1 },
  { id: 3, question: "A fire alarm sounds during a crowded event. You:", options: ["Wait to see if it's real", "Immediately guide people to nearest exits", "Announce it might be a drill", "Look for the fire yourself"], answer: 1 },
  { id: 4, question: "A guest is behaving erratically and appears to be under the influence. You:", options: ["Let them stay if they're not violent", "Quietly escort them to a safe area and contact supervisor", "Yell at them to leave", "Film it for evidence"], answer: 1 },
  { id: 5, question: "Two guests start arguing and it's escalating. You:", options: ["Wait for them to cool down", "Step between them physically", "Calmly approach, separate them, and de-escalate", "Call police immediately"], answer: 2 },
  { id: 6, question: "You notice a colleague accepting money from a guest. You:", options: ["Ignore it, not your business", "Report it to your supervisor immediately", "Confront the colleague in front of guests", "Ask the guest what it was for"], answer: 1 },
  { id: 7, question: "During patrol you find an unlocked door that should be secured. You:", options: ["Lock it and continue patrol without reporting", "Leave it and keep walking", "Lock it and report it to your supervisor", "Leave a note on the door"], answer: 2 },
  { id: 8, question: "A person claims to be a plainclothes officer and asks you to let them in without ID. You:", options: ["Let them in, they're law enforcement", "Request proper identification per protocol", "Call 911 to verify", "Refuse and tell them to leave"], answer: 1 },
  { id: 9, question: "An elderly guest falls and appears injured. Your first action:", options: ["Move them to a comfortable area", "Call for medical help and do not move them unless in danger", "Try to help them stand up", "Find a witness"], answer: 1 },
  { id: 10, question: "You're exhausted at the end of a long shift but your relief hasn't arrived. You:", options: ["Leave anyway — your shift is over", "Stay and notify supervisor of the delay", "Call a friend to cover you informally", "Lock up and go home"], answer: 1 },
];

const TIME_PER_QUESTION = 30;

export default function MockTest({ record, onUpdate }) {
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [done, setDone] = useState(!!record?.mock_test_completed_at);
  const [results, setResults] = useState(record?.mock_test_results || null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!started || done) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          handleAnswer(-1); // auto-skip
          return TIME_PER_QUESTION;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, current, done]);

  const handleAnswer = (optIdx) => {
    clearInterval(timerRef.current);
    const newAnswers = { ...answers, [current]: optIdx };
    setAnswers(newAnswers);
    if (current + 1 >= QUESTIONS.length) {
      finishTest(newAnswers);
    } else {
      setCurrent(c => c + 1);
      setTimeLeft(TIME_PER_QUESTION);
    }
  };

  const finishTest = async (finalAnswers) => {
    let score = 0;
    const details = {};
    QUESTIONS.forEach((q, i) => {
      const chosen = finalAnswers[i];
      const correct = chosen === q.answer;
      if (correct) score++;
      details[i] = { question: q.question, chosen, correct, correctAnswer: q.answer, options: q.options };
    });
    const pct = Math.round((score / QUESTIONS.length) * 100);
    setResults({ score, total: QUESTIONS.length, percentage: pct, details });
    setDone(true);
    await onUpdate({ mock_test_score: pct, mock_test_results: { score, total: QUESTIONS.length, percentage: pct, details }, mock_test_completed_at: new Date().toISOString() });
  };

  const timerColor = timeLeft <= 10 ? "text-red-400" : timeLeft <= 20 ? "text-yellow-400" : "text-green-400";
  const timerBg = timeLeft <= 10 ? "bg-red-900/30 border-red-800/40" : timeLeft <= 20 ? "bg-yellow-900/20 border-yellow-800/40" : "bg-gray-800 border-gray-700";

  if (done && results) {
    return (
      <div className="space-y-5">
        <div className="text-center py-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="inline-block">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${results.percentage >= 70 ? "bg-green-900/40 border-2 border-green-500" : "bg-red-900/40 border-2 border-red-500"}`}>
              <span className={`text-2xl font-bold ${results.percentage >= 70 ? "text-green-400" : "text-red-400"}`}>{results.percentage}%</span>
            </div>
          </motion.div>
          <h3 className="text-white font-bold text-xl">{results.score}/{results.total} Correct</h3>
          <p className="text-gray-400 text-sm mt-1">{results.percentage >= 70 ? "Well done! Your results have been shared with HR." : "Your results have been shared with HR for review."}</p>
        </div>
        <div className="space-y-3">
          {QUESTIONS.map((q, i) => {
            const d = results.details[i];
            return (
              <div key={i} className={`rounded-xl p-4 border ${d.correct ? "bg-green-900/10 border-green-800/40" : "bg-red-900/10 border-red-800/40"}`}>
                <div className="flex items-start gap-2 mb-2">
                  {d.correct ? <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                  <p className="text-white text-sm font-medium">{q.question}</p>
                </div>
                <p className="text-xs text-gray-400 ml-6">Your answer: <span className={d.correct ? "text-green-400" : "text-red-400"}>{d.chosen === -1 ? "Time expired" : q.options[d.chosen]}</span></p>
                {!d.correct && <p className="text-xs text-gray-400 ml-6">Correct: <span className="text-green-400">{q.options[q.answer]}</span></p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-5 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-400" />
        <h3 className="text-white font-bold text-xl">Decision-Making Assessment</h3>
        <p className="text-gray-400 text-sm max-w-sm">10 scenario-based questions. You have <strong className="text-white">30 seconds</strong> per question. Unanswered questions are skipped automatically. Results are sent to HR.</p>
        <button onClick={() => setStarted(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-semibold">
          Start Assessment
        </button>
      </div>
    );
  }

  const q = QUESTIONS[current];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Question {current + 1} of {QUESTIONS.length}</span>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${timerBg}`}>
          <Clock className={`w-4 h-4 ${timerColor}`} />
          <span className={`font-mono font-bold ${timerColor}`}>{timeLeft}s</span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full">
        <motion.div className="h-1.5 bg-purple-500 rounded-full" animate={{ width: `${((current) / QUESTIONS.length) * 100}%` }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
          <p className="text-white text-base font-semibold leading-relaxed">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleAnswer(idx)}
                className="w-full text-left bg-gray-800 hover:bg-purple-900/40 border border-gray-700 hover:border-purple-600 text-gray-300 hover:text-white px-4 py-3 rounded-xl transition-all text-sm">
                <span className="font-mono text-purple-400 mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}