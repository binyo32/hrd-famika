import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AnnouncementFormDialog = ({
  isOpen,
  onOpenChange,
  currentAnnouncement,
  onSubmit,
  isAudienceFeatureEnabled,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    audience: "all",
  });
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    setAttachment(null);

    if (isOpen) {
      if (currentAnnouncement) {
        setFormData({
          title: currentAnnouncement.title,
          content: currentAnnouncement.content,
          audience: currentAnnouncement.audience || "all",
        });
      } else {
        setFormData({ title: "", content: "", audience: "all" });
      }
    }
  }, [isOpen, currentAnnouncement]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleAudienceChange = (value) => {
    setFormData((prev) => ({ ...prev, audience: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, attachment);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass-effect max-h-[700px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {currentAnnouncement ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
          </DialogTitle>
          <DialogDescription>
            {currentAnnouncement
              ? "Perbarui detail pengumuman Anda."
              : "Bagikan informasi penting dengan tim."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div>
            <Label htmlFor="title" className="text-base">
              Judul
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="mt-1 text-base p-3"
            />
          </div>
          <div>
            <Label htmlFor="content" className="text-base">
              Isi Pengumuman
            </Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={handleInputChange}
              required
              rows={6}
              className="mt-1 min-h-[100px] text-base p-3"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base text-foreground">Lampiran (PDF)</Label>

            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              className="
      file:text-sm
      file:font-medium
      file:border-0
      file:bg-muted
      file:text-foreground
      hover:file:bg-muted/80
      dark:file:bg-muted
      dark:file:text-foreground
      dark:hover:file:bg-muted/80
    "
            />

            {currentAnnouncement?.attachment_url && (
              <a
                href={currentAnnouncement.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="
        inline-flex items-center gap-1 text-sm
        text-blue-600 dark:text-blue-400
        hover:underline
      ">
                Lihat PDF saat ini
              </a>
            )}
          </div>

          {isAudienceFeatureEnabled && (
            <div>
              <Label htmlFor="audience" className="text-base">
                Target Audiens
              </Label>
              <Select
                value={formData.audience}
                onValueChange={handleAudienceChange}>
                <SelectTrigger id="audience" className="mt-1 text-base p-3">
                  <SelectValue placeholder="Pilih target audiens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Seluruh Tim</SelectItem>
                  <SelectItem value="admin">Hanya Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6 py-3 text-base">
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 text-base">
              {currentAnnouncement ? "Simpan Perubahan" : "Posting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementFormDialog;
