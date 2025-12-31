import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Search } from 'lucide-react';

const EmployeeQuotasTab = ({ 
  employeeQuotas, 
  loading, 
  onOpenQuotaDialog 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuotas = useMemo(() => {
    if (!searchTerm) {
      return employeeQuotas;
    }
    return employeeQuotas.filter(quota => {
      const employeeName = quota.employees?.name?.toLowerCase() || '';
      const employeeNik = quota.employees?.nik?.toLowerCase() || '';
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      return employeeName.includes(lowercasedSearchTerm) || employeeNik.includes(lowercasedSearchTerm);
    });
  }, [searchTerm, employeeQuotas]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kuota Cuti Karyawan</CardTitle>
        <CardDescription>Kelola kuota cuti tahunan untuk setiap karyawan.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <Button onClick={() => onOpenQuotaDialog()} className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Atur Kuota Karyawan
          </Button>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama atau NIK karyawan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Karyawan</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Tahun</TableHead>
                <TableHead>Total Kuota</TableHead>
                <TableHead>Terpakai</TableHead>
                <TableHead>Sisa Kuota</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading.quotas ? (
                <TableRow><TableCell colSpan="7" className="text-center">Memuat...</TableCell></TableRow>
              ) : filteredQuotas.length === 0 ? (
                <TableRow><TableCell colSpan="7" className="text-center">{searchTerm ? 'Karyawan tidak ditemukan.' : 'Tidak ada data kuota.'}</TableCell></TableRow>
              ) : filteredQuotas.map((quota) => (
                <TableRow key={quota.id}>
                  <TableCell>{quota.employees?.name || 'Karyawan Tidak Ditemukan'}</TableCell>
                  <TableCell>{quota.employees?.nik || '-'}</TableCell>
                  <TableCell>{quota.year}</TableCell>
                  <TableCell>{quota.total_quota}</TableCell>
                  <TableCell>{quota.used_quota}</TableCell>
                  <TableCell>{quota.remaining_quota}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onOpenQuotaDialog(quota)} className="hover:text-blue-500" title="Edit Kuota">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeQuotasTab;