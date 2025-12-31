import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addLog } from '@/lib/activityLogService';
import { getEmployees } from '@/lib/employeeService';

export const useLeaveManagement = (showSuccessModal) => {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employeeQuotas, setEmployeeQuotas] = useState([]);
  const [loading, setLoading] = useState({ types: false, requests: false, quotas: false, employees: false });

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
        .select('*, employees (id, name, nik)')
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

  const handleSaveQuota = async (quotaData) => {
    try {
      if (quotaData.id) {
        const { id, ...updateData } = quotaData;
        const { data, error } = await supabase
          .from('employee_leave_quotas')
          .update(updateData)
          .eq('id', id)
          .select('employees(name)')
          .single();
        if (error) throw error;
        toast({ title: 'Sukses', description: 'Kuota cuti berhasil diperbarui.' });
      } else {
        const { data: existingQuota, error: existingError } = await supabase
          .from('employee_leave_quotas')
          .select('id')
          .eq('employee_id', quotaData.employee_id)
          .eq('year', quotaData.year)
          .single();

        if (existingError && existingError.code !== 'PGRST116') throw existingError;

        if (existingQuota) {
          toast({ title: 'Error', description: 'Karyawan ini sudah memiliki kuota untuk tahun yang dipilih.', variant: 'destructive' });
          return false;
        }

        const { data, error } = await supabase
          .from('employee_leave_quotas')
          .insert(quotaData)
          .select('employees(name)')
          .single();

        if (error) throw error;
        toast({ title: 'Sukses', description: 'Kuota cuti berhasil ditambahkan.' });
      }
      
      fetchEmployeeQuotas();
      return true;
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan kuota: ' + error.message, variant: 'destructive' });
      return false;
    }
  };

  const handleUpdateRequestStatus = async (requestId, newStatus, employeeId, startDate, endDate, leaveTypeId) => {
    try {
      if (newStatus === 'Disetujui') {
        const { data: leaveType, error: typeError } = await supabase.from('leave_types').select('reduces_quota').eq('id', leaveTypeId).single();
        if (typeError) throw typeError;

        if (leaveType.reduces_quota) {
          const sDate = new Date(startDate);
          const eDate = new Date(endDate);
          let duration = 0;
          let currentDate = new Date(sDate);
          while(currentDate <= eDate){
            const dayOfWeek = currentDate.getDay();
            if(dayOfWeek !==0 && dayOfWeek !==6){ duration++; }
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          if (duration <= 0) {
            toast({title: "Error", description: "Durasi cuti tidak valid.", variant: "destructive"});
            return;
          }

          const currentYear = sDate.getFullYear();
          const { data: quota, error: quotaError } = await supabase.from('employee_leave_quotas').select('*').eq('employee_id', employeeId).eq('year', currentYear).single();
          
          if (quotaError || !quota) {
             toast({ title: "Error", description: `Karyawan belum memiliki kuota cuti untuk tahun ${currentYear}. Harap atur kuota terlebih dahulu.`, variant: "destructive" });
             return;
          }

          if (quota.remaining_quota < duration) {
            toast({ title: "Error", description: "Sisa kuota karyawan tidak mencukupi.", variant: "destructive" });
            return;
          }
          
          const { error: updateQuotaError } = await supabase.from('employee_leave_quotas').update({ used_quota: quota.used_quota + duration }).eq('id', quota.id);
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

  return {
    leaveTypes,
    employees,
    leaveRequests,
    employeeQuotas,
    loading,
    fetchLeaveTypes,
    fetchEmployees,
    fetchLeaveRequests,
    fetchEmployeeQuotas,
    handleDeleteLeaveType,
    handleSaveQuota,
    handleUpdateRequestStatus,
  };
};