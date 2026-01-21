import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { LogIn, LogOut, CalendarClock, History, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "../lib/compressImage";
import LocationPermissionDialog from "../components/employee/LocationPermissionDialog";
import CheckInDialog from "../components/employee/CheckInDialog";
import ConfirmCheckoutDialog from "../components/employee/ConfirmCheckoutDialog";

const EmployeeAttendancePage = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState({
    checkInOut: false,
    history: false,
    today: false,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceChecked, setAttendanceChecked] = useState(false);

  const [showCheckInFlow, setShowCheckInFlow] = useState(false);
  const [selfieTaken, setSelfieTaken] = useState(false);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const resetCheckInFlow = () => {
    setShowCheckInFlow(false);
    setSelfieTaken(false);
    setSelectedPM(null);
    setProjectText("");
  };

  const [pmList, setPmList] = useState([]);
  const [pmLoading, setPmLoading] = useState(false);
  const [selectedPM, setSelectedPM] = useState(null);
  const [projectText, setProjectText] = useState("");
  const [liveLocation, setLiveLocation] = useState(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const fetchPM = async (keyword = "") => {
    setPmLoading(true);

    const { data, error } = await supabase
      .from("employees")
      .select("id, name")
      .eq("is_direct_pm", true)
      .ilike("name", `%${keyword}%`)
      .order("name")
      .limit(20);

    if (!error) setPmList(data ?? []);
    setPmLoading(false);
  };

  useEffect(() => {
    fetchPM();
  }, []);

  const fetchTodayAttendance = useCallback(async () => {
    if (!user || !user.id) return;
    setLoading((prev) => ({ ...prev, today: true }));
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, attendance_statuses(name)")
        .eq("employee_id", user.id)
        .eq("attendance_date", today)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 means no rows found, which is fine
      setTodayAttendance(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat absensi hari ini: " + error.message,
        variant: "destructive",
      });
    } finally {
      setAttendanceChecked(true);
      setLoading((prev) => ({ ...prev, today: false }));
    }
  }, [user]);

  const fetchAttendanceHistory = useCallback(async () => {
    if (!user || !user.id) return;
    setLoading((prev) => ({ ...prev, history: true }));
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, attendance_statuses(name)")
        .eq("employee_id", user.id)
        .order("attendance_date", { ascending: false })
        .limit(30); // Show last 30 records
      if (error) throw error;
      setAttendanceHistory(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat histori absensi: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, history: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendanceHistory();
  }, [fetchTodayAttendance, fetchAttendanceHistory]);
  const getCurrentLiveLocationPayload = () => {
    if (!liveLocation) return null;

    return {
      lat: liveLocation.latitude,
      lng: liveLocation.longitude,
      address: liveAddress || null,
      captured_at: new Date().toISOString(),
      source: "watchPosition",
    };
  };
  const normalizeName = (name) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");

  const getTimeStr = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}.${mm}`;
  };

  const uploadSelfie = async (blob) => {
    if (!user?.name) throw new Error("Nama user tidak ada");
    if (!(blob instanceof Blob)) throw new Error("Selfie bukan Blob");

    const compressed = await compressImage(blob);
    const dateStr = new Date().toISOString().split("T")[0];
    const safeName = normalizeName(user.name);
    const timeStr = getTimeStr();

    const filePath = `${dateStr}/${safeName}-${timeStr}.jpg`;

    const { error } = await supabase.storage
      .from("photo.attendance")
      .upload(filePath, compressed, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    return filePath;
  };

  const handleCheckIn = async ({
    direct_pm_id = null,
    project = null,
  } = {}) => {
    if (!user?.id) return;

    if (!selfieBlob || !liveLocation) {
      toast({ title: "Data belum lengkap", variant: "destructive" });
      return;
    }

    setLoading((p) => ({ ...p, checkInOut: true }));

    try {
      const selfiePath = await uploadSelfie(selfieBlob);

      const locPayload = getCurrentLiveLocationPayload();

      const { data: hadirStatus } = await supabase
        .from("attendance_statuses")
        .select("id")
        .eq("code", "H")
        .single();

      const { data, error } = await supabase.rpc("check_in_employee", {
        p_employee_id: user.id,
        p_status_id: hadirStatus.id,
        p_loc: locPayload,
        p_direct_pm: direct_pm_id,
        p_project: project,
        p_attachment: selfiePath,
      });

      if (error) throw error;

      setTodayAttendance(data);
      fetchAttendanceHistory();

      toast({
        title: "Check-In Berhasil",
        description: "Jam diambil dari server (WIB)",
        className: "bg-green-500 text-white",
      });
    } catch (err) {
      toast({ title: "Gagal Check-In", description: err.message });
    } finally {
      setLoading((p) => ({ ...p, checkInOut: false }));
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance?.id || !liveLocation) return;

    setLoading((p) => ({ ...p, checkInOut: true }));

    try {
      const locPayload = getCurrentLiveLocationPayload();

      const { data, error } = await supabase.rpc("check_out_employee", {
        p_attendance_id: todayAttendance.id,
        p_loc: locPayload,
      });

      if (error) throw error;

      setTodayAttendance(data);
      fetchAttendanceHistory();

      toast({
        title: "Check-Out Berhasil",
        description: "Jam server digunakan",
      });
    } finally {
      setLoading((p) => ({ ...p, checkInOut: false }));
    }
  };

  const canCheckIn = !todayAttendance || !todayAttendance.check_in_time;
  const canCheckOut =
    todayAttendance &&
    todayAttendance.check_in_time &&
    !todayAttendance.check_out_time;

  const [locationAllowed, setLocationAllowed] = useState(false);
  const [location, setLocation] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationNames, setLocationNames] = useState({});
  useEffect(() => {
    if (!attendanceChecked) return;

    if ((!todayAttendance || !todayAttendance.check_in_time) && !liveLocation) {
      setShowLocationModal(true);
    } else {
      setShowLocationModal(false);
    }
  }, [attendanceChecked, todayAttendance, liveLocation]);

  const [locationLoading, setLocationLoading] = useState(false);

  const requestLocation = () => {
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLiveLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });

        setLocationAllowed(true);
        setShowLocationModal(false);
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        toast({
          title: "Izin Lokasi Diperlukan",
          description:
            err.code === 1
              ? "Izin lokasi ditolak browser"
              : "GPS tidak tersedia",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const [liveAddress, setLiveAddress] = useState("-");
  const [watchId, setWatchId] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setLiveLocation({ latitude: lat, longitude: lon });
        setLocationAllowed(true);
        setShowLocationModal(false);
        // Reverse geocoding (OpenStreetMap)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
          );
          const data = await res.json();
          setLiveAddress(data.display_name || "-");
        } catch {
          setLiveAddress("-");
        }
      },
      (err) => {
        console.error("Live location error:", err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      },
    );

    setWatchId(id);

    // Cleanup saat keluar halaman
    return () => {
      if (id) navigator.geolocation.clearWatch(id);
    };
  }, [locationAllowed]);
  const monthlySummary = attendanceHistory.reduce((acc, record) => {
    const date = new Date(record.attendance_date);
    const key = date.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    if (!acc[key]) {
      acc[key] = {
        month: key,
        checkin: 0,
        checkout: 0,
      };
    }

    if (record.check_in_time) acc[key].checkin += 1;
    if (record.check_out_time) acc[key].checkout += 1;

    return acc;
  }, {});

  const monthlyData = Object.values(monthlySummary);

  return (
    <Layout>
      {showLocationModal && (
        <LocationPermissionDialog
          open={showLocationModal}
          loading={locationLoading}
          onAllow={requestLocation}
        />
      )}
      <CheckInDialog
        open={showCheckInFlow}
        onClose={resetCheckInFlow}
        selfieTaken={selfieTaken}
        setSelfieTaken={setSelfieTaken}
        setSelfieBlob={setSelfieBlob}
        pmList={pmList}
        pmLoading={pmLoading}
        selectedPM={selectedPM}
        setSelectedPM={setSelectedPM}
        projectText={projectText}
        setProjectText={setProjectText}
        onSearchPM={fetchPM}
        onConfirm={async () => {
          await handleCheckIn({
            direct_pm_id: selectedPM?.id ?? null,
            project: projectText,
          });

          resetCheckInFlow();
        }}
      />
      {showCheckoutConfirm && (
        <ConfirmCheckoutDialog
          open={showCheckoutConfirm}
          onCancel={() => setShowCheckoutConfirm(false)}
          onConfirm={handleCheckOut}
          loading={loading.checkInOut}
        />
      )}

      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Absensi Saya
          </h1>
          <p className="text-muted-foreground">
            Lakukan absensi harian dan lihat riwayat kehadiran Anda.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}>
          <Card className="glass-effect border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CalendarClock className="mr-2 h-5 w-5 text-primary" />
                Absensi Hari Ini
              </CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-5xl font-bold text-gray-700 dark:text-gray-300 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                {currentTime.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              {loading.today ? (
                <p className="text-center text-muted-foreground">
                  Memeriksa status absensi...
                </p>
              ) : (
                <>
                  {todayAttendance?.check_in_time && (
                    <p className="text-center text-green-600">
                      Check-In pada:{" "}
                      {new Date(
                        todayAttendance.check_in_time,
                      ).toLocaleTimeString("id-ID")}
                      {todayAttendance.attendance_statuses &&
                        ` (${todayAttendance.attendance_statuses.name})`}
                    </p>
                  )}
                  {todayAttendance?.check_out_time && (
                    <p className="text-center text-blue-600">
                      Check-Out pada:{" "}
                      {new Date(
                        todayAttendance.check_out_time,
                      ).toLocaleTimeString("id-ID")}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={() => setShowCheckInFlow(true)}
                      disabled={!canCheckIn || loading.checkInOut}
                      className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white text-lg py-6">
                      <LogIn className="mr-2 h-5 w-5" />{" "}
                      {loading.checkInOut && canCheckIn
                        ? "Memproses..."
                        : "Check In"}
                    </Button>
                    <Button
                      onClick={() => setShowCheckoutConfirm(true)}
                      disabled={!canCheckOut || loading.checkInOut}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-lg py-6">
                      <LogOut className="mr-2 h-5 w-5" />{" "}
                      {loading.checkInOut && canCheckOut
                        ? "Memproses..."
                        : "Check Out"}
                    </Button>
                  </div>
                  {!canCheckIn && !canCheckOut && todayAttendance && (
                    <p className="text-center text-muted-foreground mt-2">
                      Anda sudah menyelesaikan absensi hari ini.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-md bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <CardHeader>
              <CardTitle className="text-lg bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                Lokasi Anda Saat Ini
              </CardTitle>
              <CardDescription>
                Menampilkan lokasi aktif selama halaman ini dibuka ( gunakan
                perangkat mobile untuk hasil lebih akurat )
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {liveLocation ? (
                <>
                  <div>
                    <span className="font-medium">Latitude:</span>{" "}
                    {liveLocation.latitude}
                  </div>
                  <div>
                    <span className="font-medium">Longitude:</span>{" "}
                    {liveLocation.longitude}
                  </div>
                  <div>
                    <span className="font-medium">Alamat:</span> {liveAddress}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Menunggu lokasi aktif...
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}>
          <Card className="glass-effect border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <History className="mr-2 h-5 w-5 text-purple-500" />
                  Rekap Absesnsi Bulanan Anda
                </CardTitle>
                <CardDescription>Catatan kehadiran Anda</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchAttendanceHistory}
                disabled={loading.history}>
                <RefreshCw
                  className={`h-4 w-4 ${loading.history ? "animate-spin" : ""}`}
                />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ================= MOBILE VIEW ================= */}
              <div className="space-y-3 md:hidden max-h-60 overflow-auto">
                {loading.history ? (
                  <p className="text-center text-muted-foreground">
                    Memuat data...
                  </p>
                ) : monthlyData.length === 0 ? (
                  <p className="text-center text-muted-foreground">
                    Tidak ada data absensi.
                  </p>
                ) : (
                  monthlyData.map((item) => (
                    <div
                      key={item.month}
                      className="rounded-xl border bg-background p-4 shadow-sm space-y-2">
                      <p className="font-semibold text-sm text-muted-foreground">
                        {item.month}
                      </p>

                      <div className="flex justify-between text-sm">
                        <span>Check-In</span>
                        <span className="font-semibold text-green-600">
                          {item.checkin}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span>Check-Out</span>
                        <span className="font-semibold text-blue-600">
                          {item.checkout}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm border-t pt-2">
                        <span>Kehadiran</span>
                        <span className="font-semibold text-purple-600">
                          {item.checkin}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulan</TableHead>
                      <TableHead className="text-center">Check-In</TableHead>
                      <TableHead className="text-center">Check-Out</TableHead>
                      <TableHead className="text-center">Kehadiran</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading.history ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Memuat data...
                        </TableCell>
                      </TableRow>
                    ) : monthlyData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground">
                          Tidak ada data absensi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      monthlyData.map((item) => (
                        <TableRow key={item.month}>
                          <TableCell className="font-medium">
                            {item.month}
                          </TableCell>
                          <TableCell className="text-center text-green-600 font-semibold">
                            {item.checkin}
                          </TableCell>
                          <TableCell className="text-center text-blue-600 font-semibold">
                            {item.checkout}
                          </TableCell>
                          <TableCell className="text-center text-purple-600 font-semibold">
                            {item.checkin}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default EmployeeAttendancePage;
