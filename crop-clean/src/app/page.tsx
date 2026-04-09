"use client";

import { useState, useCallback } from "react";
import { PhotoItem, AppPhase, CropRect } from "@/lib/types";
import { processFile } from "@/lib/image-utils";
import { UploadZone } from "@/components/UploadZone";
import { ProcessingView } from "@/components/ProcessingView";
import { Gallery } from "@/components/Gallery";
import { CropAdjustModal } from "@/components/CropAdjustModal";
import { DownloadBar } from "@/components/DownloadBar";

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("upload");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const items: PhotoItem[] = files.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      fileName: f.name,
      originalWidth: 0,
      originalHeight: 0,
      thumbnailUrl: "",
      cropRect: { x: 0, y: 0, width: 0, height: 0 },
      adjustedCropRect: null,
      confidence: 0,
      status: "pending" as const,
    }));

    setPhotos(items);
    setPhase("processing");
    setProgress({ done: 0, total: files.length });

    const processed = [...items];

    for (let i = 0; i < processed.length; i++) {
      try {
        const result = await processFile(processed[i].file);
        processed[i] = {
          ...processed[i],
          cropRect: result.cropResult.rect,
          confidence: result.cropResult.confidence,
          thumbnailUrl: result.thumbnailUrl,
          originalWidth: result.originalWidth,
          originalHeight: result.originalHeight,
          status: "done",
        };
      } catch {
        processed[i] = { ...processed[i], status: "error" };
      }
      setPhotos([...processed]);
      setProgress({ done: i + 1, total: files.length });
      await new Promise((r) => setTimeout(r, 0));
    }

    setPhase("preview");
  }, []);

  const handleCropSave = useCallback(
    (photoId: string, newCropRect: CropRect, newThumbnailUrl: string) => {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? {
                ...p,
                adjustedCropRect: newCropRect,
                thumbnailUrl: newThumbnailUrl,
              }
            : p
        )
      );
      setSelectedPhotoId(null);
    },
    []
  );

  const handleReset = useCallback(() => {
    setPhase("upload");
    setPhotos([]);
    setProgress({ done: 0, total: 0 });
    setSelectedPhotoId(null);
  }, []);

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId) || null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h1 className="text-xl font-bold text-zinc-900">CropClean</h1>
          </div>
          {phase !== "upload" && (
            <button
              onClick={handleReset}
              className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              New batch
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {phase === "upload" && (
          <div className="max-w-2xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-zinc-900 mb-3">
                Clean up your screenshot photos
              </h2>
              <p className="text-lg text-zinc-500 max-w-md mx-auto">
                Automatically remove black borders, white padding, and phone UI
                from your screenshots. Batch process up to 1000+ photos.
              </p>
            </div>

            <UploadZone onFilesSelected={handleFilesSelected} />

            <div className="mt-16 grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                  1
                </div>
                <p className="text-sm font-medium text-zinc-800">Upload</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Drop or select your screenshots
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                  2
                </div>
                <p className="text-sm font-medium text-zinc-800">Auto-crop</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Borders and UI removed automatically
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                  3
                </div>
                <p className="text-sm font-medium text-zinc-800">Download</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Get all cropped photos as a ZIP
                </p>
              </div>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div className="max-w-2xl mx-auto px-6 py-16">
            <ProcessingView done={progress.done} total={progress.total} />
          </div>
        )}

        {phase === "preview" && (
          <div className="max-w-7xl mx-auto px-6 py-6 pb-24">
            <Gallery
              photos={photos}
              onPhotoClick={(id) => setSelectedPhotoId(id)}
            />
          </div>
        )}
      </main>

      {/* Download bar */}
      {phase === "preview" && (
        <DownloadBar photos={photos} onReset={handleReset} />
      )}

      {/* Crop adjustment modal */}
      {selectedPhoto && (
        <CropAdjustModal
          photo={selectedPhoto}
          onSave={handleCropSave}
          onClose={() => setSelectedPhotoId(null)}
        />
      )}
    </div>
  );
}
