const MAX_DIMENSION = 1280;
const SKIP_BELOW_BYTES = 400 * 1024;

/**
 * Downscale a photo in the browser before uploading, so multi-megabyte bag
 * photos don't get stored and re-served at full size. Falls back to the
 * original file if anything goes wrong.
 */
export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = MAX_DIMENSION / Math.max(bitmap.width, bitmap.height);
    if (scale >= 1 && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close();
      return file;
    }
    const width = Math.round(bitmap.width * Math.min(scale, 1));
    const height = Math.round(bitmap.height * Math.min(scale, 1));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return file;
    const baseName = (file.name || "image").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
