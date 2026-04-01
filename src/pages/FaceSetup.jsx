import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CheckCircle, Loader2, RefreshCw, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model";

export default function FaceSetup() {
  const [step, setStep] = useState("loading"); // loading, intro, camera, processing, done, already
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [descriptors, setDescriptors] = useState([]);
  const [error, setError] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // Load models + check auth
  useEffect(() => {
    (async () => {
      try {
        // Get current user's employee info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Silakan login terlebih dahulu"); return; }

        const { data: profile } = await supabase.from("profiles").select("employee_id, role").eq("id", user.id).single();
        if (!profile?.employee_id) { setError("Akun tidak terhubung ke data karyawan"); return; }

        const { data: emp } = await supabase.from("employees").select("id, name, position, division").eq("id", profile.employee_id).single();
        setEmployee(emp);

        // Check if already registered
        const { data: existing } = await supabase.from("employee_face_descriptors").select("id, validated_at").eq("employee_id", emp.id).single();
        if (existing) { setStep("already"); return; }

        // Load face-api models
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        setStep("intro");
      } catch (e) {
        setError("Gagal memuat: " + e.message);
      }
    })();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const startCamera = async () => {
    setStep("camera");
    setPhotos([]);
    setDescriptors([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch {
      setError("Tidak bisa mengakses kamera");
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1); // Mirror
    ctx.drawImage(video, 0, 0);

    // Detect face + extract descriptor
    const img = await faceapi.bufferToImage(canvas);
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
      setError("Wajah tidak terdeteksi. Pastikan wajah terlihat jelas.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const photoUrl = canvas.toDataURL("image/jpeg", 0.8);
    setPhotos(prev => [...prev, photoUrl]);
    setDescriptors(prev => [...prev, Array.from(detection.descriptor)]);

    if (photos.length + 1 >= 3) {
      // Done capturing
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      setStep("processing");
    }
  };

  const saveDescriptors = async () => {
    if (!employee || descriptors.length < 3) return;
    setSaving(true);
    try {
      // Upload photos to storage
      const photoPaths = [];
      for (let i = 0; i < photos.length; i++) {
        const blob = await (await fetch(photos[i])).blob();
        const path = `face-register/${employee.id}/${Date.now()}-${i}.jpg`;
        await supabase.storage.from("photo.attendance").upload(path, blob, { contentType: "image/jpeg" });
        photoPaths.push(path);
      }

      // Save to database
      const { error: dbError } = await supabase.from("employee_face_descriptors").insert({
        employee_id: employee.id,
        descriptors: descriptors,
        photos: photoPaths,
      });

      if (dbError) throw dbError;
      setStep("done");
    } catch (e) {
      setError("Gagal menyimpan: " + e.message);
    }
    setSaving(false);
  };

  useEffect(() => {
    if (step === "processing" && descriptors.length >= 3) saveDescriptors();
  }, [step, descriptors.length]);

  if (error && !["camera", "processing"].includes(step)) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-16">
          <Card className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto mt-8 space-y-6">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Memuat model face recognition...</p>
            </motion.div>
          )}

          {/* Already registered */}
          {step === "already" && (
            <motion.div key="already" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold">Wajah Sudah Terdaftar</h2>
                <p className="text-sm text-muted-foreground">
                  {employee?.name}, wajah kamu sudah terdaftar untuk auto absen.
                </p>
                <Button variant="outline" onClick={async () => {
                  await supabase.from("employee_face_descriptors").delete().eq("employee_id", employee.id);
                  window.location.reload();
                }}>Daftar Ulang</Button>
              </Card>
            </motion.div>
          )}

          {/* Intro */}
          {step === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-8 text-center space-y-5">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
                  <Camera className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Validasi Wajah</h2>
                  <p className="text-sm text-muted-foreground">Hai {employee?.name}!</p>
                </div>
                <div className="text-left bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                  <p className="font-medium">Langkah-langkah:</p>
                  <p>1. Klik tombol mulai untuk membuka kamera</p>
                  <p>2. Foto wajah kamu dari <strong>3 sudut</strong> berbeda</p>
                  <p>3. Pastikan wajah terlihat jelas dan pencahayaan cukup</p>
                  <p className="text-xs text-muted-foreground mt-2">Proses ini hanya dilakukan sekali.</p>
                </div>
                <Button onClick={startCamera} className="w-full gap-2 h-11 bg-gradient-to-r from-blue-600 to-purple-600">
                  <Camera className="h-4 w-4" /> Mulai Validasi
                </Button>
              </Card>
            </motion.div>
          )}

          {/* Camera */}
          {step === "camera" && (
            <motion.div key="camera" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden">
                <div className="relative bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover scale-x-[-1]" />
                  {/* Face guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-60 border-2 border-white/40 rounded-[50%]" />
                  </div>
                  {/* Photo counter */}
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                    Foto {photos.length + 1} / 3
                  </div>
                  {/* Captured photos */}
                  {photos.length > 0 && (
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      {photos.map((p, i) => (
                        <img key={i} src={p} className="h-12 w-12 rounded-lg object-cover border-2 border-white shadow" />
                      ))}
                    </div>
                  )}
                </div>
                {/* Error toast */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-red-50 dark:bg-red-950/30 text-red-600 text-sm px-4 py-2 text-center">
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="p-4 space-y-2">
                  <p className="text-sm text-center text-muted-foreground">
                    {photos.length === 0 && "Arahkan wajah ke depan kamera"}
                    {photos.length === 1 && "Sedikit miringkan kepala ke kiri"}
                    {photos.length === 2 && "Sedikit miringkan kepala ke kanan"}
                  </p>
                  <Button onClick={capturePhoto} className="w-full gap-2 h-11 bg-gradient-to-r from-blue-600 to-purple-600">
                    <Camera className="h-4 w-4" /> Ambil Foto {photos.length + 1}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Processing */}
          {step === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Menyimpan data wajah...</p>
            </motion.div>
          )}

          {/* Done */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="p-8 text-center space-y-5">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                  className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="h-10 w-10 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Validasi Berhasil!</h2>
                  <p className="text-sm text-muted-foreground">{employee?.name}</p>
                </div>
                <div className="flex justify-center gap-2">
                  {photos.map((p, i) => (
                    <img key={i} src={p} className="h-16 w-16 rounded-xl object-cover shadow" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Wajah kamu sudah terdaftar. Sekarang kamu bisa absen otomatis lewat kamera kiosk.</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
