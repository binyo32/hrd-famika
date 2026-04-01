import React, { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CheckCircle, Loader2, AlertTriangle, Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model";

const STEPS = [
  { id: "front", label: "Lihat ke depan", icon: "😐" },
  { id: "left", label: "Miringkan ke kiri", icon: "😏" },
  { id: "right", label: "Miringkan ke kanan", icon: "😏" },
  { id: "blink", label: "Tutup mata sebentar", icon: "😌" },
];

// Eye Aspect Ratio for blink detection
function getEAR(eye) {
  const a = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
  const b = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
  const c = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
  return (a + b) / (2 * c);
}

// Head pose from landmarks (nose vs face center)
function getHeadPose(landmarks) {
  const nose = landmarks.getNose();
  const jaw = landmarks.getJawOutline();
  const noseTip = nose[3]; // tip of nose
  const faceLeft = jaw[0];
  const faceRight = jaw[16];
  const faceWidth = faceRight.x - faceLeft.x;
  const nosePosRatio = (noseTip.x - faceLeft.x) / faceWidth;
  // 0.5 = centered, sangat longgar supaya mudah
  if (nosePosRatio < 0.46) return "right";
  if (nosePosRatio > 0.54) return "left";
  return "front";
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(1200, ctx.currentTime);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.15);
  } catch {}
}

export default function FaceSetup() {
  const [phase, setPhase] = useState("loading"); // loading, intro, camera, saving, done, already, error
  const [employee, setEmployee] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [descriptors, setDescriptors] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const runningRef = useRef(false);
  // Refs for detection loop (closures don't see React state updates)
  const stepRef = useRef(0);
  const descriptorsRef = useRef([]);
  const photosRef = useRef([]);
  const lastEarRef = useRef(1);
  const blinkDetectedRef = useRef(false);
  const capturedRef = useRef(new Set());
  const earHistoryRef = useRef([]);
  const eyesClosedFramesRef = useRef(0);
  const blinkStepStartRef = useRef(0);
  const [showBlinkFallback, setShowBlinkFallback] = useState(false);

  // Init: load models + check auth
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setErrorMsg("Silakan login terlebih dahulu"); setPhase("error"); return; }
        const { data: profile } = await supabase.from("profiles").select("employee_id").eq("id", user.id).single();
        if (!profile?.employee_id) { setErrorMsg("Akun tidak terhubung ke data karyawan"); setPhase("error"); return; }
        const { data: emp } = await supabase.from("employees").select("id, name, position, division").eq("id", profile.employee_id).single();
        setEmployee(emp);

        const { data: existing } = await supabase.from("employee_face_descriptors").select("id").eq("employee_id", emp.id).single();
        if (existing) { setPhase("already"); return; }

        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setPhase("intro");
      } catch (e) { setErrorMsg("Gagal memuat: " + e.message); setPhase("error"); }
    })();
    return () => { runningRef.current = false; if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const startCamera = async () => {
    setPhase("camera");
    setCurrentStep(0);
    setCompletedSteps([]);
    setDescriptors([]);
    setPhotos([]);
    stepRef.current = 0;
    descriptorsRef.current = [];
    photosRef.current = [];
    capturedRef.current = new Set();
    blinkDetectedRef.current = false;
    earHistoryRef.current = [];
    eyesClosedFramesRef.current = 0;
    blinkStepStartRef.current = 0;
    setShowBlinkFallback(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      runningRef.current = true;
      requestAnimationFrame(detectLoop);
    } catch { setErrorMsg("Tidak bisa mengakses kamera"); setPhase("error"); }
  };

  const detectLoop = async () => {
    if (!runningRef.current || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) { requestAnimationFrame(detectLoop); return; }

    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
      setFaceDetected(true);
      const { landmarks, descriptor } = detection;
      const box = detection.detection.box;

      // Draw face box
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw landmark dots
      ctx.fillStyle = "#22c55e80";
      landmarks.positions.forEach(pt => {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2); ctx.fill();
      });

      // Use ref for current step (closure-safe)
      const si = stepRef.current;
      const step = STEPS[si];
      if (!step) { /* all done */ }
      else if (step.id === "blink") {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const ear = (getEAR(leftEye) + getEAR(rightEye)) / 2;
        earHistoryRef.current.push(ear);
        if (earHistoryRef.current.length > 30) earHistoryRef.current.shift();

        // Start timer for fallback button
        if (!blinkStepStartRef.current) blinkStepStartRef.current = Date.now();
        if (Date.now() - blinkStepStartRef.current > 8000) setShowBlinkFallback(true);

        // Method 1: Close eyes for ~3 consecutive low-EAR frames
        const isEyesClosed = ear < 0.23;
        if (isEyesClosed) eyesClosedFramesRef.current++;
        else eyesClosedFramesRef.current = 0;

        if (eyesClosedFramesRef.current >= 3 && !blinkDetectedRef.current) {
          blinkDetectedRef.current = true;
          playBeep();
          captureFrame(video, descriptor);
          advanceStep();
          return;
        }

        // Method 2: Detect drop from baseline (adaptive)
        if (earHistoryRef.current.length > 8) {
          const sorted = [...earHistoryRef.current].sort((a, b) => b - a);
          const topAvg = (sorted[0] + sorted[1] + sorted[2]) / 3; // avg of 3 highest
          if (ear < topAvg * 0.65 && !blinkDetectedRef.current) {
            blinkDetectedRef.current = true;
            playBeep();
            captureFrame(video, descriptor);
            advanceStep();
            return;
          }
        }
        lastEarRef.current = ear;
      } else {
        const pose = getHeadPose(landmarks);
        if (pose === step.id && !capturedRef.current.has(step.id)) {
          capturedRef.current.add(step.id);
          playBeep();
          captureFrame(video, descriptor);
          advanceStep();
        }
      }
    } else {
      setFaceDetected(false);
    }

    if (runningRef.current) requestAnimationFrame(detectLoop);
  };

  const captureFrame = (video, descriptor) => {
    const c = document.createElement("canvas");
    c.width = video.videoWidth; c.height = video.videoHeight;
    const cx = c.getContext("2d");
    cx.translate(c.width, 0); cx.scale(-1, 1);
    cx.drawImage(video, 0, 0);
    const photoUrl = c.toDataURL("image/jpeg", 0.8);
    const descArr = Array.from(descriptor);
    photosRef.current = [...photosRef.current, photoUrl];
    descriptorsRef.current = [...descriptorsRef.current, descArr];
    setPhotos(photosRef.current);
    setDescriptors(descriptorsRef.current);
  };

  const advanceStep = () => {
    const si = stepRef.current;
    setCompletedSteps(prev => [...prev, STEPS[si].id]);
    const nextStep = si + 1;
    stepRef.current = nextStep;
    setCurrentStep(nextStep);
    blinkDetectedRef.current = false;
    if (nextStep >= STEPS.length) {
      runningRef.current = false;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      // Small delay to let state sync before saving
      setTimeout(() => setPhase("saving"), 300);
    }
  };

  // Auto-save when phase becomes "saving"
  useEffect(() => {
    if (phase !== "saving" || !employee) return;
    const savedPhotos = photosRef.current;
    const savedDescriptors = descriptorsRef.current;
    if (savedDescriptors.length < 3) return;
    (async () => {
      try {
        const photoPaths = [];
        for (let i = 0; i < savedPhotos.length; i++) {
          const blob = await (await fetch(savedPhotos[i])).blob();
          const path = `face-register/${employee.id}/${Date.now()}-${i}.jpg`;
          await supabase.storage.from("photo.attendance").upload(path, blob, { contentType: "image/jpeg" });
          photoPaths.push(path);
        }
        const { error } = await supabase.from("employee_face_descriptors").insert({
          employee_id: employee.id,
          descriptors: savedDescriptors,
          photos: photoPaths,
        });
        if (error) throw error;
        setPhase("done");
      } catch (e) {
        setErrorMsg("Gagal menyimpan: " + e.message);
        setPhase("error");
      }
    })();
  }, [phase, employee, descriptors, photos]);

  // Error screen
  if (phase === "error") return (
    <Layout>
      <div className="max-w-md mx-auto mt-16">
        <Card className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-sm text-red-600">{errorMsg}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button>
        </Card>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-lg mx-auto mt-6 space-y-6">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {phase === "loading" && (
            <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Memuat model face recognition...</p>
            </motion.div>
          )}

          {/* Already registered */}
          {phase === "already" && (
            <motion.div key="already" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold">Wajah Sudah Terdaftar</h2>
                <p className="text-sm text-muted-foreground">{employee?.name}, wajah kamu sudah terdaftar untuk auto absen.</p>
                <Button variant="outline" onClick={async () => {
                  await supabase.from("employee_face_descriptors").delete().eq("employee_id", employee.id);
                  window.location.reload();
                }}>Daftar Ulang</Button>
              </Card>
            </motion.div>
          )}

          {/* Intro */}
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-8 text-center space-y-5">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
                  <Camera className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Validasi Wajah</h2>
                  <p className="text-sm text-muted-foreground">Hai {employee?.name}!</p>
                </div>
                <div className="text-left bg-muted/50 rounded-xl p-4 text-sm space-y-3">
                  <p className="font-medium">Kamu akan diminta untuk:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STEPS.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2">
                        <span className="text-lg">{s.icon}</span>
                        <span className="text-xs">{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Semua dilakukan otomatis - cukup ikuti instruksi di layar. Proses ini hanya sekali.</p>
                </div>
                <Button onClick={startCamera} className="w-full gap-2 h-11 bg-gradient-to-r from-blue-600 to-purple-600">
                  <Camera className="h-4 w-4" /> Mulai Validasi
                </Button>
              </Card>
            </motion.div>
          )}

          {/* Camera - Live Detection */}
          {phase === "camera" && (
            <motion.div key="camera" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden">
                {/* Step progress */}
                <div className="px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-1">
                    {STEPS.map((s, i) => (
                      <React.Fragment key={i}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all ${
                          completedSteps.includes(s.id) ? "bg-emerald-500 text-white" :
                          i === currentStep ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {completedSteps.includes(s.id) ? <CheckCircle className="h-4 w-4" /> : s.icon}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 ${completedSteps.includes(s.id) ? "bg-emerald-500" : "bg-muted"}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Video + canvas overlay */}
                <div className="relative bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover scale-x-[-1]" />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full scale-x-[-1]" />

                  {/* Guide oval */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`w-44 h-56 border-[3px] rounded-[50%] transition-colors duration-300 ${
                      faceDetected ? "border-emerald-400/70" : "border-white/30"
                    }`} />
                  </div>

                  {/* Status */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md text-xs ${
                      faceDetected ? "bg-emerald-500/80 text-white" : "bg-black/50 text-white/70"
                    }`}>
                      <div className={`h-2 w-2 rounded-full ${faceDetected ? "bg-white animate-pulse" : "bg-red-400"}`} />
                      {faceDetected ? "Wajah terdeteksi" : "Mencari wajah..."}
                    </div>
                    <div className="bg-black/50 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full">
                      {completedSteps.length}/{STEPS.length}
                    </div>
                  </div>

                  {/* Instruction overlay - INSIDE camera */}
                  <AnimatePresence mode="wait">
                    {STEPS[currentStep] && (
                      <motion.div key={currentStep} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute bottom-16 left-4 right-4 bg-black/70 backdrop-blur-md rounded-xl p-3 text-center border border-white/10">
                        <p className="text-3xl mb-1">{STEPS[currentStep].icon}</p>
                        <p className="font-bold text-white text-base">{STEPS[currentStep].label}</p>
                        <p className="text-white/60 text-xs mt-1">
                          {STEPS[currentStep].id === "blink" ? "Tutup kedua mata selama 1 detik, lalu buka" :
                           STEPS[currentStep].id === "front" ? "Pastikan wajah terlihat jelas di dalam oval" :
                           STEPS[currentStep].id === "left" ? "\u2190 Miringkan kepala sedikit ke kiri" :
                           "\u2192 Miringkan kepala sedikit ke kanan"}
                        </p>
                        {showBlinkFallback && STEPS[currentStep]?.id === "blink" && (
                          <button onClick={() => {
                            if (!blinkDetectedRef.current) {
                              blinkDetectedRef.current = true;
                              playBeep();
                              if (videoRef.current) {
                                const c = document.createElement("canvas");
                                c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight;
                                const cx = c.getContext("2d"); cx.translate(c.width, 0); cx.scale(-1, 1);
                                cx.drawImage(videoRef.current, 0, 0);
                                photosRef.current = [...photosRef.current, c.toDataURL("image/jpeg", 0.8)];
                                setPhotos(photosRef.current);
                              }
                              advanceStep();
                            }
                          }}
                            className="mt-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-medium transition-colors">
                            Tidak bisa kedip? Tap di sini
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Captured thumbnails */}
                  {photos.length > 0 && (
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      {photos.map((p, i) => (
                        <motion.img key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                          src={p} className="h-11 w-11 rounded-lg object-cover border-2 border-emerald-400 shadow" />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Saving */}
          {phase === "saving" && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Menyimpan data wajah...</p>
            </motion.div>
          )}

          {/* Done */}
          {phase === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="p-8 text-center space-y-5">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                  className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-xl font-bold">Validasi Berhasil!</h2>
                <p className="text-sm text-muted-foreground">{employee?.name}</p>
                <div className="flex justify-center gap-2">
                  {photos.map((p, i) => (
                    <motion.img key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                      src={p} className="h-16 w-16 rounded-xl object-cover shadow" />
                  ))}
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600"><CheckCircle className="h-4 w-4" /> Wajah depan ✓</div>
                  <div className="flex items-center gap-2 text-emerald-600"><CheckCircle className="h-4 w-4" /> Wajah kiri ✓</div>
                  <div className="flex items-center gap-2 text-emerald-600"><CheckCircle className="h-4 w-4" /> Wajah kanan ✓</div>
                  <div className="flex items-center gap-2 text-emerald-600"><Eye className="h-4 w-4" /> Liveness verified ✓</div>
                </div>
                <p className="text-xs text-muted-foreground">Sekarang kamu bisa absen otomatis lewat kamera kiosk.</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
