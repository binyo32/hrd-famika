import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/lib/employeeService';
import { motion } from 'framer-motion';
import { PlusCircle, Edit, Trash2, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const ContractFormDialog = ({ isOpen, onOpenChange, currentContract, employees, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    employee_id: '',
    contract_type: 'PKWT',
    start_date: '',
    end_date: '',
    contract_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (currentContract) {
        setFormData({
          employee_id: currentContract.employee_id,
          contract_type: currentContract.contract_type,
          start_date: currentContract.start_date ? format(new Date(currentContract.start_date), 'yyyy-MM-dd') : '',
          end_date: currentContract.end_date ? format(new Date(currentContract.end_date), 'yyyy-MM-dd') : '',
          contract_number: currentContract.contract_number || '',
        });
      } else {
        setFormData({
          employee_id: '',
          contract_type: 'PKWT',
          start_date: '',
          end_date: '',
          contract_number: '',
        });
      }
    }
  }, [isOpen, currentContract]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.start_date) {
      toast({ title: "Validasi Gagal", description: "Karyawan dan tanggal mulai harus diisi.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const dataToSubmit = { ...formData, end_date: formData.end_date || null };
      let response;
      if (currentContract) {
        response = await supabase.from('employee_contracts').update(dataToSubmit).eq('id', currentContract.id).select();
      } else {
        response = await supabase.from('employee_contracts').insert(dataToSubmit).select();
      }

      if (response.error) throw response.error;
      toast({ title: "Sukses", description: `Kontrak berhasil ${currentContract ? 'diperbarui' : 'ditambahkan'}.` });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: `Gagal menyimpan kontrak: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    (emp.nik && emp.nik.includes(employeeSearchTerm))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{currentContract ? 'Edit Kontrak Kerja' : 'Tambah Kontrak Kerja'}</DialogTitle>
          <DialogDescription>
            {currentContract ? 'Perbarui detail kontrak kerja karyawan.' : 'Tambahkan data kontrak kerja baru untuk karyawan.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee_id">Karyawan</Label>
            <Select value={formData.employee_id} onValueChange={(value) => handleSelectChange('employee_id', value)} disabled={!!currentContract}>
              <SelectTrigger><SelectValue placeholder="Pilih Karyawan" /></SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    ref={searchInputRef}
                    placeholder="Cari nama atau NIK..."
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                  />
                </div>
                {filteredEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.nik})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract_type">Jenis Kontrak</Label>
            <Select value={formData.contract_type} onValueChange={(value) => handleSelectChange('contract_type', value)}>
              <SelectTrigger><SelectValue placeholder="Pilih Jenis Kontrak" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PKWT">PKWT (Perjanjian Kerja Waktu Tertentu)</SelectItem>
                <SelectItem value="PKWTT">PKWTT (Perjanjian Kerja Waktu Tidak Tertentu)</SelectItem>
                <SelectItem value="Magang">Magang</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input id="start_date" type="date" value={formData.start_date} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Tanggal Berakhir</Label>
              <Input id="end_date" type="date" value={formData.end_date} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract_number">Nomor Kontrak (Opsional)</Label>
            <Input id="contract_number" value={formData.contract_number} onChange={handleChange} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const AdminContractManagement = () => {
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentContract, setCurrentContract] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [employeeData, { data: contractData, error: contractError }] = await Promise.all([
        getEmployees('name', true),
        supabase.from('employee_contracts').select('*, employees(name, nik)').order('start_date', { ascending: false })
      ]);

      if (contractError) throw contractError;

      setEmployees(employeeData);
      setContracts(contractData || []);
    } catch (error) {
      toast({ title: "Error", description: `Gagal memuat data: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    setCurrentContract(null);
    setIsFormOpen(true);
  };

  const handleEdit = (contract) => {
    setCurrentContract(contract);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data kontrak ini?")) {
      try {
        const { error } = await supabase.from('employee_contracts').delete().eq('id', id);
        if (error) throw error;
        toast({ title: "Sukses", description: "Kontrak berhasil dihapus." });
        fetchData();
      } catch (error) {
        toast({ title: "Error", description: `Gagal menghapus kontrak: ${error.message}`, variant: "destructive" });
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Manajemen Kontrak Kerja
          </h1>
          <p className="text-muted-foreground">Kelola riwayat kontrak kerja seluruh karyawan.</p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Kontrak Karyawan</CardTitle>
            <CardDescription>Lihat, tambah, edit, atau hapus data kontrak kerja.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAdd} className="mb-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kontrak
            </Button>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Karyawan</TableHead>
                    <TableHead>Jenis Kontrak</TableHead>
                    <TableHead>Tanggal Mulai</TableHead>
                    <TableHead>Tanggal Berakhir</TableHead>
                    <TableHead>Nomor Kontrak</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan="7" className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  ) : contracts.length === 0 ? (
                    <TableRow><TableCell colSpan="7" className="text-center">Tidak ada data kontrak.</TableCell></TableRow>
                  ) : (
                    contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>{contract.employees?.name || 'N/A'} ({contract.employees?.nik || 'N/A'})</TableCell>
                        <TableCell>{contract.contract_type}</TableCell>
                        <TableCell>{format(new Date(contract.start_date), 'dd MMMM yyyy')}</TableCell>
                        <TableCell>{contract.end_date ? format(new Date(contract.end_date), 'dd MMMM yyyy') : ' - '}</TableCell>
                        <TableCell>{contract.contract_number || '-'}</TableCell>
                        <TableCell>{contract.created_at ? format(new Date(contract.created_at), 'dd MMM yyyy, HH:mm') : '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(contract.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <ContractFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        currentContract={currentContract}
        employees={employees}
        onSuccess={fetchData}
      />
    </Layout>
  );
};

export default AdminContractManagement;