import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const EmployeeQuickViewDialog = ({ isOpen, onOpenChange, title, employees }) => {
  const navigate = useNavigate();

  const handleRowClick = (employeeId) => {
    navigate(`/admin/employees/${employeeId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Menampilkan {employees.length} karyawan yang cocok. Klik baris untuk melihat detail.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Divisi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} onClick={() => handleRowClick(employee.id)} className="cursor-pointer">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={employee.photo} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                          {employee.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.nik}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell><Badge variant="outline">{employee.division}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeQuickViewDialog;