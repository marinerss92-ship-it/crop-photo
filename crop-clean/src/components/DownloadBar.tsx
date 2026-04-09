"use client";

import { useState } from "react";
import { PhotoItem } from "@/lib/types";
import { downloadAllAsZip } from "@/lib/zip-download";

interface Props {
  photos: PhotoItem[];
  onReset: () => void;
}

export function DownloadBar({ photos, onReset }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState({ done: 0, total: 0 });

  const readyPhotos = photos.filter((p) => p.status === "done");

  const handleDownloadAll = async () => {
    if (readyPhotos.length === 0) return;
    setDownloading(true);
    setDlProgress({ done: 0, total: readyPhotos.length });
    try {
      await downloadAllAsZip(readyPhotos, (done, total) => {
        setDlProgress({ done, total });
      });
    } catch (e) {
      console.error("Download failed:", e);
    }
    setDownloading(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-zinc-200 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-zinc-600">
            <strong>{readyPhotos.length}</strong> photos ready
          </p>
          {downloading && (
            <p className="text-xs text-blue-600">
              Preparing ZIP: {dlProgress.done} / {dlProgress.total}...
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Start Over
          </button>
          <button
            onClick={handleDownloadAll}
            disabled={downloading || readyPhotos.length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {downloading ? "Preparing..." : `Download All (ZIP)`}
          </button>
        </div>
      </div>
    </div>
  );
}
