import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, Users, Plus, ArrowUpDown, Briefcase, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const getStatusColor = (status) => {
  switch (status) {
    case 'Tetap': return 'bg-green-500';
    case 'Kontrak': return 'bg-blue-500';
    case 'Magang': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

const getActiveStatusColor = (activeStatus) => {
  switch (activeStatus) {
    case 'Aktif': return 'bg-emerald-500';
    case 'Cuti': return 'bg-yellow-500';
    case 'Resign': return 'bg-red-500';
    case 'Tidak Aktif': return 'bg-slate-500';
    default: return 'bg-gray-500';
  }
};

const SortableHeader = ({ label, columnKey, currentSortKey, currentSortOrder, onSort }) => {
  const isActive = currentSortKey === columnKey;
  const iconRotation = isActive && currentSortOrder === 'desc' ? 'rotate-180' : 'rotate-0';
  return (
    <TableHead onClick={() => onSort(columnKey)} className="cursor-pointer hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {isActive && <ArrowUpDown className={`h-4 w-4 transform ${iconRotation}`} />}
        {!isActive && <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />}
      </div>
    </TableHead>
  );
};


const EmployeeTable = ({ 
  employees, 
  totalEmployees,
  filteredCount,
  currentPage,
  setCurrentPage,
  pageSize,
  onEdit, 
  onDelete, 
  onView, 
  onAddEmployeeClick,
  onSort,
  sortKey,
  sortOrder,
  visibleColumns
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="glass-effect border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Data Karyawan</span>
            </div>
            <Badge variant="outline" className="text-sm">
              {employees.length} dari {totalEmployees} karyawan
            </Badge>
          </CardTitle>
        </CardHeader> 
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum ada data karyawan</h3>
              <p className="text-muted-foreground mb-4">
                {totalEmployees === 0 
                  ? 'Mulai dengan menambahkan karyawan pertama'
                  : 'Tidak ada karyawan yang sesuai dengan filter atau pencarian Anda.'
                }
              </p>
              {totalEmployees === 0 && (
                <Button 
                  onClick={onAddEmployeeClick}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Karyawan Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Karyawan" columnKey="name" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={onSort} />
                    {visibleColumns.age && <SortableHeader label="Usia" columnKey="age" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={onSort} />}
                    {visibleColumns.position && <SortableHeader label="Jabatan" columnKey="position" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={onSort} />}
                    {visibleColumns.division && <SortableHeader label="Divisi" columnKey="division" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={onSort} />}
                    {visibleColumns.workDurationYears && <SortableHeader label="Masa Kerja" columnKey="workDurationYears" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={onSort} />}
                    {visibleColumns.status && <SortableHeader label="Status Karyawan" columnKey="status" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={onSort} />}
                    {visibleColumns.activeStatus && <SortableHeader label="Status Aktif" columnKey="activeStatus" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={onSort} />}
                    {visibleColumns.contact && <TableHead>Kontak</TableHead>}
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee, index) => (
                    <motion.tr
                      key={employee.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-white/50 dark:hover:bg-white/5"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={employee.photo} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                              {employee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">{employee.gender}</p>
                          </div>
                        </div>
                      </TableCell>
                      {visibleColumns.age && <TableCell>{employee.age !== null ? `${employee.age} tahun` : 'N/A'}</TableCell>}
                      {visibleColumns.position && <TableCell>{employee.position}</TableCell>}
                      {visibleColumns.division && <TableCell><Badge variant="outline">{employee.division}</Badge></TableCell>}
                      {visibleColumns.workDurationYears && <TableCell>{employee.workDurationYears !== null ? `${employee.workDurationYears} thn, ${employee.workDurationMonths} bln, ${employee.workDurationDays} hr` : 'N/A'}</TableCell>}
                      {visibleColumns.status && <TableCell><Badge className={`${getStatusColor(employee.status)} text-white`}>{employee.status}</Badge></TableCell>}
                      {visibleColumns.activeStatus && <TableCell><Badge className={`${getActiveStatusColor(employee.activeStatus)} text-white`}><Activity className="h-3 w-3 mr-1" />{employee.activeStatus || 'N/A'}</Badge></TableCell>}
                      {visibleColumns.contact && <TableCell><div className="text-sm"><p>{employee.email || '-'}</p><p className="text-muted-foreground">{employee.phone || '-'}</p></div></TableCell>}
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onView(employee.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onDelete(employee.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
  <div className="text-sm text-muted-foreground">
    Halaman {currentPage} dari {Math.ceil(filteredCount / pageSize)}
  </div>

  <div className="flex space-x-2">
    <Button 
      variant="outline"
      disabled={currentPage === 1}
      onClick={() => setCurrentPage(prev => prev - 1)}
    >
      Prev
    </Button>

    <Button 
      variant="outline"
      disabled={currentPage >= Math.ceil(filteredCount / pageSize)}
      onClick={() => setCurrentPage(prev => prev + 1)}
    >
      Next
    </Button>
  </div>
</div>

            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EmployeeTable;