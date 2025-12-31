import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

const SuccessModal = ({ isOpen, onClose, title, description, leaveRequestNumber }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-gradient-to-br from-green-500 to-teal-600 text-white p-8 rounded-lg shadow-2xl text-center relative"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="mx-auto mb-6 w-24 h-24 flex items-center justify-center rounded-full bg-white/30 backdrop-blur-sm"
          >
            <CheckCircle className="h-16 w-16 text-white" strokeWidth={1.5} />
          </motion.div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-3xl font-bold">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-green-100 text-base">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          {leaveRequestNumber && (
            <div className="mt-6 bg-white/20 p-4 rounded-lg">
              <p className="text-sm text-green-50">Nomor Cuti Anda:</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{leaveRequestNumber}</p>
            </div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Button
              onClick={onClose}
              className="bg-white text-green-600 hover:bg-gray-100 w-full sm:w-auto px-8 py-3 text-lg font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105"
            >
              Tutup
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default SuccessModal;