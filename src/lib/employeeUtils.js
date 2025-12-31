import { parse, format, differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from 'date-fns';
import * as XLSX from 'xlsx';

export const parseExcelDate = (excelDate) => {
  if (!excelDate) return null;
  if (typeof excelDate === 'number') {
    const date = XLSX.SSF.parse_date_code(excelDate);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  if (typeof excelDate === 'string') {
    try {
      const parsedDate = parse(excelDate, 'dd/MM/yyyy', new Date());
      if (!isNaN(parsedDate)) return parsedDate;
    } catch (e) {
      // Lanjutkan
    }
    try {
      const parsedDateISO = parse(excelDate, 'yyyy-MM-dd', new Date());
      if (!isNaN(parsedDateISO)) return parsedDateISO;
    } catch (e) {
      // Lanjutkan
    }
    const date = new Date(excelDate);
    if (!isNaN(date)) return date;
  }
  return null;
};

export const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = parseExcelDate(birthDate); // Ensure date is parsed correctly
  if (!birth || isNaN(birth)) return null;
  return differenceInYears(new Date(), birth);
};

export const getAgeCategory = (age) => {
  if (age === null || age === undefined) return 'N/A';
  if (age < 30) return '< 30 Tahun';
  if (age >= 30 && age <= 58) return '30-58 Tahun';
  return '> 58 Tahun';
};

export const calculateWorkDuration = (joinDate) => {
  if (!joinDate) return { years: null, months: null, days: null };
  const start = parseExcelDate(joinDate);
  if (!start || isNaN(start)) return { years: null, months: null, days: null };

  const now = new Date();
  
  const years = differenceInYears(now, start);
  const dateAfterYears = addYears(start, years);
  
  const months = differenceInMonths(now, dateAfterYears);
  const dateAfterMonths = addMonths(dateAfterYears, months);
  
  const days = differenceInDays(now, dateAfterMonths);

  return { years, months, days };
};

export const getWorkDurationCategory = (workYears) => {
  if (workYears === null || workYears === undefined) return 'N/A';
  if (workYears < 5) return '< 5 Tahun';
  if (workYears <= 10) return '5-10 Tahun';
  return '> 10 Tahun';
};

export const mapEmployeeDataFromSupabase = (emp) => {
  if (!emp) return null;
  const age = calculateAge(emp.birth_date);
  const { years: workDurationYears, months: workDurationMonths, days: workDurationDays } = calculateWorkDuration(emp.join_date);

  return {
    id: emp.id,
    name: emp.name,
    birthDate: emp.birth_date ? format(parseExcelDate(emp.birth_date), 'yyyy-MM-dd') : null,
    nik: emp.nik,
    position: emp.position,
    division: emp.division,
    joinDate: emp.join_date ? format(parseExcelDate(emp.join_date), 'yyyy-MM-dd') : null,
    gender: emp.gender,
    address: emp.address,
    phone: emp.phone,
    email: emp.email,
    status: emp.status,
    photo: emp.photo,
    workLocation: emp.work_location,
    education: emp.education,
    area: emp.area,
    activeStatus: emp.active_status,
    terminationDate: emp.termination_date ? format(parseExcelDate(emp.termination_date), 'yyyy-MM-dd') : null,
    bpjsNumber: emp.bpjs_number,
    directManagerId: emp.direct_manager_id,
    directManager: emp.manager,
    project: emp.project,
    npwp: emp.npwp,
    ptkp_status: emp.ptkp_status,
    dependents_count: emp.dependents_count,
    createdAt: emp.created_at,
    updatedAt: emp.updated_at,
    age: age,
    ageCategory: getAgeCategory(age),
    workDurationYears: workDurationYears,
    workDurationMonths: workDurationMonths,
    workDurationDays: workDurationDays,
    workDurationCategory: getWorkDurationCategory(workDurationYears),
  };
};

export const mapEmployeeDataToSupabase = (employee) => {
  const { 
    birthDate, 
    joinDate, 
    workLocation, 
    education, 
    area, 
    activeStatus, 
    terminationDate, 
    bpjsNumber, 
    directManagerId,
    directManager,
    project,
    npwp,
    ptkp_status,
    dependents_count,
    age, 
    ageCategory,
    workDurationYears,
    workDurationMonths,
    workDurationDays,
    workDurationCategory,
    createdAt, 
    updatedAt,
    id,
    ...restOfEmployee 
  } = employee;

  const dataToSupabase = {
    ...restOfEmployee,
    birth_date: birthDate ? format(parseExcelDate(birthDate), 'yyyy-MM-dd') : null,
    join_date: joinDate ? format(parseExcelDate(joinDate), 'yyyy-MM-dd') : null,
    work_location: workLocation,
    education: education,
    area: area,
    active_status: activeStatus,
    termination_date: terminationDate ? format(parseExcelDate(terminationDate), 'yyyy-MM-dd') : null,
    bpjs_number: bpjsNumber,
    direct_manager_id: directManagerId,
    project: project,
    npwp: npwp,
    ptkp_status: ptkp_status,
    dependents_count: dependents_count,
    email: employee.email || null, 
  };
  
  Object.keys(dataToSupabase).forEach(key => {
    if (dataToSupabase[key] === undefined) {
      dataToSupabase[key] = null;
    }
  });
  
  return dataToSupabase;
};

export const generateExcelTemplateData = () => {
  const templateHeaders = [
    "STATUS KARYAWAN", "NIK", "NAMA", "ALAMAT", "NO HP", "JENIS KELAMIN", 
    "TGL LAHIR (DD/MM/YYYY)", "PENDIDIKAN", "TGL MULAI KERJA (DD/MM/YYYY)", 
    "LOKASI KERJA", "AREA", "JABATAN", "DIVISI", "STATUS AKTIF", 
    "TGL KELUAR (DD/MM/YYYY)", "BPJS", "EMAIL (Opsional)", "PASSWORD (Opsional)", "DIRECT MANAGER (NAMA ATAU NIK)",
    "NPWP (Opsional)", "STATUS PTKP (Opsional)", "JUMLAH TANGGUNGAN (Opsional)"
  ];
  
  const exampleRow = {
    "STATUS KARYAWAN": "Kontrak",
    "NIK": "1234567890123456",
    "NAMA": "Nama Contoh Karyawan",
    "ALAMAT": "Jl. Contoh No. 123",
    "NO HP": "081234567890",
    "JENIS KELAMIN": "Laki-laki",
    "TGL LAHIR (DD/MM/YYYY)": "15/01/1990",
    "PENDIDIKAN": "S1",
    "TGL MULAI KERJA (DD/MM/YYYY)": "01/06/2020",
    "LOKASI KERJA": "HEAD OFFICE",
    "AREA": "Jakarta",
    "JABATAN": "STAF",
    "DIVISI": "IT",
    "STATUS AKTIF": "Aktif",
    "TGL KELUAR (DD/MM/YYYY)": "",
    "BPJS": "0001234567890",
    "EMAIL (Opsional)": "karyawan.contoh@email.com",
    "PASSWORD (Opsional)": "",
    "DIRECT MANAGER (NAMA ATAU NIK)": "Nama Manager Contoh",
    "NPWP (Opsional)": "12.345.678.9-012.000",
    "STATUS PTKP (Opsional)": "K/1",
    "JUMLAH TANGGUNGAN (Opsional)": "1"
  };

  const wsData = [templateHeaders, Object.values(exampleRow)];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  
  const colWidths = templateHeaders.map(header => ({ wch: header.length + 5 }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "TemplateKaryawan");
  return workbook;
};

export const createExportData = (employees) => {
  return employees.map(emp => ({
    "STATUS KARYAWAN": emp.status,
    "NIK": emp.nik,
    "NAMA": emp.name,
    "ALAMAT": emp.address,
    "NO HP": emp.phone,
    "JENIS KELAMIN": emp.gender,
    "TGL LAHIR (DD/MM/YYYY)": emp.birthDate ? format(parseExcelDate(emp.birthDate), 'dd/MM/yyyy') : 'N/A',
    "PENDIDIKAN": emp.education,
    "TGL MULAI KERJA (DD/MM/YYYY)": emp.joinDate ? format(parseExcelDate(emp.joinDate), 'dd/MM/yyyy') : 'N/A',
    "LOKASI KERJA": emp.workLocation,
    "AREA": emp.area,
    "JABATAN": emp.position,
    "DIVISI": emp.division,
    "STATUS AKTIF": emp.activeStatus,
    "TGL KELUAR (DD/MM/YYYY)": emp.terminationDate ? format(parseExcelDate(emp.terminationDate), 'dd/MM/yyyy') : '',
    "BPJS": emp.bpjsNumber,
    "EMAIL": emp.email || '',
    "DIRECT MANAGER": emp.directManager ? emp.directManager.name : '',
    "NPWP (Opsional)": emp.npwp || '',
    "STATUS PTKP (Opsional)": emp.ptkp_status || '',
    "JUMLAH TANGGUNGAN (Opsional)": emp.dependents_count ?? ''
  }));
};