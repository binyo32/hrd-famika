"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

import AttendanceMapTab from "../AttendanceMapTab";

const MapAttendanceTab = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [filterEmployee, setFilterEmployee] = useState("");

  const [loading, setLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      let allEmployees = [];
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

        allEmployees = allEmployees.concat(data);
        from += limit;
      }

      setEmployees(allEmployees);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data karyawan: " + error.message,
        variant: "destructive",
      });
    }
  }, []);
  const fetchAttendanceRecords = useCallback(async () => {
    setLoading(true);

    try {
      let allData = [];
      let from = 0;
      const limit = 1000;

      while (true) {
        let query = supabase
          .from("attendance_records")
          .select(
            `
          *,
          employee:employees!attendance_records_employee_id_fkey (
            id,
            name
          ),
          attendance_location_logs (*)
        `,
          )
          .eq("attendance_date", filterDate)
          .order("attendance_date", { ascending: false })
          .range(from, from + limit - 1);

        // 🔥 INI YANG SERING KELEWAT
        if (filterEmployee) {
          query = query.eq("employee_id", filterEmployee);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        from += limit;
      }

      setAttendanceRecords(allData);
    } catch (e) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterEmployee]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [filterDate, filterEmployee, fetchAttendanceRecords]);
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peta Absensi</CardTitle>
        <CardDescription>
          Lihat lokasi check-in karyawan berdasarkan tanggal dan karyawan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AttendanceMapTab
          records={attendanceRecords}
          employees={employees}
          filterDate={filterDate}
          setFilterDate={setFilterDate}
          filterEmployee={filterEmployee}
          setFilterEmployee={setFilterEmployee}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
};

export default MapAttendanceTab;
