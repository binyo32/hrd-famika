import * as XLSX from "xlsx";

export const exportAttendanceToExcel = ({ records, startDate, endDate }) => {
  if (!records || records.length === 0) {
    throw new Error("Tidak ada data absensi untuk diekspor");
  }

  const excelData = records.map((row, index) => ({
  No: index + 1,
  Tanggal: row.attendance_date,
  "Nama Karyawan": row.employee?.name || "-",
  NIK: row.employee?.nik || "-",
  "Nama PM": row.direct_pm?.name || "-",
  "Keterangan/Project": row.project || "-",
  "Check In": formatTime(row.check_in_time),
  "Check Out": formatTime(row.check_out_time),
  "Total Jam Kerja": getWorkDuration(
    row.check_in_time,
    row.check_out_time
  ),
  Status: row.attendance_statuses?.name || "-",
  Catatan: row.notes || "",
}));


  const worksheet = XLSX.utils.json_to_sheet(excelData);

 worksheet["!cols"] = [
  { wch: 5 },
  { wch: 12 },
  { wch: 25 },
  { wch: 15 },
  { wch: 25 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 18 },
  { wch: 15 },
  { wch: 30 },
];


  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");

  XLSX.writeFile(workbook, `laporan-absensi-${startDate}-sd-${endDate}.xlsx`);
};

const formatTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
const getWorkDuration = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "-";

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  inDate.setSeconds(0, 0);
  outDate.setSeconds(0, 0);

  const diffMs = outDate - inDate;
  if (diffMs <= 0) return "0 jam 0 menit";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} jam ${minutes} menit`;
};

