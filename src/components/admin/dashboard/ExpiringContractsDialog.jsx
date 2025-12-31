import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const ExpiringContractsDialog = ({ isOpen, onOpenChange, contracts }) => {
  const navigate = useNavigate();

  const handleRowClick = (employeeId) => {
    navigate(`/admin/employees/${employeeId}`);
    onOpenChange(false);
  };

  const getDaysLeftColor = (days) => {
    if (days <= 7) return 'text-red-500 font-bold';
    if (days <= 15) return 'text-orange-500 font-semibold';
    return 'text-yellow-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Karyawan dengan Kontrak Akan Berakhir</DialogTitle>
          <DialogDescription>
            Berikut adalah daftar lengkap karyawan yang kontraknya akan berakhir dalam 30 hari ke depan.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Nama Karyawan</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Tanggal Berakhir</TableHead>
                <TableHead className="text-right">Sisa Hari</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts && contracts.length > 0 ? (
                contracts.map((contract) => {
                  const daysLeft = differenceInDays(new Date(contract.end_date), new Date());
                  return (
                    <TableRow key={contract.id} className="cursor-pointer hover:bg-muted" onClick={() => handleRowClick(contract.employee.id)}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={contract.employee.photo} />
                            <AvatarFallback className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                              {contract.employee.name ? contract.employee.name.charAt(0) : 'E'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{contract.employee.name || 'Data tidak lengkap'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{contract.employee.nik || '-'}</TableCell>
                      <TableCell>{contract.employee.position || '-'}</TableCell>
                      <TableCell>{format(new Date(contract.end_date), 'dd MMMM yyyy', { locale: id })}</TableCell>
                      <TableCell className={`text-right ${getDaysLeftColor(daysLeft)}`}>
                        {daysLeft} hari
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan="5" className="text-center h-24">
                    Tidak ada data kontrak yang akan berakhir.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpiringContractsDialog;