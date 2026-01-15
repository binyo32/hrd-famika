import React, { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  Fingerprint,
  UserPlus,
  CalendarDays,
  FileText,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AttendanceFilterBar from "@/components/admin/attendance/AttendanceFilterBar";
import AttendanceTable from "@/components/admin/attendance/AttendanceTable";
import AttendanceReportTable from "@/components/admin/attendance/AttendanceReportTable";
import ManualAttendanceDialog from "@/components/admin/attendance/ManualAttendanceDialog";
import { addLog } from "@/lib/activityLogService";
import AttendanceMapTab from "@/components/admin/attendance/AttendanceMapTab";
// excel export
import { exportAttendanceToExcel } from "@/lib/attendanceExportService";
import Pagination from "../components/ui/Pagination";

const AdminAttendanceManagement = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState("daily_recap");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceStatuses, setAttendanceStatuses] = useState([]);
  const [loading, setLoading] = useState({
    records: false,
    employees: false,
    statuses: false,
    submit: false,
  });

  const [isManualInputDialogOpen, setIsManualInputDialogOpen] = useState(false);
  const [manualInputData, setManualInputData] = useState({
    employee_id: "",
    attendance_date: new Date().toISOString().split("T")[0],
    check_in_time: "",
    check_out_time: "",
    status_id: "",
    notes: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sort, setSort] = useState({
    key: "attendance_date",
    direction: "desc", // asc | desc
  });
  const [editingRecord, setEditingRecord] = useState(null);

  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterStartDate, setFilterStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterEndDate, setFilterEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [filterEmployee, setFilterEmployee] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchEmployees = useCallback(async () => {
    setLoading((prev) => ({ ...prev, employees: true }));
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, nik")
        .order("name");
      if (error) throw error;
      setEmployees(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data karyawan: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, employees: false }));
    }
  }, []);

  const fetchAttendanceStatuses = useCallback(async () => {
    setLoading((prev) => ({ ...prev, statuses: true }));
    try {
      const { data, error } = await supabase
        .from("attendance_statuses")
        .select("*")
        .order("name");
      if (error) throw error;
      setAttendanceStatuses(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat status absensi: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, statuses: false }));
    }
  }, []);

  const fetchAttendanceRecords = useCallback(
    async ({ date, startDate, endDate, employeeId, isRange = false }) => {
      setLoading((prev) => ({ ...prev, records: true }));
      try {
        let query = supabase
          .from("attendance_records")
          .select(
            `
    *,
    employee:employees!attendance_records_employee_id_fkey (
      name,
      nik
    ),
    direct_pm:employees!attendance_records_direct_pm_id_fkey (
      name
    ),
    attendance_statuses (name)
  `
          )
          .order("attendance_date", { ascending: false });

        if (isRange && startDate && endDate) {
          query = query
            .gte("attendance_date", startDate)
            .lte("attendance_date", endDate);
        } else if (date) {
          query = query.eq("attendance_date", date);
        }

        if (employeeId) {
          query = query.eq("employee_id", employeeId);
        }

        const { data, error } = await query;
        if (error) throw error;

        setAttendanceRecords(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal memuat catatan absensi: " + error.message,
          variant: "destructive",
        });
      } finally {
        setLoading((prev) => ({ ...prev, records: false }));
      }
    },
    []
  );
  useEffect(() => {
    setPage(1);
  }, [
    filterDate,
    filterEmployee,
    searchTerm,
    currentTab,
    filterStartDate,
    filterEndDate,
  ]);

  useEffect(() => {
    fetchEmployees();
    fetchAttendanceStatuses();
  }, [fetchEmployees, fetchAttendanceStatuses]);

  useEffect(() => {
    if (currentTab === "daily_recap") {
      fetchAttendanceRecords({
        date: filterDate,
        employeeId: filterEmployee,
      });
    }

    if (currentTab === "reports") {
      fetchAttendanceRecords({
        startDate: filterStartDate,
        endDate: filterEndDate,
        employeeId: filterEmployee,
        isRange: true,
      });
    }
    if (currentTab === "map") {
      fetchAttendanceRecords({
        date: filterDate,
        employeeId: filterEmployee,
      });
    }
  }, [
    currentTab,
    filterDate,
    filterStartDate,
    filterEndDate,
    filterEmployee,
    fetchAttendanceRecords,
  ]);

  const handleManualInputChange = (e) => {
    const { name, value } = e.target;
    setManualInputData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setManualInputData((prev) => ({ ...prev, [name]: value }));
  };

  const openManualInputDialogHandler = (record = null) => {
    if (record) {
      setEditingRecord(record);

      const localCheckInTime = record.check_in_time
        ? new Date(record.check_in_time).toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        : "";
      const localCheckOutTime = record.check_out_time
        ? new Date(record.check_out_time).toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        : "";

      setManualInputData({
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        check_in_time: localCheckInTime,
        check_out_time: localCheckOutTime,
        status_id: record.status_id || "",
        notes: record.notes || "",
      });
    } else {
      setEditingRecord(null);
      setManualInputData({
        employee_id: "",
        attendance_date: new Date().toISOString().split("T")[0],
        check_in_time: "",
        check_out_time: "",
        status_id: "",
        notes: "",
      });
    }
    setIsManualInputDialogOpen(true);
  };

  const handleManualInputSubmit = async () => {
    if (!manualInputData.employee_id || !manualInputData.attendance_date) {
      toast({
        title: "Validasi Gagal",
        description: "Karyawan dan Tanggal Absensi harus diisi.",
        variant: "destructive",
      });
      return;
    }
    setLoading((prev) => ({ ...prev, submit: true }));

    const createISODateTimeString = (dateStr, timeStr) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(":");
      const date = new Date(dateStr);
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return date.toISOString();
    };

    const recordToSave = {
      employee_id: manualInputData.employee_id,
      attendance_date: manualInputData.attendance_date,
      check_in_time: createISODateTimeString(
        manualInputData.attendance_date,
        manualInputData.check_in_time
      ),
      check_out_time: createISODateTimeString(
        manualInputData.attendance_date,
        manualInputData.check_out_time
      ),
      status_id: manualInputData.status_id || null,
      notes: manualInputData.notes,
      recorded_by: user.id,
    };

    try {
      let response;
      let logAction = editingRecord ? "UPDATE" : "CREATE";
      if (editingRecord) {
        response = await supabase
          .from("attendance_records")
          .update(recordToSave)
          .eq("id", editingRecord.id)
          .select()
          .single();
      } else {
        response = await supabase
          .from("attendance_records")
          .upsert(recordToSave, { onConflict: "employee_id, attendance_date" })
          .select()
          .single();
      }

      if (response.error) throw response.error;

      const employee = employees.find(
        (e) => e.id === response.data.employee_id
      );
      await addLog({
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: logAction,
        targetType: "ATTENDANCE",
        targetId: response.data.id,
        targetName: `Absensi ${employee?.name || ""} pada ${
          response.data.attendance_date
        }`,
      });

      toast({
        title: "Sukses",
        description: `Absensi berhasil ${
          editingRecord ? "diperbarui" : "dicatat"
        }.`,
      });
      setIsManualInputDialogOpen(false);
      fetchAttendanceRecords(filterDate, filterEmployee);
    } catch (error) {
      toast({
        title: "Error",
        description: `Gagal ${
          editingRecord ? "memperbarui" : "mencatat"
        } absensi: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (
      !window.confirm("Apakah Anda yakin ingin menghapus catatan absensi ini?")
    )
      return;
    try {
      const { data: recordToDelete, error: fetchError } = await supabase
        .from("attendance_records")
        .select(
          `
    *,
    employee:employees!attendance_records_employee_id_fkey(name)
  `
        )
        .eq("id", recordId)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("id", recordId);
      if (error) throw error;

      await addLog({
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: "DELETE",
        targetType: "ATTENDANCE",
        targetId: recordId,
        targetName: `Absensi ${recordToDelete.employee?.name || ""} pada ${
          recordToDelete.attendance_date
        }`,
      });

      toast({
        title: "Sukses",
        description: "Catatan absensi berhasil dihapus.",
      });
      fetchAttendanceRecords(filterDate, filterEmployee);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus catatan absensi: " + error.message,
        variant: "destructive",
      });
    }
  };

  const filteredRecords = attendanceRecords.filter((record) => {
    const employeeName = record.employee?.name?.toLowerCase() || "";
    const employeeNik = record.employee?.nik?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return employeeName.includes(search) || employeeNik.includes(search);
  });
  const getWorkMinutes = (r) => {
    if (!r.check_in_time || !r.check_out_time) return 0;
    return (new Date(r.check_out_time) - new Date(r.check_in_time)) / 60000;
  };

  const sortedRecords = React.useMemo(() => {
    const data = [...filteredRecords];

    data.sort((a, b) => {
      let aVal, bVal;

      switch (sort.key) {
        case "name":
          aVal = a.employee?.name || "";
          bVal = b.employee?.name || "";
          break;
        case "nik":
          aVal = a.employee?.nik || "";
          bVal = b.employee?.nik || "";
          break;
        case "date":
          aVal = a.attendance_date;
          bVal = b.attendance_date;
          break;
        case "checkin":
          aVal = a.check_in_time || "";
          bVal = b.check_in_time || "";
          break;
        case "workhours":
          aVal = getWorkMinutes(a);
          bVal = getWorkMinutes(b);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredRecords, sort]);
  const pagedRecords = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, page, pageSize]);

  const tabItems = [
    { id: "daily_recap", label: "Rekap Harian", icon: CalendarDays },
    { id: "map", label: "Peta Absensi", icon: MapPin },
    { id: "manual_input", label: "Input Manual", icon: UserPlus },
    { id: "requests", label: "Pengajuan Izin", icon: FileText, disabled: true },
    {
      id: "reports",
      label: "Laporan Absensi",
      icon: FileText,
      disabled: false,
    },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case "daily_recap":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Rekap Absensi Harian</CardTitle>
              <CardDescription>
                Lihat catatan absensi karyawan untuk tanggal yang dipilih.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceFilterBar
                filterDate={filterDate}
                setFilterDate={setFilterDate}
                filterEmployee={filterEmployee}
                setFilterEmployee={setFilterEmployee}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                employees={employees}
              />
              <AttendanceTable
                records={pagedRecords}
                loading={loading.records}
                onEdit={openManualInputDialogHandler}
                onDelete={handleDeleteRecord}
                sort={sort}
                onSortChange={setSort}
                page={page}
                pageSize={pageSize}
                totalRecords={sortedRecords.length}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />

              <Pagination
                page={page}
                pageSize={pageSize}
                totalRecords={sortedRecords.length}
                onPageChange={setPage}
                className="mt-4"
              />
            </CardContent>
          </Card>
        );
      case "manual_input":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Input Absensi Manual</CardTitle>
              <CardDescription>
                Catat atau perbarui absensi karyawan secara manual. Jika
                karyawan sudah ada catatan di tanggal yang sama, data akan
                diperbarui.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => openManualInputDialogHandler()}
                className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <UserPlus className="mr-2 h-4 w-4" /> Catat Absensi Baru
              </Button>
              <p className="text-sm text-muted-foreground">
                Gunakan tombol di atas untuk membuka form input absensi. Anda
                juga bisa mengedit absensi dari tabel Rekap Harian.
              </p>
            </CardContent>
          </Card>
        );
      case "reports":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Laporan Absensi</CardTitle>
              <CardDescription>
                Lihat dan ekspor laporan absensi karyawan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex-1">
                  <Label htmlFor="filterEmployeeRecap">
                    Karyawan (Opsional)
                  </Label>
                  <Select
                    value={filterEmployee || "ALL_EMPLOYEES_PLACEHOLDER"}
                    onValueChange={(value) =>
                      setFilterEmployee(
                        value === "ALL_EMPLOYEES_PLACEHOLDER" ? "" : value
                      )
                    }>
                    <SelectTrigger id="filterEmployeeRecap">
                      <SelectValue placeholder="Semua Karyawan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_EMPLOYEES_PLACEHOLDER">
                        Semua Karyawan
                      </SelectItem>
                      {(employees || [])
                        .filter((emp) => emp && emp.id)
                        .map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.nik})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative flex-1">
                  <Label htmlFor="searchTermRecap">
                    Cari Karyawan (Nama/NIK)
                  </Label>
                  <Input
                    id="searchTermRecap"
                    placeholder="Ketik untuk mencari..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-11 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <label className="text-sm font-medium">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full rounded-md dark:text-white dark:bg-background border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full rounded-md dark:text-white dark:bg-background border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  try {
                    exportAttendanceToExcel({
                      records: sortedRecords,
                      startDate: filterStartDate,
                      endDate: filterEndDate,
                    });

                    toast({
                      title: "Berhasil",
                      description: "Laporan absensi berhasil diekspor",
                    });
                  } catch (error) {
                    toast({
                      title: "Gagal",
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                }}
                className="my-4 bg-gradient-to-r from-green-500 to-teal-600 text-white">
                Ekspor Laporan (Excel)
              </Button>

              <AttendanceSummaryCards summary={attendanceSummary} />
              <AttendanceReportTable
                records={pagedRecords}
                loading={loading.records}
                sort={sort}
                onSortChange={(s) => {
                  setSort(s);
                  setPage(1);
                }}
                page={page}
                pageSize={pageSize}
                totalRecords={sortedRecords.length}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />

              <Pagination
                page={page}
                pageSize={pageSize}
                totalRecords={sortedRecords.length} // <-- total setelah sort
                onPageChange={setPage}
                className="mt-4"
              />
            </CardContent>
          </Card>
        );
      case "requests":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Pengajuan Izin/Sakit</CardTitle>
              <CardDescription>Fitur ini belum tersedia.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                🚧 Pengelolaan pengajuan izin atau sakit dari karyawan akan
                segera hadir!
              </p>
            </CardContent>
          </Card>
        );
      case "map":
        return (
          <AttendanceMapTab
            records={attendanceRecords}
            employees={employees}
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            filterEmployee={filterEmployee}
            setFilterEmployee={setFilterEmployee}
          />
        );

      default:
        return null;
    }
  };
  const attendanceSummary = {
    totalCheckIn: filteredRecords.filter((r) => r.check_in_time).length,
    totalCheckOut: filteredRecords.filter((r) => r.check_out_time).length,
    hadirByCheckIn: filteredRecords.filter((r) => r.check_in_time).length,
  };
  const AttendanceSummaryCards = ({ summary }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Check-in</p>
            <p className="text-2xl font-bold">{summary.totalCheckIn}</p>
          </div>
          <Fingerprint className="h-8 w-8 text-blue-500" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Check-out</p>
            <p className="text-2xl font-bold">{summary.totalCheckOut}</p>
          </div>
          <CalendarDays className="h-8 w-8 text-green-500" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Kehadiran</p>
            <p className="text-2xl font-bold">{summary.hadirByCheckIn}</p>
            <p className="text-xs text-muted-foreground">
              berdasarkan check-in
            </p>
          </div>
          <UserPlus className="h-8 w-8 text-purple-500" />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Manajemen Absensi Karyawan
          </h1>
          <p className="text-muted-foreground">
            Kelola catatan kehadiran, input manual, dan lihat laporan absensi.
          </p>
        </motion.div>

        <div className="flex border-b mb-6 overflow-x-auto">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setCurrentTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium focus:outline-none whitespace-nowrap
                ${
                  currentTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }
                ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}>
              <tab.icon className="h-5 w-5 " />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}>
          {renderContent()}
        </motion.div>
      </div>

      <ManualAttendanceDialog
        isOpen={isManualInputDialogOpen}
        onOpenChange={setIsManualInputDialogOpen}
        editingRecord={editingRecord}
        manualInputData={manualInputData}
        handleManualInputChange={handleManualInputChange}
        handleSelectChange={handleSelectChange}
        employees={employees}
        attendanceStatuses={attendanceStatuses}
        onSubmit={handleManualInputSubmit}
        loadingSubmit={loading.submit}
      />
    </Layout>
  );
};

export default AdminAttendanceManagement;
