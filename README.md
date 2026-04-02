# Online Drive - Demo

A simple client-side online-storage demo (Google Drive-like) built with HTML, Tailwind CSS (CDN) and vanilla JavaScript.

Features:
- Folder tree in the sidebar
- Create folder, rename, delete
- Upload files (stored in localStorage as data URLs)
- Download and delete files
- Search files/folders
- Persists data in browser `localStorage` (demo only)

How to run:
1. Open `index.html` in your browser (double-click or via a local server).
2. Use the sidebar to navigate folders, `Upload` to add files, `Folder+` to create folders.

Notes:
- This is a frontend-only demo. For a real online storage app you need a backend and persistent storage.
- Files are stored as data URLs in `localStorage` so they're limited by browser storage quotas.

Files:
- `index.html` — main UI
- `js/app.js` — application logic

If you want, I can:
- Add download size/preview for images
- Replace localStorage with a tiny Node.js backend API
- Add drag-and-drop and multi-file upload

