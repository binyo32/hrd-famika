import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc =
  new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();

const AnnouncementPdfDialog = ({ open, onOpenChange, pdfUrl, title }) => {
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setNumPages(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title || "Lampiran PDF"}</DialogTitle>
        </DialogHeader>

        {/* TOOLBAR */}
        <div className="flex justify-end gap-2 mb-2">
          <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(z - 0.2, 0.6))}>
            −
          </Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(z + 0.2, 2.5))}>
            +
          </Button>
        </div>

        {/* PDF VIEW */}
        <div className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-2">
          {pdfUrl && (
            <Document
              file={pdfUrl}
              loading="Memuat PDF..."
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              error="Gagal memuat PDF"
            >
              {Array.from(new Array(numPages), (_, i) => (
                <div key={i} className="mb-6 flex justify-center">
                  <Page
                    pageNumber={i + 1}
                    scale={zoom}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="bg-white shadow rounded"
                  />
                </div>
              ))}
            </Document>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementPdfDialog;