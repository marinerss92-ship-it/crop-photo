import JSZip from "jszip";
import { saveAs } from "file-saver";
import { PhotoItem } from "./types";
import { loadImageFromFile, applyCropToCanvas } from "./image-utils";

export async function downloadAllAsZip(
  photos: PhotoItem[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const cropRect = photo.adjustedCropRect || photo.cropRect;

    try {
      const img = await loadImageFromFile(photo.file);
      const canvas = applyCropToCanvas(img, cropRect);

      const isPng = photo.file.type === "image/png";
      const mimeType = isPng ? "image/png" : "image/jpeg";
      const ext = isPng ? ".png" : ".jpg";

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b!),
          mimeType,
          isPng ? undefined : 0.95
        );
      });

      const baseName = photo.fileName.replace(/\.[^.]+$/, "");
      zip.file(`${baseName}_cropped${ext}`, blob);
    } catch (e) {
      console.error(`Failed to process ${photo.fileName}:`, e);
    }

    onProgress?.(i + 1, photos.length);
    await new Promise((r) => setTimeout(r, 0));
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "cropped-photos.zip");
}

export async function downloadSinglePhoto(photo: PhotoItem): Promise<void> {
  const cropRect = photo.adjustedCropRect || photo.cropRect;
  const img = await loadImageFromFile(photo.file);
  const canvas = applyCropToCanvas(img, cropRect);

  const isPng = photo.file.type === "image/png";
  const mimeType = isPng ? "image/png" : "image/jpeg";
  const ext = isPng ? ".png" : ".jpg";

  canvas.toBlob(
    (blob) => {
      if (blob) {
        const baseName = photo.fileName.replace(/\.[^.]+$/, "");
        saveAs(blob, `${baseName}_cropped${ext}`);
      }
    },
    mimeType,
    isPng ? undefined : 0.95
  );
}
