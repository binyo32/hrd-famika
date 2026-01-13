import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ConfirmCheckoutDialog = ({ open, onCancel, onConfirm, loading }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Konfirmasi Check-Out</CardTitle>
          <CardDescription>
            Yakin ingin melakukan check-out sekarang?
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Batal
            </Button>
            <Button
              className="flex-1 bg-blue-600 text-white"
              onClick={onConfirm}
              disabled={loading}
            >
              Ya, Check-Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmCheckoutDialog;
