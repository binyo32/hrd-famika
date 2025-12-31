export const statuses = ['Tetap', 'Kontrak', 'Magang'];
export const activeStatuses = ['Aktif', 'Cuti', 'Resign', 'Tidak Aktif'];
export const genders = ['Laki-laki', 'Perempuan'];
export const workLocations = ['HEAD OFFICE', 'REGIONAL'];
export const educationLevels = ['SD', 'SMP', 'SMA/SMK', 'D1', 'D2', 'D3', 'S1', 'D4', 'S2', 'S3', 'Lainnya'];


export const initialFormData = {
  name: '',
  birthDate: '',
  nik: '',
  position: '',
  division: '',
  joinDate: '',
  gender: '',
  address: '',
  phone: '',
  email: '',
  status: '', // Status Karyawan (Tetap, Kontrak, Magang)
  photo: '',
  password: '',
  workLocation: '',
  education: '',
  area: '',
  active_status: 'Aktif', // Status Aktif (Aktif, Cuti, Resign)
  termination_date: null,
  bpjs_number: '',
  direct_manager_id: null,
  project: '',
  npwp: '',
  ptkp_status: '',
  dependents_count: ''
};