import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Megaphone, CalendarDays, Search, MessageSquare, ThumbsUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .or('audience.eq.all,audience.is.null')
          .order('created_at', { ascending: false });

        if (error) throw error;
        const announcementsData = data || [];
        setAllAnnouncements(announcementsData);
        setAnnouncements(announcementsData);
      } catch (error) {
        toast({ title: "Error", description: "Gagal memuat pengumuman: " + error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setAnnouncements(allAnnouncements);
      return;
    }

    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const filtered = allAnnouncements.filter(ann =>
      ann.title.toLowerCase().includes(lowercasedSearchTerm) ||
      ann.content.toLowerCase().includes(lowercasedSearchTerm)
    );
    setAnnouncements(filtered);
  }, [searchTerm, allAnnouncements]);

  const handleFeatureNotImplemented = () => {
    toast({
      title: "🚧 Fitur Belum Tersedia 🚧",
      description: "Fitur ini belum diimplementasikan. Anda bisa memintanya di prompt berikutnya! 🚀",
      variant: "default",
    });
  };

  const handleLikeToggle = async (announcementId) => {
    if (!user || !user.id) {
      toast({ title: "Aksi Gagal", description: "Anda harus login untuk menyukai pengumuman.", variant: "destructive" });
      return;
    }

    const originalAllAnnouncements = [...allAnnouncements];

    const userHasLiked = allAnnouncements.find(a => a.id === announcementId)?.liked_by?.includes(user.id);

    const newAllAnnouncements = allAnnouncements.map(a => {
        if (a.id === announcementId) {
            const likedBy = Array.isArray(a.liked_by) ? a.liked_by : [];
            const newLikedBy = userHasLiked 
                ? likedBy.filter(id => id !== user.id)
                : [...likedBy, user.id];
            return { ...a, liked_by: newLikedBy };
        }
        return a;
    });

    setAllAnnouncements(newAllAnnouncements);

    try {
        const announcementToUpdate = newAllAnnouncements.find(a => a.id === announcementId);
        const { error } = await supabase
            .from('announcements')
            .update({ liked_by: announcementToUpdate.liked_by })
            .eq('id', announcementId);

        if (error) {
            setAllAnnouncements(originalAllAnnouncements);
            toast({ title: "Error", description: "Gagal memperbarui suka. Pastikan kolom 'liked_by' (tipe jsonb) ada di tabel announcements.", variant: "destructive" });
            console.error("Like error:", error);
        }
    } catch (error) {
        setAllAnnouncements(originalAllAnnouncements);
        toast({ title: "Error", description: "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Feed Pengumuman
          </h1>
          <p className="text-muted-foreground">
            Informasi dan pengumuman terbaru dari perusahaan.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          </div>
        ) : (
          <AnimatePresence>
            {announcements.length > 0 ? (
              <div className="space-y-6">
                {announcements.map((ann, index) => (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                           <Avatar>
                            <AvatarImage src={null} />
                            <AvatarFallback className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                              { (ann.author_name || 'A').charAt(0) }
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{ann.author_name || 'Admin HRIS'}</CardTitle>
                            <CardDescription className="text-xs flex items-center">
                              <CalendarDays className="h-3 w-3 mr-1" />
                              {new Date(ann.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {ann.updated_at && new Date(ann.updated_at).getTime() !== new Date(ann.created_at).getTime() && 
                               ` (Diperbarui)`
                              }
                            </CardDescription>
                          </div>
                        </div>
                        <h2 className="text-xl font-semibold mt-3">{ann.title}</h2>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-line leading-relaxed">{ann.content}</p>
                      </CardContent>
                      <CardFooter className="flex justify-start items-center pt-4 border-t">
                        <div className="flex space-x-4 text-muted-foreground">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`flex items-center space-x-2 transition-colors ${ann.liked_by?.includes(user.id) ? 'text-blue-600' : 'hover:text-blue-500'}`}
                            onClick={() => handleLikeToggle(ann.id)}
                          >
                            <ThumbsUp className={`h-4 w-4 ${ann.liked_by?.includes(user.id) ? 'fill-current' : ''}`} />
                            <span>{ann.liked_by?.length || 0} Suka</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:text-green-500" onClick={handleFeatureNotImplemented}>
                            <MessageSquare className="h-4 w-4" /> <span>Komentar</span>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Megaphone className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
                <h3 className="text-2xl font-semibold">Tidak Ada Pengumuman</h3>
                <p className="text-muted-foreground mt-2">Saat ini belum ada pengumuman baru untuk Anda.</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </Layout>
  );
};

export default EmployeeDashboard;