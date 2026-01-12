import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const AttendanceReportTable = ({ records, loading }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama Karyawan</TableHead>
          <TableHead>NIK</TableHead>
            <TableHead>Direct PM</TableHead>
          <TableHead>Tanggal</TableHead>
          <TableHead>Check In</TableHead>
          <TableHead>Check Out</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Total Jam Kerja</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow><TableCell colSpan="7" className="text-center">Memuat...</TableCell></TableRow>
        ) : records.length === 0 ? (
          <TableRow><TableCell colSpan="7" className="text-center">Tidak ada data untuk laporan ini.</TableCell></TableRow>
        ) : (
          records.map(record => {
            let workHours = '-';
            if (record.check_in_time && record.check_out_time) {
              const checkIn = new Date(record.check_in_time);
              const checkOut = new Date(record.check_out_time);
              const diffMs = checkOut - checkIn;
              const hours = Math.floor(diffMs / 3600000);
              const minutes = Math.floor((diffMs % 3600000) / 60000);
              workHours = `${hours} jam ${minutes} menit`;
            }
            return (
              <TableRow key={record.id}>
                <TableCell>{record.employee?.name || 'N/A'}</TableCell>
                <TableCell>{record.employee?.nik || 'N/A'}</TableCell>
                <TableCell>{record.direct_pm?.name|| "N/A"}</TableCell>
                <TableCell>{new Date(record.attendance_date).toLocaleDateString('id-ID', { timeZone: 'UTC' })}</TableCell>
                <TableCell>{record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) : '-'}</TableCell>
                <TableCell>{record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) : '-'}</TableCell>
                <TableCell>{record.attendance_statuses?.name || (record.check_in_time ? 'Hadir' : '-')}</TableCell>
                <TableCell>{workHours}</TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  </div>
);

export default AttendanceReportTable;