import React from 'react';
import { Edit, CalendarDays, Users, FileText } from 'lucide-react';

const LeaveManagementTabs = ({ currentTab, setCurrentTab }) => {
  const tabItems = [
    { id: 'requests', label: 'Pengajuan Cuti', icon: CalendarDays, disabled: false },
    { id: 'types', label: 'Jenis Cuti', icon: Edit, disabled: false },
    { id: 'quotas', label: 'Kuota Karyawan', icon: Users, disabled: false },
    { id: 'calendar', label: 'Kalender Cuti', icon: CalendarDays, disabled: true },
    { id: 'reports', label: 'Laporan Cuti', icon: FileText, disabled: true },
  ];

  return (
    <div className="flex border-b mb-6 overflow-x-auto">
      {tabItems.map(tab => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && setCurrentTab(tab.id)}
          disabled={tab.disabled}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium focus:outline-none whitespace-nowrap
            ${currentTab === tab.id 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-muted-foreground hover:text-foreground'}
            ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <tab.icon className="h-5 w-5" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default LeaveManagementTabs;