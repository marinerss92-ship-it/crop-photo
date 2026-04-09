"use client";

import { useState, useMemo } from "react";
import { PhotoItem, ConfidenceLevel, SortOrder } from "@/lib/types";
import { PhotoCard } from "./PhotoCard";

interface Props {
  photos: PhotoItem[];
  onPhotoClick: (id: string) => void;
}

export function Gallery({ photos, onPhotoClick }: Props) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [filter, setFilter] = useState<ConfidenceLevel>("all");

  const donePhotos = photos.filter((p) => p.status === "done" || p.status === "error");

  const filtered = useMemo(() => {
    return donePhotos.filter((p) => {
      if (filter === "all") return true;
      if (filter === "low") return p.confidence < 0.4;
      if (filter === "medium") return p.confidence >= 0.4 && p.confidence < 0.7;
      if (filter === "high") return p.confidence >= 0.7;
      return true;
    });
  }, [donePhotos, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortOrder === "confidence-asc") return a.confidence - b.confidence;
      if (sortOrder === "confidence-desc") return b.confidence - a.confidence;
      return 0;
    });
  }, [filtered, sortOrder]);

  const lowCount = donePhotos.filter((p) => p.confidence < 0.4).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <p className="text-sm text-zinc-600">
          <strong>{donePhotos.length}</strong> photos
          {lowCount > 0 && (
            <span className="text-amber-600 ml-2">
              ({lowCount} may need review)
            </span>
          )}
        </p>

        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-zinc-500">Show:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ConfidenceLevel)}
            className="text-sm border border-zinc-300 rounded-md px-2 py-1 bg-white"
          >
            <option value="all">All</option>
            <option value="low">Low confidence</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <label className="text-xs text-zinc-500 ml-3">Sort:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="text-sm border border-zinc-300 rounded-md px-2 py-1 bg-white"
          >
            <option value="default">Default</option>
            <option value="confidence-asc">Confidence (low first)</option>
            <option value="confidence-desc">Confidence (high first)</option>
          </select>
        </div>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {sorted.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onClick={() => onPhotoClick(photo.id)}
          />
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-center text-zinc-400 py-8">
          No photos match this filter.
        </p>
      )}
    </div>
  );
}
