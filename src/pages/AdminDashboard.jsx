import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, UserCheck, Briefcase, Clock, TrendingUp, MapPin, FileClock, AlarmClock as UserClock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import StatCard from '@/components/admin/dashboard/StatCard';
import PieChartCard from '@/components/admin/dashboard/PieChartCard';
import EmployeeQuickViewDialog from '@/components/admin/dashboard/EmployeeQuickViewDialog';
import ExpiringContractsCard from '@/components/admin/dashboard/ExpiringContractsCard';
import ExpiringContractsDialog from '@/components/admin/dashboard/ExpiringContractsDialog';
import MppCard from '@/components/admin/dashboard/MppCard';
import MppDialog from '@/components/admin/dashboard/MppDialog';
import BirthdayCard from '@/components/admin/dashboard/BirthdayCard';
import BirthdayDialog from '@/components/admin/dashboard/BirthdayDialog';

const AdminDashboard = () => {
  const {
    employees,
    loading,
    expiringContracts,
    mppEmployees,
    upcomingBirthdays,
    employmentStatus,
    activeStatusDistribution,
    ageCategory,
    genderDiversity,
    lengthOfService,
    jobLevel,
    provinceDistribution
  } = useDashboardStats();

  const [showAllJobLevels, setShowAllJobLevels] = useState(false);
  const [showAllProvinces, setShowAllProvinces] = useState(false);
  const [quickView, setQuickView] = useState({ isOpen: false, title: '', employees: [] });
  const [isExpiringContractsDialogOpen, setIsExpiringContractsDialogOpen] = useState(false);
  const [isMppDialogOpen, setIsMppDialogOpen] = useState(false);
  const [isBirthdayDialogOpen, setIsBirthdayDialogOpen] = useState(false);


  const combinedStatus = [
    ...employmentStatus,
    ...activeStatusDistribution,
  ];

  const handleQuickView = (filter, title) => {
    let filteredEmployees = [];
    switch (filter.type) {
      case 'all':
        filteredEmployees = employees;
        break;
      case 'status':
        filteredEmployees = employees.filter(e => e.status === filter.value);
        break;
      case 'activeStatus':
        filteredEmployees = employees.filter(e => e.activeStatus === filter.value);
        break;
      case 'age':
        if (filter.value === 'under30') filteredEmployees = employees.filter(e => e.age < 30);
        else if (filter.value === 'between30_58') filteredEmployees = employees.filter(e => e.age >= 30 && e.age <= 58);
        else if (filter.value === 'over58') filteredEmployees = employees.filter(e => e.age > 58);
        break;
      case 'gender':
        filteredEmployees = employees.filter(e => e.gender === filter.value);
        break;
      case 'service':
        if (filter.value === 'under5') filteredEmployees = employees.filter(e => e.workDurationYears < 5);
        else if (filter.value === 'between5_10') filteredEmployees = employees.filter(e => e.workDurationYears >= 5 && e.workDurationYears <= 10);
        else if (filter.value === 'over10') filteredEmployees = employees.filter(e => e.workDurationYears > 10);
        break;
      case 'position':
        filteredEmployees = employees.filter(e => e.position === filter.value);
        break;
      case 'area':
        filteredEmployees = employees.filter(e => e.area === filter.value);
        break;
      default:
        filteredEmployees = [];
    }
    setQuickView({ isOpen: true, title, employees: filteredEmployees });
  };

  const GENDER_COLORS = ['#0088FE', '#FF8042', '#00C49F', '#FFBB28'];

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Admin
          </h1>
          <p className="text-muted-foreground">Ringkasan data karyawan HRIS Famika</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(16)].map((_, index) => <Card key={index} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-36 rounded-lg"></Card>)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="glass-effect border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center"><Users className="mr-2 h-5 w-5" />Status Kepegawaian</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {combinedStatus.map((stat, index) => <StatCard key={index} {...stat} title={stat.name} percentage={stat.name !== "Total Karyawan" ? stat.percentage : undefined} onClick={() => handleQuickView(stat.filter, `Karyawan: ${stat.name}`)} />)}
                  </CardContent>
                </Card>
                 <Card className="glass-effect border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center"><TrendingUp className="mr-2 h-5 w-5" />Kategori Usia</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {ageCategory.map((stat, index) => <StatCard key={index} {...stat} title={stat.name} icon={UserCheck} color="from-teal-500 to-cyan-600" bgColor="bg-teal-50 dark:bg-teal-900/20" onClick={() => handleQuickView(stat.filter, `Karyawan Usia ${stat.name}`)} />)}
                    </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <ExpiringContractsCard contracts={expiringContracts} onViewAll={() => setIsExpiringContractsDialogOpen(true)} />
                <MppCard employees={mppEmployees} onViewAll={() => setIsMppDialogOpen(true)} />
                <BirthdayCard employees={upcomingBirthdays} onViewAll={() => setIsBirthdayDialogOpen(true)} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <Card className="glass-effect border-0 shadow-xl lg:col-span-2">
                 <CardHeader>
                  <CardTitle className="text-xl flex items-center"><Clock className="mr-2 h-5 w-5" />Lama Bekerja</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {lengthOfService.map((stat, index) => <StatCard key={index} {...stat} title={stat.name} icon={Clock} color="from-amber-500 to-yellow-600" bgColor="bg-amber-50 dark:bg-amber-900/20" onClick={() => handleQuickView(stat.filter, `Karyawan dengan Masa Kerja ${stat.name}`)} />)}
                </CardContent>
              </Card>
              <PieChartCard title="Diversitas Gender" data={genderDiversity} dataKey="value" nameKey="name" colors={GENDER_COLORS} onPieClick={(gender) => handleQuickView({ type: 'gender', value: gender }, `Karyawan ${gender}`)} />
            </div>

            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl flex items-center"><Briefcase className="mr-2 h-5 w-5" />Distribusi Level Jabatan</CardTitle>
                {jobLevel.length > 5 && (
                  <Button variant="ghost" onClick={() => setShowAllJobLevels(!showAllJobLevels)}>
                    {showAllJobLevels ? 'Tampilkan Lebih Sedikit' : 'Lihat Semua'}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {jobLevel.length > 0 ? (
                  (showAllJobLevels ? jobLevel : jobLevel.slice(0, 5)).map((stat, index) => (
                    <StatCard
                      key={index}
                      {...stat}
                      title={stat.name}
                      description="Karyawan di jabatan ini"
                      icon={Briefcase}
                      color="from-indigo-500 to-purple-600"
                      bgColor="bg-indigo-50 dark:bg-indigo-900/20"
                      onClick={() => handleQuickView(stat.filter, `Karyawan Jabatan: ${stat.name}`)}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground col-span-full text-center">Data jabatan tidak tersedia.</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl flex items-center"><MapPin className="mr-2 h-5 w-5" />Distribusi Area</CardTitle>
                {provinceDistribution.length > 5 && (
                  <Button variant="ghost" onClick={() => setShowAllProvinces(!showAllProvinces)}>
                    {showAllProvinces ? 'Tampilkan Lebih Sedikit' : 'Lihat Semua'}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {provinceDistribution.length > 0 ? (
                  (showAllProvinces ? provinceDistribution : provinceDistribution.slice(0, 5)).map((stat, index) => (
                    <StatCard
                      key={index}
                      {...stat}
                      title={stat.name}
                      description="Karyawan di area ini"
                      icon={MapPin}
                      color="from-pink-500 to-rose-600"
                      bgColor="bg-pink-50 dark:bg-pink-900/20"
                      onClick={() => handleQuickView(stat.filter, `Karyawan di Area ${stat.name}`)}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground col-span-full text-center">Data area tidak tersedia.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <EmployeeQuickViewDialog
        isOpen={quickView.isOpen}
        onOpenChange={(isOpen) => setQuickView({ ...quickView, isOpen })}
        title={quickView.title}
        employees={quickView.employees}
      />
      <ExpiringContractsDialog
        isOpen={isExpiringContractsDialogOpen}
        onOpenChange={setIsExpiringContractsDialogOpen}
        contracts={expiringContracts}
      />
      <MppDialog
        isOpen={isMppDialogOpen}
        onOpenChange={setIsMppDialogOpen}
        employees={mppEmployees}
      />
      <BirthdayDialog
        isOpen={isBirthdayDialogOpen}
        onOpenChange={setIsBirthdayDialogOpen}
        employees={upcomingBirthdays}
      />
    </Layout>
  );
};

export default AdminDashboard;