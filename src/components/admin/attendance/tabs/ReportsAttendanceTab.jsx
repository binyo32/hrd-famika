"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

import AttendanceReportTable from "../AttendanceReportTable";
import AttendanceSummaryCards from "../AttendanceSummaryCards";
import Pagination from "@/components/ui/Pagination";
import { exportAttendanceToExcel } from "@/lib/attendanceExportService";

const ReportsAttendanceTab = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [filterStartDate, setFilterStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [filterEndDate, setFilterEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [filterEmployee, setFilterEmployee] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [checkinFilter, setCheckinFilter] = useState("checked");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sort, setSort] = useState({
    key: "attendance_date",
    direction: "desc",
  });
  const getWorkMinutes = (r) => {
    if (!r.check_in_time || !r.check_out_time) return 0;
    return (new Date(r.check_out_time) - new Date(r.check_in_time)) / 60000;
  };

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

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
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
  employee:employees!attendance_records_employee_id_fkey (name, nik),
  direct_pm:employees!attendance_records_direct_pm_id_fkey (name),
  attendance_statuses (name)
`,
          )

          .gte("attendance_date", filterStartDate)
          .lte("attendance_date", filterEndDate)
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
        description: "Gagal memuat laporan absensi: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterStartDate, filterEndDate, filterEmployee]);

  useEffect(() => {
    fetchAttendanceRecords();
    setPage(1);
  }, [filterStartDate, filterEndDate, filterEmployee, fetchAttendanceRecords]);
  const checkedInEmployeeIds = useMemo(() => {
    return new Set(attendanceRecords.map((r) => r.employee_id));
  }, [attendanceRecords]);

  const uncheckedEmployees = useMemo(() => {
    return employees.filter((emp) => !checkedInEmployeeIds.has(emp.id));
  }, [employees, checkedInEmployeeIds]);

  const uncheckedEmployeeRecords = useMemo(() => {
    return uncheckedEmployees.map((emp) => ({
      id: `unchecked-${emp.id}`,
      employee_id: emp.id,
      employee: {
        name: emp.name,
        nik: emp.nik,
      },
      attendance_date: `${filterStartDate} - ${filterEndDate}`,
      check_in_time: null,
      check_out_time: null,
      attendance_statuses: { name: "Belum Check-in" },
      isUnchecked: true,
    }));
  }, [uncheckedEmployees, filterStartDate, filterEndDate]);
  const filteredRecords = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return attendanceRecords.filter((r) => {
      const name = r.employee?.name?.toLowerCase() || "";
      const nik = r.employee?.nik?.toLowerCase() || "";
      return name.includes(search) || nik.includes(search);
    });
  }, [attendanceRecords, searchTerm]);
  const sortedRecords = useMemo(() => {
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

        case "direct_pm":
          aVal = a.direct_pm?.name || "";
          bVal = b.direct_pm?.name || "";
          break;

        case "date":
          aVal = a.attendance_date;
          bVal = b.attendance_date;
          break;

        case "checkin":
          aVal = a.check_in_time || "";
          bVal = b.check_in_time || "";
          break;

        case "checkout":
          aVal = a.check_out_time || "";
          bVal = b.check_out_time || "";
          break;

        case "workhours":
          aVal = getWorkMinutes(a);
          bVal = getWorkMinutes(b);
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

  const finalReportRecords = useMemo(() => {
    if (checkinFilter === "unchecked") return uncheckedEmployeeRecords;
    return sortedRecords;
  }, [checkinFilter, uncheckedEmployeeRecords, sortedRecords]);

  const attendanceSummary = useMemo(() => {
    if (checkinFilter === "unchecked") {
      const total = uncheckedEmployeeRecords.length;
      return {
        totalCheckIn: total,
        totalCheckOut: 0,
        hadirByCheckIn: total,
      };
    }

    return {
      totalCheckIn: filteredRecords.filter((r) => r.check_in_time).length,
      totalCheckOut: filteredRecords.filter((r) => r.check_out_time).length,
      hadirByCheckIn: filteredRecords.filter((r) => r.check_in_time).length,
    };
  }, [checkinFilter, uncheckedEmployeeRecords, filteredRecords]);
  const pagedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return finalReportRecords.slice(start, start + pageSize);
  }, [finalReportRecords, page, pageSize]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Absensi</CardTitle>
        <CardDescription>
          Lihat dan ekspor laporan absensi karyawan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Status Kehadiran</Label>
            <Select
              value={checkinFilter}
              onValueChange={(v) => {
                setCheckinFilter(v);
                setPage(1);
              }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checked">Sudah Check-in</SelectItem>
                <SelectItem value="unchecked">Belum Check-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Label>Cari Karyawan</Label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-9 h-5 w-5 text-muted-foreground" />
          </div>

          <div>
            <Label>Tanggal Mulai</Label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <Label>Tanggal Akhir</Label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <Button
          className="mb-4 bg-gradient-to-r from-green-700 to-green-500"
          onClick={() =>
            exportAttendanceToExcel({
              records: finalReportRecords,
              startDate: filterStartDate,
              endDate: filterEndDate,
              mode: checkinFilter,
            })
          }>
          Export Laporan (Excel)
        </Button>

        <AttendanceSummaryCards
          summary={attendanceSummary}
          mode={checkinFilter}
        />

        <AttendanceReportTable
          records={pagedRecords}
          loading={loading}
          sort={sort}
          onSortChange={setSort}
          page={page}
          pageSize={pageSize}
          totalRecords={finalReportRecords.length}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          totalRecords={finalReportRecords.length}
          onPageChange={setPage}
          className="mt-4"
        />
      </CardContent>
    </Card>
  );
};

export default ReportsAttendanceTab;
