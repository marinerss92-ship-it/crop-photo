"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CropRect, PhotoItem } from "@/lib/types";

interface Props {
  photo: PhotoItem;
  onSave: (photoId: string, newCropRect: CropRect, newThumbnailUrl: string) => void;
  onClose: () => void;
}

type DragMode = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null;

const HANDLE_SIZE = 10;
const MIN_CROP = 50;

export function CropAdjustModal({ photo, onSave, onClose }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect>(
    photo.adjustedCropRect || photo.cropRect
  );
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cropStartRef = useRef<CropRect>(cropRect);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(photo.file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo.file]);

  const getScale = useCallback(() => {
    if (!imgRef.current) return 1;
    return imgRef.current.clientWidth / photo.originalWidth;
  }, [photo.originalWidth]);

  const displayRect = useCallback(() => {
    const s = getScale();
    return {
      x: cropRect.x * s,
      y: cropRect.y * s,
      width: cropRect.width * s,
      height: cropRect.height * s,
    };
  }, [cropRect, getScale]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: DragMode) => {
      e.preventDefault();
      e.stopPropagation();
      setDragMode(mode);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      cropStartRef.current = { ...cropRect };
    },
    [cropRect]
  );

  useEffect(() => {
    if (!dragMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const scale = getScale();
      if (scale === 0) return;

      const dx = (e.clientX - dragStartRef.current.x) / scale;
      const dy = (e.clientY - dragStartRef.current.y) / scale;
      const cs = cropStartRef.current;
      const newRect = { ...cs };

      if (dragMode === "move") {
        newRect.x = Math.max(
          0,
          Math.min(photo.originalWidth - cs.width, cs.x + dx)
        );
        newRect.y = Math.max(
          0,
          Math.min(photo.originalHeight - cs.height, cs.y + dy)
        );
      } else {
        if (dragMode.includes("w")) {
          const newX = Math.max(0, cs.x + dx);
          const newW = cs.width - (newX - cs.x);
          if (newW >= MIN_CROP) {
            newRect.x = newX;
            newRect.width = newW;
          }
        }
        if (dragMode.includes("e")) {
          const newW = Math.min(
            photo.originalWidth - cs.x,
            cs.width + dx
          );
          if (newW >= MIN_CROP) newRect.width = newW;
        }
        if (dragMode.includes("n")) {
          const newY = Math.max(0, cs.y + dy);
          const newH = cs.height - (newY - cs.y);
          if (newH >= MIN_CROP) {
            newRect.y = newY;
            newRect.height = newH;
          }
        }
        if (dragMode.includes("s")) {
          const newH = Math.min(
            photo.originalHeight - cs.y,
            cs.height + dy
          );
          if (newH >= MIN_CROP) newRect.height = newH;
        }
      }

      setCropRect(newRect);
    };

    const handleMouseUp = () => setDragMode(null);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragMode, getScale, photo.originalWidth, photo.originalHeight]);

  const handleSave = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    const maxW = 300;
    const s = Math.min(maxW / cropRect.width, 1);
    canvas.width = Math.round(cropRect.width * s);
    canvas.height = Math.round(cropRect.height * s);
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
    onSave(photo.id, cropRect, canvas.toDataURL("image/jpeg", 0.7));
  }, [cropRect, onSave, photo.id]);

  const handleReset = useCallback(() => {
    setCropRect(photo.cropRect);
  }, [photo.cropRect]);

  const dr = displayRect();
  const hs = HANDLE_SIZE;

  const handles: { mode: DragMode; cursor: string; style: React.CSSProperties }[] = [
    { mode: "nw", cursor: "nw-resize", style: { top: dr.y - hs / 2, left: dr.x - hs / 2 } },
    { mode: "ne", cursor: "ne-resize", style: { top: dr.y - hs / 2, left: dr.x + dr.width - hs / 2 } },
    { mode: "sw", cursor: "sw-resize", style: { top: dr.y + dr.height - hs / 2, left: dr.x - hs / 2 } },
    { mode: "se", cursor: "se-resize", style: { top: dr.y + dr.height - hs / 2, left: dr.x + dr.width - hs / 2 } },
    { mode: "n", cursor: "n-resize", style: { top: dr.y - hs / 2, left: dr.x + dr.width / 2 - hs / 2 } },
    { mode: "s", cursor: "s-resize", style: { top: dr.y + dr.height - hs / 2, left: dr.x + dr.width / 2 - hs / 2 } },
    { mode: "w", cursor: "w-resize", style: { top: dr.y + dr.height / 2 - hs / 2, left: dr.x - hs / 2 } },
    { mode: "e", cursor: "e-resize", style: { top: dr.y + dr.height / 2 - hs / 2, left: dr.x + dr.width - hs / 2 } },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8">
      <div className="bg-white rounded-xl shadow-2xl max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200">
          <div>
            <p className="font-medium text-zinc-800 text-sm">{photo.fileName}</p>
            <p className="text-xs text-zinc-400">
              {photo.originalWidth} x {photo.originalHeight}px — Crop: {Math.round(cropRect.width)} x {Math.round(cropRect.height)}px
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-900">
          <div className="relative inline-block select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt={photo.fileName}
              onLoad={() => setImageLoaded(true)}
              className="block max-w-[75vw] max-h-[65vh]"
              draggable={false}
            />

            {imageLoaded && (
              <>
                {/* Top shade */}
                <div
                  className="absolute left-0 right-0 top-0 bg-black/50 pointer-events-none"
                  style={{ height: dr.y }}
                />
                {/* Bottom shade */}
                <div
                  className="absolute left-0 right-0 bottom-0 bg-black/50 pointer-events-none"
                  style={{ height: `calc(100% - ${dr.y + dr.height}px)` }}
                />
                {/* Left shade */}
                <div
                  className="absolute left-0 bg-black/50 pointer-events-none"
                  style={{ top: dr.y, height: dr.height, width: dr.x }}
                />
                {/* Right shade */}
                <div
                  className="absolute right-0 bg-black/50 pointer-events-none"
                  style={{
                    top: dr.y,
                    height: dr.height,
                    left: dr.x + dr.width,
                  }}
                />

                {/* Crop box */}
                <div
                  className="absolute border-2 border-white/80 border-dashed cursor-move"
                  style={{
                    top: dr.y,
                    left: dr.x,
                    width: dr.width,
                    height: dr.height,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, "move")}
                />

                {/* Resize handles */}
                {handles.map((h) => (
                  <div
                    key={h.mode}
                    className="absolute bg-white border border-zinc-400 rounded-sm z-10"
                    style={{
                      ...h.style,
                      width: hs,
                      height: hs,
                      cursor: h.cursor,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, h.mode)}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-200">
          <button
            onClick={handleReset}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Reset to auto-detect
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
