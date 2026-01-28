import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertOctagon, AlertTriangleIcon, Clock } from "lucide-react";

const CheckoutBlockedDialog = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-orange-500">
            <AlertTriangleIcon className="h-20 w-20" />
           
          </DialogTitle>
          <DialogDescription className="space-y-2 mt-7 text-center">
            <p className="mt-5">
             <b className="text-green-500">Checkout</b> dan  <b className="text-green-500">Update Lokasi Kerja</b> hanya dapat dilakukan hingga pukul <b>23.59</b>
            </p>
            <p>
             Data absensi anda hari ini sudah disimpan.
            </p>
            <p className="text-sm text-muted-foreground">
              Silakan hubungi Team HRD jika memerlukan bantuan.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Saya Mengerti</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutBlockedDialog;