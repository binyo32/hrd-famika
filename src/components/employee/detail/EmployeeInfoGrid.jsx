import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, CalendarDays, Mail, Phone, MapPin, Building, Clock, Map as MapIcon, BookOpen, ShieldCheck, LogOut, Briefcase, Award, FileText as FileTextIcon, Users
} from 'lucide-react';

const EmployeeInfoGrid = ({ employee, ageDetails, workDurationDetails }) => {
  const profileFields = [
    { icon: User, label: 'NIK/Nomor Pegawai', value: employee.nik },
    { icon: Award, label: 'Jabatan', value: employee.position },
    { icon: Briefcase, label: 'Divisi', value: employee.division },
    { icon: CalendarDays, label: 'Tanggal Masuk', value: employee.joinDate ? new Date(employee.joinDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
    ...(employee.terminationDate ? [{ icon: LogOut, label: 'Tanggal Keluar', value: new Date(employee.terminationDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) }] : []),
    { icon: Clock, label: 'Masa Kerja', value: workDurationDetails.duration },
    { icon: Clock, label: 'Kategori Masa Kerja', value: workDurationDetails.category },
    { icon: CalendarDays, label: 'Tanggal Lahir', value: employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
    { icon: User, label: 'Usia', value: ageDetails.age },
    { icon: User, label: 'Kategori Usia', value: ageDetails.category },
    { icon: Mail, label: 'Email', value: employee.email },
    { icon: Phone, label: 'Nomor Telepon', value: employee.phone },
    { icon: BookOpen, label: 'Pendidikan', value: employee.education || 'N/A' },
    { icon: MapIcon, label: 'Area Project', value: employee.area || 'N/A' },
    { icon: Building, label: 'Lokasi Kerja', value: employee.workLocation || 'N/A' },
    { icon: ShieldCheck, label: 'Nomor BPJS', value: employee.bpjsNumber || 'N/A' },
    { icon: FileTextIcon, label: 'NPWP', value: employee.npwp || 'N/A' },
    { icon: FileTextIcon, label: 'Status PTKP', value: employee.ptkp_status || 'N/A' },
    { icon: Users, label: 'Jumlah Tanggungan', value: employee.dependents_count !== null && employee.dependents_count !== undefined ? employee.dependents_count : 'N/A' },
    { icon: MapPin, label: 'Alamat (KTP)', value: employee.address, fullWidth: true },
  ];

  return (
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
  );
};

export default EmployeeInfoGrid;