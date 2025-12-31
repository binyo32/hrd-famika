import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import EmployeeCombobox from '@/components/shared/EmployeeCombobox';

const EmployeeQuotaDialog = ({ 
  isOpen, 
  onOpenChange, 
  currentQuota, 
  employees, 
  onSuccess 
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalQuota, setTotalQuota] = useState(12);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentQuota) {
        setEmployeeId(currentQuota.employee_id);
        setYear(currentQuota.year);
        setTotalQuota(currentQuota.total_quota);
      } else {
        setEmployeeId('');
        setYear(new Date().getFullYear());
        setTotalQuota(12);
      }
    }
  }, [isOpen, currentQuota]);

  const handleSave = async () => {
    if (!employeeId || !year || totalQuota < 0) {
      toast({ title: "Validasi Gagal", description: "Karyawan, tahun, dan total kuota harus diisi dengan benar.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: existingQuota, error: fetchError } = await supabase
        .from('employee_leave_quotas')
        .select('id, used_quota')
        .eq('employee_id', employeeId)
        .eq('year', year)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { 
        throw fetchError;
      }
      
      const quotaData = {
        employee_id: employeeId,
        year: parseInt(year),
        total_quota: parseInt(totalQuota),
      };

      let response;
      if (existingQuota) {
        if (quotaData.total_quota < existingQuota.used_quota) {
            toast({ title: "Peringatan", description: "Total kuota baru lebih kecil dari kuota yang sudah terpakai. Sisa kuota akan negatif.", variant: "default" });
        }
        response = await supabase.from('employee_leave_quotas').update(quotaData).eq('id', existingQuota.id).select();
      } else {
        quotaData.used_quota = 0; 
        response = await supabase.from('employee_leave_quotas').insert(quotaData).select();
      }

      if (response.error) throw response.error;
      toast({ title: "Sukses", description: `Kuota cuti karyawan berhasil ${existingQuota ? 'diperbarui' : 'ditambahkan'}.` });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "Gagal menyimpan kuota cuti: " + error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur Kuota Cuti Karyawan</DialogTitle>
          <DialogDescription>Tetapkan atau ubah kuota cuti tahunan untuk karyawan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quotaEmployee">Karyawan</Label>
            <EmployeeCombobox
              employees={employees}
              value={employeeId}
              onChange={setEmployeeId}
              disabled={!!currentQuota}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quotaYear">Tahun</Label>
            <Input id="quotaYear" type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} placeholder="YYYY" disabled={!!currentQuota} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalQuota">Total Kuota (hari)</Label>
            <Input id="totalQuota" type="number" value={totalQuota} onChange={(e) => setTotalQuota(parseInt(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
          <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Kuota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeQuotaDialog;