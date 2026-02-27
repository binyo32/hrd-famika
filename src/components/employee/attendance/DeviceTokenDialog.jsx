import { Button } from "@/components/ui/button";

const DeviceTokenDialog = ({ open, onClose }) => {
  if (!open) return null;

  const handleOpenApp = () => {
    // Ganti dengan scheme yang sudah Anda daftarkan di AndroidManifest
    const deepLink = "famikaabsence://home";
    const playStoreUrl =
      "https://play.google.com/store/apps/details?id=com.famika.absence";

    const start = Date.now();

    window.location.href = deepLink;

    // fallback jika app tidak terinstall
    setTimeout(() => {
      if (Date.now() - start < 2000) {
        window.location.href = playStoreUrl;
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-2">
          Perangkat Sudah Terdaftar
        </h2>

        <p className="text-sm text-muted-foreground mb-4">
          Akun Anda sudah memiliki device terdaftar. Untuk melanjutkan absensi,
          silakan gunakan aplikasi mobile.
        </p>

        <div className="flex justify-end gap-2">
          <Button onClick={handleOpenApp}>
           Lanjutkan di Aplikasi
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeviceTokenDialog;