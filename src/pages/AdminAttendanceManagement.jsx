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
  Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AttendanceFilterBar from "@/components/admin/attendance/AttendanceFilterBar";
import AttendanceTable from "@/components/admin/attendance/AttendanceTable";
import AttendanceReportTable from "@/components/admin/attendance/AttendanceReportTable";
import ManualAttendanceDialog from "@/components/admin/attendance/ManualAttendanceDialog";
import { addLog } from "@/lib/activityLogService";
import AttendanceMapTab from "@/components/admin/attendance/AttendanceMapTab";
import { exportAttendanceToExcel } from "@/lib/attendanceExportService";
import Pagination from "../components/ui/Pagination";
import AttendanceSetting from "../components/admin/attendance/AttendanceSetting";
import AttendanceSummaryCards from "../components/admin/attendance/AttendanceSummaryCards";

const AdminAttendanceManagement = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState("daily_recap");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceStatuses, setAttendanceStatuses] = useState([]);
  const [checkinFilter, setCheckinFilter] = useState("checked");
  // checked | unchecked

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
    new Date().toISOString().split("T")[0],
  );
  const [filterStartDate, setFilterStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [filterEndDate, setFilterEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [filterEmployee, setFilterEmployee] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchEmployees = useCallback(async () => {
    setLoading((prev) => ({ ...prev, employees: true }));

    try {
      let allEmployees = [];
      let from = 0;
      const limit = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("employees")
          .select("id, name, nik, is_direct_pm")
          .order("name")
          .range(from, from + limit - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allEmployees = allEmployees.concat(data);
        from += limit;
      }

      setEmployees(allEmployees);
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
  `,
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
    [],
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
        manualInputData.check_in_time,
      ),
      check_out_time: createISODateTimeString(
        manualInputData.attendance_date,
        manualInputData.check_out_time,
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
        (e) => e.id === response.data.employee_id,
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
  `,
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
  const checkedInEmployeeIds = React.useMemo(() => {
    return new Set(attendanceRecords.map((r) => r.employee_id));
  }, [attendanceRecords]);

  const uncheckedEmployees = React.useMemo(() => {
    return employees.filter((emp) => !checkedInEmployeeIds.has(emp.id));
  }, [employees, checkedInEmployeeIds]);
  const uncheckedEmployeeRecords = React.useMemo(() => {
    return uncheckedEmployees.map((emp) => ({
      id: `unchecked-${emp.id}`,
      employee_id: emp.id,
      employee: {
        name: emp.name,
        nik: emp.nik,
      },
      attendance_date: filterStartDate + " - " + filterEndDate,
      check_in_time: null,
      check_out_time: null,
      attendance_statuses: { name: "Belum Check-in" },
      isUnchecked: true,
    }));
  }, [uncheckedEmployees, filterStartDate, filterEndDate]);
  const filteredUncheckedEmployeeRecords = React.useMemo(() => {
    const search = searchTerm.toLowerCase();

    if (!search) return uncheckedEmployeeRecords;

    return uncheckedEmployeeRecords.filter((record) => {
      const name = record.employee?.name?.toLowerCase() || "";
      const nik = record.employee?.nik?.toLowerCase() || "";

      return name.includes(search) || nik.includes(search);
    });
  }, [uncheckedEmployeeRecords, searchTerm]);

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
        case "direct_pm":
          aVal = a.direct_pm?.name || "";
          bVal = b.direct_pm?.name || "";
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
        case "checkout":
          aVal = a.check_out_time || "";
          bVal = b.check_out_time || "";
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
  const finalReportRecords = React.useMemo(() => {
    if (checkinFilter === "unchecked") {
      return filteredUncheckedEmployeeRecords;
    }
    return sortedRecords;
  }, [checkinFilter, filteredUncheckedEmployeeRecords, sortedRecords]);

  const pagedRecords = React.useMemo(() => {
    const source =
      currentTab === "reports" ? finalReportRecords : sortedRecords;

    const start = (page - 1) * pageSize;
    return source.slice(start, start + pageSize);
  }, [currentTab, finalReportRecords, sortedRecords, page, pageSize]);

  const tabItems = [
    { id: "daily_recap", label: "Rekap Harian", icon: CalendarDays },
    { id: "map", label: "Peta Absensi", icon: MapPin },
    { id: "manual_input", label: "Input Manual", icon: UserPlus },
    { id: "setting", label: "Pengaturan", icon: Settings },
    { id: "requests", label: "Pengajuan Izin", icon: FileText, disabled: true },
    {
      id: "reports",
      label: "Laporan Absensi",
      icon: FileText,
      disabled: false,
    },
  ];
  const exportRecords = React.useMemo(() => {
    if (checkinFilter === "unchecked") {
      return filteredUncheckedEmployeeRecords;
    }
    return sortedRecords;
  }, [checkinFilter, filteredUncheckedEmployeeRecords, sortedRecords]);

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
                <div>
                  <label className="text-sm font-medium">
                    Status Kehadiran
                  </label>
                  <Select
                    value={checkinFilter}
                    onValueChange={(value) => {
                      setCheckinFilter(value);
                      setPage(1);
                    }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checked">Sudah Check-in</SelectItem>
                      <SelectItem value="unchecked">Belum Check-in</SelectItem>
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
                      records: finalReportRecords,
                      startDate: filterStartDate,
                      endDate: filterEndDate,
                      mode: checkinFilter,
                    });

                    toast({
                      title: "Berhasil",
                      description:
                        checkinFilter === "unchecked"
                          ? "Laporan karyawan belum check-in berhasil diekspor"
                          : "Laporan absensi berhasil diekspor",
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

              <AttendanceSummaryCards
                summary={attendanceSummary}
                mode={checkinFilter}
              />
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
                totalRecords={finalReportRecords.length}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />

              <Pagination
                page={page}
                pageSize={pageSize}
                totalRecords={finalReportRecords.length}
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
      case "setting":
        return (
          <AttendanceSetting
            employees={employees}
            setEmployees={setEmployees}
            loading={loading.employees}
          />
        );

      default:
        return null;
    }
  };
  const attendanceSummary = React.useMemo(() => {
    // MODE: BELUM CHECK-IN
    if (currentTab === "reports" && checkinFilter === "unchecked") {
      const totalUnchecked = uncheckedEmployeeRecords.length;

      return {
        totalCheckIn: totalUnchecked, // jumlah belum check-in
        totalCheckOut: 0, // selalu 0
        hadirByCheckIn: totalUnchecked, // dianggap tidak hadir
      };
    }

    // MODE: SUDAH CHECK-IN (perilaku lama)
    return {
      totalCheckIn: filteredRecords.filter((r) => r.check_in_time).length,
      totalCheckOut: filteredRecords.filter((r) => r.check_out_time).length,
      hadirByCheckIn: filteredRecords.filter((r) => r.check_in_time).length,
    };
  }, [currentTab, checkinFilter, uncheckedEmployeeRecords, filteredRecords]);

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
