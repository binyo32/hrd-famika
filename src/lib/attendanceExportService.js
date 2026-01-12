import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";

export const exportAttendanceToExcel = async ({
  startDate,
  endDate,
  employeeId,
}) => {
  let query = supabase
    .from("attendance_records")
    .select(`
      attendance_date,
      check_in_time,
      check_out_time,
      notes,
      employee:employees!attendance_records_employee_id_fkey (
        name,
        nik
      ),
      direct_pm:employees!attendance_records_direct_pm_id_fkey (
        name
      ),
      attendance_statuses (
        name
      )
    `)
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate)
    .order("attendance_date", { ascending: true });

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Tidak ada data absensi untuk diekspor");
  }

  /* =====================
     FORMAT DATA EXCEL
  ====================== */
  const excelData = data.map((row, index) => ({
    No: index + 1,
    Tanggal: row.attendance_date,
    "Nama Karyawan": row.employee?.name || "-",
    NIK: row.employee?.nik || "-",
    "Nama PM": row.direct_pm?.name || "-",
    "Check In": formatTime(row.check_in_time),
    "Check Out": formatTime(row.check_out_time),
    Status: row.attendance_statuses?.name || "-",
    Catatan: row.notes || "",
  }));

  /* =====================
     BUAT WORKSHEET
  ====================== */
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  worksheet["!cols"] = [
    { wch: 5 },   // No
    { wch: 12 },  // Tanggal
    { wch: 25 },  // Nama Karyawan
    { wch: 15 },  // NIK
    { wch: 25 },  // Nama PM
    { wch: 12 },  // Check In
    { wch: 12 },  // Check Out
    { wch: 15 },  // Status
    { wch: 30 },  // Catatan
  ];

  /* =====================
     BUAT WORKBOOK
  ====================== */
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Laporan Absensi"
  );

  /* =====================
     DOWNLOAD FILE
  ====================== */
  XLSX.writeFile(
    workbook,
    `laporan-absensi-${startDate}-sd-${endDate}.xlsx`
  );
};

/* ================= HELPERS ================= */

const formatTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
