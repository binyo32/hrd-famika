"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

import AttendanceFilterBar from "../AttendanceFilterBar";
import AttendanceTable from "../AttendanceTable";
import Pagination from "@/components/ui/Pagination";

const DailyRecapTab = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [filterEmployee, setFilterEmployee] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sort, setSort] = useState({
    key: "attendance_date",
    direction: "desc",
  });

  const [loading, setLoading] = useState({
    records: false,
    employees: false,
  });
  const fetchEmployees = useCallback(async () => {
    setLoading((prev) => ({ ...prev, employees: true }));
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
      setLoading((prev) => ({ ...prev, employees: false }));
    }
  }, []);
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  const fetchAttendanceRecords = useCallback(async () => {
    setLoading((prev) => ({ ...prev, records: true }));

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
    name,
    nik
  ),
  direct_pm:employees!attendance_records_direct_pm_id_fkey (
    name
  ),
  attendance_statuses (name)
`,
          )

          .eq("attendance_date", filterDate)
          .order("attendance_date", { ascending: false })
          .range(from, from + limit - 1);

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
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat catatan absensi: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, records: false }));
    }
  }, [filterDate, filterEmployee]);
  useEffect(() => {
    fetchAttendanceRecords();
    setPage(1);
  }, [filterDate, filterEmployee, fetchAttendanceRecords]);
  const filteredRecords = attendanceRecords.filter((record) => {
    const name = record.employee?.name?.toLowerCase() || "";
    const nik = record.employee?.nik?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return name.includes(search) || nik.includes(search);
  });
  const sortedRecords = React.useMemo(() => {
    const data = [...filteredRecords];
    data.sort((a, b) => {
      let aVal, bVal;
      switch (sort.key) {
        case "name":
          aVal = a.employee?.name || "";
          bVal = b.employee?.name || "";
          break;
        case "nik":
          aVal = a.employee?.nik || "";
          bVal = b.employee?.nik || "";
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [filteredRecords, sort]);
  const pagedRecords = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, page, pageSize]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rekap Absensi Harian</CardTitle>
        <CardDescription>
          Lihat catatan absensi karyawan untuk tanggal yang dipilih.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CardContent>
          <AttendanceFilterBar
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            filterEmployee={filterEmployee}
            setFilterEmployee={setFilterEmployee}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            employees={employees}
          />

          <AttendanceTable
            records={pagedRecords}
            loading={loading.records}
            sort={sort}
            onSortChange={setSort}
            page={page}
            pageSize={pageSize}
            totalRecords={sortedRecords.length}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />

          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={sortedRecords.length}
            onPageChange={setPage}
            className="mt-4"
          />
        </CardContent>
      </CardContent>
    </Card>
  );
};

export default DailyRecapTab;
