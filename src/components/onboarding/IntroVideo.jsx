import { useState, useRef, useEffect } from "react";
import { CheckCircle, AlertCircle, Play } from "lucide-react";

// Using a public sample video for demo
const DEMO_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4";

export default function IntroVideo({ record, onUpdate }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState(record?.intro_video_status || "not_started");
  const [skipped, setSkipped] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setStatus(record?.intro_video_status || "not_started");
  }, [record]);

  const handleEnded = async () => {
    setStatus("complete");
    setSaved(false);
    await onUpdate({ intro_video_status: "complete", intro_video_watched_seconds: videoRef.current?.duration || 0, intro_video_duration_seconds: videoRef.current?.duration || 0 });
    setSaved(true);
  };

  const handleSeeked = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const pct = vid.currentTime / vid.duration;
    // If they skip more than 10% ahead, mark as incomplete
    if (pct > 0.1 && vid.currentTime > (vid.dataset.lastTime || 0) + vid.duration * 0.12) {
      setSkipped(true);
    }
    vid.dataset.lastTime = vid.currentTime;
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.dataset.lastTime = vid.currentTime;
  };

  const handlePause = async () => {
    const vid = videoRef.current;
    if (!vid || status === "complete") return;
    const pct = vid.currentTime / vid.duration;
    const newStatus = skipped ? "incomplete" : pct < 0.98 ? "incomplete" : "complete";
    if (newStatus !== status) {
      setStatus(newStatus);
      await onUpdate({ intro_video_status: newStatus, intro_video_watched_seconds: vid.currentTime, intro_video_duration_seconds: vid.duration });
    }
  };

  const statusConfig = {
    not_started: { color: "text-gray-400", bg: "bg-gray-800", label: "Not Started" },
    incomplete: { color: "text-yellow-400", bg: "bg-yellow-900/30", label: "Incomplete — Must watch fully" },
    complete: { color: "text-green-400", bg: "bg-green-900/30", label: "✓ Video Complete" },
  };
  const sc = statusConfig[status] || statusConfig.not_started;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Welcome to SecureOps</h3>
        <span className={`text-xs px-3 py-1 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
      </div>
      <p className="text-gray-400 text-sm">Please watch the full introduction video before continuing. Skipping ahead will mark the video as incomplete.</p>
      <div className="rounded-xl overflow-hidden border border-gray-700 bg-black aspect-video">
        <video
          ref={videoRef}
          src={DEMO_VIDEO_URL}
          controls
          className="w-full h-full"
          onEnded={handleEnded}
          onSeeked={handleSeeked}
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          controlsList="nodownload"
        />
      </div>
      {status === "complete" && (
        <div className="flex items-center gap-2 text-green-400 bg-green-900/20 border border-green-800/40 rounded-xl p-3">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Video watched completely. You may proceed.</span>
        </div>
      )}
      {status === "incomplete" && (
        <div className="flex items-center gap-2 text-yellow-400 bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-3">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Please watch the entire video without skipping to complete this step.</span>
        </div>
      )}
    </div>
  );
}