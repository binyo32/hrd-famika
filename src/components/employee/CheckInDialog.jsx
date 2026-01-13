import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CameraCapture from "./attendance/CameraCapture";
import PMSelect from "./attendance/PMSelect";

const CheckInDialog = ({
  open,
  onClose,
  selfieTaken,
  setSelfieTaken,
  setSelfieBlob,
  pmList,
  pmLoading,
  selectedPM,
  setSelectedPM,
  projectText,
  setProjectText,
  onConfirm,
  onSearchPM,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-500 hover:text-red-500"
        >
          ✕
        </button>

        <CardHeader>
          <CardTitle>Check-In</CardTitle>
          <CardDescription>
            Ambil selfie lalu isi data Project
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {!selfieTaken ? (
            <CameraCapture
              onConfirm={(blob) => {
                setSelfieBlob(blob);
                setSelfieTaken(true);
              }}
            />
          ) : (
            <>
              <PMSelect
                pmList={pmList}
                value={selectedPM}
                onChange={setSelectedPM}
                onSearch={onSearchPM}
                loading={pmLoading}
              />

              <label className="text-sm font-semibold">Project</label>
              <textarea
                className="w-full rounded-md border p-2 text-sm dark:bg-background"
                value={projectText}
                onChange={(e) => setProjectText(e.target.value)}
              />

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  setSelfieTaken(false);
                  setSelectedPM(null);
                  setProjectText("");
                }}
              >
                ← Kembali
              </Button>

              <Button
                disabled={!selectedPM || !projectText}
                onClick={onConfirm}
                className="w-full"
              >
                Konfirmasi Check-In
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckInDialog;
