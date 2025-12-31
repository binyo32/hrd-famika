import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SettingsFormDialog = ({ isOpen, onOpenChange, onSubmit, initialData, itemType, loading }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialData ? initialData.name : '');
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({ ...initialData, name: name.trim() });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? `Edit ${itemType}` : `Tambah ${itemType} Baru`}</DialogTitle>
          <DialogDescription>
            {initialData ? `Perbarui nama ${itemType.toLowerCase()}.` : `Masukkan nama untuk ${itemType.toLowerCase()} baru.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama {itemType}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Batal</Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white" disabled={loading}>
              {loading ? 'Menyimpan...' : (initialData ? 'Perbarui' : 'Simpan')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsFormDialog;