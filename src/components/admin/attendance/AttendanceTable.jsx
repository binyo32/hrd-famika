import React from "react";
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

import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
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

const SkeletonRow = () => (
  <TableRow className="animate-pulse">
    {Array.from({ length: 10 }).map((_, i) => (
      <TableCell key={i}>
        <div className="h-4 w-full rounded bg-muted" />
      </TableCell>
    ))}
  </TableRow>
);

const AttendanceTable = ({
  records,
  loading,
  onEdit,
  onDelete,
  sort,
  onSortChange,

  page,
  pageSize,
  totalRecords,
  onPageSizeChange,
}) => (
  <div className="overflow-x-auto">
    <div className="flex items-center justify-end mb-3 gap-4 flex-wrap">

      <div className="flex items-center gap-2 px-4 py-1">
        <span className="text-sm">Rows:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <Table>
      <TableHeader>
        <TableRow>
          <SortableTh
            label="Tanggal"
            column="date"
            sort={sort}
            onSortChange={onSortChange}
          />
          <SortableTh
            label="Nama Karyawan"
            column="name"
            sort={sort}
            onSortChange={onSortChange}
          />
          <SortableTh
            label="NIK"
            column="nik"
            sort={sort}
            onSortChange={onSortChange}
          />

          <TableHead>Direct PM</TableHead>

          <SortableTh
            label="Check In"
            column="checkin"
            sort={sort}
            onSortChange={onSortChange}
          />

          <TableHead>Check Out</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Catatan</TableHead>
          <TableHead>Lokasi</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
        ) : records.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan="10"
              className="text-center py-6 text-muted-foreground">
              Tidak ada catatan absensi untuk filter ini.
            </TableCell>
          </TableRow>
        ) : (
          records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>
                {new Date(record.attendance_date).toLocaleDateString("id-ID", {
                  timeZone: "UTC",
                })}
              </TableCell>

              <TableCell>{record.employee?.name || "N/A"}</TableCell>
              <TableCell>{record.employee?.nik || "N/A"}</TableCell>
              <TableCell>{record.direct_pm?.name || "N/A"}</TableCell>

              <TableCell>
                {record.check_in_time
                  ? new Date(record.check_in_time).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
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

              <TableCell>{record.notes || "-"}</TableCell>

              <TableCell className="space-y-1">
                {record.loc_checkin && (
                  <a
                    href={`https://www.google.com/maps?q=${record.loc_checkin.lat},${record.loc_checkin.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-green-600 hover:underline">
                    Check-In
                  </a>
                )}

                {record.loc_checkout && (
                  <a
                    href={`https://www.google.com/maps?q=${record.loc_checkout.lat},${record.loc_checkout.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-red-600 hover:underline">
                    Check-Out
                  </a>
                )}

                {!record.loc_checkin && !record.loc_checkout && "-"}
              </TableCell>

              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(record)}
                  className="hover:text-blue-500 mr-2">
                  <Edit2 className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(record.id)}
                  className="hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
);

export default AttendanceTable;
