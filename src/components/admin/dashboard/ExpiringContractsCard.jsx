import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FileClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';

const ExpiringContractsCard = ({ contracts, onViewAll }) => {
  const navigate = useNavigate();

  const handleRowClick = (employeeId) => {
    navigate(`/admin/employees/${employeeId}`);
  };

  const getDaysLeftColor = (days) => {
    if (days <= 7) return 'text-red-500';
    if (days <= 15) return 'text-orange-500';
    return 'text-yellow-500';
  };

  return (
    <Card className="glass-effect border-0 shadow-xl lg:col-span-1 flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <FileClock className="mr-2 h-5 w-5 text-red-500" /> Kontrak Akan Berakhir
        </CardTitle>
        <CardDescription>Daftar karyawan yang kontraknya akan habis dalam 30 hari.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden flex flex-col">
        {contracts && contracts.length > 0 ? (
          <>
            <div className="space-y-4 overflow-y-auto flex-grow pr-2">
              {contracts.slice(0, 5).map(contract => {
                const daysLeft = differenceInDays(new Date(contract.end_date), new Date());
                return (
                  <div 
                    key={contract.id} 
                    className="flex items-center space-x-4 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleRowClick(contract.employee.id)}
                  >
                    <Avatar>
                      <AvatarImage src={contract.employee.photo} />
                      <AvatarFallback className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                        {contract.employee.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contract.employee.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Berakhir: {format(new Date(contract.end_date), 'dd MMM yyyy', { locale: id })}
                      </p>
                    </div>
                    <div className={`font-bold text-sm text-right ${getDaysLeftColor(daysLeft)}`}>
                        {daysLeft} hari
                    </div>
                  </div>
                );
              })}
            </div>
            {contracts.length > 5 && (
              <Button variant="link" className="w-full mt-4" onClick={onViewAll}>
                Lihat Semua ({contracts.length})
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center flex-grow h-full">
            <FileClock className="h-16 w-16 text-green-500" />
            <p className="mt-4 font-semibold text-lg">Semua Aman!</p>
            <p className="text-muted-foreground mt-1">Tidak ada kontrak yang akan berakhir dalam waktu dekat.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiringContractsCard;