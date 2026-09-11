/**
 * Client-side image optimization for uploads.
 * - Resizes to max 1600px on the long edge
 * - Re-encodes to WebP (q=0.82) when supported, else JPEG
 * - Skips tiny images and non-image files
 *
 * Reduces bandwidth ~60-80% on typical phone photos before upload.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

async function loadBitmap(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // revoke after returning — callers draw synchronously below
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function pickType(): { mime: string; ext: string } {
  // Most modern browsers encode WebP via canvas
  const c = document.createElement('canvas');
  const webp = c.toDataURL('image/webp').startsWith('data:image/webp');
  return webp ? { mime: 'image/webp', ext: 'webp' } : { mime: 'image/jpeg', ext: 'jpg' };
}

export async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // Don't bother for already-tiny files
  if (file.size < 200 * 1024) return file;

  try {
    const img = await loadBitmap(file);
    const { width: w, height: h } = img;
    const longest = Math.max(w, h);
    const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
    const tw = Math.round(w * scale);
    const th = Math.round(h * scale);

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, tw, th);

    const { mime, ext } = pickType();
    const blob: Blob | null = await new Promise(res =>
      canvas.toBlob(b => res(b), mime, QUALITY)
    );
    if (!blob || blob.size >= file.size) return file; // keep original if no win

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${ext}`, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function optimizeImages(files: FileList | File[]): Promise<File[]> {
  const arr = Array.from(files);
  return Promise.all(arr.map(optimizeImage));
}
