import { useState } from 'react';
import { format } from 'date-fns';

export const useEmployeeForm = (initialFormData, toast, loadAndSetEmployees, addEmployee, updateEmployee) => {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingEmployee(null);
  };

  const handleFormSubmit = async (data) => {
    setLoadingSubmit(true);
    try {
      if (editingEmployee) {
        await updateEmployee({ ...editingEmployee, ...data });
        toast({ title: "Berhasil!", description: "Data karyawan berhasil diperbarui." });
      } else {
        await addEmployee(data);
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
    } finally {
      setLoadingSubmit(false);
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

  return {
    isFormDialogOpen,
    setIsFormDialogOpen,
    editingEmployee,
    formData,
    loadingSubmit,
    handleFormSubmit,
    handleEdit,
    resetForm,
  };
};