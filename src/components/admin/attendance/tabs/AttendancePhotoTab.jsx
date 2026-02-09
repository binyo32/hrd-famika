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

const PAGE_SIZE = 60;

export default function AttendancePhotoTab() {
  const [records, setRecords] = useState([]);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  /* ================= FETCH DATA (PAGINATED) ================= */
  const fetchPhotos = useCallback(
    async (reset = false) => {
      if (loading) return;

      setLoading(true);

      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
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
        )
        .eq("attendance_date", filterDate)
        .not("attachment", "is", null)
        .range(from, to);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

     if (reset) {
  setRecords(data || []);
  setPage(1);
} else {
  setRecords((prev) => [...prev, ...(data || [])]);
  setPage((p) => p + 1);
}

// ⬇️ INI PENTING
if (!data || data.length < PAGE_SIZE) {
  setHasMore(false); // sudah habis
} else {
  setHasMore(true);
}


      setLoading(false);
    },
    [filterDate, page, loading],
  );

  /* FIRST LOAD + RESET SAAT GANTI TANGGAL */
  useEffect(() => {
    setRecords([]);
    setPage(0);
    setHasMore(true);
    fetchPhotos(true);
  }, [filterDate]);

  /* ================= SEARCH FILTER ================= */
  const filtered = useMemo(() => {
    const s = search.toLowerCase();

    return [...records]
      .filter((r) => {
        const fileName = r.attachment?.toLowerCase() || "";
        const emp = r.employee?.name?.toLowerCase() || "";
        return fileName.includes(s) || emp.includes(s);
      })
      .sort((a, b) => {
        const nameA = a.employee?.name || "";
        const nameB = b.employee?.name || "";
        return nameA.localeCompare(nameB);
      });
  }, [records, search]);

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
        </div>

        {/* LOADING */}
        {loading && records.length === 0 && (
          <p className="text-sm text-muted-foreground">Memuat foto...</p>
        )}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Tidak ada foto pada tanggal ini
          </p>
        )}

        {/* GRID PHOTO */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((r) => (
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

        {/* LOAD MORE */}
    {hasMore && !search && (
  <div className="flex justify-center pt-2">
    <Button
      variant="outline"
      onClick={() => fetchPhotos()}
      disabled={loading}
    >
      {loading ? "Loading..." : "Load More"}
    </Button>
  </div>
)}

      </CardContent>
    </Card>
  );
}
