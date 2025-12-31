import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { getEmployees, updateEmployee } from '@/lib/employeeService';
import { Tree, TreeNode } from 'react-organizational-chart';
import { motion } from 'framer-motion';
import { Users, Briefcase, MapPin, Edit, Save, X, ChevronDown, ChevronRight, Building } from 'lucide-react';
import EmployeeFormDialog from '@/components/employee/EmployeeFormDialog';
import { statuses as allStatuses, genders as allGenders } from '@/lib/employeeConfig';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const OrgChartNode = ({ node, onNodeClick, onEditEmployee }) => {
  const isEmployee = !!node.nik;
  const bgColor = isEmployee ? 'bg-blue-500 dark:bg-blue-700' : 'bg-purple-500 dark:bg-purple-700';
  const textColor = 'text-white';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-3 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow min-w-[200px] ${bgColor} ${textColor}`}
      onClick={() => onNodeClick(node)}
    >
      <div className="flex items-center space-x-3">
        {isEmployee && (
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={node.photo} />
            <AvatarFallback className="bg-white text-blue-600">{node.name?.charAt(0) || 'K'}</AvatarFallback>
          </Avatar>
        )}
        {!isEmployee && (
          <div className="p-2 bg-white/20 rounded-full">
            <Building className="h-6 w-6" />
          </div>
        )}
        <div className="flex-1">
          <p className={`font-bold ${isEmployee ? 'text-base' : 'text-lg'}`}>{node.name}</p>
          {isEmployee && <p className="text-xs opacity-80">{node.position}</p>}
          {!isEmployee && <p className="text-xs opacity-80">{node.workLocation || 'Lokasi Tidak Diketahui'}</p>}
        </div>
        {isEmployee && (
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onEditEmployee(node);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

const AdminOrgChart = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const [divisions, setDivisions] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const navigate = useNavigate();

  const fetchAndProcessEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployees('name', true);
      setEmployees(data);
      processOrgData(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data karyawan: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchConfigData = useCallback(async () => {
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
  }, []);


  useEffect(() => {
    fetchAndProcessEmployees();
    fetchConfigData();
  }, [fetchAndProcessEmployees, fetchConfigData]);

  const processOrgData = (employeeData) => {
    if (!employeeData || employeeData.length === 0) {
      setOrgData({ name: 'Perusahaan', children: [] });
      return;
    }

    const locationsMap = new Map();

    employeeData.forEach(emp => {
      const location = emp.workLocation || 'Lainnya';
      if (!locationsMap.has(location)) {
        locationsMap.set(location, new Map());
      }
      const divisionsMap = locationsMap.get(location);
      
      const division = emp.division || 'Lainnya';
      if (!divisionsMap.has(division)) {
        divisionsMap.set(division, []);
      }
      divisionsMap.get(division).push(emp);
    });

    const companyNode = {
      name: 'PT. Famika Tunas Mandiri',
      isCompany: true,
      children: Array.from(locationsMap.entries()).map(([locationName, divisionsMap]) => ({
        name: locationName,
        isLocation: true,
        workLocation: locationName,
        children: Array.from(divisionsMap.entries()).map(([divisionName, emps]) => ({
          name: divisionName,
          isDivision: true,
          workLocation: locationName, 
          employeesCount: emps.length,
          children: emps.map(emp => ({ ...emp, isEmployee: true })),
        })),
      })),
    };
    setOrgData(companyNode);
  };
  
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (node.isDivision) {
      setExpandedDivisions(prev => ({
        ...prev,
        [`${node.workLocation}-${node.name}`]: !prev[`${node.workLocation}-${node.name}`]
      }));
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setIsFormDialogOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      await updateEmployee(formData, user, editingEmployee);
      toast({ title: "Sukses", description: "Data karyawan berhasil diperbarui." });
      setIsFormDialogOpen(false);
      setEditingEmployee(null);
      fetchAndProcessEmployees();
    } catch (error) {
      toast({
        title: "Error",
        description: `Gagal memperbarui karyawan: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const renderTree = (node) => {
    if (!node) return null;
    const nodeKey = node.isDivision ? `${node.workLocation}-${node.name}` : node.name;
    const isExpanded = node.isDivision ? !!expandedDivisions[nodeKey] : true;

    return (
      <TreeNode label={<OrgChartNode node={node} onNodeClick={handleNodeClick} onEditEmployee={handleEditEmployee} />}>
        {isExpanded && node.children && node.children.map((child, index) => (
          <React.Fragment key={index}>
            {renderTree(child)}
          </React.Fragment>
        ))}
      </TreeNode>
    );
  };


  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Struktur Organisasi
          </h1>
          <p className="text-muted-foreground">
            Visualisasi hierarki perusahaan, divisi, dan karyawan. Klik node untuk detail atau edit.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            className="md:col-span-2 overflow-x-auto p-4 glass-effect rounded-lg shadow-xl"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {orgData ? (
              <Tree
                lineWidth={'2px'}
                lineColor={'#a1a1aa'}
                lineBorderRadius={'10px'}
                label={<OrgChartNode node={orgData} onNodeClick={handleNodeClick} onEditEmployee={handleEditEmployee} />}
              >
                {orgData.children && orgData.children.map((locationNode, index) => (
                   <TreeNode key={`loc-${index}`} label={<OrgChartNode node={locationNode} onNodeClick={handleNodeClick} onEditEmployee={handleEditEmployee} />}>
                    {locationNode.children && locationNode.children.map((divisionNode, divIndex) => (
                       renderTree(divisionNode)
                    ))}
                  </TreeNode>
                ))}
              </Tree>
            ) : (
              <p className="text-center text-muted-foreground py-10">Tidak ada data untuk ditampilkan.</p>
            )}
          </motion.div>

          <motion.div 
            className="md:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-effect border-0 shadow-xl sticky top-6">
              <CardHeader>
                <CardTitle>Detail Node</CardTitle>
                <CardDescription>Informasi lebih lanjut tentang item yang dipilih.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {selectedNode ? (
                  <>
                    <h3 className="text-xl font-semibold text-primary">{selectedNode.name}</h3>
                    {selectedNode.isCompany && <p className="text-sm"><Building className="inline mr-2 h-4 w-4" />Entitas Perusahaan Utama</p>}
                    {selectedNode.isLocation && <p className="text-sm"><MapPin className="inline mr-2 h-4 w-4" />Lokasi Kerja: {selectedNode.workLocation}</p>}
                    {selectedNode.isDivision && (
                      <>
                        <p className="text-sm"><Briefcase className="inline mr-2 h-4 w-4" />Divisi di {selectedNode.workLocation}</p>
                        <p className="text-sm"><Users className="inline mr-2 h-4 w-4" />Jumlah Karyawan: {selectedNode.employeesCount}</p>
                        <Button onClick={() => handleNodeClick(selectedNode)} variant="outline" size="sm" className="mt-2">
                          {expandedDivisions[`${selectedNode.workLocation}-${selectedNode.name}`] ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                          {expandedDivisions[`${selectedNode.workLocation}-${selectedNode.name}`] ? 'Sembunyikan Karyawan' : 'Tampilkan Karyawan'}
                        </Button>
                      </>
                    )}
                    {selectedNode.isEmployee && (
                      <>
                        <p className="text-sm"><Briefcase className="inline mr-2 h-4 w-4" />Jabatan: {selectedNode.position}</p>
                        <p className="text-sm"><MapPin className="inline mr-2 h-4 w-4" />Lokasi: {selectedNode.workLocation}</p>
                        <p className="text-sm">NIK: {selectedNode.nik}</p>
                        <p className="text-sm">Email: {selectedNode.email || '-'}</p>
                        <p className="text-sm">Telepon: {selectedNode.phone || '-'}</p>
                        <div className="flex space-x-2 mt-3">
                          <Button onClick={() => handleEditEmployee(selectedNode)} size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600">
                            <Edit className="mr-2 h-4 w-4" /> Edit Karyawan
                          </Button>
                           <Button onClick={() => navigate(`/admin/employees/${selectedNode.id}`)} size="sm" variant="outline">
                            Lihat Detail Lengkap
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Pilih node dari struktur organisasi untuk melihat detailnya.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {editingEmployee && (
        <EmployeeFormDialog
          isOpen={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          onSubmit={handleFormSubmit}
          initialData={editingEmployee}
          editingEmployee={editingEmployee}
          divisions={divisions}
          statuses={allStatuses}
          genders={allGenders}
          jobPositions={jobPositions}
        />
      )}
    </Layout>
  );
};

export default AdminOrgChart;