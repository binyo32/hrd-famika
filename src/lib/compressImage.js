export const compressImage = async (
  blob,
  {
    maxSizeKB = 15,
    maxWidth = 480,
    maxHeight = 480,
    initialQuality = 0.7,
    minQuality = 0.35,
  } = {}
) => {
  const img = new Image();
  const url = URL.createObjectURL(blob);
  img.src = url;

  await new Promise((res) => (img.onload = res));

  // 🔹 hitung resize ratio
  let { width, height } = img;
  const ratio = Math.min(
    maxWidth / width,
    maxHeight / height,
    1
  );

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(url);

  let quality = initialQuality;
  let compressedBlob;

  while (quality >= minQuality) {
    compressedBlob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );

    if (!compressedBlob) break;
    if (compressedBlob.size / 1024 <= maxSizeKB) {
      return compressedBlob;
    }

    quality -= 0.05;
  }

  // 🚨 fallback: resize ulang lebih kecil
  canvas.width = Math.floor(width * 0.8);
  canvas.height = Math.floor(height * 0.8);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  compressedBlob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", minQuality)
  );

  return compressedBlob;
};
