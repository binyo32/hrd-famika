import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const getStatusColor = (status) => {
  switch (status) {
    case 'Tetap': return 'bg-green-500';
    case 'Kontrak': return 'bg-blue-500';
    case 'Magang': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

const getActiveStatusColor = (activeStatus) => {
  switch (activeStatus) {
    case 'Aktif': return 'bg-green-500';
    case 'Cuti': return 'bg-yellow-500';
    case 'Resign': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const EmployeeProfileCard = ({ employee }) => {
  if (!employee) return null;

  return (
    <Card className="glass-effect border-0 shadow-xl">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
            <AvatarImage src={employee.photo} />
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-4xl">
              {employee.name ? employee.name.charAt(0) : 'N'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div>
          <CardTitle className="text-2xl">{employee.name}</CardTitle>
          <CardDescription className="text-lg mt-1">
            {employee.position}
          </CardDescription>
          <div className="flex justify-center mt-3 space-x-2">
            <Badge className={`${getStatusColor(employee.status)} text-white text-sm px-3 py-1`}>
              {employee.status}
            </Badge>
            <Badge className={`${getActiveStatusColor(employee.activeStatus)} text-white text-sm px-3 py-1`}>
              {employee.activeStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <p className="text-sm font-medium text-muted-foreground">Divisi</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{employee.division}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <p className="text-sm font-medium text-muted-foreground">Jenis Kelamin</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{employee.gender}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <p className="text-sm font-medium text-muted-foreground">Lokasi Kerja</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {employee.workLocation || 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeProfileCard;