# Multi-Object Detection Dashboard Tasks

- [/] Update `app.py`
  - Modify `/api/detect` to return an array of detections
  - Process all boxes and apply 0.70 threshold
- [x] Update `templates/detection.html`
  - Implement scrollable list container for "Hasil Deteksi"
  - Revamp "Informasi Buah" structure for dynamic selection
- [x] Update `static/css/style.css`
  - Add styles for list items and states (`.detect-item`, `.active`)
  - Ensure `#webcam-video` is not mirrored
- [x] Update `static/js/main.js`
  - Render multiple `.bounding-box` dynamically
  - Populate "Hasil Deteksi" list and handle click events
  - Manage state for selected object info
  - Implement 3-second cooldown logic for multi-object stats
- [x] Verify functionality
- [x] Create `walkthrough.md`
