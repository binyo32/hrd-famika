import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

const AttendanceFilterBar = ({
  filterDate,
  setFilterDate,
  filterEmployee,
  setFilterEmployee,
  searchTerm,
  setSearchTerm,
  employees,
  onClearFilters
}) => (
  <div className="flex flex-col md:flex-row gap-4 mb-4 ">
    <div className="flex-1">
      <Label htmlFor="filterDate">Tanggal</Label>
      <Input id="filterDate" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
    </div>
    <div className="flex-1">
      <Label htmlFor="filterEmployeeRecap">Karyawan (Opsional)</Label>
      <Select value={filterEmployee || "ALL_EMPLOYEES_PLACEHOLDER"} onValueChange={(value) => setFilterEmployee(value === "ALL_EMPLOYEES_PLACEHOLDER" ? "" : value)}>
        <SelectTrigger id="filterEmployeeRecap"><SelectValue placeholder="Semua Karyawan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL_EMPLOYEES_PLACEHOLDER">Semua Karyawan</SelectItem>
          {(employees || []).filter(emp => emp && emp.id).map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.nik})</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="relative flex-1">
      <Label htmlFor="searchTermRecap">Cari Karyawan (Nama/NIK)</Label>
      <Input
        id="searchTermRecap"
        placeholder="Ketik untuk mencari..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10"
      />
      <Search className="absolute left-3 top-11 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
    </div>
    {typeof onClearFilters === 'function' && (
       <Button onClick={onClearFilters} variant="outline">Reset Filter</Button>
    )}
  </div>
);

export default AttendanceFilterBar;