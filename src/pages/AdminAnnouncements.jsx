import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Search, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { addLog } from '@/lib/activityLogService';
import AnnouncementFormDialog from '@/components/admin/announcements/AnnouncementFormDialog';
import AnnouncementCard from '@/components/admin/announcements/AnnouncementCard';
import AnnouncementCreator from '@/components/admin/announcements/AnnouncementCreator';

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', audience: 'all' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isAudienceFeatureEnabled, setIsAudienceFeatureEnabled] = useState(null);

  useEffect(() => {
    const checkAudienceFeature = async () => {
      try {
        const { error } = await supabase.from('announcements').select('audience').limit(1);
        setIsAudienceFeatureEnabled(!error);
      } catch (e) {
        setIsAudienceFeatureEnabled(false);
      }
    };
    checkAudienceFeature();
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    if (isAudienceFeatureEnabled === null) return;
    setLoading(true);
    
    const columnsToSelect = isAudienceFeatureEnabled ? '*' : 'id, title, content, created_at, updated_at, author_name, author_role, liked_by';

    try {
      let query = supabase.from('announcements').select(columnsToSelect).order('created_at', { ascending: false });
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setAnnouncements(data);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat pengumuman: " + error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, isAudienceFeatureEnabled]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSubmit = async (newFormData) => {
    if (!newFormData.title || !newFormData.content) {
      toast({ title: "Input Tidak Lengkap", description: "Judul dan isi pengumuman tidak boleh kosong.", variant: "destructive" });
      return;
    }

    try {
      let logAction;
      let result;
      const announcementData = {
        title: newFormData.title,
        content: newFormData.content,
      };

      if (isAudienceFeatureEnabled) {
        announcementData.audience = newFormData.audience;
      }

      if (currentAnnouncement) {
        logAction = 'UPDATE';
        announcementData.updated_at = new Date().toISOString();
        const { data, error } = await supabase.from('announcements').update(announcementData).eq('id', currentAnnouncement.id).select().single();
        if (error) throw error;
        result = data;
        toast({ title: "Berhasil!", description: "Pengumuman berhasil diperbarui." });
      } else {
        logAction = 'CREATE';
        announcementData.author_name = user?.name || 'Admin';
        announcementData.author_role = user?.role || 'Administrator';
        const { data, error } = await supabase.from('announcements').insert([announcementData]).select().single();
        if (error) throw error;
        result = data;
        toast({ title: "Berhasil!", description: "Pengumuman baru berhasil ditambahkan." });
      }

      await addLog({
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: logAction,
        targetType: 'ANNOUNCEMENT',
        targetId: result.id,
        targetName: result.title,
      });

      setIsFormOpen(false);
      setCurrentAnnouncement(null);
      fetchAnnouncements();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menyimpan pengumuman: " + error.message, variant: "destructive" });
    }
  };

  const handleEdit = (announcement) => {
    setCurrentAnnouncement(announcement);
    setFormData({ title: announcement.title, content: announcement.content, audience: announcement.audience || 'all' });
    setIsFormOpen(true);
  };

  const handleDelete = async (announcement) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")) {
      try {
        const { error } = await supabase.from('announcements').delete().eq('id', announcement.id);
        if (error) throw error;

        await addLog({
          userId: user.id,
          userName: user.name || user.email,
          userRole: user.role,
          action: 'DELETE',
          targetType: 'ANNOUNCEMENT',
          targetId: announcement.id,
          targetName: announcement.title,
        });

        toast({ title: "Berhasil!", description: "Pengumuman berhasil dihapus." });
        fetchAnnouncements();
      } catch (error) {
        toast({ title: "Error", description: "Gagal menghapus pengumuman: " + error.message, variant: "destructive" });
      }
    }
  };

  const openAddForm = () => {
    setCurrentAnnouncement(null);
    setFormData({ title: '', content: '', audience: 'all' });
    setIsFormOpen(true);
  };

  const handleLikeToggle = async (announcementId) => {
    if (!user || !user.id) {
      toast({ title: "Aksi Gagal", description: "Anda harus login untuk menyukai pengumuman.", variant: "destructive" });
      return;
    }

    const originalAnnouncements = [...announcements];
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;

    const likedBy = Array.isArray(announcement.liked_by) ? [...announcement.liked_by] : [];
    const userHasLiked = likedBy.includes(user.id);
    const newLikedBy = userHasLiked ? likedBy.filter(id => id !== user.id) : [...likedBy, user.id];

    setAnnouncements(prev =>
      prev.map(a =>
        a.id === announcementId
          ? { ...a, liked_by: newLikedBy }
          : a
      )
    );

    try {
      const { error } = await supabase
        .from('announcements')
        .update({ liked_by: newLikedBy })
        .eq('id', announcementId);

      if (error) {
        setAnnouncements(originalAnnouncements);
        toast({ title: "Error", description: "Gagal memperbarui suka. Pastikan kolom 'liked_by' (tipe jsonb) ada di tabel announcements.", variant: "destructive" });
        console.error("Like error:", error);
      }
    } catch (error) {
      setAnnouncements(originalAnnouncements);
      toast({ title: "Error", description: "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Feed Pengumuman
            </h1>
            <p className="text-muted-foreground">
              Bagikan informasi penting dengan seluruh tim.
            </p>
          </div>
        </motion.div>

        <AnnouncementCreator onOpenAddForm={openAddForm} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <Input 
            placeholder="Cari pengumuman..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-2 glass-effect border-0 shadow-md"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </motion.div>

        {loading || isAudienceFeatureEnabled === null ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          </div>
        ) : (
          <AnimatePresence>
            {announcements.length > 0 ? (
              <div className="space-y-6">
                {announcements.map((ann, index) => (
                  <AnnouncementCard
                    key={ann.id}
                    announcement={ann}
                    index={index}
                    user={user}
                    isAudienceFeatureEnabled={isAudienceFeatureEnabled}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onLikeToggle={handleLikeToggle}
                  />
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Megaphone className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
                <h3 className="text-2xl font-semibold">Feed Pengumuman Kosong</h3>
                <p className="text-muted-foreground mt-2">Jadilah yang pertama memposting pengumuman!</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <AnnouncementFormDialog
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          currentAnnouncement={currentAnnouncement}
          onSubmit={handleSubmit}
          isAudienceFeatureEnabled={isAudienceFeatureEnabled}
        />
      </div>
    </Layout>
  );
};

export default AdminAnnouncements;