import { useState } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { parseExcelDate, generateExcelTemplateData, createExportData } from '@/lib/employeeUtils';

export const useEmployeeImportExport = (toast, loadAndSetEmployees, addEmployee, employees, filteredEmployees) => {
  const [loadingImport, setLoadingImport] = useState(false);

  const handleExport = () => {
    if (filteredEmployees.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data karyawan untuk diexport.",
        variant: "destructive"
      });
      return;
    }
    const dataToExport = createExportData(filteredEmployees);
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Karyawan");
    XLSX.writeFile(workbook, "DataKaryawan_Export.xlsx");
    toast({ title: "Berhasil!", description: "Data karyawan diexport ke Excel." });
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoadingImport(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

          if(jsonData.length === 0) {
            toast({ title: "File Kosong", description: "File Excel yang diimport tidak berisi data.", variant: "warning" });
            setLoadingImport(false);
            if (event.target) event.target.value = null;
            return;
          }
          
          const excelFieldToSupabaseField = {
            "STATUS KARYAWAN": "status",
            "NIK": "nik",
            "NAMA": "name",
            "ALAMAT": "address",
            "NO HP": "phone",
            "JENIS KELAMIN": "gender",
            "TGL LAHIR (DD/MM/YYYY)": "birthDate",
            "PENDIDIKAN": "education",
            "TGL MULAI KERJA (DD/MM/YYYY)": "joinDate",
            "LOKASI KERJA": "workLocation",
            "AREA": "area",
            "JABATAN": "position",
            "DIVISI": "division",
            "STATUS AKTIF": "activeStatus",
            "TGL KELUAR (DD/MM/YYYY)": "terminationDate",
            "BPJS": "bpjsNumber",
            "EMAIL (Opsional)": "email",
            "PASSWORD (Opsional)": "password",
            "DIRECT MANAGER (NAMA ATAU NIK)": "direct_manager_id",
            "NPWP (Opsional)": "npwp",
            "STATUS PTKP (Opsional)": "ptkp_status",
            "JUMLAH TANGGUNGAN (Opsional)": "dependents_count"
          };

          const requiredExcelFields = [
            "NIK", "NAMA", "JABATAN", "DIVISI", "STATUS KARYAWAN", 
            "TGL MULAI KERJA (DD/MM/YYYY)", "TGL LAHIR (DD/MM/YYYY)", 
            "JENIS KELAMIN", "ALAMAT"
          ];

          let employeesToImport = [];
          for (const [index, row] of jsonData.entries()) {
            const newEmployee = {};
            let missingFields = [];

            for (const excelField of requiredExcelFields) {
              if (!row[excelField] || String(row[excelField]).trim() === '') {
                missingFields.push(excelField);
              }
            }
            
            if (missingFields.length > 0) {
              toast({ title: "Data Tidak Lengkap", description: `Baris ${index + 2} kekurangan field wajib: ${missingFields.join(', ')}. Import dibatalkan.`, variant: "destructive" });
              setLoadingImport(false);
              if (event.target) event.target.value = null;
              return;
            }

            for (const excelField in excelFieldToSupabaseField) {
              const supabaseField = excelFieldToSupabaseField[excelField];
              const cellValue = row[excelField];

              if (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
                if (supabaseField === 'birthDate' || supabaseField === 'joinDate' || supabaseField === 'terminationDate') {
                  const parsedDate = parseExcelDate(cellValue);
                  if (parsedDate && !isNaN(parsedDate)) {
                    newEmployee[supabaseField] = format(parsedDate, 'yyyy-MM-dd');
                  } else {
                     toast({ title: "Format Tanggal Salah", description: `Format tanggal untuk '${excelField}' pada baris ${index + 2} (${cellValue}) tidak valid. Gunakan DD/MM/YYYY. Import dibatalkan.`, variant: "destructive" });
                     setLoadingImport(false);
                     if (event.target) event.target.value = null;
                     return;
                  }
                } else if (supabaseField === 'direct_manager_id') {
                  const managerIdentifier = String(cellValue).trim();
                  const manager = employees.find(emp => 
                    emp.name.toLowerCase() === managerIdentifier.toLowerCase() || 
                    emp.nik === managerIdentifier
                  );
                  if (manager) {
                    newEmployee[supabaseField] = manager.id;
                  } else {
                    toast({ title: "Manager Tidak Ditemukan", description: `Direct Manager '${managerIdentifier}' pada baris ${index + 2} tidak ditemukan di sistem. Kolom ini akan dikosongkan.`, variant: "warning" });
                    newEmployee[supabaseField] = null;
                  }
                } else if (supabaseField === 'dependents_count') {
                    const numValue = parseInt(cellValue, 10);
                    newEmployee[supabaseField] = isNaN(numValue) ? null : numValue;
                }
                else {
                  newEmployee[supabaseField] = String(cellValue).trim();
                }
              } else if (["email", "password", "terminationDate", "education", "phone", "bpjsNumber", "area", "direct_manager_id", "npwp", "ptkp_status", "dependents_count"].includes(supabaseField)) {
                 newEmployee[supabaseField] = null; 
              }
            }
            
            if (!newEmployee.password) {
              newEmployee.password = 'karyawan123';
            }
            employeesToImport.push(newEmployee);
          }
          
          let successCount = 0;
          let errorCount = 0;
          let errors = [];

          for (const employee of employeesToImport) {
            try {
              const existingByNik = employees.find(emp => emp.nik === employee.nik);
              const existingByEmail = employee.email ? employees.find(emp => emp.email && emp.email.toLowerCase() === employee.email.toLowerCase()) : null;

              if (existingByNik) {
                errors.push(`Karyawan ${employee.name} (NIK: ${employee.nik}) sudah ada.`);
                errorCount++;
                continue;
              }
              if (existingByEmail) {
                 errors.push(`Karyawan ${employee.name} (Email: ${employee.email}) sudah ada.`);
                 errorCount++;
                 continue;
              }
              await addEmployee(employee);
              successCount++;
            } catch (err) {
              errors.push(`Gagal import ${employee.name}: ${err.message}`);
              errorCount++;
            }
          }
          
          if (successCount > 0) {
            toast({ title: "Import Selesai", description: `${successCount} karyawan berhasil diimport.` });
          }
          if (errorCount > 0) {
            toast({ 
              title: "Beberapa Import Gagal", 
              description: `${errorCount} karyawan gagal diimport. ${errors.slice(0,2).join('; ')}`, 
              variant: "warning",
              duration: 7000 
            });
          }
          if(successCount === 0 && errorCount === 0 && jsonData.length > 0){
             toast({ title: "Tidak Ada Karyawan Baru", description: "Semua karyawan dalam file sudah ada di sistem atau tidak ada data baru untuk diimport.", variant: "info" });
          }

          loadAndSetEmployees();
        } catch (error) {
          toast({
            title: "Error Import",
            description: "Terjadi kesalahan saat mengimport data: " + error.message,
            variant: "destructive",
          });
        } finally {
          setLoadingImport(false);
          if (event.target) event.target.value = null;
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const generateExcelTemplate = () => {
    const workbook = generateExcelTemplateData();
    XLSX.writeFile(workbook, "TemplateImportKaryawan.xlsx");
    toast({ title: "Template Dibuat!", description: "Template Excel berhasil diunduh." });
  };

  return {
    loadingImport,
    handleImport,
    handleExport,
    generateExcelTemplate,
  };
};