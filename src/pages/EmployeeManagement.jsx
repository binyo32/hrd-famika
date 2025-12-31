import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Plus, Search, Filter, Download, Upload, FileText, Columns, ChevronDown, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EmployeeFormDialog from '@/components/employee/EmployeeFormDialog';
import EmployeeTable from '@/components/employee/EmployeeTable';
import { useEmployeeManagement } from '@/hooks/useEmployeeManagement';
import { statuses, genders, initialFormData, workLocations, activeStatuses } from '@/lib/employeeConfig';
import ColumnSelector from '@/components/employee/ColumnSelector';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabaseClient';

const EmployeeManagementHeader = ({ onImportClick, onExportClick, onAddEmployeeClick, onDownloadTemplateClick, visibleColumns, setVisibleColumns, onGoToSettings }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0"
  >
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Manajemen Karyawan
      </h1>
      <p className="text-muted-foreground">
        Kelola data karyawan dengan mudah dan efisien
      </p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={onGoToSettings}>
        <Settings className="mr-2 h-4 w-4" />
        <span>Pengaturan</span>
      </Button>
      <ColumnSelector visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns} />
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onImportClick}
        className="hidden"
        id="import-file"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 space-x-2">
            <span>Kelola Karyawan</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onAddEmployeeClick}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Tambah Karyawan</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => document.getElementById('import-file').click()}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Import dari Excel</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportClick}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export ke Excel</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownloadTemplateClick}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Download Template</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </motion.div>
);

const EmployeeFilterControls = ({ searchTerm, setSearchTerm, filterDivision, setFilterDivision, filterStatus, setFilterStatus, filterJobPosition, setFilterJobPosition, filterWorkLocation, setFilterWorkLocation, filterActiveStatus, setFilterActiveStatus, filterProject, setFilterProject, divisions, jobPositions, projects }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
  >
    <Card className="glass-effect border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Filter & Pencarian</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
          <div className="relative md:col-span-2 lg:col-span-3 xl:col-span-1">
            <Label htmlFor="search-employee">Pencarian Umum</Label>
            <Search className="absolute left-3 top-9 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-employee"
              placeholder="Nama, NIK, email, proyek..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div>
            <Label htmlFor="filter-division">Divisi</Label>
            <EmployeeFormDialog.FilterSelect
              value={filterDivision}
              onValueChange={setFilterDivision}
              placeholder="Semua Divisi"
              options={divisions}
              allValue="all"
            />
          </div>
          <div>
            <Label htmlFor="filter-job">Jabatan</Label>
            <EmployeeFormDialog.FilterSelect
              value={filterJobPosition}
              onValueChange={setFilterJobPosition}
              placeholder="Semua Jabatan"
              options={jobPositions}
              allValue="all"
            />
          </div>
           <div>
            <Label htmlFor="filter-location">Lokasi Kerja</Label>
            <EmployeeFormDialog.FilterSelect
              value={filterWorkLocation}
              onValueChange={setFilterWorkLocation}
              placeholder="Semua Lokasi"
              options={workLocations}
              allValue="all"
            />
          </div>
          <div>
            <Label htmlFor="filter-status">Status Karyawan</Label>
            <EmployeeFormDialog.FilterSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              placeholder="Semua Status"
              options={statuses}
              allValue="all"
            />
          </div>
           <div>
            <Label htmlFor="filter-active-status">Status Aktif</Label>
            <EmployeeFormDialog.FilterSelect
              value={filterActiveStatus}
              onValueChange={setFilterActiveStatus}
              placeholder="Semua Status Aktif"
              options={activeStatuses}
              allValue="all"
            />
          </div>
          <div>
            <Label htmlFor="filter-project">Proyek</Label>
            <EmployeeFormDialog.FilterSelect
              value={filterProject}
              onValueChange={setFilterProject}
              placeholder="Semua Proyek"
              options={projects}
              allValue="all"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setFilterDivision('all');
              setFilterStatus('all');
              setFilterJobPosition('all');
              setFilterWorkLocation('all');
              setFilterActiveStatus('all');
              setFilterProject('all');
            }}
            className="self-end"
          >
            Reset Filter
          </Button>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);


const EmployeeManagement = () => {
  const navigate = useNavigate();
  const {
    employees,
    filteredEmployees,
    searchTerm,
    setSearchTerm,
    filterDivision,
    setFilterDivision,
    filterStatus,
    setFilterStatus,
    filterJobPosition,
    setFilterJobPosition,
    filterWorkLocation,
    setFilterWorkLocation,
    filterActiveStatus,
    setFilterActiveStatus,
    filterProject,
    setFilterProject,
    isFormDialogOpen,
    setIsFormDialogOpen,
    editingEmployee,
    formData,
    loading,
    loadAndSetEmployees,
    handleFormSubmit,
    handleEdit,
    handleDelete,
    handleExport,
    handleImport,
    generateExcelTemplate,
    resetForm,
    sortKey,
    sortOrder,
    handleSort,
  } = useEmployeeManagement(initialFormData, toast);

  const [divisions, setDivisions] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [projects, setProjects] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
const pageSize = 10; // jumlah karyawan per halaman

const paginatedEmployees = React.useMemo(() => {
  const start = (currentPage - 1) * pageSize;
  return filteredEmployees.slice(start, start + pageSize);
}, [filteredEmployees, currentPage]);

useEffect(() => {
  setCurrentPage(1);
}, [
  searchTerm,
  filterDivision,
  filterStatus,
  filterJobPosition,
  filterWorkLocation,
  filterActiveStatus,
  filterProject
]);

  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        const { data: divisionsData, error: divisionsError } = await supabase.from('divisions').select('name').order('name');
        if (divisionsError) throw divisionsError;
        setDivisions(divisionsData.map(d => d.name));

        const { data: positionsData, error: positionsError } = await supabase.from('job_positions').select('name').order('name');
        if (positionsError) throw positionsError;
        setJobPositions(positionsData.map(p => p.name));

        const { data: projectData, error: projectError } = await supabase.from('employees').select('project').not('project', 'is', null);
        if (projectError) throw projectError;
        setProjects([...new Set(projectData.map(p => p.project).filter(Boolean))]);

      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal memuat data divisi/jabatan/proyek: " + error.message,
          variant: "destructive",
        });
      }
    };
    fetchConfigData();
  }, [employees]);

  const [visibleColumns, setVisibleColumns] = React.useState(() => {
    try {
      const saved = localStorage.getItem('visibleEmployeeColumns');
      const initialValue = saved ? JSON.parse(saved) : {
        age: true,
        position: true,
        division: true,
        workDurationYears: true,
        status: true,
        activeStatus: true,
        contact: true,
      };
      return initialValue;
    } catch (error) {
      console.error("Failed to parse visible columns from localStorage", error);
      return {
        age: true,
        position: true,
        division: true,
        workDurationYears: true,
        status: true,
        activeStatus: true,
        contact: true,
      };
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('visibleEmployeeColumns', JSON.stringify(visibleColumns));
    } catch (error) {
      console.error("Failed to save visible columns to localStorage", error);
    }
  }, [visibleColumns]);

  const openAddForm = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  

  return (
    <Layout>
      <div className="space-y-8">
        <EmployeeManagementHeader
          onImportClick={handleImport}
          onExportClick={handleExport}
          onAddEmployeeClick={openAddForm}
          onDownloadTemplateClick={generateExcelTemplate}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          onGoToSettings={() => navigate('/admin/settings')}
        />

        <EmployeeFilterControls
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterDivision={filterDivision}
          setFilterDivision={setFilterDivision}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterJobPosition={filterJobPosition}
          setFilterJobPosition={setFilterJobPosition}
          filterWorkLocation={filterWorkLocation}
          setFilterWorkLocation={setFilterWorkLocation}
          filterActiveStatus={filterActiveStatus}
          setFilterActiveStatus={setFilterActiveStatus}
          filterProject={filterProject}
          setFilterProject={setFilterProject}
          divisions={divisions}
          jobPositions={jobPositions}
          projects={projects}
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          </div>
        ) : (
          <EmployeeTable
           employees={paginatedEmployees}
filteredCount={filteredEmployees.length}
currentPage={currentPage}
setCurrentPage={setCurrentPage}
pageSize={pageSize}

            totalEmployees={employees.length}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={(id) => navigate(`/admin/employees/${id}`)}
            onAddEmployeeClick={openAddForm}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
            visibleColumns={visibleColumns}
          />
        )}

        <EmployeeFormDialog
          isOpen={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          onSubmit={handleFormSubmit}
          initialData={formData}
          editingEmployee={editingEmployee}
          divisions={divisions}
          statuses={statuses}
          genders={genders}
          jobPositions={jobPositions}
        />
      </div>
    </Layout>
  );
};

export default EmployeeManagement;