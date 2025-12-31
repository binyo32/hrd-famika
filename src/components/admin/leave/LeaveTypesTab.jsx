import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const LeaveTypesTab = ({ 
  leaveTypes, 
  loading, 
  onOpenLeaveTypeDialog, 
  onDeleteLeaveType 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Jenis Cuti</CardTitle>
        <CardDescription>Kelola jenis-jenis cuti yang tersedia untuk karyawan.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => onOpenLeaveTypeDialog()} className="mb-4 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Jenis Cuti
        </Button>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Jenis Cuti</TableHead>
                <TableHead>Mengurangi Kuota?</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading.types ? (
                <TableRow><TableCell colSpan="3" className="text-center">Memuat...</TableCell></TableRow>
              ) : leaveTypes.length === 0 ? (
                <TableRow><TableCell colSpan="3" className="text-center">Tidak ada jenis cuti.</TableCell></TableRow>
              ) : leaveTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>{type.name}</TableCell>
                  <TableCell>{type.reduces_quota ? 'Ya' : 'Tidak'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onOpenLeaveTypeDialog(type)} className="hover:text-blue-500 mr-2" title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteLeaveType(type.id)} className="hover:text-red-500" title="Hapus">
                      <Trash2 className="h-4 w-4" />
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

export default LeaveTypesTab;