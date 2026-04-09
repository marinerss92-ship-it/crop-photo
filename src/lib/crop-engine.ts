import { CropRect } from "./types";

export interface CropResult {
  rect: CropRect;
  confidence: number;
}

function rowVariance(
  data: Uint8ClampedArray,
  y: number,
  width: number,
  step: number
): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let x = 0; x < width; x += step) {
    const idx = (y * width + x) * 4;
    const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    sum += b;
    sumSq += b * b;
    count++;
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

function colVariance(
  data: Uint8ClampedArray,
  x: number,
  width: number,
  height: number,
  step: number
): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 0; y < height; y += step) {
    const idx = (y * width + x) * 4;
    const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    sum += b;
    sumSq += b * b;
    count++;
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Detects the content region within a screenshot by analyzing pixel variance.
 * Uniform borders (black, white, solid colors) have low variance.
 * Photo content has high variance.
 */
export function detectCrop(imageData: ImageData): CropResult {
  const { width, height, data } = imageData;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 200));

  const rowVars: number[] = [];
  for (let y = 0; y < height; y++) {
    rowVars.push(rowVariance(data, y, width, step));
  }

  const colVars: number[] = [];
  for (let x = 0; x < width; x++) {
    colVars.push(colVariance(data, x, width, height, step));
  }

  const nonZeroRowVars = rowVars.filter((v) => v > 1);
  const medianRowVar = median(nonZeroRowVars);
  const rowThreshold = Math.max(medianRowVar * 0.1, 50);

  const nonZeroColVars = colVars.filter((v) => v > 1);
  const medianColVar = median(nonZeroColVars);
  const colThreshold = Math.max(medianColVar * 0.1, 50);

  let top = 0;
  while (top < height - 1 && rowVars[top] < rowThreshold) top++;

  let bottom = height - 1;
  while (bottom > top && rowVars[bottom] < rowThreshold) bottom--;

  let left = 0;
  while (left < width - 1 && colVars[left] < colThreshold) left++;

  let right = width - 1;
  while (right > left && colVars[right] < colThreshold) right--;

  const minW = width * 0.3;
  const minH = height * 0.3;
  if (right - left + 1 < minW) {
    const cx = (left + right) / 2;
    left = Math.max(0, Math.round(cx - minW / 2));
    right = Math.min(width - 1, Math.round(cx + minW / 2));
  }
  if (bottom - top + 1 < minH) {
    const cy = (top + bottom) / 2;
    top = Math.max(0, Math.round(cy - minH / 2));
    bottom = Math.min(height - 1, Math.round(cy + minH / 2));
  }

  const cropArea = (right - left + 1) * (bottom - top + 1);
  const totalArea = width * height;
  const cropRatio = cropArea / totalArea;

  const borderRowVars = [
    ...rowVars.slice(0, Math.max(top, 1)),
    ...rowVars.slice(Math.min(bottom + 1, height)),
  ];
  const contentRowVars = rowVars.slice(top, bottom + 1);
  const avgBorderVar =
    borderRowVars.length > 0
      ? borderRowVars.reduce((a, b) => a + b, 0) / borderRowVars.length
      : 0;
  const avgContentVar =
    contentRowVars.length > 0
      ? contentRowVars.reduce((a, b) => a + b, 0) / contentRowVars.length
      : 0;

  let confidence: number;
  if (borderRowVars.length === 0 || cropRatio > 0.98) {
    confidence = 0.95;
  } else {
    const ratio = avgContentVar / Math.max(avgBorderVar, 1);
    confidence = Math.min(Math.max(ratio / 20, 0.1), 1);
  }

  return {
    rect: {
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
    },
    confidence: Math.round(confidence * 100) / 100,
  };
}
