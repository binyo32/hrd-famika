import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, CheckCircle, XCircle, Printer } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { generateLeaveRequestPdf } from '@/lib/pdfGenerator';
import { format } from 'date-fns';

const LeaveRequestsTab = ({ 
  leaveRequests, 
  loading, 
  onOpenDirectRequestDialog, 
  onUpdateRequestStatus 
}) => {

  const handlePrintLeaveRequest = async (request) => {
    try {
      await generateLeaveRequestPdf(request);
      toast({ title: "Sukses", description: "Surat cuti PDF berhasil dibuat." });
    } catch (error) {
      toast({ title: "Error Membuat PDF", description: error.message || "Gagal membuat surat cuti PDF.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Pengajuan Cuti</CardTitle>
        <CardDescription>Tinjau dan kelola pengajuan cuti dari karyawan.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onOpenDirectRequestDialog} className="mb-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
          <UserPlus className="mr-2 h-4 w-4" /> Buat Pengajuan Langsung
        </Button>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Cuti</TableHead>
                <TableHead>Nama Karyawan</TableHead>
                <TableHead>Jenis Cuti</TableHead>
                <TableHead>Tanggal Cuti</TableHead>
                <TableHead>Tanggal Dibuat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading.requests ? (
                <TableRow><TableCell colSpan="7" className="text-center">Memuat...</TableCell></TableRow>
              ) : leaveRequests.length === 0 ? (
                <TableRow><TableCell colSpan="7" className="text-center">Tidak ada pengajuan cuti.</TableCell></TableRow>
              ) : leaveRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.leave_request_number || '-'}</TableCell>
                  <TableCell>{req.employees?.name || 'N/A'}</TableCell>
                  <TableCell>{req.leave_types?.name || 'N/A'}</TableCell>
                  <TableCell>{new Date(req.start_date).toLocaleDateString('id-ID')} - {new Date(req.end_date).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{req.requested_at ? format(new Date(req.requested_at), 'dd MMM yyyy, HH:mm') : '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                        req.status === 'Disetujui' ? 'bg-green-100 text-green-700' :
                        req.status === 'Ditolak' ? 'bg-red-100 text-red-700' :
                        req.status === 'Dibatalkan' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                    }`}>
                        {req.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    {req.status === 'Menunggu Persetujuan' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => onUpdateRequestStatus(req.id, 'Disetujui', req.employee_id, req.start_date, req.end_date, req.leave_type_id)} className="hover:text-green-500" title="Setujui">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onUpdateRequestStatus(req.id, 'Ditolak')} className="hover:text-red-500" title="Tolak">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {req.status === 'Disetujui' && (
                        <Button variant="ghost" size="icon" onClick={() => onUpdateRequestStatus(req.id, 'Dibatalkan', req.employee_id, req.start_date, req.end_date, req.leave_type_id)} className="hover:text-yellow-600 mr-1" title="Batalkan Cuti">
                          <XCircle className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handlePrintLeaveRequest(req)} className="hover:text-blue-500" title="Cetak Surat Cuti">
                        <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaveRequestsTab;