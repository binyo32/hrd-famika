import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { History, Search, User, SlidersHorizontal, Calendar, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const AdminActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    startDate: '',
    endDate: '',
  });
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const PAGE_SIZE = 20;

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('user_id, user_name')
        .order('user_name');
      if (error) throw error;
      if (data) {
        const uniqueUsers = Array.from(new Map(data.filter(item => item.user_id).map(item => [item.user_id, item])).values());
        setUsers(uniqueUsers);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat daftar pengguna.', variant: 'destructive' });
    }
  }, []);

  const fetchLogs = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,target_type.ilike.%${searchTerm}%,target_name.ilike.%${searchTerm}%,user_name.ilike.%${searchTerm}%`);
      }
      if (filters.user) query = query.eq('user_id', filters.user);
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', new Date(filters.endDate).toISOString().replace('T00:00:00.000Z', 'T23:59:59.999Z'));

      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      
      setLogs(prev => pageNum === 1 ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);

    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat log aktivitas: ' + error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  useEffect(() => {
    fetchLogs(1);
  }, [searchTerm, filters, fetchLogs]);

  const handleFilterChange = (key, value) => {
    const finalValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: finalValue }));
    setPage(1);
    setLogs([]);
  };
  
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({ user: '', action: '', startDate: '', endDate: '' });
    setPage(1);
    setLogs([]);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage);
  };
  
  const actionTypes = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE'];
  
  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Log Aktivitas Admin
          </h1>
          <p className="text-muted-foreground">
            Lacak semua tindakan penting yang dilakukan di dalam sistem.
          </p>
        </motion.div>

        <Card className="glass-effect border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><SlidersHorizontal className="mr-2"/> Filter & Pencarian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan aksi, target, atau nama pengguna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select value={filters.user || 'all'} onValueChange={value => handleFilterChange('user', value)}>
                <SelectTrigger><SelectValue placeholder="Semua Pengguna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pengguna</SelectItem>
                  {users.map(u => u.user_id && <SelectItem key={u.user_id} value={u.user_id}>{u.user_name || 'Tanpa Nama'}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.action || 'all'} onValueChange={value => handleFilterChange('action', value)}>
                <SelectTrigger><SelectValue placeholder="Semua Aksi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aksi</SelectItem>
                  {actionTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
              <Input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
              <Button onClick={handleResetFilters} variant="outline">Reset</Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><History className="mr-2"/> Daftar Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Pengguna</TableHead>
                        <TableHead>Aksi</TableHead>
                        <TableHead>Target</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && logs.length === 0 ? (
                        <TableRow><TableCell colSpan="4" className="text-center h-24">Memuat...</TableCell></TableRow>
                      ) : logs.length === 0 ? (
                        <TableRow><TableCell colSpan="4" className="text-center h-24">Tidak ada log yang cocok.</TableCell></TableRow>
                      ) : (
                        logs.map(log => (
                          <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="text-xs">{new Date(log.created_at).toLocaleString('id-ID')}</TableCell>
                            <TableCell>{log.user_name || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={log.action === 'DELETE' ? 'destructive' : 'secondary'}>{log.action}</Badge>
                            </TableCell>
                            <TableCell>{log.target_type ? `${log.target_type}: ${log.target_name || log.target_id}` : '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {hasMore && !loading && (
                    <div className="text-center mt-4">
                        <Button onClick={loadMore} variant="outline">Muat Lebih Banyak</Button>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
             <Card className="glass-effect border-0 shadow-lg sticky top-24">
                <CardHeader>
                    <CardTitle className="flex items-center"><Info className="mr-2" /> Detail Log</CardTitle>
                    <CardDescription>Informasi rinci dari log yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[300px] max-h-[60vh] overflow-y-auto">
                    {selectedLog ? (
                        <div className="space-y-4 text-sm">
                            <div><p className="font-semibold">ID Log:</p><p className="text-muted-foreground break-all">{selectedLog.id}</p></div>
                            <div><p className="font-semibold">Waktu:</p><p className="text-muted-foreground">{new Date(selectedLog.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' })}</p></div>
                            <div><p className="font-semibold">Pengguna:</p><p className="text-muted-foreground">{selectedLog.user_name} ({selectedLog.user_role})</p></div>
                            <div><p className="font-semibold">Aksi:</p><p className="text-muted-foreground">{selectedLog.action}</p></div>
                            {selectedLog.target_type && <div><p className="font-semibold">Tipe Target:</p><p className="text-muted-foreground">{selectedLog.target_type}</p></div>}
                            {selectedLog.target_name && <div><p className="font-semibold">Nama Target:</p><p className="text-muted-foreground">{selectedLog.target_name}</p></div>}
                            {selectedLog.target_id && <div><p className="font-semibold">ID Target:</p><p className="text-muted-foreground break-all">{selectedLog.target_id}</p></div>}
                            {selectedLog.details && (
                                <div>
                                    <p className="font-semibold">Detail Tambahan:</p>
                                    <pre className="mt-1 p-2 bg-muted/50 rounded-md whitespace-pre-wrap break-all">
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Pilih log dari tabel untuk melihat detail.</p>
                        </div>
                    )}
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminActivityLog;