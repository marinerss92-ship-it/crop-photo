export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoItem {
  id: string;
  file: File;
  fileName: string;
  originalWidth: number;
  originalHeight: number;
  thumbnailUrl: string;
  cropRect: CropRect;
  adjustedCropRect: CropRect | null;
  confidence: number;
  status: "pending" | "processing" | "done" | "error";
}

export type AppPhase = "upload" | "processing" | "preview";
export type ConfidenceLevel = "all" | "low" | "medium" | "high";
export type SortOrder = "default" | "confidence-asc" | "confidence-desc";
