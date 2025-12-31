import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const DirectLeaveRequestDialog = ({ 
  isOpen, 
  onOpenChange, 
  employees, 
  leaveTypes, 
  onSuccess,
  showSuccessModal
}) => {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('Menunggu Persetujuan'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);

  const statusOptions = [
    { value: 'Menunggu Persetujuan', label: 'Menunggu Persetujuan' },
    { value: 'Disetujui', label: 'Disetujui' },
    { value: 'Dibatalkan', label: 'Dibatalkan' },
  ];

  useEffect(() => {
    if (isOpen) {
      setEmployeeId('');
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setStatus('Menunggu Persetujuan');
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!employeeId || !leaveTypeId || !startDate || !endDate || !status) {
      toast({ title: "Validasi Gagal", description: "Karyawan, jenis cuti, tanggal mulai, tanggal selesai, dan status harus diisi.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: leaveType, error: typeError } = await supabase
        .from('leave_types')
        .select('reduces_quota')
        .eq('id', leaveTypeId)
        .single();

      if (typeError) throw typeError;
      
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
        toast({ title: "Error", description: "Durasi cuti tidak valid.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      if (status === 'Disetujui' && leaveType.reduces_quota) {
        const currentYear = sDate.getFullYear();
        const { data: quota, error: quotaError } = await supabase
          .from('employee_leave_quotas')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('year', currentYear)
          .single();

        if (quotaError || !quota) {
          toast({ title: "Error", description: `Karyawan belum memiliki kuota cuti untuk tahun ${currentYear}. Harap atur kuota terlebih dahulu.`, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        if (quota.remaining_quota < duration) {
          toast({ title: "Error", description: "Sisa kuota karyawan tidak mencukupi.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        const { error: updateQuotaError } = await supabase
          .from('employee_leave_quotas')
          .update({ used_quota: quota.used_quota + duration })
          .eq('id', quota.id);
        if (updateQuotaError) throw updateQuotaError;
      }
      
      const { data: leaveNumberData, error: numberError } = await supabase.rpc('generate_leave_request_number');
      if (numberError) throw numberError;
      const leaveRequestNumber = leaveNumberData;

      const requestData = {
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        status: status, 
        admin_notes: 'Pengajuan dibuat langsung oleh Admin.',
        approved_at: status === 'Disetujui' ? new Date().toISOString() : null,
        approved_by: status === 'Disetujui' ? user.id : null,
        leave_request_number: leaveRequestNumber,
      };

      const { error: insertError } = await supabase.from('leave_requests').insert(requestData);
      if (insertError) throw insertError;

      if (status === 'Disetujui') {
        showSuccessModal({
          title: "Cuti Dibuat & Disetujui!",
          description: "Pengajuan cuti berhasil dibuat dan disetujui.",
          leaveRequestNumber: leaveRequestNumber
        });
      } else if (status === 'Menunggu Persetujuan') {
        showSuccessModal({
          title: "Pengajuan Cuti Dibuat!",
          description: "Pengajuan cuti berhasil dibuat dan menunggu persetujuan.",
          leaveRequestNumber: leaveRequestNumber
        });
      } else {
         toast({ title: "Sukses", description: `Pengajuan cuti berhasil dibuat dengan status: ${status}.` });
      }
      
      onSuccess();
      onOpenChange(false);

    } catch (error) {
      toast({ title: "Error", description: `Gagal membuat pengajuan cuti: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = (employees || []).filter(emp =>
    emp && emp.id && (
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.nik && emp.nik.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Pengajuan Cuti Langsung</DialogTitle>
          <DialogDescription>Buat pengajuan cuti untuk karyawan dengan status yang ditentukan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="directRequestEmployee">Karyawan</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="directRequestEmployee"><SelectValue placeholder="Pilih Karyawan" /></SelectTrigger>
              <SelectContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="p-2">
                  <Input
                    ref={searchInputRef}
                    placeholder="Cari nama atau NIK..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.nik})</SelectItem>)
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">Karyawan tidak ditemukan.</div>
                  )}
                </div>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="directRequestLeaveType">Jenis Cuti</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger id="directRequestLeaveType"><SelectValue placeholder="Pilih Jenis Cuti" /></SelectTrigger>
              <SelectContent>
                {(leaveTypes || []).filter(type => type && type.id).map(type => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="directRequestStartDate">Tanggal Mulai</Label>
              <Input id="directRequestStartDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="directRequestEndDate">Tanggal Selesai</Label>
              <Input id="directRequestEndDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="directRequestReason">Alasan (Opsional)</Label>
            <Input id="directRequestReason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan cuti..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="directRequestStatus">Status Pengajuan</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="directRequestStatus"><SelectValue placeholder="Pilih Status" /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
          <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Memproses...' : 'Buat Pengajuan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DirectLeaveRequestDialog;