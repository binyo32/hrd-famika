import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import SettingsManagementTab from '@/components/admin/settings/SettingsManagementTab';
import SettingsFormDialog from '@/components/admin/settings/SettingsFormDialog';
import { useAuth } from '@/contexts/AuthContext';
import { addLog } from '@/lib/activityLogService';

const AdminSettings = () => {
  const { user } = useAuth();
  const [divisions, setDivisions] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [loading, setLoading] = useState({ divisions: false, jobPositions: false, submit: false });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemType, setItemType] = useState(''); // 'Divisi' or 'Jabatan'

  const fetchData = useCallback(async (tableName, setData, loadingKey) => {
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const { data, error } = await supabase.from(tableName).select('*').order('name');
      if (error) throw error;
      setData(data);
    } catch (error) {
      toast({ title: "Error", description: `Gagal memuat data ${loadingKey}: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, []);

  useEffect(() => {
    fetchData('divisions', setDivisions, 'divisions');
    fetchData('job_positions', setJobPositions, 'jobPositions');
  }, [fetchData]);

  const handleOpenDialog = (item = null, type) => {
    setEditingItem(item);
    setItemType(type);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setLoading(prev => ({ ...prev, submit: true }));
    const tableName = itemType === 'Divisi' ? 'divisions' : 'job_positions';
    const logType = itemType === 'Divisi' ? 'DIVISION' : 'JOB_POSITION';
    const setData = itemType === 'Divisi' ? setDivisions : setJobPositions;
    const loadingKey = itemType === 'Divisi' ? 'divisions' : 'jobPositions';

    try {
      let response;
      let logAction = formData.id ? 'UPDATE' : 'CREATE';
      if (formData.id) { // Editing
        response = await supabase.from(tableName).update({ name: formData.name }).eq('id', formData.id).select().single();
      } else { // Adding
        response = await supabase.from(tableName).insert({ name: formData.name }).select().single();
      }
      
      if (response.error) throw response.error;
      
      await addLog({
        userId: user.id, userName: user.name, userRole: user.role,
        action: logAction, targetType: logType,
        targetId: response.data.id, targetName: response.data.name
      });

      toast({ title: "Sukses", description: `${itemType} berhasil ${formData.id ? 'diperbarui' : 'ditambahkan'}.` });
      setIsDialogOpen(false);
      fetchData(tableName, setData, loadingKey);
    } catch (error) {
      toast({ title: "Error", description: `Gagal menyimpan ${itemType.toLowerCase()}: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const handleDelete = async (id, type) => {
    const itemName = (type === 'Divisi' ? divisions : jobPositions).find(i => i.id === id)?.name;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${type.toLowerCase()} "${itemName}"?`)) return;
    
    const tableName = type === 'Divisi' ? 'divisions' : 'job_positions';
    const logType = type === 'Divisi' ? 'DIVISION' : 'JOB_POSITION';
    const setData = type === 'Divisi' ? setDivisions : setJobPositions;
    const loadingKey = type === 'Divisi' ? 'divisions' : 'jobPositions';

    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;

      await addLog({
        userId: user.id, userName: user.name, userRole: user.role,
        action: 'DELETE', targetType: logType,
        targetId: id, targetName: itemName
      });

      toast({ title: "Sukses", description: `${type} berhasil dihapus.` });
      fetchData(tableName, setData, loadingKey);
    } catch (error) {
      toast({ title: "Error", description: `Gagal menghapus ${type.toLowerCase()}: ${error.message}`, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-cyan-600 bg-clip-text text-transparent">
            Pengaturan Data Master
          </h1>
          <p className="text-muted-foreground">
            Kelola data master seperti Divisi dan Jabatan untuk digunakan di seluruh sistem.
          </p>
        </motion.div>

        <Tabs defaultValue="divisions">
          <TabsList>
            <TabsTrigger value="divisions">Divisi</TabsTrigger>
            <TabsTrigger value="job_positions">Jabatan</TabsTrigger>
          </TabsList>
          <TabsContent value="divisions">
            <SettingsManagementTab
              title="Manajemen Divisi"
              description="Tambah, edit, atau hapus data divisi perusahaan."
              items={divisions}
              onAdd={() => handleOpenDialog(null, 'Divisi')}
              onEdit={(item) => handleOpenDialog(item, 'Divisi')}
              onDelete={(id) => handleDelete(id, 'Divisi')}
              loading={loading.divisions}
            />
          </TabsContent>
          <TabsContent value="job_positions">
            <SettingsManagementTab
              title="Manajemen Jabatan"
              description="Tambah, edit, atau hapus data jabatan yang tersedia."
              items={jobPositions}
              onAdd={() => handleOpenDialog(null, 'Jabatan')}
              onEdit={(item) => handleOpenDialog(item, 'Jabatan')}
              onDelete={(id) => handleDelete(id, 'Jabatan')}
              loading={loading.jobPositions}
            />
          </TabsContent>
        </Tabs>
      </div>

      <SettingsFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleFormSubmit}
        initialData={editingItem}
        itemType={itemType}
        loading={loading.submit}
      />
    </Layout>
  );
};

export default AdminSettings;