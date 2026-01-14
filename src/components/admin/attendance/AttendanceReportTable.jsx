import React, { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
      className="cursor-pointer select-none hover:text-primary whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-xs ${active ? "opacity-100" : "opacity-30"}`}>
          {dir === "asc" ? "▲" : "▼"}
        </span>
      </span>
    </TableHead>
  );
};


const AttendanceReportTable = ({ records, loading, sort, onSortChange }) => {

  const sortedRecords = useMemo(() => {
    if (!sort?.key) return records;

    return [...records].sort((a, b) => {
      let av, bv;

      switch (sort.key) {
        case "name":
          av = a.employee?.name || "";
          bv = b.employee?.name || "";
          break;

        case "checkin":
          av = a.check_in_time ? new Date(a.check_in_time).getTime() : 0;
          bv = b.check_in_time ? new Date(b.check_in_time).getTime() : 0;
          break;

        case "checkout":
          av = a.check_out_time ? new Date(a.check_out_time).getTime() : 0;
          bv = b.check_out_time ? new Date(b.check_out_time).getTime() : 0;
          break;

        case "workhours":
          av = getWorkMinutes(a);
          bv = getWorkMinutes(b);
          break;

        default:
          return 0;
      }

      if (av < bv) return sort.direction === "asc" ? -1 : 1;
      if (av > bv) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [records, sort]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTh label="Nama Karyawan" column="name" sort={sort} onSortChange={onSortChange} />
            <TableHead>NIK</TableHead>
            <TableHead>Direct PM</TableHead>
            <TableHead>Tanggal</TableHead>
            <SortableTh label="Check In" column="checkin" sort={sort} onSortChange={onSortChange} />
            <SortableTh label="Check Out" column="checkout" sort={sort} onSortChange={onSortChange} />
            <TableHead>Status</TableHead>
            <SortableTh label="Total Jam Kerja" column="workhours" sort={sort} onSortChange={onSortChange} />
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan="8" className="text-center">Memuat...</TableCell>
            </TableRow>
          ) : sortedRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan="8" className="text-center">Tidak ada data untuk laporan ini.</TableCell>
            </TableRow>
          ) : (
            sortedRecords.map((record) => {
              let workHours = "-";
              if (record.check_in_time && record.check_out_time) {
                const diff = new Date(record.check_out_time) - new Date(record.check_in_time);
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                workHours = `${h} jam ${m} menit`;
              }

              return (
                <TableRow key={record.id}>
                  <TableCell>{record.employee?.name || "N/A"}</TableCell>
                  <TableCell>{record.employee?.nik || "N/A"}</TableCell>
                  <TableCell>{record.direct_pm?.name || "N/A"}</TableCell>
                  <TableCell>{new Date(record.attendance_date).toLocaleDateString("id-ID", { timeZone: "UTC" })}</TableCell>
                  <TableCell>{record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) : "-"}</TableCell>
                  <TableCell>{record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) : "-"}</TableCell>
                  <TableCell>{record.attendance_statuses?.name || (record.check_in_time ? "Hadir" : "-")}</TableCell>
                  <TableCell>{workHours}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AttendanceReportTable;
