import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Columns } from 'lucide-react';

const columnConfig = [
  { key: 'age', label: 'Usia' },
  { key: 'position', label: 'Jabatan' },
  { key: 'division', label: 'Divisi' },
  { key: 'workDurationYears', label: 'Masa Kerja' },
  { key: 'status', label: 'Status Karyawan' },
  { key: 'activeStatus', label: 'Status Aktif' },
  { key: 'contact', label: 'Kontak' },
];

const ColumnSelector = ({ visibleColumns, setVisibleColumns }) => {
  const handleCheckedChange = (key, checked) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: checked,
    }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="space-x-2">
          <Columns className="h-4 w-4" />
          <span>Tampilan Kolom</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Pilih Kolom</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columnConfig.map(col => (
          <DropdownMenuCheckboxItem
            key={col.key}
            checked={visibleColumns[col.key]}
            onCheckedChange={(checked) => handleCheckedChange(col.key, checked)}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnSelector;