"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import AttendanceLocationCard from "../AttendanceLocationCard";

export default function AttendanceUpdateLocationTab() {
  const [records, setRecords] = useState([]);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  /* ================= FETCH ================= */
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(
          `
          id,
          attendance_date,
          employee:employees!attendance_records_employee_id_fkey (
            id, name, nik
          ),
          attendance_location_logs (
            id, activity, latitude, longitude, address, recorded_at
          )
        `,
        )
        .eq("attendance_date", filterDate)
        .order("recorded_at", {
          foreignTable: "attendance_location_logs",
          ascending: true,
        });

      if (error) throw error;

      setRecords(data || []);
    } catch (e) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    fetchAttendance();
    setPage(1); // reset pagination saat ganti tanggal
  }, [fetchAttendance]);

  /* ================= FILTER + SORT ================= */
  const filteredRecords = useMemo(() => {
    return records.filter((r) =>
      r.employee?.name?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [records, search]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort(
      (a, b) =>
        (b.attendance_location_logs?.length || 0) -
        (a.attendance_location_logs?.length || 0),
    );
  }, [filteredRecords]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, page]);

  useEffect(() => {
    setPage(1); // reset page saat search
  }, [search]);

  /* ================= SUMMARY ================= */
  const summary = useMemo(() => {
    const totalEmployee = records.length;
    const totalLocationUpdates = records.reduce(
      (sum, r) => sum + (r.attendance_location_logs?.length || 0),
      0,
    );

    return {
      totalEmployee,
      totalLocationUpdates,
    };
  }, [records]);

  /* ================= RENDER ================= */
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Update Lokasi</CardTitle>
        <CardDescription>
          Aktivitas lokasi karyawan yang sudah absen
        </CardDescription>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Karyawan Sudah Absen
            </p>
            <p className="text-2xl font-bold">{summary.totalEmployee}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Update Lokasi</p>
            <p className="text-2xl font-bold">{summary.totalLocationUpdates}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* FILTER BAR */}
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />

          <Input
            placeholder="Cari nama karyawan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* CONTENT */}
        {loading && (
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        )}

        {!loading && paginatedRecords.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Tidak ada data pada tanggal ini
          </p>
        )}

        {!loading &&
          paginatedRecords.map((record) => (
            <AttendanceLocationCard key={record.id} record={record} />
          ))}

        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-muted-foreground">
            Page {page} dari {totalPages}
          </span>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
