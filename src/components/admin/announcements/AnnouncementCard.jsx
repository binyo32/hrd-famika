import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ThumbsUp, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const AnnouncementCard = ({ announcement, index, user, isAudienceFeatureEnabled, onEdit, onDelete, onLikeToggle }) => {
  
  const handleFeatureNotImplemented = () => {
    toast({
      title: "🚧 Fitur Belum Tersedia 🚧",
      description: "Fitur ini belum diimplementasikan. Anda bisa memintanya di prompt berikutnya! 🚀",
      variant: "default",
    });
  };

  return (
    <motion.div
      key={announcement.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={user?.photo} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                { (announcement.author_name || 'A').charAt(0) }
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{announcement.author_name || 'Admin HRIS'}</CardTitle>
              <CardDescription className="text-xs flex items-center">
                <CalendarDays className="h-3 w-3 mr-1" />
                {new Date(announcement.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {announcement.updated_at && new Date(announcement.updated_at).getTime() !== new Date(announcement.created_at).getTime() && 
                 ` (Diperbarui)`
                }
              </CardDescription>
            </div>
          </div>
          <div className="flex justify-between items-start mt-3">
            <h2 className="text-xl font-semibold">{announcement.title}</h2>
            {isAudienceFeatureEnabled && (announcement.audience === 'admin' ? (
              <Badge variant="secondary">Khusus Admin</Badge>
            ) : (
              <Badge variant="outline">Untuk Semua</Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-line leading-relaxed">{announcement.content}</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-4 border-t">
          <div className="flex space-x-4 text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center space-x-2 transition-colors ${announcement.liked_by?.includes(user.id) ? 'text-blue-600' : 'hover:text-blue-500'}`}
              onClick={() => onLikeToggle(announcement.id)}
            >
              <ThumbsUp className={`h-4 w-4 ${announcement.liked_by?.includes(user.id) ? 'fill-current' : ''}`} />
              <span>{announcement.liked_by?.length || 0} Suka</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:text-green-500" onClick={handleFeatureNotImplemented}>
              <MessageSquare className="h-4 w-4" /> <span>Komentar</span>
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(announcement)} className="hover:border-blue-500 hover:text-blue-500">
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(announcement)} className="text-red-500 hover:border-red-600 hover:text-red-600">
              <Trash2 className="h-4 w-4 mr-1" /> Hapus
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default AnnouncementCard;