import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Cake } from 'lucide-react';

const BirthdayDialog = ({ isOpen, onOpenChange, employees }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Cake className="mr-2 h-5 w-5 text-rose-500" />
            Ulang Tahun Bulan Ini
          </DialogTitle>
          <DialogDescription>
            Daftar lengkap karyawan yang berulang tahun dalam 30 hari ke depan.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4">
            {employees.length > 0 ? (
              employees.map((employee) => (
                <div key={employee.id} className="flex items-center p-2 rounded-lg hover:bg-muted">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.photo} alt={employee.name} />
                    <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-sm">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.position}</p>
                  </div>
                  <div className="text-right">
                     <p className="font-bold text-sm text-rose-500">
                        {format(employee.birthdayThisYear, 'dd', { locale: id })}
                     </p>
                     <p className="text-xs text-muted-foreground">
                        {format(employee.birthdayThisYear, 'MMM', { locale: id })}
                     </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Tidak ada data.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default BirthdayDialog;