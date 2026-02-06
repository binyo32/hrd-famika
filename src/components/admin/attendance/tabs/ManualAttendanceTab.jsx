"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

import ManualAttendanceDialog from "../ManualAttendanceDialog";
import { addLog } from "@/lib/activityLogService";

const ManualAttendanceTab = () => {
  const { user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [attendanceStatuses, setAttendanceStatuses] = useState([]);

  const [loading, setLoading] = useState({
    employees: false,
    statuses: false,
    submit: false,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [manualInputData, setManualInputData] = useState({
    employee_id: "",
    attendance_date: new Date().toISOString().split("T")[0],
    check_in_time: "",
    check_out_time: "",
    status_id: "",
    notes: "",
  });
  const fetchEmployees = useCallback(async () => {
    setLoading((p) => ({ ...p, employees: true }));
    try {
      let all = [];
      let from = 0;
      const limit = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("employees")
          .select("id, name, nik")
          .order("name")
          .range(from, from + limit - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        all = all.concat(data);
        from += limit;
      }

      setEmployees(all);
    } catch (e) {
      toast({
        title: "Error",
        description: "Gagal memuat karyawan: " + e.message,
        variant: "destructive",
      });
    } finally {
      setLoading((p) => ({ ...p, employees: false }));
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  const fetchAttendanceStatuses = useCallback(async () => {
    setLoading((p) => ({ ...p, statuses: true }));
    try {
      const { data, error } = await supabase
        .from("attendance_statuses")
        .select("*")
        .order("name");

      if (error) throw error;
      setAttendanceStatuses(data);
    } catch (e) {
      toast({
        title: "Error",
        description: "Gagal memuat status absensi: " + e.message,
        variant: "destructive",
      });
    } finally {
      setLoading((p) => ({ ...p, statuses: false }));
    }
  }, []);

  useEffect(() => {
    fetchAttendanceStatuses();
  }, [fetchAttendanceStatuses]);
  const handleManualInputChange = (e) => {
    const { name, value } = e.target;
    setManualInputData((p) => ({ ...p, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setManualInputData((p) => ({ ...p, [name]: value }));
  };
  const openDialog = (record = null) => {
    if (record) {
      setEditingRecord(record);

      const toLocal = (iso) =>
        iso
          ? new Date(iso).toLocaleTimeString("sv-SE", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

      setManualInputData({
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        check_in_time: toLocal(record.check_in_time),
        check_out_time: toLocal(record.check_out_time),
        status_id: record.status_id || "",
        notes: record.notes || "",
      });
    } else {
      setEditingRecord(null);
      setManualInputData({
        employee_id: "",
        attendance_date: new Date().toISOString().split("T")[0],
        check_in_time: "",
        check_out_time: "",
        status_id: "",
        notes: "",
      });
    }

    setIsDialogOpen(true);
  };
  const handleSubmit = async () => {
    if (!manualInputData.employee_id || !manualInputData.attendance_date) {
      toast({
        title: "Validasi Gagal",
        description: "Karyawan dan tanggal wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setLoading((p) => ({ ...p, submit: true }));

    const toISO = (date, time) => {
      if (!time) return null;
      const [h, m] = time.split(":");
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };

    const payload = {
      employee_id: manualInputData.employee_id,
      attendance_date: manualInputData.attendance_date,
      check_in_time: toISO(
        manualInputData.attendance_date,
        manualInputData.check_in_time,
      ),
      check_out_time: toISO(
        manualInputData.attendance_date,
        manualInputData.check_out_time,
      ),
      status_id: manualInputData.status_id || null,
      notes: manualInputData.notes,
      recorded_by: user.id,
    };

    try {
      let res;
      let action = editingRecord ? "UPDATE" : "CREATE";

      if (editingRecord) {
        res = await supabase
          .from("attendance_records")
          .update(payload)
          .eq("id", editingRecord.id)
          .select()
          .single();
      } else {
        res = await supabase
          .from("attendance_records")
          .upsert(payload, {
            onConflict: "employee_id,attendance_date",
          })
          .select()
          .single();
      }

      if (res.error) throw res.error;

      const emp = employees.find((e) => e.id === res.data.employee_id);

      await addLog({
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action,
        targetType: "ATTENDANCE",
        targetId: res.data.id,
        targetName: `Absensi ${emp?.name || ""} ${res.data.attendance_date}`,
      });

      toast({
        title: "Sukses",
        description: `Absensi berhasil ${
          editingRecord ? "diperbarui" : "dicatat"
        }`,
      });

      setIsDialogOpen(false);
    } catch (e) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading((p) => ({ ...p, submit: false }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Absensi Manual</CardTitle>
        <CardDescription>
          Catat atau perbarui absensi karyawan secara manual.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => openDialog()}
          className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Catat Absensi
        </Button>

        <p className="text-sm text-muted-foreground">
          Gunakan tombol di atas untuk input atau update absensi manual.
        </p>

        <ManualAttendanceDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editingRecord={editingRecord}
          manualInputData={manualInputData}
          handleManualInputChange={handleManualInputChange}
          handleSelectChange={handleSelectChange}
          employees={employees}
          attendanceStatuses={attendanceStatuses}
          onSubmit={handleSubmit}
          loadingSubmit={loading.submit}
        />
      </CardContent>
    </Card>
  );
};

export default ManualAttendanceTab;
