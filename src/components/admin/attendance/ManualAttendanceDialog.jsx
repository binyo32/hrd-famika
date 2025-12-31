import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ManualAttendanceDialog = ({
  isOpen,
  onOpenChange,
  editingRecord,
  manualInputData,
  handleManualInputChange,
  handleSelectChange,
  employees,
  attendanceStatuses,
  onSubmit,
  loadingSubmit
}) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editingRecord ? 'Edit Absensi' : 'Input Absensi Manual'}</DialogTitle>
        <DialogDescription>
          {editingRecord ? 'Perbarui detail absensi karyawan.' : 'Catat absensi baru untuk karyawan.'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="employee_id">Karyawan</Label>
          <Select name="employee_id" value={manualInputData.employee_id || undefined} onValueChange={(value) => handleSelectChange('employee_id', value)} disabled={!!editingRecord}>
            <SelectTrigger id="employee_id"><SelectValue placeholder="Pilih Karyawan" /></SelectTrigger>
            <SelectContent>
              {(employees || []).filter(emp => emp && emp.id).map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.nik})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="attendance_date">Tanggal Absensi</Label>
          <Input id="attendance_date" name="attendance_date" type="date" value={manualInputData.attendance_date} onChange={handleManualInputChange} disabled={!!editingRecord} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="check_in_time">Jam Check-In</Label>
            <Input id="check_in_time" name="check_in_time" type="time" value={manualInputData.check_in_time} onChange={handleManualInputChange} />
          </div>
          <div>
            <Label htmlFor="check_out_time">Jam Check-Out</Label>
            <Input id="check_out_time" name="check_out_time" type="time" value={manualInputData.check_out_time} onChange={handleManualInputChange} />
          </div>
        </div>
        <div>
          <Label htmlFor="status_id">Status Absensi (Opsional)</Label>
          <Select name="status_id" value={manualInputData.status_id || "NO_STATUS_PLACEHOLDER"} onValueChange={(value) => handleSelectChange('status_id', value === "NO_STATUS_PLACEHOLDER" ? "" : value)}>
            <SelectTrigger id="status_id"><SelectValue placeholder="Pilih Status (jika perlu)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NO_STATUS_PLACEHOLDER">Tidak Ada Status Khusus</SelectItem>
              {(attendanceStatuses || []).filter(status => status && status.id).map(status => <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="notes">Catatan (Opsional)</Label>
          <Input id="notes" name="notes" value={manualInputData.notes} onChange={handleManualInputChange} placeholder="Contoh: Izin setengah hari" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loadingSubmit}>Batal</Button>
        <Button onClick={onSubmit} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white" disabled={loadingSubmit}>
          {loadingSubmit ? 'Menyimpan...' : (editingRecord ? 'Perbarui Absensi' : 'Simpan Absensi')}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default ManualAttendanceDialog;