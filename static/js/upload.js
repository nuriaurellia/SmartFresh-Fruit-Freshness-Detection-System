document.addEventListener('DOMContentLoaded', () => {
    // ===== TIME SETUP =====
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    if (timeEl && dateEl) {
        const updateTime = () => {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    // ===== FRUIT META =====
    const fruitsMeta = {
        'Pisang': { emoji: '🍌', color: '#F59E0B', tags: ['Kalium', 'Vitamin B6', 'Vitamin C', 'Serat'], tagClass: 'bg-tag-banana' },
        'Jeruk':  { emoji: '🍊', color: '#F97316', tags: ['Vitamin C', 'Folat', 'Antioksidan', 'Serat'], tagClass: 'bg-tag-orange' },
        'Anggur': { emoji: '🍇', color: '#8B5CF6', tags: ['Resveratrol', 'Vitamin K', 'Vitamin C'], tagClass: 'bg-tag-grape' }
    };

    // ===== DOM REFS =====
    const uploadArea       = document.getElementById('upload-area');
    const dropZone         = document.getElementById('drop-zone');
    const previewWrapper   = document.getElementById('preview-wrapper');
    const previewCanvas    = document.getElementById('preview-canvas');
    const boxesContainer   = document.getElementById('upload-boxes-container');
    const fileInput        = document.getElementById('file-input');
    const btnBrowse        = document.getElementById('btn-browse');
    const btnClear         = document.getElementById('btn-clear');
    const btnRedetect      = document.getElementById('btn-redetect');
    const uploadLoading    = document.getElementById('upload-loading');
    const detectList       = document.getElementById('detect-list');
    const badgeCount       = document.getElementById('badge-count');
    const totalDet         = document.getElementById('total-det');
    const statBanana       = document.getElementById('stat-banana');
    const statOrange       = document.getElementById('stat-orange');
    const statGrape        = document.getElementById('stat-grape');
    const infoEmpty        = document.getElementById('info-empty');
    const infoNoDetect     = document.getElementById('info-no-detect');
    const infoContent      = document.getElementById('info-content');
    const infoValNama      = document.getElementById('info-val-nama');
    const infoValStatus    = document.getElementById('info-val-status');
    const infoValConf      = document.getElementById('info-val-conf');
    const infoValDesc      = document.getElementById('info-val-desc');
    const fileNamePill     = document.getElementById('file-name-pill');
    const fileNameText     = document.getElementById('file-name-text');
    const yoloActivePill   = document.getElementById('yolo-active-pill');

    let currentFile = null;
    let currentDetections = [];
    let selectedSignature = null;
    let originalImageObj = null; // stores the HTMLImageElement for redraw

    // ===== FILE INPUT & BROWSE =====
    btnBrowse.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('click', () => {
        // Only open file picker if drop zone is visible (no image loaded)
        if (dropZone.style.display !== 'none' && getComputedStyle(dropZone).display !== 'none') {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
        // Reset input so same file can be re-selected
        fileInput.value = '';
    });

    // ===== DRAG & DROP =====
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
            handleFile(file);
        } else {
            alert('Format file tidak didukung. Gunakan JPG, JPEG, atau PNG.');
        }
    });

    // ===== CLEAR =====
    btnClear.addEventListener('click', () => {
        resetState();
    });

    // ===== REDETECT =====
    btnRedetect.addEventListener('click', () => {
        if (currentFile) {
            runDetection(currentFile);
        }
    });

    // ===== HANDLE FILE =====
    function handleFile(file) {
        currentFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                originalImageObj = img;
                showPreview(img);
                runDetection(file);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showPreview(img) {
        // Show preview, hide drop zone
        dropZone.style.display = 'none';
        previewWrapper.style.display = 'block';
        btnClear.style.display = 'flex';
        btnRedetect.style.display = 'flex';

        // Draw image on canvas
        drawImageOnCanvas(img);

        // Update file name pill
        if (currentFile) {
            fileNameText.textContent = currentFile.name.length > 28
                ? currentFile.name.substring(0, 25) + '...'
                : currentFile.name;
            fileNamePill.classList.remove('hidden');
        }
    }

    function drawImageOnCanvas(img) {
        const containerW = uploadArea.clientWidth;
        const containerH = uploadArea.clientHeight;

        // Determine scale to fit image within container (contain)
        const scaleW = containerW / img.naturalWidth;
        const scaleH = containerH / img.naturalHeight;
        const scale = Math.min(scaleW, scaleH);

        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;

        previewCanvas.width = containerW;
        previewCanvas.height = containerH;

        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, containerW, containerH);

        // Background
        ctx.fillStyle = '#0D1117';
        ctx.fillRect(0, 0, containerW, containerH);

        // Center image
        const offsetX = (containerW - drawW) / 2;
        const offsetY = (containerH - drawH) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    }

    // ===== RUN DETECTION =====
    function runDetection(file) {
        uploadLoading.classList.add('active');
        yoloActivePill.classList.remove('hidden');
        boxesContainer.innerHTML = '';
        resetDetectPanel();

        const reader = new FileReader();
        reader.onload = (ev) => {
            const imageData = ev.target.result;

            fetch('/api/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData })
            })
            .then(res => res.json())
            .then(data => {
                uploadLoading.classList.remove('active');
                if (Array.isArray(data)) {
                    currentDetections = data;
                    renderResults(data);
                } else {
                    currentDetections = [];
                    renderResults([]);
                }
            })
            .catch(err => {
                console.error('Detection error:', err);
                uploadLoading.classList.remove('active');
                currentDetections = [];
                renderResults([]);
            });
        };
        reader.readAsDataURL(file);
    }

    // ===== RENDER RESULTS =====
    function renderResults(detections) {
        // Update stats
        updateStats(detections);

        // Update badge
        badgeCount.textContent = `${detections.length} Objek`;
        detectList.innerHTML = '';
        boxesContainer.innerHTML = '';
        selectedSignature = null;

        if (detections.length === 0) {
            detectList.innerHTML = '<div class="empty-state">Tidak ada buah terdeteksi</div>';
            showNoDetection();
            return;
        }

        // Draw bounding boxes on canvas
        drawBoundingBoxes(detections);

        // Populate detection list
        detections.forEach((det, index) => {
            const meta = fruitsMeta[det.nama_buah] || { emoji: '❓', color: '#ccc', tagClass: '' };
            const isFresh = det.status_kelayakan.toLowerCase().includes('layak konsumsi') &&
                            !det.status_kelayakan.toLowerCase().includes('tidak');
            const signature = `${det.nama_buah}-${det.status_kelayakan}-${index}`;

            const item = document.createElement('div');
            item.className = 'detect-item detect-item-upload';
            item.dataset.signature = signature;
            item.innerHTML = `
                <div class="item-left">
                    <div class="item-emoji">${meta.emoji}</div>
                    <div class="item-details">
                        <span class="item-name">${det.nama_buah}</span>
                        <span class="item-status ${isFresh ? 'text-success' : 'text-danger'}">${det.status_kelayakan}</span>
                    </div>
                </div>
                <div class="item-right">${det.confidence}%</div>
            `;
            item.addEventListener('click', () => selectObject(signature, det, index));
            detectList.appendChild(item);
        });

        // Auto-select first item
        const firstSig = `${detections[0].nama_buah}-${detections[0].status_kelayakan}-0`;
        selectObject(firstSig, detections[0], 0);
    }

    function drawBoundingBoxes(detections) {
        if (!originalImageObj) return;

        const containerW = uploadArea.clientWidth;
        const containerH = uploadArea.clientHeight;
        const imgW = originalImageObj.naturalWidth;
        const imgH = originalImageObj.naturalHeight;

        // Compute scale & offset (same contain logic as drawImageOnCanvas)
        const scaleW = containerW / imgW;
        const scaleH = containerH / imgH;
        const scale = Math.min(scaleW, scaleH);

        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const offsetX = (containerW - drawW) / 2;
        const offsetY = (containerH - drawH) / 2;

        detections.forEach((det, index) => {
            const meta = fruitsMeta[det.nama_buah] || { emoji: '❓', color: '#ccc' };
            const isFresh = det.status_kelayakan.toLowerCase().includes('layak konsumsi') &&
                            !det.status_kelayakan.toLowerCase().includes('tidak');

            // Scale box coordinates
            const x1 = offsetX + det.x1 * scale;
            const y1 = offsetY + det.y1 * scale;
            const x2 = offsetX + det.x2 * scale;
            const y2 = offsetY + det.y2 * scale;
            const boxW = x2 - x1;
            const boxH = y2 - y1;

            const box = document.createElement('div');
            box.className = 'bounding-box';
            box.style.borderColor = meta.color;
            box.style.left = `${x1}px`;
            box.style.top = `${y1}px`;
            box.style.width = `${boxW}px`;
            box.style.height = `${boxH}px`;
            box.style.cursor = 'pointer';
            box.style.pointerEvents = 'auto';
            box.dataset.index = index;

            const statusLabel = isFresh ? '✓ Layak' : '✗ Tdk Layak';
            box.innerHTML = `<div class="box-label" style="background-color: ${meta.color}">${det.nama_buah} ${det.confidence}% · ${statusLabel}</div>`;

            const signature = `${det.nama_buah}-${det.status_kelayakan}-${index}`;
            box.addEventListener('click', () => selectObject(signature, det, index));

            boxesContainer.appendChild(box);
        });
    }

    // ===== SELECT OBJECT =====
    function selectObject(signature, objData, index) {
        selectedSignature = signature;

        // Highlight list item
        document.querySelectorAll('.detect-item').forEach(item => {
            item.classList.toggle('active', item.dataset.signature === signature);
        });

        // Highlight bounding box (add glow effect)
        document.querySelectorAll('.bounding-box').forEach((box, i) => {
            if (parseInt(box.dataset.index) === index) {
                box.style.boxShadow = `0 0 12px 3px ${fruitsMeta[objData.nama_buah]?.color || '#ccc'}`;
                box.style.borderWidth = '3px';
            } else {
                box.style.boxShadow = 'none';
                box.style.borderWidth = '2px';
            }
        });

        // Update info panel
        infoEmpty.style.display = 'none';
        infoNoDetect.style.display = 'none';
        infoContent.style.display = 'block';

        infoValNama.textContent = objData.nama_buah;

        const isFresh = objData.status_kelayakan.toLowerCase().includes('layak konsumsi') &&
                        !objData.status_kelayakan.toLowerCase().includes('tidak');
        infoValStatus.textContent = objData.status_kelayakan;
        infoValStatus.className = 'info-value ' + (isFresh ? 'text-success' : 'text-danger');

        infoValConf.textContent = objData.confidence + '%';
        infoValDesc.textContent = objData.informasi_buah;
    }

    // ===== SHOW NO DETECTION =====
    function showNoDetection() {
        infoEmpty.style.display = 'none';
        infoNoDetect.style.display = 'block';
        infoContent.style.display = 'none';
    }

    // ===== RESET DETECT PANEL =====
    function resetDetectPanel() {
        detectList.innerHTML = '<div class="empty-state">Mendeteksi...</div>';
        badgeCount.textContent = '0 Objek';
        infoEmpty.style.display = 'none';
        infoNoDetect.style.display = 'none';
        infoContent.style.display = 'none';
    }

    // ===== UPDATE STATS =====
    function updateStats(detections) {
        const counts = { Pisang: 0, Jeruk: 0, Anggur: 0 };
        detections.forEach(d => {
            if (counts[d.nama_buah] !== undefined) counts[d.nama_buah]++;
        });
        totalDet.textContent = detections.length;
        statBanana.textContent = counts.Pisang;
        statOrange.textContent = counts.Jeruk;
        statGrape.textContent  = counts.Anggur;
    }

    // ===== RESET STATE =====
    function resetState() {
        currentFile = null;
        currentDetections = [];
        selectedSignature = null;
        originalImageObj = null;

        // Reset UI
        dropZone.style.display = 'flex';
        previewWrapper.style.display = 'none';
        boxesContainer.innerHTML = '';
        btnClear.style.display = 'none';
        btnRedetect.style.display = 'none';
        fileNamePill.classList.add('hidden');
        yoloActivePill.classList.add('hidden');

        // Reset panels
        detectList.innerHTML = '<div class="empty-state">Unggah gambar untuk memulai deteksi</div>';
        badgeCount.textContent = '0 Objek';
        updateStats([]);

        infoEmpty.style.display = 'block';
        infoNoDetect.style.display = 'none';
        infoContent.style.display = 'none';
    }
});
