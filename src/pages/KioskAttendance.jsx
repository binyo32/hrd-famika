import React, { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle, AlertTriangle, Loader2, Camera, Clock, Users, X } from "lucide-react";
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
  const [status, setStatus] = useState("loading"); // loading, auth, ready, error
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [employeeMap, setEmployeeMap] = useState({});
  const [todayLog, setTodayLog] = useState([]);
  const [currentDetection, setCurrentDetection] = useState(null); // { name, confidence, employee }
  const [recentCheckin, setRecentCheckin] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectingRef = useRef(false);
  const checkedInRef = useRef(new Set());
  const cooldownRef = useRef(new Map());

  // Clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Check auth on mount
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { await initKiosk(); }
      else { setStatus("auth"); }
    })();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPw });
    if (error) { setLoginError("Login gagal: " + error.message); return; }
    await initKiosk();
  };

  const initKiosk = async () => {
    setStatus("loading");
    try {
      // Load models
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);

      // Load all face descriptors
      const { data: faceData } = await supabase.from("employee_face_descriptors").select("employee_id, descriptors");
      if (!faceData?.length) { setStatus("error"); return; }

      // Load ALL employee info (for today log names)
      const { data: employees } = await supabase.from("employees").select("id, name, position, division");
      const empMap = {};
      employees?.forEach(e => { empMap[e.id] = e; });
      setEmployeeMap(empMap);
      setRegisteredCount(faceData.length);

      // Build face matcher
      const labeledDescriptors = faceData.map(fd => {
        const descs = fd.descriptors.map(d => new Float32Array(d));
        return new faceapi.LabeledFaceDescriptors(fd.employee_id, descs);
      });
      setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.55));

      // Load today's attendance
      await loadTodayLog();

      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 1280, height: 720 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }

      setStatus("ready");
      setTimeout(() => startDetection(), 1000);
    } catch (e) {
      console.error("Init error:", e);
      setStatus("error");
    }
  };

  const loadTodayLog = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("attendance_records").select("employee_id, check_in_time").eq("attendance_date", today).order("check_in_time", { ascending: false });
    if (data) {
      setTodayLog(data);
      checkedInRef.current = new Set(data.map(d => d.employee_id));
    }
  };

  const startDetection = useCallback(() => {
    if (detectingRef.current) return;
    detectingRef.current = true;
    setDetecting(true);

    const detect = async () => {
      if (!detectingRef.current || !videoRef.current || !faceMatcher) return;
      try {
        const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
        if (detection) {
          const match = faceMatcher.findBestMatch(detection.descriptor);
          if (match.label !== "unknown" && match.distance < 0.55) {
            const empId = match.label;
            const confidence = Math.round((1 - match.distance) * 100);
            const emp = employeeMap[empId];
            setCurrentDetection({ name: emp?.name || "Unknown", confidence, employee: emp });

            // Auto check-in (with cooldown)
            const now = Date.now();
            const lastCheck = cooldownRef.current.get(empId) || 0;
            if (!checkedInRef.current.has(empId) && now - lastCheck > 10000) {
              cooldownRef.current.set(empId, now);
              await doCheckIn(empId, emp);
            }
          } else {
            setCurrentDetection(null);
          }
        } else {
          setCurrentDetection(null);
        }
      } catch {}

      if (detectingRef.current) requestAnimationFrame(() => setTimeout(detect, 500));
    };
    detect();
  }, [faceMatcher, employeeMap]);

  useEffect(() => {
    if (status === "ready" && faceMatcher && Object.keys(employeeMap).length) {
      startDetection();
    }
  }, [status, faceMatcher, employeeMap, startDetection]);

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
      if (error) { console.error("Checkin error:", error); return; }

      checkedInRef.current.add(employeeId);
      setRecentCheckin({ name: emp?.name, time: now });
      playSuccessSound();

      // Refresh log
      await loadTodayLog();
      setTimeout(() => setRecentCheckin(null), 4000);
    } catch (e) { console.error("Checkin error:", e); }
  };

  const timeStr = currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Auth screen
  if (status === "auth") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-sm border border-white/20">
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Kiosk Auto Absen</h1>
            <p className="text-sm text-white/60 mt-1">Login admin untuk mengaktifkan kiosk</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email admin" type="email"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm outline-none focus:border-blue-400" />
            <input value={loginPw} onChange={e => setLoginPw(e.target.value)} placeholder="Password" type="password"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm outline-none focus:border-blue-400" />
            {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}
            <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-sm hover:from-blue-600 hover:to-purple-700 transition-all">
              Aktifkan Kiosk
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Loading
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white/70 text-sm">{modelsLoaded ? "Memuat data wajah karyawan..." : "Memuat model face recognition..."}</p>
        </div>
      </div>
    );
  }

  // Error
  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Belum Ada Data Wajah</h2>
          <p className="text-white/60 text-sm mb-4">Belum ada karyawan yang mendaftarkan wajah. Minta karyawan untuk membuka halaman Validasi Wajah terlebih dahulu.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700">Refresh</button>
        </div>
      </div>
    );
  }

  // Main kiosk view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Famika Auto Absen</h1>
            <p className="text-xs text-white/50">{registeredCount} wajah terdaftar</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white tabular-nums">{timeStr}</p>
          <p className="text-xs text-white/50">{dateStr}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 md:p-4 min-h-0 overflow-hidden">
        {/* Camera section */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] md:flex-1 md:aspect-auto">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

            {/* Detection overlay */}
            <AnimatePresence>
              {currentDetection && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {currentDetection.name?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{currentDetection.name}</p>
                      <p className="text-white/60 text-xs">{currentDetection.employee?.position} &middot; {currentDetection.employee?.division}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold text-lg">{currentDetection.confidence}%</p>
                      <p className="text-white/40 text-[10px]">match</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success overlay */}
            <AnimatePresence>
              {recentCheckin && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
                      className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/40">
                      <CheckCircle className="h-12 w-12 text-white" />
                    </motion.div>
                    <p className="text-white text-2xl font-bold mb-1">{recentCheckin.name}</p>
                    <p className="text-emerald-400 font-medium">Check-in berhasil!</p>
                    <p className="text-white/50 text-sm mt-1">{new Date(recentCheckin.time).toLocaleTimeString("id-ID")}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <div className={`h-2 w-2 rounded-full ${detecting ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              <span className="text-white/70 text-xs">{detecting ? "Mendeteksi wajah..." : "Memulai..."}</span>
            </div>
          </div>

          <p className="text-center text-white/30 text-xs mt-2 hidden md:block">Arahkan wajah ke kamera untuk absen otomatis</p>
        </div>

        {/* Today's log */}
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0 bg-white/5 rounded-2xl border border-white/10 flex flex-col overflow-hidden max-h-[35vh] md:max-h-full">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/50" />
              <span className="text-sm font-medium text-white">Hari Ini</span>
            </div>
            <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">{todayLog.length} hadir</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence>
              {todayLog.slice(0, 20).map((log, i) => {
                const emp = employeeMap[log.employee_id];
                const time = new Date(log.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                return (
                  <motion.div key={log.employee_id} initial={i === 0 ? { opacity: 0, x: 20 } : false} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500/80 to-purple-500/80 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {emp?.name?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{emp?.name || "Unknown"}</p>
                      <p className="text-white/40 text-[10px] truncate">{emp?.position}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                      <span className="text-white/60 text-xs tabular-nums">{time}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {todayLog.length === 0 && (
              <div className="text-center py-12">
                <Clock className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/30 text-xs">Belum ada yang absen</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
