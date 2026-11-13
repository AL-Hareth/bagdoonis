const MAX_SIDE = 1024;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older Safari: fall back to an <img> element.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Downscale a photo to a ≤1024px JPEG data URL so uploads stay fast on mobile data. */
export async function resizeImage(file: Blob): Promise<string> {
  const source = await decode(file);
  const w = source.width;
  const h = source.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  return canvas.toDataURL("image/jpeg", 0.82);
}
