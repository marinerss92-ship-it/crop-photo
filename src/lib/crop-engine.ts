import { CropRect } from "./types";

export interface CropResult {
  rect: CropRect;
  confidence: number;
}

interface RowAnalysis {
  variance: number;
  mean: number;
  uniformity: number;
}

type RowType = "solid" | "ui" | "photo";

function analyzeRow(
  data: Uint8ClampedArray,
  y: number,
  width: number,
  step: number
): RowAnalysis {
  const histogram = new Uint32Array(18);
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let x = 0; x < width; x += step) {
    const idx = (y * width + x) * 4;
    const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    sum += lum;
    sumSq += lum * lum;
    histogram[Math.min(17, Math.floor(lum / 15))]++;
    count++;
  }

  if (count === 0) return { variance: 0, mean: 0, uniformity: 1 };

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;

  let peakIdx = 0;
  for (let i = 1; i < 18; i++) {
    if (histogram[i] > histogram[peakIdx]) peakIdx = i;
  }
  const nearPeak =
    (peakIdx > 0 ? histogram[peakIdx - 1] : 0) +
    histogram[peakIdx] +
    (peakIdx < 17 ? histogram[peakIdx + 1] : 0);

  return { variance, mean, uniformity: nearPeak / count };
}

/**
 * Classify a row based on its visual characteristics.
 * - solid: near-zero variance (black bars, white bars, solid fills)
 * - ui: most pixels are a single background color with small discrete elements (text, icons)
 * - photo: varied pixel values typical of natural image content
 */
function classifyRow(row: RowAnalysis): RowType {
  if (row.variance < 30) return "solid";

  // High uniformity on a clearly light or dark background → UI chrome
  if (row.uniformity > 0.7 && (row.mean > 200 || row.mean < 55)) return "ui";

  // Very high uniformity regardless of color → UI/solid bar
  if (row.uniformity > 0.85 && row.variance < 2000) return "ui";

  return "photo";
}

/**
 * Find the largest contiguous block of photo-classified rows,
 * bridging small gaps of non-photo rows that may occur within the photo
 * (e.g. a thin uniform band in a sky gradient).
 */
function findLargestPhotoBlock(
  rowTypes: RowType[],
  height: number
): { start: number; end: number } {
  const gapTolerance = Math.max(5, Math.floor(height * 0.01));

  let bestStart = 0;
  let bestEnd = height - 1;
  let bestPhotoCount = 0;

  let blockStart = -1;
  let gapCount = 0;
  let photoCount = 0;

  for (let y = 0; y < height; y++) {
    if (rowTypes[y] === "photo") {
      if (blockStart === -1) {
        blockStart = y;
        gapCount = 0;
        photoCount = 1;
      } else {
        photoCount++;
        gapCount = 0;
      }
    } else if (blockStart !== -1) {
      gapCount++;
      if (gapCount > gapTolerance) {
        const blockEnd = y - gapCount;
        if (photoCount > bestPhotoCount) {
          bestPhotoCount = photoCount;
          bestStart = blockStart;
          bestEnd = blockEnd;
        }
        blockStart = -1;
        gapCount = 0;
        photoCount = 0;
      }
    }
  }

  if (blockStart !== -1) {
    const blockEnd = gapCount > 0 ? height - 1 - gapCount : height - 1;
    if (photoCount > bestPhotoCount) {
      bestPhotoCount = photoCount;
      bestStart = blockStart;
      bestEnd = blockEnd;
    }
  }

  if (bestPhotoCount < height * 0.1) {
    return { start: 0, end: height - 1 };
  }

  return { start: bestStart, end: bestEnd };
}

/**
 * Refine boundaries by trimming any remaining non-photo rows
 * at the edges of the detected block.
 */
function tightenBoundaries(
  rowTypes: RowType[],
  start: number,
  end: number
): { start: number; end: number } {
  while (start < end && rowTypes[start] !== "photo") start++;
  while (end > start && rowTypes[end] !== "photo") end--;
  return { start, end };
}

/**
 * Compute average row-to-row pixel difference for a given row pair.
 * High values indicate a sharp visual boundary (e.g. photo edge → UI bar).
 */
function rowDifference(
  data: Uint8ClampedArray,
  y1: number,
  y2: number,
  width: number,
  step: number
): number {
  let totalDiff = 0;
  let count = 0;
  for (let x = 0; x < width; x += step) {
    const idx1 = (y1 * width + x) * 4;
    const idx2 = (y2 * width + x) * 4;
    totalDiff += Math.abs(
      (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3 -
        (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3
    );
    count++;
  }
  return count > 0 ? totalDiff / count : 0;
}

/**
 * Look for the sharpest visual edge near a boundary to place the crop line
 * exactly at the photo frame.
 */
function refineEdge(
  data: Uint8ClampedArray,
  approxY: number,
  width: number,
  height: number,
  step: number,
  searchRange: number,
  direction: "top" | "bottom"
): number {
  const lo = Math.max(1, approxY - searchRange);
  const hi = Math.min(height - 1, approxY + searchRange);

  let bestY = approxY;
  let bestDiff = 0;

  for (let y = lo; y <= hi; y++) {
    const diff = rowDifference(data, y - 1, y, width, step);
    if (diff > bestDiff && diff > 8) {
      bestDiff = diff;
      bestY = direction === "top" ? y : y - 1;
    }
  }

  return bestY;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
}

export function detectCrop(imageData: ImageData): CropResult {
  const { width, height, data } = imageData;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 250));

  // --- Row analysis: variance + uniformity ---
  const rowStats: RowAnalysis[] = [];
  for (let y = 0; y < height; y++) {
    rowStats.push(analyzeRow(data, y, width, step));
  }

  const rowTypes: RowType[] = rowStats.map(classifyRow);

  // Find the main photo block and tighten its edges
  let { start: top, end: bottom } = findLargestPhotoBlock(rowTypes, height);
  ({ start: top, end: bottom } = tightenBoundaries(rowTypes, top, bottom));

  // Refine edges using row-to-row difference (find the sharpest transition)
  const edgeSearch = Math.max(5, Math.floor(height * 0.03));
  top = refineEdge(data, top, width, height, step, edgeSearch, "top");
  bottom = refineEdge(data, bottom, width, height, step, edgeSearch, "bottom");

  // Clamp after refinement
  top = Math.max(0, Math.min(top, height - 1));
  bottom = Math.max(top, Math.min(bottom, height - 1));

  // --- Column analysis within the photo region only ---
  const colVars: number[] = [];
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    for (let y = top; y <= bottom; y += step) {
      const idx = (y * width + x) * 4;
      const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      sum += lum;
      sumSq += lum * lum;
      count++;
    }
    if (count === 0) {
      colVars.push(0);
    } else {
      const mean = sum / count;
      colVars.push(sumSq / count - mean * mean);
    }
  }

  const nonTrivialColVars = colVars.filter((v) => v > 30);
  const colThreshold =
    nonTrivialColVars.length > 0
      ? Math.max(percentile(nonTrivialColVars, 0.2) * 0.15, 30)
      : 30;

  let left = 0;
  while (left < width - 1 && colVars[left] < colThreshold) left++;

  let right = width - 1;
  while (right > left && colVars[right] < colThreshold) right--;

  // --- Safety: minimum crop size (20% of original) ---
  const minW = width * 0.2;
  const minH = height * 0.2;
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

  // --- Confidence ---
  const cropArea = (right - left + 1) * (bottom - top + 1);
  const totalArea = width * height;
  const cropRatio = cropArea / totalArea;

  const photoRowCount = rowTypes
    .slice(top, bottom + 1)
    .filter((t) => t === "photo").length;
  const photoRowRatio =
    bottom > top ? photoRowCount / (bottom - top + 1) : 0;

  let confidence: number;
  if (cropRatio > 0.98) {
    confidence = 0.95;
  } else if (photoRowRatio > 0.8) {
    confidence = Math.min(0.95, 0.6 + photoRowRatio * 0.35);
  } else if (photoRowRatio > 0.5) {
    confidence = 0.5 + photoRowRatio * 0.3;
  } else {
    confidence = 0.3;
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
