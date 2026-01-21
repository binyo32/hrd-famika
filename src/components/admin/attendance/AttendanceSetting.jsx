import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/components/ui/use-toast";
import Pagination from "@/components/ui/Pagination";

const AttendanceSetting = ({ employees, setEmployees, loading }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(t);
  }, [search]);

  const filteredEmployees = useMemo(() => {
    const q = debouncedSearch.toLowerCase();

    const filtered = employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) || e.nik?.toLowerCase().includes(q),
    );

    filtered.sort((a, b) => {
      if (a.is_direct_pm === b.is_direct_pm) return 0;
      return a.is_direct_pm ? -1 : 1;
    });

    return filtered;
  }, [employees, debouncedSearch]);

  const pagedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);
  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) return;

    setSubmitting(true);
    const value = bulkAction === "enable";

    try {
      const { error } = await supabase
        .from("employees")
        .update({ is_direct_pm: value })
        .in("id", selectedIds); // 🔥 BULK UPDATE

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((e) =>
          selectedIds.includes(e.id) ? { ...e, is_direct_pm: value } : e,
        ),
      );

      toast({
        title: "Berhasil",
        description: `${selectedIds.length} karyawan berhasil ${
          value ? "ditetapkan sebagai" : "dinonaktifkan dari"
        } Direct PM`,
      });

      setSelectedIds([]);
      setBulkAction(null);
      setOpen(false);
    } catch (err) {
      toast({
        title: "Gagal",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Direct PM</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tentukan karyawan yang berperan sebagai Direct PM untuk Absensi
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 justify-between">
          <Input
            placeholder="Cari nama / NIK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded dark:bg-background dark:text-white px-3 py-2 text-sm">
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} rows
              </option>
            ))}
          </select>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setBulkAction("enable");
                setOpen(true);
              }}>
              Jadikan Direct PM
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                setBulkAction("disable");
                setOpen(true);
              }}>
              Nonaktifkan Direct PM
            </Button>

            <span className="text-sm text-muted-foreground self-center">
              {selectedIds.length} dipilih
            </span>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    pagedEmployees.length > 0 &&
                    pagedEmployees.every((e) => selectedIds.includes(e.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(pagedEmployees.map((e) => e.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </TableHead>

              <TableHead>Nama</TableHead>
              <TableHead>NIK</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : pagedEmployees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground py-6">
                  Tidak ada data
                </TableCell>
              </TableRow>
            ) : (
              pagedEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(emp.id)}
                      onChange={(e) => {
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, emp.id]
                            : prev.filter((id) => id !== emp.id),
                        );
                      }}
                    />
                  </TableCell>

                  <TableCell>{emp.name}</TableCell>
                  <TableCell>{emp.nik}</TableCell>
                  <TableCell className="text-center">
                    {emp.is_direct_pm ? (
                      <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-700 text-green-700 dark:text-green-200">
                        Direct PM
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-700 text-red-500 dark:text-red-200">
                        Bukan Direct PM
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <Dialog open={open} onOpenChange={setOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Konfirmasi</DialogTitle>
                          <DialogDescription>
                            {bulkAction === "enable"
                              ? `Jadikan ${selectedIds.length} karyawan sebagai Direct PM?`
                              : `Nonaktifkan Direct PM dari ${selectedIds.length} karyawan?`}
                          </DialogDescription>
                        </DialogHeader>

                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Batal</Button>
                          </DialogClose>
                          <Button
                            onClick={handleBulkConfirm}
                            disabled={submitting}>
                            {submitting ? "Menyimpan..." : "Ya, Lanjutkan"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination
          page={page}
          pageSize={pageSize}
          totalRecords={filteredEmployees.length}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  );
};

export default AttendanceSetting;
