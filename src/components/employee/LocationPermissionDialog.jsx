import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LocationPermissionDialog = ({ open, loading, onAllow }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Izin Lokasi</CardTitle>
          <CardDescription>
            Aplikasi membutuhkan akses lokasi untuk mencatat absensi Anda
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button onClick={onAllow} disabled={loading} className="w-full">
            {loading ? "Mengambil lokasi..." : "Izinkan Lokasi"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationPermissionDialog;
