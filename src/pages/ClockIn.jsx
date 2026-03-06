import { useState, useEffect } from "react";
import { Shifts, ClockRecords } from "@/api/supabaseClient";
import { Clock, MapPin, CheckCircle, AlertTriangle, LogIn, LogOut } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

export default function ClockIn() {
  const [officer, setOfficer] = useState(null);
  const [todayShifts, setTodayShifts] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("idle");

  useEffect(() => {
    const stored = sessionStorage.getItem("secureops_officer");
    if (stored) {
      const o = JSON.parse(stored);
      setOfficer(o);
      loadData(o);
    }
  }, []);

  const loadData = async (o) => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");

    // Get today's shifts for this company, then filter to ones assigned to this officer
    const allShifts = await Shifts.list({ date: today, company_code: o.company_code });
    const myShifts = allShifts.filter(s => s.assigned_officers?.includes(o.id));
    setTodayShifts(myShifts);

    // Get active clock-in record if one exists
    const records = await ClockRecords.list({ officer_id: o.id, status: "clocked_in" });
    setActiveRecord(records[0] || null);
    setLoading(false);
  };

  const getGPS = () => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    setGpsStatus("getting");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsStatus("got");
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setGpsStatus("denied");
        resolve(null);
      }
    );
  });

  const handleClockIn = async (shift) => {
    setActionLoading(true);
    const now = new Date().toISOString();
    const loc = await getGPS();

    const scheduledStart = new Date(`${shift.date}T${shift.start_time}`);
    const lateMinutes = differenceInMinutes(new Date(), scheduledStart);
    const flags = lateMinutes > 10 ? ["late"] : [];

    const record = await ClockRecords.create({
      officer_id: officer.id,
      officer_name: officer.full_name,
      shift_id: shift.id,
      site_id: shift.site_id,
      site_name: shift.site_name,
      clock_in_time: now,
      clock_in_lat: loc?.lat,
      clock_in_lng: loc?.lng,
      status: "clocked_in",
      flags,
      company_code: officer.company_code,
    });
    setActiveRecord(record);
    setActionLoading(false);
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    const now = new Date().toISOString();
    const loc = await getGPS();

    const inTime = new Date(activeRecord.clock_in_time);
    const outTime = new Date(now);
    const totalHours = Math.round((outTime - inTime) / 36000) / 100;

    await ClockRecords.update(activeRecord.id, {
      clock_out_time: now,
      clock_out_lat: loc?.lat,
      clock_out_lng: loc?.lng,
      total_hours: totalHours,
      status: "clocked_out",
    });

    setActiveRecord(null);
    loadData(officer);
    setActionLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <p className="text-gray-400 text-sm">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        <h2 className="text-white text-xl font-bold mt-1">Clock In / Out</h2>
      </div>

      {/* Active clock-in */}
      {activeRecord && (
        <div className="bg-green-900/20 border border-green-700 rounded-2xl p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-green-400 font-semibold text-lg">Currently Clocked In</p>
          <p className="text-white font-bold text-xl mt-1">{activeRecord.site_name}</p>
          <p className="text-gray-400 text-sm mt-1">
            Since {format(new Date(activeRecord.clock_in_time), "HH:mm")}
          </p>
          {activeRecord.flags?.includes("late") && (
            <div className="mt-3 flex items-center justify-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4" /> Late clock-in flagged
            </div>
          )}
          <button
            onClick={handleClockOut}
            disabled={actionLoading}
            className="mt-5 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {actionLoading ? "Processing..." : "Clock Out"}
          </button>
        </div>
      )}

      {/* Today's shifts */}
      {!activeRecord && (
        <div className="space-y-4">
          {todayShifts.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No shifts assigned for today.</p>
            </div>
          ) : (
            todayShifts.map(shift => (
              <div key={shift.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{shift.site_name}</h3>
                    <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {shift.start_time} – {shift.end_time}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded-full">
                    {shift.status}
                  </span>
                </div>
                <button
                  onClick={() => handleClockIn(shift)}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  {actionLoading ? "Processing..." : "Clock In"}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {gpsStatus === "denied" && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-3 flex items-center gap-2 text-yellow-400 text-sm">
          <MapPin className="w-4 h-4 flex-shrink-0" /> GPS unavailable – location not recorded
        </div>
      )}
    </div>
  );
}