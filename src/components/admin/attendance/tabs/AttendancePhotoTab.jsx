"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function AttendancePhotoTab() {
  const [records, setRecords] = useState([]);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  /* PAGINATION STATE */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);

  /* ================= FETCH DATA ================= */
  const fetchPhotos = useCallback(async () => {
    setLoading(true);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("attendance_records")
      .select(
        `
      id,
      attachment,
      employee:employees!attendance_records_employee_id_fkey (
        name,
        nik
      )
    `,
        { count: "exact" },
      )
      .eq("attendance_date", filterDate)
      .not("attachment", "is", null);

    if (search) {
      // 🔹 search attachment (table utama)
      query = query.ilike("attachment", `%${search}%`);

      // 🔹 search employee.name (foreign table)
      query = query.or(`name.ilike.%${search}%`, { foreignTable: "employees" });
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setRecords(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [filterDate, page, pageSize, search]);

  /* FETCH WHEN STATE CHANGE */
  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  /* RESET PAGE WHEN FILTER CHANGE */
  useEffect(() => {
    setPage(1);
  }, [filterDate, pageSize, search]);

  const totalPage = Math.ceil(total / pageSize);

  /* ================= GET PUBLIC URL ================= */
  const getPhotoUrl = (path) => {
    const { data } = supabase.storage
      .from("photo.attendance")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto Absensi</CardTitle>
        <CardDescription>
          Galeri foto check-in karyawan berdasarkan tanggal
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* FILTER */}
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />

          <Input
            placeholder="Cari nama karyawan / file..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          {/* PAGE SIZE */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm">
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* LOADING */}
        {loading && (
          <p className="text-sm text-muted-foreground">Memuat foto...</p>
        )}

        {!loading && records.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Tidak ada foto pada tanggal ini
          </p>
        )}

        {/* GRID PHOTO (TIDAK DIUBAH) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {records.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border overflow-hidden bg-muted">
              <img
                src={getPhotoUrl(r.attachment)}
                alt="attendance"
                loading="lazy"
                className="w-full h-40 object-cover"
              />

              <div className="p-2">
                <p className="text-xs font-medium truncate">
                  {r.employee?.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {r.attachment.split("/")[1]}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* PAGINATION CONTROL */}
        {!search && totalPage > 1 && (
          <div className="flex justify-center items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>

            <span className="text-xs text-muted-foreground">
              Page {page} / {totalPage}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPage}
              onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
