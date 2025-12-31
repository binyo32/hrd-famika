import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";

const AttendanceTable = ({ records, loading, onEdit, onDelete }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama Karyawan</TableHead>
          <TableHead>NIK</TableHead>
          <TableHead>Tanggal</TableHead>
          <TableHead>Check In</TableHead>
          <TableHead>Check Out</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Catatan</TableHead>
          <TableHead>Lokasi</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan="8" className="text-center">
              Memuat...
            </TableCell>
          </TableRow>
        ) : records.length === 0 ? (
          <TableRow>
            <TableCell colSpan="8" className="text-center">
              Tidak ada catatan absensi untuk filter ini.
            </TableCell>
          </TableRow>
        ) : (
          records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.employees?.name || "N/A"}</TableCell>
              <TableCell>{record.employees?.nik || "N/A"}</TableCell>
              <TableCell>
                {new Date(record.attendance_date).toLocaleDateString("id-ID", {
                  timeZone: "UTC",
                })}
              </TableCell>
              <TableCell>
                {record.check_in_time
                  ? new Date(record.check_in_time).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
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
                        timeZone:
                          Intl.DateTimeFormat().resolvedOptions().timeZone,
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
                    href={`https://www.google.com/maps?q=${record.loc_checkin.latitude},${record.loc_checkin.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-green-600 hover:underline">
                    Check-In
                  </a>
                )}

                {record.loc_checkout && (
                  <a
                    href={`https://www.google.com/maps?q=${record.loc_checkout.latitude},${record.loc_checkout.longitude}`}
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
                  className="hover:text-blue-500 mr-2"
                  title="Edit">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(record.id)}
                  className="hover:text-red-500"
                  title="Hapus">
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
