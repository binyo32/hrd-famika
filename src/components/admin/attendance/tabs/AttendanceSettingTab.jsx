"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

import AttendanceSetting from "../AttendanceSetting";

const AttendanceSettingTab = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      let allEmployees = [];
      let from = 0;
      const limit = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("employees")
          .select("id, name, nik, is_direct_pm")
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
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Absensi</CardTitle>
        <CardDescription>
          Kelola pengaturan dan relasi karyawan pada sistem absensi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AttendanceSetting
          employees={employees}
          setEmployees={setEmployees}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
};

export default AttendanceSettingTab;
