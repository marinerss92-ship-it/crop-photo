## Relevant Files

- `src/app/page.tsx` - Main landing page with upload zone and app flow
- `src/app/layout.tsx` - Root layout with metadata and global styles
- `src/app/globals.css` - Global styles (Tailwind)
- `src/components/UploadZone.tsx` - Drag-and-drop + file picker upload component
- `src/components/ProcessingView.tsx` - Progress bar during auto-crop processing
- `src/components/Gallery.tsx` - Virtualized grid of cropped photo thumbnails
- `src/components/PhotoCard.tsx` - Individual photo thumbnail with confidence indicator
- `src/components/CropAdjustModal.tsx` - Modal for manual crop adjustment
- `src/components/DownloadBar.tsx` - Sticky bottom bar with download actions
- `src/workers/crop-worker.ts` - Web Worker for auto-crop detection logic
- `src/lib/crop-engine.ts` - Core crop detection algorithm (border/UI detection via pixel analysis)
- `src/lib/types.ts` - Shared TypeScript types
- `src/lib/zip-download.ts` - ZIP generation and download helper
- `next.config.js` - Next.js configuration (Web Worker support)
- `tailwind.config.ts` - Tailwind CSS configuration
- `package.json` - Dependencies and scripts

### Notes

- All image processing is client-side (Canvas API + Web Workers).
- No backend/API routes needed — Vercel serves static frontend only.
- Use `react-window` for virtualized rendering of 1000+ thumbnails.
- Use `JSZip` + `file-saver` for client-side ZIP generation.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch `feature/screenshot-cropper`

- [ ] 1.0 Project Setup
  - [ ] 1.1 Initialize Next.js project with TypeScript, Tailwind CSS, App Router
  - [ ] 1.2 Install dependencies: `jszip`, `file-saver`, `react-window`, `@types/react-window`
  - [ ] 1.3 Configure `next.config.js` for Web Worker support
  - [ ] 1.4 Set up shared types in `src/lib/types.ts`
  - [ ] 1.5 Set up global styles and Tailwind config

- [ ] 2.0 Upload Component
  - [ ] 2.1 Create `UploadZone.tsx` with drag-and-drop area and file input
  - [ ] 2.2 Accept JPG, PNG, WebP, HEIC formats
  - [ ] 2.3 Handle batch file selection (1000+ files)
  - [ ] 2.4 Show upload count and file list feedback
  - [ ] 2.5 Pass uploaded files to parent for processing

- [ ] 3.0 Auto-Crop Detection Engine
  - [ ] 3.1 Create `src/lib/crop-engine.ts` with border detection algorithm (scan rows/columns for uniform color)
  - [ ] 3.2 Implement black border detection (near-solid dark pixels)
  - [ ] 3.3 Implement white border/padding detection (near-solid light pixels)
  - [ ] 3.4 Implement phone UI strip detection (status bar, nav bar regions)
  - [ ] 3.5 Compute confidence score based on detection clarity
  - [ ] 3.6 Handle both portrait and landscape orientations
  - [ ] 3.7 Create `src/workers/crop-worker.ts` Web Worker to run detection off main thread
  - [ ] 3.8 Create `ProcessingView.tsx` with progress bar and count

- [ ] 4.0 Preview Gallery
  - [ ] 4.1 Create virtualized `Gallery.tsx` using `react-window` for 1000+ thumbnails
  - [ ] 4.2 Create `PhotoCard.tsx` showing cropped thumbnail with confidence badge (green/yellow/red)
  - [ ] 4.3 Add sort/filter controls to surface low-confidence crops first
  - [ ] 4.4 Show processed count and overall stats

- [ ] 5.0 Crop Adjustment Modal
  - [ ] 5.1 Create `CropAdjustModal.tsx` with original image display
  - [ ] 5.2 Render draggable/resizable crop box overlay
  - [ ] 5.3 Add Save / Reset buttons to confirm or revert adjustments
  - [ ] 5.4 Update crop data in state on save

- [ ] 6.0 Batch Download
  - [ ] 6.1 Create `src/lib/zip-download.ts` using JSZip to package cropped images
  - [ ] 6.2 Render cropped images to canvas at original quality (no recompression)
  - [ ] 6.3 Create `DownloadBar.tsx` with "Download All (ZIP)" and individual download
  - [ ] 6.4 Preserve original filenames with `_cropped` suffix
  - [ ] 6.5 Show download progress for large batches

- [ ] 7.0 Landing Page & Polish
  - [ ] 7.1 Design clean landing page in `page.tsx` (headline, description, upload zone)
  - [ ] 7.2 Wire up full flow: Upload → Process → Preview → Download
  - [ ] 7.3 Add responsive layout and clean styling
  - [ ] 7.4 Add loading states and error handling

- [ ] 8.0 Deploy to Vercel
  - [ ] 8.1 Connect GitHub repo to Vercel project
  - [ ] 8.2 Push code and trigger deployment
  - [ ] 8.3 Verify live deployment works end-to-end
