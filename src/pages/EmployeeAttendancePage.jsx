import React, { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
  const checkLocationPermission = async () => {
    if (!navigator.permissions) return;

    const result = await navigator.permissions.query({
      name: "geolocation",
    });

    if (result.state === "granted") {
      setLocationAllowed(true);
    }

    if (result.state === "denied") {
      toast({
        title: "Izin Lokasi Ditolak",
        description: "Silakan aktifkan izin lokasi melalui pengaturan browser.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendanceHistory();
    checkLocationPermission();
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

  const handleCheckIn = async () => {
    if (!user?.id) return;

    if (!liveLocation) {
      toast({
        title: "Lokasi belum tersedia",
        description: "Tunggu hingga lokasi terdeteksi.",
        variant: "destructive",
      });
      return;
    }

    setLoading((p) => ({ ...p, checkInOut: true }));

    try {
      const today = new Date().toISOString().split("T")[0];
      const checkInTime = new Date().toISOString();

      const locPayload = getCurrentLiveLocationPayload();

      const { data: hadirStatus } = await supabase
        .from("attendance_statuses")
        .select("id")
        .eq("code", "H")
        .single();

      const { data, error } = await supabase
        .from("attendance_records")
        .upsert(
          {
            employee_id: user.id,
            attendance_date: today,
            check_in_time: checkInTime,
            status_id: hadirStatus.id,
            loc_checkin: locPayload, // ✅ JSONB
          },
          { onConflict: "employee_id, attendance_date" }
        )
        .select()
        .single();

      if (error) throw error;

      setTodayAttendance(data);
      fetchAttendanceHistory();

      toast({
        title: "Check-In Berhasil",
        description: "Lokasi diambil dari live GPS.",
        className: "bg-green-500 text-white",
      });
    } catch (err) {
      toast({
        title: "Gagal Check-In",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading((p) => ({ ...p, checkInOut: false }));
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance?.id) return;

    if (!liveLocation) {
      toast({
        title: "Lokasi belum tersedia",
        description: "Tunggu hingga lokasi terdeteksi.",
        variant: "destructive",
      });
      return;
    }

    setLoading((p) => ({ ...p, checkInOut: true }));

    try {
      const checkOutTime = new Date().toISOString();
      const locPayload = getCurrentLiveLocationPayload();

      const { data, error } = await supabase
        .from("attendance_records")
        .update({
          check_out_time: checkOutTime,
          loc_checkout: locPayload, //
        })
        .eq("id", todayAttendance.id)
        .select()
        .single();

      if (error) throw error;

      setTodayAttendance(data);
      fetchAttendanceHistory();

      toast({
        title: "Check-Out Berhasil",
        description: "Lokasi diambil dari live GPS.",
        className: "bg-blue-500 text-white",
      });
    } catch (err) {
      toast({
        title: "Gagal Check-Out",
        description: err.message,
        variant: "destructive",
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

    if (
      (!todayAttendance || !todayAttendance.check_in_time) &&
      !locationAllowed
    ) {
      setShowLocationModal(true);
    } else {
      setShowLocationModal(false);
    }
  }, [attendanceChecked, todayAttendance, locationAllowed]);

  const [locationLoading, setLocationLoading] = useState(false);

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocationAllowed(true);
      },
      (err) => {
        toast({
          title: "Izin Lokasi Diperlukan",
          description: "Aktifkan lokasi untuk absensi",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  };
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveAddress, setLiveAddress] = useState("-");
  const [watchId, setWatchId] = useState(null);
  useEffect(() => {
    if (!locationAllowed || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setLiveLocation({ latitude: lat, longitude: lon });

        // Reverse geocoding (OpenStreetMap)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
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
        enableHighAccuracy: false,
        maximumAge: 10000,
        timeout: 5000,
      }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Izin Lokasi</CardTitle>
              <CardDescription>
                Aplikasi membutuhkan akses lokasi untuk mencatat absensi Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button onClick={requestLocation} disabled={locationLoading}>
                {locationLoading ? "Mengambil lokasi..." : "Izinkan Lokasi"}
              </Button>
            </CardContent>
          </Card>
        </div>
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
                {currentTime.toLocaleTimeString("id-ID", {
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
                        todayAttendance.check_in_time
                      ).toLocaleTimeString("id-ID")}
                      {todayAttendance.attendance_statuses &&
                        ` (${todayAttendance.attendance_statuses.name})`}
                    </p>
                  )}
                  {todayAttendance?.check_out_time && (
                    <p className="text-center text-blue-600">
                      Check-Out pada:{" "}
                      {new Date(
                        todayAttendance.check_out_time
                      ).toLocaleTimeString("id-ID")}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={handleCheckIn}
                      disabled={!canCheckIn || loading.checkInOut}
                      className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white text-lg py-6">
                      <LogIn className="mr-2 h-5 w-5" />{" "}
                      {loading.checkInOut && canCheckIn
                        ? "Memproses..."
                        : "Check In"}
                    </Button>
                    <Button
                      onClick={handleCheckOut}
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

              {/* ================= DESKTOP VIEW ================= */}
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
