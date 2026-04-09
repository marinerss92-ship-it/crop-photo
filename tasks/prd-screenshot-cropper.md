# PRD: Screenshot Photo Cropper

## 1. Introduction / Overview

Many users collect photos by taking screenshots — for example, when building a photo album from images received via messaging apps or social media where direct download isn't available. These screenshots contain unwanted artifacts: black borders, phone status bars (time, battery, signal), navigation bars, white padding, and app UI chrome.

**CropClean** is a web app (hosted on Vercel) that lets users batch-upload these screenshot images, automatically detects and removes the non-photo content (borders, phone UI, padding), and lets them batch-download the cleaned photos — ready for printing or album creation.

## 2. Goals

- Allow users to upload large batches of screenshot photos (up to 1000+).
- Automatically detect and crop out black borders, white borders, phone UI elements (status bar, nav bar), and any non-photo surrounding content.
- Provide a preview step where users can review and manually adjust any crop before downloading.
- Enable batch download of all cropped photos in one action.
- Keep the experience fast, simple, and usable without any account or login.

## 3. User Stories

- **As a user**, I want to drag-and-drop (or select) hundreds of screenshot photos at once so I don't have to process them one by one.
- **As a user**, I want the app to automatically detect where the actual photo starts and ends within each screenshot, removing black bars, white padding, and phone UI elements.
- **As a user**, I want to preview all the auto-cropped results in a grid so I can quickly spot any that need adjustment.
- **As a user**, I want to manually adjust the crop box on individual photos when the auto-detection isn't perfect.
- **As a user**, I want to download all cropped photos at once as a ZIP file so I can use them in my photo album.
- **As a user**, I want the original filenames to be preserved (or logically named) so I can match them back to the originals.

## 4. Functional Requirements

### Upload
1. The system must support drag-and-drop and file picker for batch image upload.
2. The system must accept common image formats (JPG, PNG, WebP, HEIC).
3. The system must handle batches of 1000+ images without crashing.
4. The system must show an upload progress indicator.

### Auto-Crop Detection
5. The system must detect and remove solid or near-solid black borders around the photo content.
6. The system must detect and remove solid or near-solid white borders/padding around the photo content.
7. The system must detect and remove phone UI elements (status bar at the top, navigation bar at the bottom) commonly found in screenshots.
8. The system must find the actual photo region within the screenshot, even when surrounded by app chrome or messaging UI.
9. The auto-crop must work on screenshots from various phone models and screen sizes (iPhone, Android, various aspect ratios).
10. The system must correctly handle both portrait and landscape screenshots, preserving the original orientation after cropping.

### Preview & Adjust
11. The system must display all cropped photos in a scrollable grid/gallery view after processing.
12. Each photo must show a before/after or at least the proposed crop overlay.
13. The user must be able to click on any photo to manually adjust the crop box (drag handles to resize/reposition the crop area).
14. The user must be able to approve all crops at once or individually.
15. The system must show a count of processed / total photos and overall progress.
16. Each photo in the gallery must display a confidence score indicator (e.g., green/yellow/red) so the user can quickly identify which auto-crops may need manual review.
17. The gallery should allow sorting/filtering by confidence score so low-confidence crops surface first.

### Download
18. The system must allow the user to download all cropped photos as a single ZIP file.
19. The system must preserve original filenames in the downloaded files (with an optional suffix like `_cropped`).
20. The system must allow downloading individual cropped photos.
21. The cropped photos must maintain the original image quality (no unnecessary recompression).

### General
22. The system must work entirely without user accounts or login.
23. The system must provide a clear, simple landing page explaining what the tool does.
24. The system must be responsive and usable on desktop browsers (mobile is nice-to-have but not required).

## 5. Non-Goals (Out of Scope)

- **No multi-photo splitting** — the tool assumes one photo per screenshot; it does not detect or split multiple photos within a single screenshot.
- **No AI-based subject detection** — the tool focuses on removing borders and phone UI, not smart recomposition or subject framing.
- **No image editing** — no filters, rotation, color correction, or resizing beyond cropping.
- **No aspect ratio enforcement** — cropped photos keep their natural dimensions (portrait stays portrait, landscape stays landscape).
- **No cloud storage** — photos are processed and stay in the browser; nothing is saved server-side.
- **No user accounts or history** — each session is standalone.
- **No mobile-optimized experience** — desktop-first (handling 1000 photos on mobile isn't practical).

## 6. Design Considerations

- **Landing page**: Minimal — headline, short description, and a large drop zone / upload button. No clutter.
- **Processing view**: Progress bar with count (e.g., "Processing 342 / 1000...").
- **Gallery view**: Grid of thumbnails showing cropped results. Visual indicator for photos that may need review (e.g., low-confidence crops). Click to open an adjustment modal.
- **Adjustment modal**: Shows the original image with a draggable/resizable crop box overlaid. Save / Reset buttons.
- **Download bar**: Sticky bottom bar with "Download All (ZIP)" button and a count of approved photos.
- **Color palette**: Clean, neutral — the photos should be the focus. White/light gray background, minimal accent color.

## 7. Technical Considerations

- **Client-side processing recommended**: Border/padding detection can be done via Canvas API pixel analysis (scan rows/columns for uniform color). This avoids backend costs and keeps photos private.
- **Web Workers**: Processing 1000+ images will block the main thread. Use Web Workers to handle crop detection in parallel.
- **Lazy loading / virtualization**: The gallery grid must use virtualized rendering (e.g., `react-window` or similar) to handle 1000+ thumbnails without performance issues.
- **ZIP generation**: Use a client-side library like `JSZip` + `FileSaver.js` for creating the download archive.
- **HEIC support**: May need a client-side HEIC decoder (e.g., `heic2any`) since browsers don't natively render HEIC.
- **Framework**: Next.js (App Router) deployed on Vercel — simple setup, good performance.
- **No backend needed**: All processing is client-side. Vercel just serves the static/SSR frontend.

## 8. Success Metrics

- A user can upload 100 screenshots and download cropped versions in under 5 minutes.
- Auto-crop correctly identifies the photo region in 90%+ of standard phone screenshots without manual adjustment.
- The app handles 1000 images in a single session without crashing or freezing the browser.
- Users can complete the full flow (upload → review → download) with zero instructions — the UI is self-explanatory.

## 9. Open Questions

1. What is an acceptable processing speed target per image? (Currently estimating ~100-300ms per image client-side for border detection.)
2. Should there be a maximum ZIP file size warning before download (e.g., if 1000 full-resolution photos produce a multi-GB archive)?
