import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const gradeStyles = {
  basic: "bg-green-100 text-green-700 border-green-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  important: "bg-red-100 text-red-700 border-red-200",
};

const gradeLabel = {
  basic: "Basic",
  warning: "Warning",
  important: "Important",
};

const MessageDialog = ({ open, onOpenChange, message }) => {
  if (!message) return null;

  const grade = message.grade || "basic";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-10">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg font-semibold">
              Pesan Dari {message.profiles.role} 
            </DialogTitle>

            <span
              className={`text-xs font-medium px-3 py-1 rounded-full border ${gradeStyles[grade] || gradeStyles.basic}`}
            >
              {gradeLabel[grade] || "Basic"}
            </span>
          </div>

          <DialogDescription className="mt-1">
            {new Date(message.created_at).toLocaleString("id-ID")}
          </DialogDescription>
        </DialogHeader>
         <DialogTitle className="text-lg font-semibold">
              {message.title}
            </DialogTitle>

        <div className="mt-4 whitespace-pre-line text-sm leading-relaxed">
          {message.content}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Saya Mengerti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageDialog;
