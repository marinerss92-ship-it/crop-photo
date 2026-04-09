import { CropRect } from "./types";
import { detectCrop, CropResult } from "./crop-engine";

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

export function runCropDetection(img: HTMLImageElement): CropResult {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return detectCrop(imageData);
}

export function generateThumbnail(
  img: HTMLImageElement,
  cropRect: CropRect,
  maxWidth = 300
): string {
  const canvas = document.createElement("canvas");
  const scale = Math.min(maxWidth / cropRect.width, 1);
  canvas.width = Math.round(cropRect.width * scale);
  canvas.height = Math.round(cropRect.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    img,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas.toDataURL("image/jpeg", 0.7);
}

export function applyCropToCanvas(
  img: HTMLImageElement,
  cropRect: CropRect
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = cropRect.width;
  canvas.height = cropRect.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    img,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    cropRect.width,
    cropRect.height
  );
  return canvas;
}

export async function processFile(file: File): Promise<{
  cropResult: CropResult;
  thumbnailUrl: string;
  originalWidth: number;
  originalHeight: number;
}> {
  const img = await loadImageFromFile(file);
  const cropResult = runCropDetection(img);
  const thumbnailUrl = generateThumbnail(img, cropResult.rect);
  return {
    cropResult,
    thumbnailUrl,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
  };
}
