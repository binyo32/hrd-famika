"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/components/ui/use-toast";

const UpdateLocationDialog = ({
  open,
  onClose,
  attendanceId,
  employeeId,
  liveLocation,
  liveAddress,
}) => {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!liveLocation) {
      toast({
        title: "Lokasi belum siap",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("attendance_location_logs")
        .insert({
          attendance_id: attendanceId,
          employee_id: employeeId,
          latitude: liveLocation.latitude,
          longitude: liveLocation.longitude,
          activity: note || "Lokasi kerja diperbarui",
          source: "gps",
          address: liveAddress || null,
        });

      if (error) throw error;

      toast({
        title: "Lokasi berhasil diperbarui",
        description: "Progres lokasi kerja tersimpan",
        className: "bg-green-600 text-white",
      });

      setNote("");
      onClose();
    } catch (err) {
      toast({
        title: "Gagal menyimpan lokasi",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Update Lokasi Kerja
          </DialogTitle>
          <DialogDescription>
            Simpan progres lokasi kerja Anda saat ini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm">
            <div>lokasi: {liveAddress || "-"}</div>
          </div>

          <Textarea
            placeholder="Keterangan aktivitas pekerjaan"
            value={note}
            required
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateLocationDialog;