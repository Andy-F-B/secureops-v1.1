import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, MessageSquare, Users, Megaphone, UserCircle } from "lucide-react";
import { format } from "date-fns";

export default function Messages() {
  const [officer, setOfficer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [sites, setSites] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [candidateChats, setCandidateChats] = useState({});
  const [channel, setChannel] = useState("broadcast");
  const [recipientId, setRecipientId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [selectedCandId, setSelectedCandId] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const bottomRef = useRef(null);

  const isHR = (o) => o?.role === "admin" || o?.role === "hr";

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (stored) {
      const o = JSON.parse(stored);
      setOfficer(o);
      loadData(o);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === "create") {
        setMessages(prev => [...prev, event.data]);
        // Update unread counts for candidate chats
        const msg = event.data;
        if (msg.channel === "direct" && msg.site_id?.startsWith("cand_")) {
          const candId = msg.site_id.replace("cand_", "");
          if (msg.sender_id !== officer?.id) {
            setUnreadCounts(prev => ({ ...prev, [candId]: (prev[candId] || 0) + 1 }));
          }
        }
      }
    });
    return unsubscribe;
  }, [officer]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, candidateChats, selectedCandId]);

  const loadData = async (o) => {
    const cc = o?.company_code;
    const [m, of, si] = await Promise.all([
      cc ? base44.entities.Message.filter({ company_code: cc }, "-created_date", 100) : base44.entities.Message.list("-created_date", 100),
      cc ? base44.entities.Officer.filter({ status: "active", company_code: cc }, "full_name") : base44.entities.Officer.filter({ status: "active" }, "full_name"),
      cc ? base44.entities.Site.filter({ status: "active", company_code: cc }, "name") : base44.entities.Site.filter({ status: "active" }, "name"),
    ]);
    setMessages(m.reverse());
    setOfficers(of.filter(x => x.id !== o.id));
    setSites(si);

    if (isHR(o)) {
      const cc = o?.company_code;
      const cands = cc
        ? await base44.entities.Candidate.filter({ company_code: cc }, "-created_date", 100)
        : await base44.entities.Candidate.list("-created_date", 100);
      setCandidates(cands);

      // Load all candidate chat messages & compute unread per candidate
      const allCandMsgs = await base44.entities.Message.filter({ channel: "direct" }, "-created_date", 500);
      const chatMap = {};
      const unread = {};
      for (const cand of cands) {
        const key = `cand_${cand.id}`;
        const msgs = allCandMsgs.filter(msg => msg.site_id === key).reverse();
        chatMap[cand.id] = msgs;
        // Count messages from candidate (not from HR/officer) that aren't read by current officer
        const unreadCount = msgs.filter(msg => msg.sender_id === cand.id && !(msg.read_by || []).includes(o.id)).length;
        if (unreadCount > 0) unread[cand.id] = unreadCount;
      }
      setCandidateChats(chatMap);
      setUnreadCounts(unread);
    }
  };

  const openCandidateChat = async (candId) => {
    setSelectedCandId(candId);
    // Mark as read
    setUnreadCounts(prev => ({ ...prev, [candId]: 0 }));
    const msgs = await base44.entities.Message.filter({ site_id: `cand_${candId}`, channel: "direct" }, "created_date", 100);
    setCandidateChats(prev => ({ ...prev, [candId]: msgs }));
  };

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    if (channel === "candidates" && selectedCandId) {
      await base44.entities.Message.create({
        sender_id: officer.id,
        sender_name: officer.full_name,
        site_id: `cand_${selectedCandId}`,
        channel: "direct",
        content: text.trim(),
        read_by: [officer.id],
        company_code: officer.company_code,
      });
      setText("");
      setSending(false);
      const msgs = await base44.entities.Message.filter({ site_id: `cand_${selectedCandId}`, channel: "direct" }, "created_date", 100);
      setCandidateChats(prev => ({ ...prev, [selectedCandId]: msgs }));
      return;
    }
    await base44.entities.Message.create({
      sender_id: officer.id,
      sender_name: officer.full_name,
      channel,
      recipient_id: channel === "direct" ? recipientId : undefined,
      site_id: channel === "site" ? siteId : undefined,
      content: text.trim(),
      read_by: [officer.id],
      company_code: officer.company_code,
    });
    setText("");
    setSending(false);
    loadData(officer);
  };

  const visibleMessages = messages.filter(m => {
    if (m.channel === "broadcast") return channel === "broadcast";
    if (m.channel === "direct" && channel === "direct") return m.sender_id === officer?.id || m.recipient_id === officer?.id;
    if (m.channel === "site" && channel === "site" && siteId) return m.site_id === siteId;
    if (channel === "site" && !siteId && m.channel === "site") return true;
    return false;
  });

  const isAdmin = officer?.role === "admin" || officer?.role === "supervisor";
  const selectedCand = candidates.find(c => c.id === selectedCandId);
  const candMessages = selectedCandId ? (candidateChats[selectedCandId] || []) : [];
  const totalCandUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Channel selector */}
      <div className="flex border-b border-gray-800 bg-gray-900/90 overflow-x-auto">
        <ChannelBtn active={channel === "broadcast"} onClick={() => setChannel("broadcast")} icon={Megaphone} label="Announcements" />
        <ChannelBtn active={channel === "site"} onClick={() => setChannel("site")} icon={Users} label="Site Chat" />
        <ChannelBtn active={channel === "direct"} onClick={() => setChannel("direct")} icon={MessageSquare} label="Direct" />
        {isHR(officer) && (
          <ChannelBtn active={channel === "candidates"} onClick={() => setChannel("candidates")} icon={UserCircle} label="Candidates" badge={totalCandUnread} />
        )}
      </div>

      {/* Sub-selector */}
      {channel === "site" && (
        <div className="px-4 py-2 border-b border-gray-800">
          <select value={siteId} onChange={e => setSiteId(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm">
            <option value="">All Sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      {channel === "direct" && (
        <div className="px-4 py-2 border-b border-gray-800">
          <select value={recipientId} onChange={e => setRecipientId(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm">
            <option value="">Select officer...</option>
            {officers.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
          </select>
        </div>
      )}

      {/* Candidate chat layout */}
      {channel === "candidates" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Candidate list */}
          <div className="w-56 flex-shrink-0 border-r border-gray-800 overflow-y-auto">
            {candidates.length === 0 && <p className="text-gray-600 text-xs p-4">No candidates.</p>}
            {candidates.map(cand => {
              const unread = unreadCounts[cand.id] || 0;
              const isSelected = selectedCandId === cand.id;
              return (
                <button key={cand.id} onClick={() => openCandidateChat(cand.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-800 text-left hover:bg-gray-800 transition-colors ${isSelected ? "bg-gray-800" : ""}`}>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-purple-900/60 flex items-center justify-center text-purple-300 text-sm font-bold">
                      {cand.full_name?.charAt(0)}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{cand.full_name}</p>
                    <p className="text-gray-600 text-xs">{cand.candidate_id}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedCandId ? (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">Select a candidate to view chat</div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/80">
                  <p className="text-white text-sm font-semibold">{selectedCand?.full_name}</p>
                  <p className="text-gray-500 text-xs">{selectedCand?.candidate_id}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {candMessages.length === 0 && <p className="text-gray-600 text-sm text-center pt-10">No messages yet.</p>}
                  {candMessages.map(msg => {
                    const isMe = msg.sender_id === officer?.id;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                        <div className="w-7 h-7 rounded-full bg-purple-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                          {msg.sender_name?.charAt(0)}
                        </div>
                        <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                          <p className={`text-xs text-gray-500 mb-1 ${isMe ? "text-right" : ""}`}>
                            {msg.sender_name} • {msg.created_date ? format(new Date(msg.created_date), "HH:mm") : ""}
                          </p>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-purple-700 text-white" : "bg-gray-800 text-gray-200"}`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <div className="p-4 border-t border-gray-800 flex gap-3">
                  <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="Message candidate..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500" />
                  <button onClick={send} disabled={sending || !text.trim()} className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl disabled:opacity-50">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Normal message channels */}
      {channel !== "candidates" && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {visibleMessages.map(m => {
              const isMe = m.sender_id === officer?.id;
              return (
                <div key={m.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className="w-7 h-7 rounded-full bg-blue-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {m.sender_name?.charAt(0)}
                  </div>
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    <p className={`text-xs text-gray-500 mb-1 ${isMe ? "text-right" : ""}`}>
                      {m.sender_name} • {m.created_date ? format(new Date(m.created_date), "HH:mm") : ""}
                    </p>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                      isMe ? "bg-blue-700 text-white" : m.channel === "broadcast" ? "bg-yellow-900/40 border border-yellow-800 text-yellow-200" : "bg-gray-800 text-gray-200"
                    }`}>
                      {m.channel === "broadcast" && !isMe && <p className="text-yellow-400 text-xs font-semibold mb-1">📢 Announcement</p>}
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-gray-800">
            {channel === "broadcast" && !isAdmin ? (
              <p className="text-gray-600 text-sm text-center py-2">Only command staff can send announcements.</p>
            ) : (
              <div className="flex gap-3">
                <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder={`Message via ${channel}...`}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
                <button onClick={send} disabled={sending || !text.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ChannelBtn({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors whitespace-nowrap relative ${active ? "text-blue-400 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
      <Icon className="w-4 h-4" /> {label}
      {badge > 0 && (
        <span className="absolute top-1.5 right-2 bg-red-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}