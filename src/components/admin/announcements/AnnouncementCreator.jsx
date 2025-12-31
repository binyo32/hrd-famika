import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AnnouncementCreator = ({ onOpenAddForm }) => {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="glass-effect border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={user?.photo} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                {user?.name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <Button 
              variant="outline" 
              className="flex-grow justify-start text-muted-foreground"
              onClick={onOpenAddForm}
            >
              Buat pengumuman baru...
            </Button>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-end pt-2">
            <Button onClick={onOpenAddForm} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 space-x-2">
                <Plus className="h-4 w-4" />
                <span>Posting</span>
            </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default AnnouncementCreator;