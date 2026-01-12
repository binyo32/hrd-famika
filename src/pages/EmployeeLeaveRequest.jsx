import React, { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, CalendarDays, Info, RefreshCw, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSuccessModal } from "@/contexts/SuccessModalContext";

const EmployeeLeaveRequest = () => {
  const { user } = useAuth();
  const { showSuccessModal } = useSuccessModal();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [leaveQuota, setLeaveQuota] = useState({
    total_quota: 0,
    used_quota: 0,
    remaining_quota: 0,
  });

  const [loading, setLoading] = useState({
    types: false,
    requests: false,
    quota: false,
    submit: false,
  });

  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const fetchLeaveTypes = useCallback(async () => {
    setLoading((prev) => ({ ...prev, types: true }));
    try {
      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .order("name");
      if (error) throw error;
      setLeaveTypes(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat jenis cuti: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, types: false }));
    }
  }, []);

  const fetchMyLeaveRequests = useCallback(async () => {
    if (!user || !user.id) return;
    setLoading((prev) => ({ ...prev, requests: true }));
    try {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, leave_types(name)")
        .eq("employee_id", user.id)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      setMyLeaveRequests(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat histori pengajuan cuti: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, requests: false }));
    }
  }, [user]);

  const fetchLeaveQuota = useCallback(async () => {
    if (!user || !user.id) return;
    setLoading((prev) => ({ ...prev, quota: true }));
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from("employee_leave_quotas")
        .select("total_quota, used_quota, remaining_quota")
        .eq("employee_id", user.id)
        .eq("year", currentYear)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }
      if (data) {
        setLeaveQuota(data);
      } else {
        setLeaveQuota({ total_quota: 0, used_quota: 0, remaining_quota: 0 });
        toast({
          title: "Informasi Kuota",
          description: `Anda belum memiliki kuota cuti untuk tahun ${currentYear}. Hubungi Admin.`,
          variant: "default",
          duration: 7000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat kuota cuti: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, quota: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchLeaveTypes();
    fetchMyLeaveRequests();
    fetchLeaveQuota();
  }, [fetchLeaveTypes, fetchMyLeaveRequests, fetchLeaveQuota]);

  const handleSubmitLeaveRequest = async () => {
    if (!leaveTypeId || !startDate || !endDate) {
      toast({
        title: "Validasi Gagal",
        description:
          "Jenis cuti, tanggal mulai, dan tanggal selesai harus diisi.",
        variant: "destructive",
      });
      return;
    }

    const selectedLeaveType = leaveTypes.find((lt) => lt.id === leaveTypeId);
    if (!selectedLeaveType) {
      toast({
        title: "Error",
        description: "Jenis cuti tidak valid.",
        variant: "destructive",
      });
      return;
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (sDate > eDate) {
      toast({
        title: "Validasi Gagal",
        description: "Tanggal mulai tidak boleh setelah tanggal selesai.",
        variant: "destructive",
      });
      return;
    }

    let duration = 0;
    let currentDate = new Date(sDate);
    while (currentDate <= eDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        duration++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (duration <= 0) {
      toast({
        title: "Validasi Gagal",
        description: "Durasi cuti minimal 1 hari kerja.",
        variant: "destructive",
      });
      return;
    }

    if (selectedLeaveType.reduces_quota) {
      if (leaveQuota.remaining_quota < duration) {
        toast({
          title: "Validasi Gagal",
          description: `Sisa kuota cuti Anda (${leaveQuota.remaining_quota} hari) tidak mencukupi untuk ${duration} hari.`,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading((prev) => ({ ...prev, submit: true }));
    try {
      const { data: leaveNumberData, error: numberError } = await supabase.rpc(
        "generate_leave_request_number"
      );
      if (numberError) throw numberError;
      const leaveRequestNumber = leaveNumberData;

      const { data, error } = await supabase
        .from("leave_requests")
        .insert({
          employee_id: user.id,
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          reason: reason,
          status: "Menunggu Persetujuan",
          leave_request_number: leaveRequestNumber,
        })
        .select()
        .single();

      if (error) throw error;

      showSuccessModal({
        title: "Pengajuan Terkirim!",
        description:
          "Pengajuan cuti Anda berhasil dikirim dan sedang menunggu persetujuan.",
        leaveRequestNumber: leaveRequestNumber,
      });

      fetchMyLeaveRequests();
      if (selectedLeaveType.reduces_quota) {
        fetchLeaveQuota();
      }
      setIsRequestDialogOpen(false);
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengirim pengajuan cuti: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const openRequestDialog = () => {
    setLeaveTypeId("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setIsRequestDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-8 ">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            Pengajuan Cuti Saya
          </h1>
          <p className="text-muted-foreground">
            Ajukan cuti baru dan lihat histori pengajuan Anda.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}>
          <Card className="glass-effect border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center">
                <Info className="mr-2 h-5 w-5 text-blue-500" />
                Informasi Kuota Cuti Tahunan ({new Date().getFullYear()})
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchLeaveQuota}
                disabled={loading.quota}>
                <RefreshCw
                  className={`h-4 w-4 ${loading.quota ? "animate-spin" : ""}`}
                />
              </Button>
            </CardHeader>
            <CardContent>
              {loading.quota ? (
                <p className="text-muted-foreground">Memuat kuota...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Kuota</p>
                    <p className="text-2xl font-bold">
                      {leaveQuota.total_quota} hari
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Kuota Terpakai
                    </p>
                    <p className="text-2xl font-bold">
                      {leaveQuota.used_quota} hari
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sisa Kuota</p>
                    <p className="text-2xl font-bold text-green-500">
                      {leaveQuota.remaining_quota} hari
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}>
          <Card className="glass-effect border-0 shadow-xl">
            <CardHeader className="flex md:flex-row flex-col md:items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Histori Pengajuan Cuti Saya
                </CardTitle>
                <CardDescription>
                  Daftar semua pengajuan cuti yang pernah Anda buat.
                </CardDescription>
              </div>
              <Button
                onClick={openRequestDialog}
                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white">
                <PlusCircle className="mr-2 h-4 w-4" /> Ajukan Cuti Baru
              </Button>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Cuti</TableHead>
                      <TableHead>Jenis Cuti</TableHead>
                      <TableHead>Tanggal Mulai</TableHead>
                      <TableHead>Tanggal Selesai</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Diajukan Pada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading.requests ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Memuat pengajuan...
                        </TableCell>
                      </TableRow>
                    ) : myLeaveRequests.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground">
                          Anda belum pernah mengajukan cuti.
                        </TableCell>
                      </TableRow>
                    ) : (
                      myLeaveRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="whitespace-nowrap">
                            {req.leave_request_number || "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {req.leave_types?.name || "N/A"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(req.start_date).toLocaleDateString(
                              "id-ID"
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(req.end_date).toLocaleDateString("id-ID")}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                req.status === "Disetujui"
                                  ? "bg-green-100 text-green-700"
                                  : req.status === "Ditolak"
                                  ? "bg-red-100 text-red-700"
                                  : req.status === "Dibatalkan"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                              {req.status}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(req.requested_at).toLocaleString("id-ID")}
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

      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Formulir Pengajuan Cuti / Dinas</DialogTitle>
            <DialogDescription>
              Isi detail pengajuan cuti Anda. Pastikan data yang dimasukkan
              sudah benar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="leaveType">Jenis Cuti / Dinas</Label>
              <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Pilih Jenis Cuti" />
                </SelectTrigger>
                <SelectContent>
                  {(leaveTypes || [])
                    .filter((type) => type && type.id)
                    .map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} (
                        {type.reduces_quota
                          ? "Mengurangi Kuota"
                          : "Tidak Mengurangi Kuota"}
                        )
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai Cuti</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Tanggal Selesai Cuti</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Alasan Cuti (Opsional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan alasan pengajuan cuti Anda di sini..."
              />
            </div>
            {leaveTypeId &&
              leaveTypes.find((lt) => lt.id === leaveTypeId)?.reduces_quota && (
                <p className="text-sm text-blue-600">
                  Sisa kuota Anda saat ini: {leaveQuota.remaining_quota} hari.
                  Pengajuan ini akan mengurangi sisa kuota jika disetujui.
                </p>
              )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRequestDialogOpen(false)}
              disabled={loading.submit}>
              Batal
            </Button>
            <Button
              onClick={handleSubmitLeaveRequest}
              className="bg-gradient-to-r from-green-500 to-teal-600 text-white"
              disabled={loading.submit}>
              {loading.submit ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Kirim Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default EmployeeLeaveRequest;
