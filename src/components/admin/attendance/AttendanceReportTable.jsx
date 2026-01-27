import React, { useMemo, useState, useEffect } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const getWorkMinutes = (r) => {
  if (!r.check_in_time || !r.check_out_time) return 0;
  return (new Date(r.check_out_time) - new Date(r.check_in_time)) / 60000;
};
const SortableTh = ({ label, column, sort, onSortChange }) => {
  const active = sort.key === column;
  const dir = active ? sort.direction : "asc";

  return (
    <TableHead
      onClick={() =>
        onSortChange({
          key: column,
          direction: active && dir === "asc" ? "desc" : "asc",
        })
      }
      className="cursor-pointer select-none hover:text-primary whitespace-nowrap">
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-xs ${active ? "opacity-100" : "opacity-30"}`}>
          {dir === "asc" ? "▲" : "▼"}
        </span>
      </span>
    </TableHead>
  );
};

const AttendanceReportTable = ({
  records,
  loading,
  sort,
  onSortChange,
  page,
  pageSize,
  totalRecords,
  onPageSizeChange,
}) => {
  return (
    <div className="overflow-x-auto">
      {/* TOP BAR */}
      <div className="flex my-2 p-1 items-center justify-end gap-3 mb-4">
        {/* Rows per page */}
        <div className="flex items-center gap-2 text-sm">
          <span>Rows:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTh
              label="Nama Karyawan"
              column="name"
              sort={sort}
              onSortChange={onSortChange}
            />
            <TableHead>NIK</TableHead>
            {/* <TableHead>Direct PM</TableHead> */}
             <SortableTh
              label="Direct PM"
              column="direct_pm"
              sort={sort}
              onSortChange={onSortChange}
            />
            <TableHead>Keterangan/Project</TableHead>
            <TableHead>Tanggal</TableHead>
            <SortableTh
              label="Check In"
              column="checkin"
              sort={sort}
              onSortChange={onSortChange}
            />
            <SortableTh
              label="Check Out"
              column="checkout"
              sort={sort}
              onSortChange={onSortChange}
            />
            <TableHead>Status</TableHead>
            <SortableTh
              label="Total Jam Kerja"
              column="workhours"
              sort={sort}
              onSortChange={onSortChange}
            />
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                Memuat...
              </TableCell>
            </TableRow>
          ) : records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                Tidak ada data.
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.employee?.name || "N/A"}</TableCell>
                <TableCell>{record.employee?.nik || "N/A"}</TableCell>
                <TableCell>{record.direct_pm?.name || "N/A"}</TableCell>
                <TableCell>{record.project || "N/A"}</TableCell>
                <TableCell>
                  {new Date(record.attendance_date).toLocaleDateString("id-ID")}
                </TableCell>
                <TableCell>
                  {record.check_in_time
                    ? new Date(record.check_in_time).toLocaleTimeString(
                        "id-ID",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )
                    : "-"}
                </TableCell>
                <TableCell>
                  {record.check_out_time
                    ? new Date(record.check_out_time).toLocaleTimeString(
                        "id-ID",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )
                    : "-"}
                </TableCell>
                <TableCell>
                  {record.attendance_statuses?.name ||
                    (record.check_in_time ? "Hadir" : "-")}
                </TableCell>
                <TableCell>
                  {record.check_in_time && record.check_out_time
                    ? (() => {
                        const diff =
                          new Date(record.check_out_time) -
                          new Date(record.check_in_time);
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return `${h} jam ${m} menit`;
                      })()
                    : "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AttendanceReportTable;
