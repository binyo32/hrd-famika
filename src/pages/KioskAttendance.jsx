import React, { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle, AlertTriangle, Loader2, Camera, Clock, Users, Play } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model";

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export default function KioskAttendance() {
  const [status, setStatus] = useState("loading");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [employeeMap, setEmployeeMap] = useState({});
  const [todayLog, setTodayLog] = useState([]);
  const [currentDetection, setCurrentDetection] = useState(null);
  const [recentCheckin, setRecentCheckin] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [needTap, setNeedTap] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectingRef = useRef(false);
  const checkedInRef = useRef(new Set());
  const cooldownRef = useRef(new Map());
  const faceMatcherRef = useRef(null);
  const employeeMapRef = useRef({});

  useEffect(() => { const id = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await initKiosk();
      else setStatus("auth");
    })();
    return () => { detectingRef.current = false; if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPw });
    if (error) { setLoginError("Login gagal"); return; }
    await initKiosk();
  };

  const initKiosk = async () => {
    setStatus("loading");
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);

      const { data: faceData } = await supabase.from("employee_face_descriptors").select("employee_id, descriptors");
      if (!faceData?.length) { setStatus("error"); return; }

      // Load ALL employees (paginated)
      let employees = [];
      let from = 0;
      while (true) {
        const { data } = await supabase.from("employees").select("id, name, position, division").range(from, from + 999);
        if (!data?.length) break;
        employees.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }
      const empMap = {};
      employees.forEach(e => { empMap[e.id] = e; });
      setEmployeeMap(empMap);
      employeeMapRef.current = empMap;
      setRegisteredCount(faceData.length);

      const labeledDescriptors = faceData.map(fd => {
        const descs = fd.descriptors.map(d => new Float32Array(d));
        return new faceapi.LabeledFaceDescriptors(fd.employee_id, descs);
      });
      const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
      setFaceMatcher(matcher);
      faceMatcherRef.current = matcher;

      await loadTodayLog();
      setStatus("ready");
    } catch (e) {
      console.error("Init error:", e);
      setStatus("error");
    }
  };

  // Start camera AFTER status is ready and video element exists
  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.onloadeddata = () => {
          setCameraReady(true);
          setNeedTap(false);
          detectingRef.current = true;
          setDetecting(true);
          runDetection();
        };
        try {
          await video.play();
        } catch {
          // Autoplay blocked - show tap overlay
          setNeedTap(true);
        }
      } catch (e) {
        console.error("Camera error:", e);
        setNeedTap(true);
      }
    };
    startCam();
    return () => { cancelled = true; };
  }, [status]);

  const handleTapToStart = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (!video.srcObject) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        streamRef.current = stream;
        video.srcObject = stream;
      }
      await video.play();
      setCameraReady(true);
      setNeedTap(false);
      detectingRef.current = true;
      setDetecting(true);
      runDetection();
    } catch (e) { console.error("Tap play error:", e); }
  };

  const loadTodayLog = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("attendance_records").select("employee_id, check_in_time").eq("attendance_date", today).order("check_in_time", { ascending: false }).limit(50);
    if (data) {
      setTodayLog(data);
      checkedInRef.current = new Set(data.map(d => d.employee_id));
    }
  };

  const runDetection = async () => {
    if (!detectingRef.current || !videoRef.current || !faceMatcherRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) { setTimeout(runDetection, 500); return; }

    try {
      const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
      if (detection) {
        const match = faceMatcherRef.current.findBestMatch(detection.descriptor);
        if (match.label !== "unknown" && match.distance < 0.55) {
          const empId = match.label;
          const confidence = Math.round((1 - match.distance) * 100);
          const emp = employeeMapRef.current[empId];
          const alreadyCheckedIn = checkedInRef.current.has(empId);

          setCurrentDetection({ name: emp?.name || "Unknown", confidence, employee: emp, alreadyCheckedIn });

          if (!alreadyCheckedIn) {
            const now = Date.now();
            const lastCheck = cooldownRef.current.get(empId) || 0;
            if (now - lastCheck > 10000) {
              cooldownRef.current.set(empId, now);
              await doCheckIn(empId, emp);
            }
          }
        } else {
          setCurrentDetection(null);
        }
      } else {
        setCurrentDetection(null);
      }
    } catch {}

    if (detectingRef.current) setTimeout(runDetection, 600);
  };

  const doCheckIn = async (employeeId, emp) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();
      const { error } = await supabase.from("attendance_records").insert({
        employee_id: employeeId,
        attendance_date: today,
        check_in_time: now,
        status_id: "H",
        project: "Auto Absen (Face Recognition)",
      });
      if (error) return;

      checkedInRef.current.add(employeeId);
      setRecentCheckin({ name: emp?.name, time: now });
      playSuccessSound();
      await loadTodayLog();
      setTimeout(() => setRecentCheckin(null), 4000);
    } catch {}
  };

  const timeStr = currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Auth screen
  if (status === "auth") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-sm border border-white/20">
        <div className="text-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Kiosk Auto Absen</h1>
          <p className="text-sm text-white/60 mt-1">Login admin untuk mengaktifkan</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email" type="email"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm outline-none focus:border-blue-400" />
          <input value={loginPw} onChange={e => setLoginPw(e.target.value)} placeholder="Password" type="password"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm outline-none focus:border-blue-400" />
          {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}
          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-sm">Aktifkan Kiosk</button>
        </form>
      </motion.div>
    </div>
  );

  if (status === "loading") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
        <p className="text-white/70 text-sm">{modelsLoaded ? "Memuat data karyawan..." : "Memuat model face recognition..."}</p>
      </div>
    </div>
  );

  if (status === "error") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Belum Ada Data Wajah</h2>
        <p className="text-white/60 text-sm mb-4">Minta karyawan buka /face-setup untuk validasi wajah.</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm">Refresh</button>
      </div>
    </div>
  );

  // Main kiosk
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Camera className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Famika Auto Absen</h1>
            <p className="text-[10px] text-white/50">{registeredCount} wajah terdaftar</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white tabular-nums">{timeStr}</p>
          <p className="text-[10px] text-white/50">{dateStr}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 md:p-3 min-h-0 overflow-hidden">
        {/* Camera */}
        <div className="md:flex-1 flex flex-col min-h-0">
          <div className="relative bg-black rounded-xl overflow-hidden flex-1 min-h-[250px]">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />

            {/* Tap to start overlay */}
            {needTap && (
              <button onClick={handleTapToStart}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white">
                <div className="h-20 w-20 rounded-full bg-blue-500/30 flex items-center justify-center mb-3 border-2 border-blue-400">
                  <Play className="h-8 w-8 text-blue-400 ml-1" />
                </div>
                <p className="font-semibold">Tap untuk mulai kamera</p>
                <p className="text-xs text-white/50 mt-1">Izinkan akses kamera saat diminta</p>
              </button>
            )}

            {/* Detection overlay */}
            <AnimatePresence>
              {currentDetection && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                      currentDetection.alreadyCheckedIn
                        ? "bg-gradient-to-br from-amber-500 to-amber-600"
                        : "bg-gradient-to-br from-blue-500 to-purple-600"
                    }`}>
                      {currentDetection.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{currentDetection.name}</p>
                      <p className="text-white/60 text-[11px] truncate">{currentDetection.employee?.position}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {currentDetection.alreadyCheckedIn ? (
                        <div className="flex items-center gap-1 text-amber-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Sudah absen</span>
                        </div>
                      ) : (
                        <p className="text-emerald-400 font-bold text-lg">{currentDetection.confidence}%</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success check-in overlay */}
            <AnimatePresence>
              {recentCheckin && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                  <div className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
                      className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-2xl shadow-emerald-500/40">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </motion.div>
                    <p className="text-white text-xl font-bold">{recentCheckin.name}</p>
                    <p className="text-emerald-400 font-medium text-sm">Check-in berhasil!</p>
                    <p className="text-white/50 text-xs mt-1">{new Date(recentCheckin.time).toLocaleTimeString("id-ID")}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status badge */}
            <div className="absolute top-2 left-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md text-[11px] ${
                cameraReady && detecting ? "bg-emerald-500/80 text-white" : "bg-black/50 text-white/70"
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full ${cameraReady && detecting ? "bg-white animate-pulse" : "bg-red-400"}`} />
                {cameraReady && detecting ? "Mendeteksi..." : "Menunggu kamera..."}
              </div>
            </div>
          </div>
        </div>

        {/* Today log */}
        <div className="w-full md:w-64 lg:w-72 flex-shrink-0 bg-white/5 rounded-xl border border-white/10 flex flex-col overflow-hidden max-h-[30vh] md:max-h-full">
          <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-white/50" />
              <span className="text-xs font-medium text-white">Hari Ini</span>
            </div>
            <span className="text-[10px] text-white/40 bg-white/10 px-1.5 py-0.5 rounded-full">{todayLog.length} hadir</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {todayLog.slice(0, 20).map((log) => {
              const emp = employeeMap[log.employee_id];
              const time = new Date(log.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={`${log.employee_id}-${log.check_in_time}`} className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500/80 to-purple-500/80 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {emp?.name?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[11px] font-medium truncate">{emp?.name || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                    <span className="text-white/60 text-[10px] tabular-nums">{time}</span>
                  </div>
                </div>
              );
            })}
            {todayLog.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-6 w-6 text-white/20 mx-auto mb-1" />
                <p className="text-white/30 text-[10px]">Belum ada yang absen</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
