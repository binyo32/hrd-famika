import {React, useState, useEffect} from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { 
  CalendarDays, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  User, 
  Clock, 
  Map as MapIcon, 
  BookOpen,
  ShieldCheck,
  LogOut,
  Briefcase,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';

const EmployeeProfile = () => {
   const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchEmployee = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Fetch employee error:', error);
      } else {
        setEmployee(data);
      }

      setLoading(false);
    };

    fetchEmployee();
  }, [user?.id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Memuat data karyawan...</p>
        </div>
      </Layout>
    );
  }

  if (!employee) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Data karyawan tidak ditemukan</p>
        </div>
      </Layout>
    );
  }

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

  const calculateAgeDetails = (birthDate) => {
    if (!birthDate) return { age: 'N/A', category: 'N/A' };
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    
    let category = 'N/A';
    if (age < 30) category = '< 30 Tahun';
    else if (age <= 50) category = '31-50 Tahun';
    else category = '> 50 Tahun';
    
    return { age: `${age} tahun`, category };
  };

  const calculateWorkDurationDetails = (joinDate) => {
    if (!joinDate) return { duration: 'N/A', category: 'N/A', years: 0, months: 0 };
    const start = new Date(joinDate);
    const now = new Date();
    let diffYears = now.getFullYear() - start.getFullYear();
    let diffMonths = now.getMonth() - start.getMonth();
    let diffDays = now.getDate() - start.getDate();

    if (diffDays < 0) {
        diffMonths--;
        const daysInLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        diffDays += daysInLastMonth;
    }
    if (diffMonths < 0) {
        diffYears--;
        diffMonths += 12;
    }
    
    let durationString = "";
    if (diffYears > 0) durationString += `${diffYears} tahun `;
    if (diffMonths > 0) durationString += `${diffMonths} bulan `;
    if (diffYears === 0 && diffMonths === 0 && diffDays >= 0) durationString += `${diffDays} hari`;
    durationString = durationString.trim() || "Baru bergabung";
    
    let category = 'N/A';
    const totalServiceYears = diffYears + diffMonths/12;
    if (totalServiceYears < 5) category = '< 5 Tahun';
    else if (totalServiceYears <= 10) category = '5-10 Tahun';
    else category = '> 10 Tahun';
    
    return { duration: durationString, category, years: diffYears, months: diffMonths };
  };
  
  const ageDetails = calculateAgeDetails(employee.birth_date);
  const workDurationDetails = calculateWorkDurationDetails(employee.join_date);

  const profileFields = [
    { icon: User, label: 'NIK/Nomor Pegawai', value: employee.nik },
    { icon: Award, label: 'Jabatan', value: employee.position },
    { icon: Briefcase, label: 'Divisi', value: employee.division },
    { icon: CalendarDays, label: 'Tanggal Masuk', value: employee.join_date ? new Date(employee.join_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
    { icon: Clock, label: 'Masa Kerja', value: workDurationDetails.duration },
    { icon: Clock, label: 'Kategori Masa Kerja', value: workDurationDetails.category },
    { icon: CalendarDays, label: 'Tanggal Lahir', value: employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
    { icon: User, label: 'Usia', value: ageDetails.age },
    { icon: User, label: 'Kategori Usia', value: ageDetails.category },
    { icon: Mail, label: 'Email', value: employee.email },
    { icon: Phone, label: 'Nomor Telepon', value: employee.phone },
    { icon: BookOpen, label: 'Pendidikan', value: employee.education || 'N/A' },
    { icon: MapIcon, label: 'Provinsi (KTP)', value: employee.province || 'N/A' },
    { icon: MapPin, label: 'Alamat (KTP)', value: employee.address, fullWidth: true },
    { icon: Building, label: 'Lokasi Kerja', value: employee.work_location || 'N/A'},
    { icon: ShieldCheck, label: 'Nomor BPJS', value: employee.bpjs_number || 'N/A' },
    ...(employee.active_status === 'Resign' && employee.termination_date ? [{ icon: LogOut, label: 'Tanggal Keluar', value: new Date(employee.termination_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) }] : [])
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Profil Saya
          </h1>
          <p className="text-muted-foreground">
            Informasi lengkap data pribadi dan kepegawaian Anda
          </p>
        </motion.div>
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-effect border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl">Selamat Datang Kembali, {employee.name}! 👋</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Halaman ini berisi semua detail profil Anda. Pastikan data Anda selalu terbarui. 
                Jika ada perubahan, silakan hubungi departemen HRD.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
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
                     <Badge className={`${getActiveStatusColor(employee.active_status)} text-white text-sm px-3 py-1`}>
                      {employee.active_status}
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
                      {employee.work_location || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Informasi Detail</CardTitle>
                <CardDescription>
                  Data lengkap kepegawaian dan kontak Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profileFields.map((field, index) => (
                    <motion.div
                      key={field.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className={`flex items-start space-x-4 p-4 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors border border-white/20 dark:border-white/10 ${field.fullWidth ? 'md:col-span-2' : ''}`}
                    >
                      <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0">
                        <field.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground mb-1">{field.label}</p>
                        <p className="text-base font-semibold break-words">{field.value || 'N/A'}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
      

      </div>
    </Layout>
  );
};

export default EmployeeProfile;