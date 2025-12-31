import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { Fingerprint, UserPlus, CalendarDays, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AttendanceFilterBar from '@/components/admin/attendance/AttendanceFilterBar';
import AttendanceTable from '@/components/admin/attendance/AttendanceTable';
import AttendanceReportTable from '@/components/admin/attendance/AttendanceReportTable';
import ManualAttendanceDialog from '@/components/admin/attendance/ManualAttendanceDialog';
import { addLog } from '@/lib/activityLogService';

const AdminAttendanceManagement = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('daily_recap');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceStatuses, setAttendanceStatuses] = useState([]);
  const [loading, setLoading] = useState({ records: false, employees: false, statuses: false, submit: false });
  
  const [isManualInputDialogOpen, setIsManualInputDialogOpen] = useState(false);
  const [manualInputData, setManualInputData] = useState({
    employee_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: '',
    check_out_time: '',
    status_id: '',
    notes: ''
  });
  const [editingRecord, setEditingRecord] = useState(null);

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEmployees = useCallback(async () => {
    setLoading(prev => ({ ...prev, employees: true }));
    try {
      const { data, error } = await supabase.from('employees').select('id, name, nik').order('name');
      if (error) throw error;
      setEmployees(data);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat data karyawan: " + error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  }, []);

  const fetchAttendanceStatuses = useCallback(async () => {
    setLoading(prev => ({ ...prev, statuses: true }));
    try {
      const { data, error } = await supabase.from('attendance_statuses').select('*').order('name');
      if (error) throw error;
      setAttendanceStatuses(data);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat status absensi: " + error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, statuses: false }));
    }
  }, []);

  const fetchAttendanceRecords = useCallback(async (date, employeeId) => {
    setLoading(prev => ({ ...prev, records: true }));
    try {
      let query = supabase
        .from('attendance_records')
        .select('*, employees(name, nik), attendance_statuses(name)')
        .order('attendance_date', { ascending: false })
        .order('check_in_time', { ascending: true, nullsFirst: false });

      if (date) {
        query = query.eq('attendance_date', date);
      }
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setAttendanceRecords(data);
    } catch (error)
{
      toast({ title: "Error", description: "Gagal memuat catatan absensi: " + error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, records: false }));
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchAttendanceStatuses();
  }, [fetchEmployees, fetchAttendanceStatuses]);

  useEffect(() => {
    if (currentTab === 'daily_recap' || currentTab === 'reports') {
       fetchAttendanceRecords(filterDate, filterEmployee);
    }
  }, [currentTab, filterDate, filterEmployee, fetchAttendanceRecords]);

  const handleManualInputChange = (e) => {
    const { name, value } = e.target;
    setManualInputData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, value) => {
    setManualInputData(prev => ({ ...prev, [name]: value }));
  };

  const openManualInputDialogHandler = (record = null) => {
    if (record) {
      setEditingRecord(record);
      
      const localCheckInTime = record.check_in_time 
        ? new Date(record.check_in_time).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
        : '';
      const localCheckOutTime = record.check_out_time 
        ? new Date(record.check_out_time).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
        : '';

      setManualInputData({
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        check_in_time: localCheckInTime,
        check_out_time: localCheckOutTime,
        status_id: record.status_id || '',
        notes: record.notes || ''
      });
    } else {
      setEditingRecord(null);
      setManualInputData({
        employee_id: '',
        attendance_date: new Date().toISOString().split('T')[0],
        check_in_time: '',
        check_out_time: '',
        status_id: '',
        notes: ''
      });
    }
    setIsManualInputDialogOpen(true);
  };

  const handleManualInputSubmit = async () => {
    if (!manualInputData.employee_id || !manualInputData.attendance_date) {
      toast({ title: "Validasi Gagal", description: "Karyawan dan Tanggal Absensi harus diisi.", variant: "destructive" });
      return;
    }
    setLoading(prev => ({ ...prev, submit: true }));

    const createISODateTimeString = (dateStr, timeStr) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':');
      const date = new Date(dateStr);
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return date.toISOString();
    };
    
    const recordToSave = {
      employee_id: manualInputData.employee_id,
      attendance_date: manualInputData.attendance_date,
      check_in_time: createISODateTimeString(manualInputData.attendance_date, manualInputData.check_in_time),
      check_out_time: createISODateTimeString(manualInputData.attendance_date, manualInputData.check_out_time),
      status_id: manualInputData.status_id || null,
      notes: manualInputData.notes,
      recorded_by: user.id
    };
    
    try {
      let response;
      let logAction = editingRecord ? 'UPDATE' : 'CREATE';
      if (editingRecord) {
        response = await supabase.from('attendance_records').update(recordToSave).eq('id', editingRecord.id).select().single();
      } else {
         response = await supabase.from('attendance_records')
          .upsert(recordToSave, { onConflict: 'employee_id, attendance_date' })
          .select().single();
      }

      if (response.error) throw response.error;

      const employee = employees.find(e => e.id === response.data.employee_id);
      await addLog({
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: logAction,
        targetType: 'ATTENDANCE',
        targetId: response.data.id,
        targetName: `Absensi ${employee?.name || ''} pada ${response.data.attendance_date}`,
      });

      toast({ title: "Sukses", description: `Absensi berhasil ${editingRecord ? 'diperbarui' : 'dicatat'}.` });
      setIsManualInputDialogOpen(false);
      fetchAttendanceRecords(filterDate, filterEmployee);
    } catch (error) {
      toast({ title: "Error", description: `Gagal ${editingRecord ? 'memperbarui' : 'mencatat'} absensi: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };
  
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan absensi ini?")) return;
    try {
      const { data: recordToDelete, error: fetchError } = await supabase.from('attendance_records').select('*, employees(name)').eq('id', recordId).single();
      if (fetchError) throw fetchError;
      
      const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
      if (error) throw error;
      
      await addLog({
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: 'DELETE',
        targetType: 'ATTENDANCE',
        targetId: recordId,
        targetName: `Absensi ${recordToDelete.employees.name} pada ${recordToDelete.attendance_date}`,
      });

      toast({ title: "Sukses", description: "Catatan absensi berhasil dihapus." });
      fetchAttendanceRecords(filterDate, filterEmployee);
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus catatan absensi: " + error.message, variant: "destructive" });
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    const employeeName = record.employees?.name?.toLowerCase() || '';
    const employeeNik = record.employees?.nik?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return employeeName.includes(search) || employeeNik.includes(search);
  });

  const tabItems = [
    { id: 'daily_recap', label: 'Rekap Harian', icon: CalendarDays },
    { id: 'manual_input', label: 'Input Manual', icon: UserPlus },
    { id: 'requests', label: 'Pengajuan Izin', icon: FileText, disabled: true },
    { id: 'reports', label: 'Laporan Absensi', icon: FileText, disabled: false },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'daily_recap':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Rekap Absensi Harian</CardTitle>
              <CardDescription>Lihat catatan absensi karyawan untuk tanggal yang dipilih.</CardDescription>
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
                records={filteredRecords}
                loading={loading.records}
                onEdit={openManualInputDialogHandler}
                onDelete={handleDeleteRecord}
              />
            </CardContent>
          </Card>
        );
      case 'manual_input':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Input Absensi Manual</CardTitle>
              <CardDescription>Catat atau perbarui absensi karyawan secara manual. Jika karyawan sudah ada catatan di tanggal yang sama, data akan diperbarui.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => openManualInputDialogHandler()} className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <UserPlus className="mr-2 h-4 w-4" /> Catat Absensi Baru
              </Button>
              <p className="text-sm text-muted-foreground">Gunakan tombol di atas untuk membuka form input absensi. Anda juga bisa mengedit absensi dari tabel Rekap Harian.</p>
            </CardContent>
          </Card>
        );
      case 'reports':
         return (
          <Card>
            <CardHeader>
              <CardTitle>Laporan Absensi</CardTitle>
              <CardDescription>Lihat dan ekspor laporan absensi karyawan.</CardDescription>
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
              <Button 
                onClick={() => toast({title: "Fitur Segera Hadir", description: "Ekspor laporan belum tersedia."})} 
                className="my-4 bg-gradient-to-r from-green-500 to-teal-600 text-white"
              >
                Ekspor Laporan (Segera)
              </Button>
              <AttendanceReportTable records={filteredRecords} loading={loading.records} />
            </CardContent>
          </Card>
        );
      case 'requests':
        return (
          <Card>
            <CardHeader><CardTitle>Pengajuan Izin/Sakit</CardTitle><CardDescription>Fitur ini belum tersedia.</CardDescription></CardHeader>
            <CardContent><p className="text-muted-foreground">🚧 Pengelolaan pengajuan izin atau sakit dari karyawan akan segera hadir!</p></CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Manajemen Absensi Karyawan
          </h1>
          <p className="text-muted-foreground">
            Kelola catatan kehadiran, input manual, dan lihat laporan absensi.
          </p>
        </motion.div>

        <div className="flex border-b mb-6 overflow-x-auto">
          {tabItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setCurrentTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium focus:outline-none whitespace-nowrap
                ${currentTab === tab.id 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground hover:text-foreground'}
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <tab.icon className="h-5 w-5 " />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        <motion.div key={currentTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
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