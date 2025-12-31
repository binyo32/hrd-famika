import { useState, useEffect, useCallback } from 'react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '@/lib/employeeService';
import { useEmployeeFilters } from '@/hooks/useEmployeeFilters';
import { useEmployeeImportExport } from '@/hooks/useEmployeeImportExport';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export const useEmployeeManagement = (initialState, toast) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(initialState);
  
  const { 
    searchTerm, setSearchTerm, filterDivision, setFilterDivision, 
    filterStatus, setFilterStatus, filterJobPosition, setFilterJobPosition, 
    filterWorkLocation, setFilterWorkLocation, filterActiveStatus, setFilterActiveStatus,
    filterProject, setFilterProject, filteredEmployees, sortKey, sortOrder, handleSort
  } = useEmployeeFilters(employees);
  
  const loadAndSetEmployees = useCallback(async (key = sortKey, order = sortOrder === 'asc') => {
    setLoading(true);
    try {
      const data = await getEmployees(key, order);
      setEmployees(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data karyawan: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, sortKey, sortOrder]);
  
  const { handleExport, handleImport, generateExcelTemplate } = useEmployeeImportExport(toast, loadAndSetEmployees, addEmployee, employees, filteredEmployees);

  useEffect(() => {
    loadAndSetEmployees();
  }, [loadAndSetEmployees]);

  const handleSortAndReload = (key) => {
    handleSort(key);
    loadAndSetEmployees(key, sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc');
  };
  
  const resetForm = () => {
    setFormData(initialState);
    setEditingEmployee(null);
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingEmployee) {
        await updateEmployee({ ...editingEmployee, ...data }, user, editingEmployee);
        toast({ title: "Berhasil!", description: "Data karyawan berhasil diperbarui." });
      } else {
        await addEmployee(data, user);
        toast({ title: "Berhasil!", description: "Karyawan baru berhasil ditambahkan." });
      }
      setIsFormDialogOpen(false);
      loadAndSetEmployees();
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: `Gagal menyimpan data: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    const formattedEmployee = {
        ...employee,
        birthDate: employee.birthDate ? format(new Date(employee.birthDate), 'yyyy-MM-dd') : '',
        joinDate: employee.joinDate ? format(new Date(employee.joinDate), 'yyyy-MM-dd') : '',
        terminationDate: employee.terminationDate ? format(new Date(employee.terminationDate), 'yyyy-MM-dd') : null,
    };
    setFormData(formattedEmployee);
    setIsFormDialogOpen(true);
  };

  const handleDelete = async (id) => {
    const employeeToDelete = employees.find(e => e.id === id);
    if (!employeeToDelete) return;

    if (window.confirm(`Apakah Anda yakin ingin menghapus data karyawan ${employeeToDelete.name}?`)) {
      try {
        await deleteEmployee(id, user, employeeToDelete.name);
        toast({
          title: "Berhasil!",
          description: "Data karyawan berhasil dihapus",
        });
        loadAndSetEmployees();
      } catch (error) {
        toast({
          title: "Error",
          description: `Gagal menghapus data: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  return {
    employees,
    filteredEmployees,
    loading,
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
    setFormData,
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
    handleSort: handleSortAndReload,
  };
};