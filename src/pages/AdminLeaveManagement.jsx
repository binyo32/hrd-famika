import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSuccessModal } from '@/contexts/SuccessModalContext';
import { addLog } from '@/lib/activityLogService';
import { getEmployees } from '@/lib/employeeService';

import LeaveManagementTabs from '@/components/admin/leave/LeaveManagementTabs';
import LeaveRequestsTab from '@/components/admin/leave/LeaveRequestsTab';
import LeaveTypesTab from '@/components/admin/leave/LeaveTypesTab';
import EmployeeQuotasTab from '@/components/admin/leave/EmployeeQuotasTab';
import LeaveTypeDialog from '@/components/admin/leave/LeaveTypeDialog';
import EmployeeQuotaDialog from '@/components/admin/leave/EmployeeQuotaDialog';
import DirectLeaveRequestDialog from '@/components/admin/leave/DirectLeaveRequestDialog';

const AdminLeaveManagement = () => {
  const { user } = useAuth();
  const { showSuccessModal } = useSuccessModal();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employeeQuotas, setEmployeeQuotas] = useState([]);

  const [loading, setLoading] = useState({ types: false, requests: false, quotas: false, employees: false });
  const [currentTab, setCurrentTab] = useState('requests');

  const [isLeaveTypeDialogOpen, setIsLeaveTypeDialogOpen] = useState(false);
  const [currentLeaveType, setCurrentLeaveType] = useState(null);
  
  const [isQuotaDialogOpen, setIsQuotaDialogOpen] = useState(false);
  const [currentQuota, setCurrentQuota] = useState(null);

  const [isDirectRequestDialogOpen, setIsDirectRequestDialogOpen] = useState(false);

  const fetchLeaveTypes = useCallback(async () => {
    setLoading(prev => ({ ...prev, types: true }));
    try {
      const { data, error } = await supabase.from('leave_types').select('*').order('name');
      if (error) throw error;
      setLeaveTypes(data);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat jenis cuti: " + error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, types: false }));
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(prev => ({ ...prev, employees: true }));
    try {
      const data = await getEmployees('name', true);
      setEmployees(data);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat data karyawan: " + error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  }, []);
  
  const fetchLeaveRequests = useCallback(async () => {
    setLoading(prev => ({ ...prev, requests: true }));
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, employees (name, nik, division, position, address, phone), leave_types (name)')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      setLeaveRequests(data);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat pengajuan cuti: " + error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  }, []);

  const fetchEmployeeQuotas = useCallback(async () => {
    setLoading(prev => ({ ...prev, quotas: true }));
    try {
      const { data, error } = await supabase
        .from('employee_leave_quotas')
        .select('*, employees (name, nik)')
        .order('year', { ascending: false })
        .order('employees(name)');
      if (error) throw error;
      setEmployeeQuotas(data);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat kuota cuti karyawan: " + error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, quotas: false }));
    }
  }, []);

  useEffect(() => {
    fetchLeaveTypes();
    fetchEmployees();
    fetchLeaveRequests();
    fetchEmployeeQuotas();
  }, [fetchLeaveTypes, fetchEmployees, fetchLeaveRequests, fetchEmployeeQuotas]);

  const openLeaveTypeDialogHandler = (type = null) => {
    setCurrentLeaveType(type);
    setIsLeaveTypeDialogOpen(true);
  };

  const handleDeleteLeaveType = async (typeId, typeName) => {
    const { data: requests, error: requestError } = await supabase.from('leave_requests').select('id').eq('leave_type_id', typeId).limit(1);
    if (requestError) {
        toast({ title: "Error", description: "Gagal memeriksa penggunaan jenis cuti: " + requestError.message, variant: "destructive" });
        return;
    }
    if (requests && requests.length > 0) {
        toast({ title: "Tidak Dapat Menghapus", description: "Jenis cuti ini sudah digunakan dalam pengajuan cuti dan tidak dapat dihapus.", variant: "destructive" });
        return;
    }

    if (window.confirm("Apakah Anda yakin ingin menghapus jenis cuti ini?")) {
      try {
        const { error } = await supabase.from('leave_types').delete().eq('id', typeId);
        if (error) throw error;

        await addLog({
          userId: user.id, userName: user.name, userRole: user.role,
          action: 'DELETE', targetType: 'LEAVE_TYPE', targetId: typeId, targetName: typeName
        });

        toast({ title: "Sukses", description: "Jenis cuti berhasil dihapus." });
        fetchLeaveTypes();
      } catch (error) {
        toast({ title: "Error", description: "Gagal menghapus jenis cuti: " + error.message, variant: "destructive" });
      }
    }
  };
  
  const openQuotaDialogHandler = (quota = null) => {
    setCurrentQuota(quota);
    setIsQuotaDialogOpen(true);
  };

  const handleUpdateRequestStatus = async (requestId, newStatus, employeeId, startDate, endDate, leaveTypeId) => {
    try {
      if (newStatus === 'Disetujui') {
        const { data: leaveType, error: typeError } = await supabase
          .from('leave_types')
          .select('reduces_quota')
          .eq('id', leaveTypeId)
          .single();

        if (typeError) throw typeError;

        if (leaveType.reduces_quota) {
          const sDate = new Date(startDate);
          const eDate = new Date(endDate);
          let duration = 0;
          let currentDate = new Date(sDate);
          while(currentDate <= eDate){
            const dayOfWeek = currentDate.getDay();
            if(dayOfWeek !==0 && dayOfWeek !==6){ 
               duration++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          if (duration <= 0) {
            toast({title: "Error", description: "Durasi cuti tidak valid.", variant: "destructive"});
            return;
          }

          const currentYear = sDate.getFullYear();
          const { data: quota, error: quotaError } = await supabase
            .from('employee_leave_quotas')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('year', currentYear)
            .single();
          
          if (quotaError || !quota) {
             toast({ title: "Error", description: `Karyawan belum memiliki kuota cuti untuk tahun ${currentYear}. Harap atur kuota terlebih dahulu.`, variant: "destructive" });
             return;
          }

          if (quota.remaining_quota < duration) {
            toast({ title: "Error", description: "Sisa kuota karyawan tidak mencukupi.", variant: "destructive" });
            return;
          }
          
          const { error: updateQuotaError } = await supabase
            .from('employee_leave_quotas')
            .update({ used_quota: quota.used_quota + duration })
            .eq('id', quota.id);

          if (updateQuotaError) throw updateQuotaError;
          fetchEmployeeQuotas(); 
        }
      } else if (newStatus === 'Ditolak' || newStatus === 'Dibatalkan') {
        const { data: currentRequest, error: reqError } = await supabase.from('leave_requests').select('status, start_date, end_date, leave_type_id, employee_id, leave_request_number').eq('id', requestId).single();
        if (reqError) throw reqError;

        if (currentRequest.status === 'Disetujui') {
            const { data: leaveType, error: typeError } = await supabase.from('leave_types').select('reduces_quota').eq('id', currentRequest.leave_type_id).single();
            if (typeError) throw typeError;

            if (leaveType.reduces_quota) {
                const sDate = new Date(currentRequest.start_date);
                const eDate = new Date(currentRequest.end_date);
                let duration = 0;
                let currentDate = new Date(sDate);
                while(currentDate <= eDate){
                    const dayOfWeek = currentDate.getDay();
                    if(dayOfWeek !==0 && dayOfWeek !==6){ duration++; }
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                if (duration > 0) {
                    const currentYear = sDate.getFullYear();
                    const { data: quota, error: quotaError } = await supabase.from('employee_leave_quotas').select('*').eq('employee_id', currentRequest.employee_id).eq('year', currentYear).single();
                    if (quota && !quotaError) {
                        await supabase.from('employee_leave_quotas').update({ used_quota: Math.max(0, quota.used_quota - duration) }).eq('id', quota.id);
                        fetchEmployeeQuotas();
                    }
                }
            }
        }
      }

      const { data: updatedRequest, error } = await supabase
        .from('leave_requests')
        .update({ 
          status: newStatus, 
          approved_at: newStatus === 'Disetujui' ? new Date().toISOString() : null,
          approved_by: newStatus === 'Disetujui' ? user.id : null,
        })
        .eq('id', requestId)
        .select('leave_request_number, employees(name)')
        .single();

      if (error) throw error;
      
      await addLog({
        userId: user.id, userName: user.name, userRole: user.role,
        action: 'UPDATE', targetType: 'LEAVE_REQUEST', targetId: requestId,
        targetName: `Cuti ${updatedRequest.employees.name} (${updatedRequest.leave_request_number})`,
        details: { new_status: newStatus }
      });

      if (newStatus === 'Disetujui') {
        showSuccessModal({
            title: "Cuti Disetujui!",
            description: "Pengajuan cuti telah berhasil disetujui.",
            leaveRequestNumber: updatedRequest.leave_request_number
        });
      } else {
        toast({ title: "Sukses", description: `Status pengajuan cuti berhasil diperbarui menjadi ${newStatus}.` });
      }
      fetchLeaveRequests();
    } catch (error) {
      toast({ title: "Error", description: `Gagal memperbarui status: ${error.message}`, variant: "destructive" });
    }
  };
  
  const openDirectRequestDialogHandler = () => {
    setIsDirectRequestDialogOpen(true);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'types':
        return (
          <LeaveTypesTab 
            leaveTypes={leaveTypes}
            loading={loading}
            onOpenLeaveTypeDialog={openLeaveTypeDialogHandler}
            onDeleteLeaveType={(typeId) => handleDeleteLeaveType(typeId, leaveTypes.find(lt => lt.id === typeId)?.name)}
          />
        );
      case 'quotas':
        return (
          <EmployeeQuotasTab
            employeeQuotas={employeeQuotas}
            loading={loading}
            onOpenQuotaDialog={openQuotaDialogHandler}
          />
        );
      case 'requests':
      default:
        return (
          <LeaveRequestsTab
            leaveRequests={leaveRequests}
            loading={loading}
            onOpenDirectRequestDialog={openDirectRequestDialogHandler}
            onUpdateRequestStatus={handleUpdateRequestStatus}
          />
        );
      case 'calendar':
        return (
            <Card>
                <CardHeader><CardTitle>Kalender Cuti</CardTitle><CardDescription>Fitur ini belum tersedia.</CardDescription></CardHeader>
                <CardContent><p className="text-muted-foreground">🚧 Kalender cuti perusahaan akan segera hadir!</p></CardContent>
            </Card>
        );
      case 'reports':
        return (
            <Card>
                <CardHeader><CardTitle>Laporan Cuti</CardTitle><CardDescription>Fitur ini belum tersedia.</CardDescription></CardHeader>
                <CardContent><p className="text-muted-foreground">🚧 Laporan histori cuti karyawan akan segera hadir!</p></CardContent>
            </Card>
        );
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Manajemen Cuti Karyawan
          </h1>
          <p className="text-muted-foreground">
            Kelola jenis cuti, kuota, pengajuan, dan lihat kalender serta laporan cuti.
          </p>
        </motion.div>

        <LeaveManagementTabs currentTab={currentTab} setCurrentTab={setCurrentTab} />
        
        <motion.div key={currentTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {renderContent()}
        </motion.div>
      </div>

      <LeaveTypeDialog
        isOpen={isLeaveTypeDialogOpen}
        onOpenChange={setIsLeaveTypeDialogOpen}
        currentLeaveType={currentLeaveType}
        onSuccess={fetchLeaveTypes}
      />

      <EmployeeQuotaDialog
        isOpen={isQuotaDialogOpen}
        onOpenChange={setIsQuotaDialogOpen}
        currentQuota={currentQuota}
        employees={employees}
        onSuccess={fetchEmployeeQuotas}
      />
      
      <DirectLeaveRequestDialog
        isOpen={isDirectRequestDialogOpen}
        onOpenChange={setIsDirectRequestDialogOpen}
        employees={employees}
        leaveTypes={leaveTypes}
        onSuccess={() => {
          fetchLeaveRequests();
          fetchEmployeeQuotas(); 
        }}
        showSuccessModal={showSuccessModal}
      />

    </Layout>
  );
};

export default AdminLeaveManagement;