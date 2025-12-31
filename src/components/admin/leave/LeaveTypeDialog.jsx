import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const LeaveTypeDialog = ({ 
  isOpen, 
  onOpenChange, 
  currentLeaveType, 
  onSuccess 
}) => {
  const [leaveTypeName, setLeaveTypeName] = useState('');
  const [reducesQuota, setReducesQuota] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentLeaveType) {
        setLeaveTypeName(currentLeaveType.name);
        setReducesQuota(currentLeaveType.reduces_quota);
      } else {
        setLeaveTypeName('');
        setReducesQuota(true);
      }
    }
  }, [isOpen, currentLeaveType]);

  const handleSave = async () => {
    if (!leaveTypeName) {
      toast({ title: "Validasi Gagal", description: "Nama jenis cuti tidak boleh kosong.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      let response;
      const leaveTypeData = { name: leaveTypeName, reduces_quota: reducesQuota };
      if (currentLeaveType) {
        response = await supabase.from('leave_types').update(leaveTypeData).eq('id', currentLeaveType.id).select();
      } else {
        response = await supabase.from('leave_types').insert(leaveTypeData).select();
      }
      if (response.error) throw response.error;
      toast({ title: "Sukses", description: `Jenis cuti berhasil ${currentLeaveType ? 'diperbarui' : 'ditambahkan'}.` });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: `Gagal menyimpan jenis cuti: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentLeaveType ? 'Edit Jenis Cuti' : 'Tambah Jenis Cuti Baru'}</DialogTitle>
          <DialogDescription>
            {currentLeaveType ? 'Ubah detail jenis cuti.' : 'Tambahkan jenis cuti baru ke sistem.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="leaveTypeName">Nama Jenis Cuti</Label>
            <Input id="leaveTypeName" value={leaveTypeName} onChange={(e) => setLeaveTypeName(e.target.value)} placeholder="Contoh: Cuti Tahunan" />
          </div>
          <div className="flex items-center space-x-2">
            <Input type="checkbox" id="reducesQuota" checked={reducesQuota} onChange={(e) => setReducesQuota(e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="reducesQuota" className="text-sm font-normal">Jenis cuti ini mengurangi kuota tahunan karyawan</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
          <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveTypeDialog;