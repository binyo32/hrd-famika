import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangleIcon } from "lucide-react";

const WorkHourWarningDialog = ({ open, onClose, onProceed, hours }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <AlertTriangleIcon className="h-20 w-20 text-red-700" />
          </div>
          <DialogTitle>
            {" "}
            <h1 className=" text-center text-gray-600">
              Anda Bekerja Kurang Dari 8 Jam <br />
            </h1>
            <h1 className=" text-gray-600">
              Apakah Anda yakin ingin melakukan check-out sekarang?
            </h1>
          </DialogTitle>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onProceed}>
            Tetap Check-Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkHourWarningDialog;
