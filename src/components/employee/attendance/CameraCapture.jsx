import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CameraIcon, RefreshCw, Check } from "lucide-react";

const CameraCapture = ({ onConfirm }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [photoPreview, setPhotoPreview] = useState();
  const [photoBlob, setPhotoBlob] = useState();

  useEffect(() => {
    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    // UN-MIRROR
    ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // PREVIEW (base64)
    setPhotoPreview(canvas.toDataURL("image/jpeg", 0.9));

    // BLOB (for upload)
    canvas.toBlob(
      (blob) => {
        setPhotoBlob(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  const retake = () => {
    setPhotoPreview(null);
    setPhotoBlob(null);
  };

  return (
    <div className="space-y-3">
      {/* VIDEO */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`rounded-md w-full ${
          photoPreview ? "hidden" : "block"
        } -scale-x-100`}
      />

      {/* PREVIEW */}
      {photoPreview && (
        <img src={photoPreview} alt="Preview" className="rounded-md w-full" />
      )}

      {!photoPreview ? (
        <Button onClick={takePhoto} className="w-full">
          <CameraIcon className="mr-2" />
          Ambil Foto
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={retake} className="flex-1">
            <RefreshCw className="mr-2" />
            Ambil Ulang
          </Button>

          <Button
            onClick={() => photoBlob && onConfirm(photoBlob)}
            className="flex-1"
          >
            <Check className="mr-2" />
            Lanjut
          </Button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
