import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Trash2, FileText, CalendarCheck2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { getEmployeeById, deleteEmployee, updateEmployee } from '@/lib/employeeService';
import EmployeeFormDialog from '@/components/employee/EmployeeFormDialog';
import { statuses, genders } from '@/lib/employeeConfig';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeProfileCard from '@/components/employee/detail/EmployeeProfileCard';
import EmployeeInfoGrid from '@/components/employee/detail/EmployeeInfoGrid';
import { format, isAfter } from 'date-fns';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [foundEmployee, { data: contractData, error: contractError }] = await Promise.all([
          getEmployeeById(id),
          supabase.from('employee_contracts').select('*').eq('employee_id', id).order('start_date', { ascending: false })
        ]);

        if (contractError) throw contractError;

        setEmployee(foundEmployee);
        setContracts(contractData || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal memuat data karyawan atau kontrak: " + error.message,
          variant: "destructive",
        });
        navigate('/admin/employees');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, navigate]);
  
  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        const { data: divisionsData, error: divisionsError } = await supabase.from('divisions').select('name').order('name');
        if (divisionsError) throw divisionsError;
        setDivisions(divisionsData.map(d => d.name));

        const { data: positionsData, error: positionsError } = await supabase.from('job_positions').select('name').order('name');
        if (positionsError) throw positionsError;
        setJobPositions(positionsData.map(p => p.name));
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal memuat data konfigurasi: " + error.message,
          variant: "destructive",
        });
      }
    };
    fetchConfigData();
  }, []);

  const handleDelete = async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data karyawan ini? Ini akan menghapus semua data terkait, termasuk kontrak.')) {
      try {
        await deleteEmployee(id, user, employee?.name);
        toast({
          title: "Berhasil!",
          description: "Data karyawan berhasil dihapus",
        });
        navigate('/admin/employees');
      } catch (error) {
        toast({
          title: "Error",
          description: `Gagal menghapus data: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = () => {
    setIsFormDialogOpen(true);
  };

  const handleFormSubmit = async (data) => {
    try {
      const originalData = await getEmployeeById(id);
      await updateEmployee({ ...originalData, ...data, id: id }, user, originalData);
      toast({ title: "Berhasil!", description: "Data karyawan berhasil diperbarui." });
      setIsFormDialogOpen(false);
      
      setLoading(true);
      const foundEmployee = await getEmployeeById(id);
      setEmployee(foundEmployee);
      setLoading(false);
    } catch (error) {
       toast({
        title: "Error",
        description: `Gagal menyimpan data: ${error.message}`,
        variant: "destructive",
      });
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
    if (!joinDate) return { duration: 'N/A', category: 'N/A', years: 0, months: 0, days: 0 };
    const start = new Date(joinDate);
    const now = new Date();
    
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const durationParts = [];
    if (years > 0) durationParts.push(`${years} tahun`);
    if (months > 0) durationParts.push(`${months} bulan`);
    if (days > 0) durationParts.push(`${days} hari`);
    
    const duration = durationParts.length > 0 ? durationParts.join(' ') : 'Kurang dari sehari';

    let category = 'N/A';
    if (years < 1) category = '< 1 Tahun';
    else if (years <= 3) category = '1-3 Tahun';
    else if (years <= 5) category = '4-5 Tahun';
    else category = '> 5 Tahun';

    return { duration, category, years, months, days };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!employee) {
    return (
      <Layout>
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">Karyawan tidak ditemukan.</p>
          <Button onClick={() => navigate('/admin/employees')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar
          </Button>
        </div>
      </Layout>
    );
  }

  const ageDetails = calculateAgeDetails(employee.birthDate);
  const workDurationDetails = calculateWorkDurationDetails(employee.joinDate);
  const activeContract = contracts.find(c => !c.end_date || isAfter(new Date(c.end_date), new Date()));

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={() => navigate('/admin/employees')} variant="outline" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Karyawan
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Detail Karyawan
              </h1>
              <p className="text-muted-foreground">Profil lengkap untuk {employee.name}.</p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button onClick={handleDelete} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            className="lg:col-span-1 space-y-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <EmployeeProfileCard employee={employee} />
            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5" /> Status Kontrak</CardTitle>
              </CardHeader>
              <CardContent>
                {activeContract ? (
                  <div className="space-y-2">
                    <p><span className="font-semibold">Jenis:</span> {activeContract.contract_type}</p>
                    <p><span className="font-semibold">Mulai:</span> {format(new Date(activeContract.start_date), 'dd MMMM yyyy')}</p>
                    <p><span className="font-semibold">Berakhir:</span> {activeContract.end_date ? format(new Date(activeContract.end_date), 'dd MMMM yyyy') : 'Tidak Ditentukan'}</p>
                    <p><span className="font-semibold">No. Kontrak:</span> {activeContract.contract_number || '-'}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Tidak ada kontrak aktif.</p>
                )}
                <Button variant="link" className="p-0 h-auto mt-2" onClick={() => navigate('/admin/contract-management')}>
                  Lihat Semua Riwayat Kontrak
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Informasi Rinci</CardTitle>
                <CardDescription>Data personal dan pekerjaan karyawan.</CardDescription>
              </CardHeader>
              <CardContent>
                <EmployeeInfoGrid employee={employee} ageDetails={ageDetails} workDurationDetails={workDurationDetails} />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <EmployeeFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleFormSubmit}
        initialData={employee}
        editingEmployee={employee}
        divisions={divisions}
        statuses={statuses}
        genders={genders}
        jobPositions={jobPositions}
      />
    </Layout>
  );
};

export default EmployeeDetail;