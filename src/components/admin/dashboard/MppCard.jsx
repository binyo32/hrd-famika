import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlarmClock as UserClock } from 'lucide-react';
import { motion } from 'framer-motion';

const MppCard = ({ employees, onViewAll }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-effect border-0 shadow-xl h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold flex items-center">
            <UserClock className="mr-2 h-5 w-5 text-orange-500" />
            Masa Persiapan Pensiun
          </CardTitle>
          <span className="text-sm font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/50 px-2 py-1 rounded-full">
            {employees.length}
          </span>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between">
          {employees.length > 0 ? (
            <div className="space-y-3 flex-grow overflow-y-auto max-h-64 pr-2">
              {employees.slice(0, 4).map((employee, index) => (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={employee.photo} alt={employee.name} />
                    <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold truncate">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Pensiun dalam: {employee.timeRemaining.months} bulan, {employee.timeRemaining.days} hari
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Tidak ada karyawan dalam masa persiapan pensiun.
            </div>
          )}
          <Button variant="ghost" className="w-full mt-4 text-primary" onClick={onViewAll} disabled={employees.length === 0}>
            Lihat Semua
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MppCard;