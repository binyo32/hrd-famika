import React, { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CheckCircle, Loader2, AlertTriangle, Eye } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import * as faceapi from "@vladmandic/face-api";

const MP_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MP_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const FACEAPI_MODEL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model";

const STEPS = [
  { id: "front", label: "Lihat ke depan", icon: "😐", hint: "Pastikan wajah terlihat jelas" },
  { id: "left", label: "Miringkan ke kiri", icon: "😏", hint: "← Sedikit saja ke kiri" },
  { id: "right", label: "Miringkan ke kanan", icon: "😏", hint: "→ Sedikit saja ke kanan" },
  { id: "blink", label: "Pejamkan mata", icon: "😌", hint: "Tutup kedua mata, tahan 1 detik" },
];

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(1200, ctx.currentTime);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.15);
  } catch {}
}

// Head pose from MediaPipe 478 landmarks
function getHeadPose(landmarks) {
  const nose = landmarks[1];       // nose tip
  const left = landmarks[234];     // left cheek
  const right = landmarks[454];    // right cheek
  const w = right.x - left.x;
  if (w < 0.01) return "front";
  const ratio = (nose.x - left.x) / w;
  // MediaPipe coords: 0-1 normalized, mirrored video
  if (ratio < 0.44) return "left";
  if (ratio > 0.56) return "right";
  return "front";
}

export default function FaceSetup() {
  const [phase, setPhase] = useState("loading");
  const [employee, setEmployee] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [descriptors, setDescriptors] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [blinkScore, setBlinkScore] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("Memuat model...");
  const [showFallback, setShowFallback] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const runningRef = useRef(false);
  const landmarkerRef = useRef(null);
  const faceapiReadyRef = useRef(false);
  const stepRef = useRef(0);
  const capturedRef = useRef(new Set());
  const blinkFramesRef = useRef(0);
  const blinkStepStartRef = useRef(0);
  const descriptorsRef = useRef([]);
  const photosRef = useRef([]);

  // Init
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

        // Load MediaPipe (fast, for live detection)
        setLoadingMsg("Memuat MediaPipe Face Mesh...");
        const vision = await FilesetResolver.forVisionTasks(MP_WASM);
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MP_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          outputFaceBlendshapes: true,
          numFaces: 1,
        });

        // Load face-api.js in background (for descriptor extraction)
        setLoadingMsg("Memuat face recognition model...");
        await faceapi.nets.ssdMobilenetv1.loadFromUri(FACEAPI_MODEL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(FACEAPI_MODEL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(FACEAPI_MODEL);
        faceapiReadyRef.current = true;

        setPhase("intro");
      } catch (e) { setErrorMsg("Gagal memuat: " + e.message); setPhase("error"); }
    })();
    return () => { runningRef.current = false; if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const startCamera = async () => {
    setPhase("camera");
    setCurrentStep(0); stepRef.current = 0;
    setCompletedSteps([]); setDescriptors([]); setPhotos([]);
    descriptorsRef.current = []; photosRef.current = [];
    capturedRef.current = new Set();
    blinkFramesRef.current = 0; blinkStepStartRef.current = 0;
    setShowFallback(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          runningRef.current = true;
          detectLoop();
        };
        await videoRef.current.play();
      }
    } catch { setErrorMsg("Tidak bisa mengakses kamera"); setPhase("error"); }
  };

  const detectLoop = () => {
    if (!runningRef.current || !videoRef.current || !landmarkerRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) { requestAnimationFrame(detectLoop); return; }

    const result = landmarkerRef.current.detectForVideo(video, performance.now());
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (result.faceLandmarks?.length > 0) {
        // Draw mesh
        const du = new DrawingUtils(ctx);
        du.drawConnectors(result.faceLandmarks[0], FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#22c55e30", lineWidth: 0.5 });
        du.drawConnectors(result.faceLandmarks[0], FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#22c55e", lineWidth: 1.5 });
      }
    }

    if (result.faceLandmarks?.length > 0) {
      setFaceDetected(true);
      const landmarks = result.faceLandmarks[0];
      const blendshapes = result.faceBlendshapes?.[0]?.categories || [];

      const si = stepRef.current;
      const step = STEPS[si];
      if (!step) { if (runningRef.current) requestAnimationFrame(detectLoop); return; }

      if (step.id === "blink") {
        // Blink via blendshapes (MUCH easier than EAR!)
        const eyeL = blendshapes.find(b => b.categoryName === "eyeBlinkLeft")?.score || 0;
        const eyeR = blendshapes.find(b => b.categoryName === "eyeBlinkRight")?.score || 0;
        const blink = (eyeL + eyeR) / 2;
        setBlinkScore(blink);

        if (!blinkStepStartRef.current) blinkStepStartRef.current = Date.now();
        if (Date.now() - blinkStepStartRef.current > 8000) setShowFallback(true);

        // Eyes closed for 3+ frames
        if (blink > 0.35) blinkFramesRef.current++;
        else blinkFramesRef.current = 0;

        if (blinkFramesRef.current >= 3) {
          playBeep();
          captureAndAdvance(video);
        }
      } else {
        // Head pose from 478 landmarks
        const pose = getHeadPose(landmarks);
        if (pose === step.id && !capturedRef.current.has(step.id)) {
          capturedRef.current.add(step.id);
          playBeep();
          captureAndAdvance(video);
        }
      }
    } else {
      setFaceDetected(false);
    }

    if (runningRef.current) requestAnimationFrame(detectLoop);
  };

  const captureAndAdvance = (video) => {
    // Capture photo only (fast - no descriptor extraction here)
    const c = document.createElement("canvas");
    c.width = video.videoWidth; c.height = video.videoHeight;
    const cx = c.getContext("2d");
    cx.translate(c.width, 0); cx.scale(-1, 1);
    cx.drawImage(video, 0, 0);
    const photoUrl = c.toDataURL("image/jpeg", 0.8);
    photosRef.current = [...photosRef.current, photoUrl];
    setPhotos([...photosRef.current]);

    // Advance step immediately (no waiting)
    const si = stepRef.current;
    setCompletedSteps(prev => [...prev, STEPS[si].id]);
    const next = si + 1;
    stepRef.current = next;
    setCurrentStep(next);
    blinkFramesRef.current = 0;
    blinkStepStartRef.current = 0;
    setShowFallback(false);

    if (next >= STEPS.length) {
      runningRef.current = false;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      setTimeout(() => setPhase("saving"), 200);
    }
  };

  const [saveProgress, setSaveProgress] = useState("");

  // Save: extract descriptors + upload photos + save to DB
  useEffect(() => {
    if (phase !== "saving" || !employee) return;
    const savedPhotos = photosRef.current;
    if (!savedPhotos.length) return;
    (async () => {
      try {
        // Step 1: Extract face descriptors from captured photos
        setSaveProgress("Menganalisis wajah...");
        const descs = [];
        for (let i = 0; i < savedPhotos.length; i++) {
          setSaveProgress(`Menganalisis foto ${i + 1}/${savedPhotos.length}...`);
          try {
            const img = await faceapi.bufferToImage(await (await fetch(savedPhotos[i])).blob());
            const det = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            if (det) descs.push(Array.from(det.descriptor));
          } catch {}
        }
        if (!descs.length) { setErrorMsg("Tidak bisa mengekstrak data wajah. Coba lagi."); setPhase("error"); return; }

        // Step 2: Upload photos
        setSaveProgress("Mengunggah foto...");
        const photoPaths = [];
        for (let i = 0; i < savedPhotos.length; i++) {
          const blob = await (await fetch(savedPhotos[i])).blob();
          const path = `face-register/${employee.id}/${Date.now()}-${i}.jpg`;
          await supabase.storage.from("photo.attendance").upload(path, blob, { contentType: "image/jpeg" });
          photoPaths.push(path);
        }

        // Step 3: Save to database
        setSaveProgress("Menyimpan data...");
        const { error } = await supabase.from("employee_face_descriptors").insert({
          employee_id: employee.id, descriptors: descs, photos: photoPaths,
        });
        if (error) throw error;
        setPhase("done");
      } catch (e) { setErrorMsg("Gagal menyimpan: " + e.message); setPhase("error"); }
    })();
  }, [phase, employee]);

  // Error
  if (phase === "error") return (
    <Layout><div className="max-w-md mx-auto mt-16">
      <Card className="p-8 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <p className="text-sm text-red-600">{errorMsg}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button>
      </Card>
    </div></Layout>
  );

  return (
    <Layout>
      <div className="max-w-lg mx-auto mt-6 space-y-6">
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{loadingMsg}</p>
            </motion.div>
          )}

          {phase === "already" && (
            <motion.div key="already" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold">Wajah Sudah Terdaftar</h2>
                <p className="text-sm text-muted-foreground">{employee?.name}, wajah kamu sudah terdaftar.</p>
                <Button variant="outline" onClick={async () => {
                  await supabase.from("employee_face_descriptors").delete().eq("employee_id", employee.id);
                  window.location.reload();
                }}>Daftar Ulang</Button>
              </Card>
            </motion.div>
          )}

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
                  <p className="font-medium">Ikuti 4 langkah otomatis:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STEPS.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2">
                        <span className="text-lg">{s.icon}</span>
                        <span className="text-xs">{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Powered by Google MediaPipe - cepat & akurat.</p>
                </div>
                <Button onClick={startCamera} className="w-full gap-2 h-11 bg-gradient-to-r from-blue-600 to-purple-600">
                  <Camera className="h-4 w-4" /> Mulai Validasi
                </Button>
              </Card>
            </motion.div>
          )}

          {phase === "camera" && (
            <motion.div key="camera" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden">
                {/* Progress */}
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
                        {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${completedSteps.includes(s.id) ? "bg-emerald-500" : "bg-muted"}`} />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Camera */}
                <div className="relative bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover scale-x-[-1]" />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none" />

                  {/* Biometric scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Scanning ring */}
                    <svg width="220" height="270" viewBox="0 0 220 270" className="absolute">
                      {/* Outer glow */}
                      <ellipse cx="110" cy="135" rx="95" ry="120" fill="none"
                        stroke={faceDetected ? "#22c55e" : "#ffffff"} strokeWidth="1" opacity="0.15" />
                      {/* Main oval */}
                      <ellipse cx="110" cy="135" rx="88" ry="112" fill="none"
                        stroke={faceDetected ? "#22c55e" : "#ffffff"} strokeWidth="2.5" opacity={faceDetected ? 0.8 : 0.3}
                        strokeDasharray="8 4" className="transition-all duration-300" />
                      {/* Progress arc */}
                      <ellipse cx="110" cy="135" rx="95" ry="120" fill="none"
                        stroke="#22c55e" strokeWidth="3" opacity="0.9"
                        strokeDasharray={`${completedSteps.length * 188} 752`}
                        strokeDashoffset="0" strokeLinecap="round"
                        className="transition-all duration-700" />
                      {/* Corner brackets */}
                      <path d="M30,50 L30,30 L55,30" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.6" />
                      <path d="M190,50 L190,30 L165,30" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.6" />
                      <path d="M30,220 L30,240 L55,240" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.6" />
                      <path d="M190,220 L190,240 L165,240" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.6" />
                      {/* Scanning line animation */}
                      {faceDetected && (
                        <line x1="35" x2="185" stroke="#22c55e" strokeWidth="1.5" opacity="0.4">
                          <animate attributeName="y1" values="40;230;40" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="y2" values="40;230;40" dur="2s" repeatCount="indefinite" />
                        </line>
                      )}
                    </svg>

                    {/* Animated head guide */}
                    <AnimatePresence mode="wait">
                      {STEPS[currentStep] && !faceDetected && (
                        <motion.div key={`head-${currentStep}`}
                          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
                          className="absolute">
                          <motion.svg width="80" height="100" viewBox="0 0 80 100"
                            animate={
                              STEPS[currentStep].id === "left" ? { rotateY: [0, 35, 0], x: [0, -8, 0] } :
                              STEPS[currentStep].id === "right" ? { rotateY: [0, -35, 0], x: [0, 8, 0] } :
                              STEPS[currentStep].id === "blink" ? { scaleY: [1, 0.95, 1] } :
                              {}
                            }
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          >
                            {/* Simple head outline */}
                            <ellipse cx="40" cy="38" rx="28" ry="34" fill="none" stroke="white" strokeWidth="2" />
                            {/* Eyes */}
                            {STEPS[currentStep].id === "blink" ? (
                              <>
                                <motion.line x1="26" y1="35" x2="34" y2="35" stroke="white" strokeWidth="2" strokeLinecap="round"
                                  animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                                <motion.line x1="46" y1="35" x2="54" y2="35" stroke="white" strokeWidth="2" strokeLinecap="round"
                                  animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                              </>
                            ) : (
                              <>
                                <ellipse cx="30" cy="35" rx="4" ry="3" fill="white" />
                                <ellipse cx="50" cy="35" rx="4" ry="3" fill="white" />
                              </>
                            )}
                            {/* Nose */}
                            <path d="M40,40 L37,50 L43,50" fill="none" stroke="white" strokeWidth="1.5" />
                            {/* Mouth */}
                            <path d="M32,58 Q40,64 48,58" fill="none" stroke="white" strokeWidth="1.5" />
                            {/* Neck */}
                            <line x1="35" y1="72" x2="35" y2="95" stroke="white" strokeWidth="1.5" />
                            <line x1="45" y1="72" x2="45" y2="95" stroke="white" strokeWidth="1.5" />
                            {/* Direction arrow */}
                            {STEPS[currentStep].id === "left" && (
                              <motion.g animate={{ x: [0, -6, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                                <path d="M-5,38 L-15,38 M-12,33 L-17,38 L-12,43" stroke="#22c55e" strokeWidth="2" fill="none" />
                              </motion.g>
                            )}
                            {STEPS[currentStep].id === "right" && (
                              <motion.g animate={{ x: [0, 6, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                                <path d="M85,38 L95,38 M92,33 L97,38 L92,43" stroke="#22c55e" strokeWidth="2" fill="none" />
                              </motion.g>
                            )}
                          </motion.svg>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Status badges */}
                  <div className="absolute top-2 left-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md text-[11px] ${faceDetected ? "bg-emerald-500/80 text-white" : "bg-black/50 text-white/70"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${faceDetected ? "bg-white animate-pulse" : "bg-red-400"}`} />
                      {faceDetected ? "Terdeteksi" : "Mencari..."}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full">
                    {completedSteps.length}/{STEPS.length}
                  </div>

                  {/* Blink progress bar */}
                  {STEPS[currentStep]?.id === "blink" && (
                    <div className="absolute top-10 left-3 right-3">
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all duration-100" style={{ width: `${Math.min(blinkScore * 200, 100)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Instruction banner */}
                  <AnimatePresence mode="wait">
                    {STEPS[currentStep] && (
                      <motion.div key={currentStep} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md rounded-xl px-4 py-2.5 text-center border border-white/10">
                        <p className="font-bold text-white text-sm">{STEPS[currentStep].label}</p>
                        <p className="text-white/50 text-[11px] mt-0.5">{STEPS[currentStep].hint}</p>
                        {showFallback && STEPS[currentStep]?.id === "blink" && (
                          <button onClick={() => captureAndAdvance(videoRef.current)}
                            className="mt-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[11px] font-medium transition-colors">
                            Tidak bisa? Tap di sini
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Thumbnails */}
                  {photos.length > 0 && (
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      {photos.map((p, i) => (
                        <motion.img key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                          src={p} className="h-10 w-10 rounded-lg object-cover border-2 border-emerald-400 shadow" />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {phase === "saving" && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-8 text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <div>
                  <p className="font-semibold text-sm">Memproses...</p>
                  <p className="text-xs text-muted-foreground mt-1">{saveProgress}</p>
                </div>
                {photos.length > 0 && (
                  <div className="flex justify-center gap-2">
                    {photos.map((p, i) => (
                      <img key={i} src={p} className="h-12 w-12 rounded-lg object-cover opacity-60" />
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">Ini mungkin memerlukan beberapa detik...</p>
              </Card>
            </motion.div>
          )}

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
