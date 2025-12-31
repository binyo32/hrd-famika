import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Cake } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const BirthdayCard = ({ employees, onViewAll }) => {
  return (
    <Card className="glass-effect border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center text-rose-500">
          <Cake className="mr-2 h-5 w-5" /> Ulang Tahun Bulan Ini
        </CardTitle>
        <CardDescription>Karyawan yang berulang tahun 30 hari ke depan.</CardDescription>
      </CardHeader>
      <CardContent>
        {employees.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {employees.slice(0, 4).map((employee) => (
                <div key={employee.id} className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={employee.photo} alt={employee.name} />
                    <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm truncate">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-rose-500">
                      {format(employee.birthdayThisYear, 'dd MMM', { locale: id })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {employees.length > 4 && (
              <Button onClick={onViewAll} variant="outline" className="w-full">
                Lihat Semua ({employees.length})
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <Cake className="mx-auto h-8 w-8 mb-2" />
            <p>Tidak ada karyawan yang berulang tahun dalam 30 hari ke depan.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BirthdayCard;