"use client";

import { PhotoItem } from "@/lib/types";

interface Props {
  photo: PhotoItem;
  onClick: () => void;
}

function confidenceColor(c: number): string {
  if (c >= 0.7) return "bg-emerald-500";
  if (c >= 0.4) return "bg-amber-500";
  return "bg-red-500";
}

function confidenceLabel(c: number): string {
  if (c >= 0.7) return "High";
  if (c >= 0.4) return "Medium";
  return "Low";
}

export function PhotoCard({ photo, onClick }: Props) {
  if (photo.status === "error") {
    return (
      <div className="relative aspect-square bg-zinc-100 rounded-lg flex items-center justify-center">
        <div className="text-center p-2">
          <svg className="w-8 h-8 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-zinc-500 mt-1 truncate">{photo.fileName}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-zinc-100 hover:ring-2 hover:ring-blue-400 transition-all"
    >
      <img
        src={photo.thumbnailUrl}
        alt={photo.fileName}
        className="w-full h-full object-cover aspect-square"
        loading="lazy"
      />

      {/* Confidence badge */}
      <div className="absolute top-2 right-2">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${confidenceColor(photo.confidence)}`}
        >
          {confidenceLabel(photo.confidence)}
        </span>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Adjust
        </span>
      </div>

      {/* Filename */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
        <p className="text-[11px] text-white truncate">{photo.fileName}</p>
      </div>

      {/* Manual adjustment indicator */}
      {photo.adjustedCropRect && (
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white bg-blue-500">
            Adjusted
          </span>
        </div>
      )}
    </div>
  );
}
