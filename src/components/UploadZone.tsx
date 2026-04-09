"use client";

import { useState, useCallback, useRef } from "react";

interface Props {
  onFilesSelected: (files: File[]) => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function UploadZone({ onFilesSelected }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const filterImages = (files: FileList | File[]): File[] => {
    return Array.from(files).filter(
      (f) => ACCEPTED_TYPES.includes(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name)
    );
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const images = filterImages(e.dataTransfer.files);
    if (images.length > 0) setSelectedFiles(images);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const images = filterImages(e.target.files);
        if (images.length > 0) setSelectedFiles(images);
      }
    },
    []
  );

  const handleStart = () => onFilesSelected(selectedFiles);
  const handleClear = () => {
    setSelectedFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (selectedFiles.length > 0) {
    return (
      <div className="flex flex-col items-center gap-6 p-10">
        <div className="flex items-center gap-3 text-lg text-zinc-700">
          <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            <strong>{selectedFiles.length}</strong> image{selectedFiles.length !== 1 && "s"} selected
          </span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Crop All
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-3 text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`
        flex flex-col items-center justify-center gap-4 p-16 border-2 border-dashed rounded-2xl cursor-pointer transition-all
        ${isDragOver ? "border-blue-500 bg-blue-50" : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100"}
      `}
    >
      <svg className="w-12 h-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <div className="text-center">
        <p className="text-lg font-medium text-zinc-700">
          Drop your screenshots here
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          or click to browse — JPG, PNG, WebP
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
