document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Time
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    if (timeEl && dateEl) {
        setInterval(() => {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }, 1000);
    }

    // 2. Setup Camera
    const video = document.getElementById('webcam-video');
    if (!video) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const boxesContainer = document.getElementById('boxes-container');
    const detectList = document.getElementById('detect-list');
    const badgeCount = document.getElementById('badge-count');
    
    // Info Panel
    const infoEmpty = document.getElementById('info-empty');
    const infoContent = document.getElementById('info-content');
    const infoValNama = document.getElementById('info-val-nama');
    const infoValStatus = document.getElementById('info-val-status');
    const infoValConf = document.getElementById('info-val-conf');
    const infoValDesc = document.getElementById('info-val-desc');
    const infoValTags = document.getElementById('info-val-tags');

    const fruitsMeta = {
        'Pisang': { emoji: '🍌', color: '#F59E0B', tags: ['Kalium', 'Vitamin B6', 'Vitamin C', 'Serat'], tagClass: 'bg-tag-banana' },
        'Jeruk': { emoji: '🍊', color: '#F97316', tags: ['Vitamin C', 'Folat', 'Antioksidan', 'Serat'], tagClass: 'bg-tag-orange' },
        'Anggur': { emoji: '🍇', color: '#8B5CF6', tags: ['Resveratrol', 'Vitamin K', 'Vitamin C'], tagClass: 'bg-tag-grape' }
    };

    let isDetecting = false;
    let currentStream = null;
    let detectionInterval = null;

    // Selection State
    let selectedId = null; // We will use a signature: "Nama-Status" to keep selection

    function startCamera() {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                currentStream = stream;
                video.srcObject = stream;
                video.style.display = 'block';
                
                document.getElementById('camera-off-placeholder').style.display = 'none';
                document.getElementById('grid-overlay').style.display = 'block';
                document.getElementById('res-pill').style.display = 'flex';
                document.getElementById('yolo-pill').style.display = 'flex';
                document.getElementById('rec-indicator').style.display = 'flex';
                
                document.getElementById('sys-status-text').textContent = "Kamera Aktif";
                document.getElementById('sys-status-dot').style.backgroundColor = "#22c55e";
                
                video.play();
                
                video.addEventListener('loadeddata', () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    document.getElementById('cam-res-text').textContent = `${video.videoWidth} × ${video.videoHeight} · 30fps`;
                    
                    if(detectionInterval) clearInterval(detectionInterval);
                    detectionInterval = setInterval(sendFrameForDetection, 1000); // 1s interval for responsive dashboard
                }, { once: true });
            })
            .catch(err => {
                console.error("Camera error:", err);
                alert("Tidak dapat mengakses kamera.");
            });
    }

    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
        video.style.display = 'none';
        document.getElementById('camera-off-placeholder').style.display = 'flex';
        document.getElementById('grid-overlay').style.display = 'none';
        document.getElementById('res-pill').style.display = 'none';
        document.getElementById('yolo-pill').style.display = 'none';
        document.getElementById('rec-indicator').style.display = 'none';
        
        document.getElementById('sys-status-text').textContent = "Kamera Offline";
        document.getElementById('sys-status-dot').style.backgroundColor = "#8A9B89";
        
        updateUI([]);
    }

    document.getElementById('btn-cam-on').addEventListener('click', () => { if(!currentStream) startCamera(); });
    document.getElementById('btn-cam-off').addEventListener('click', stopCamera);
    startCamera();

    function sendFrameForDetection() {
        if (isDetecting || !video.videoWidth || !currentStream) return;
        isDetecting = true;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        fetch('/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        })
        .then(res => res.json())
        .then(data => {
            // Check if backend returned array (success) or object (error)
            if(Array.isArray(data)) {
                updateUI(data);
            } else {
                updateUI([]);
            }
        })
        .catch(err => console.error("Detection error:", err))
        .finally(() => {
            isDetecting = false;
        });
    }

    function updateStats(detections) {
        let currentFrameCounts = { Pisang: 0, Jeruk: 0, Anggur: 0 };
        detections.forEach(d => {
            if (currentFrameCounts[d.nama_buah] !== undefined) {
                currentFrameCounts[d.nama_buah]++;
            }
        });

        document.getElementById('total-det').textContent = detections.length;
        document.getElementById('stat-banana').textContent = currentFrameCounts.Pisang;
        document.getElementById('stat-orange').textContent = currentFrameCounts.Jeruk;
        document.getElementById('stat-grape').textContent = currentFrameCounts.Anggur;
    }

    function selectObject(signature, objData) {
        selectedId = signature;
        
        // Re-render list to show active state
        document.querySelectorAll('.detect-item').forEach(item => {
            if(item.dataset.signature === signature) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Info Panel
        infoEmpty.style.display = 'none';
        infoContent.style.display = 'block';

        infoValNama.textContent = objData.nama_buah;
        
        const isFresh = objData.status_kelayakan.toLowerCase().includes('layak konsumsi') && !objData.status_kelayakan.toLowerCase().includes('tidak');
        infoValStatus.textContent = objData.status_kelayakan;
        infoValStatus.className = 'info-value ' + (isFresh ? 'text-success' : 'text-danger');
        
        infoValConf.textContent = objData.confidence + '%';
        infoValDesc.textContent = objData.informasi_buah;

        const meta = fruitsMeta[objData.nama_buah];
        infoValTags.innerHTML = '';
        if(meta) {
            meta.tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = `tag-pill ${meta.tagClass}`;
                span.textContent = tag;
                infoValTags.appendChild(span);
            });
        }
    }

    function updateUI(detections) {
        // 1. Update Stats
        updateStats(detections);

        // 2. Clear previous UI
        boxesContainer.innerHTML = '';
        detectList.innerHTML = '';
        badgeCount.textContent = `${detections.length} Objek`;

        if (detections.length === 0) {
            detectList.innerHTML = `<div class="empty-state">Tidak ada buah terdeteksi</div>`;
            return; // keep last selected info in panel just in case, or we can leave it
        }

        // 3. Render Boxes & List
        const cameraAreaEl = document.getElementById('camera-area');
        const containerW = cameraAreaEl.clientWidth;
        const containerH = cameraAreaEl.clientHeight;
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        
        const scale = Math.max(containerW / videoW, containerH / videoH);
        const offsetX = (containerW - (videoW * scale)) / 2;
        const offsetY = (containerH - (videoH * scale)) / 2;

        let foundSelectedInCurrentFrame = false;

        detections.forEach((det, index) => {
            const meta = fruitsMeta[det.nama_buah] || { emoji: '❓', color: '#ccc', tagClass: '' };
            const isFresh = det.status_kelayakan.toLowerCase().includes('layak konsumsi') && !det.status_kelayakan.toLowerCase().includes('tidak');
            
            // Signature for selection tracking
            const signature = `${det.nama_buah}-${det.status_kelayakan}-${index}`;

            // Draw Box
            // Because video is CSS-flipped with scaleX(-1), we must mirror X coordinates
            const rawX1 = offsetX + (det.x1 * scale);
            const rawX2 = offsetX + (det.x2 * scale);
            const displayY1 = offsetY + (det.y1 * scale);
            const displayY2 = offsetY + (det.y2 * scale);

            // Mirror X across container width to match scaleX(-1)
            const displayX1 = containerW - rawX2;
            const displayX2 = containerW - rawX1;

            const box = document.createElement('div');
            box.className = 'bounding-box';
            box.style.borderColor = meta.color;
            box.style.left = `${displayX1}px`;
            box.style.top = `${displayY1}px`;
            box.style.width = `${displayX2 - displayX1}px`;
            box.style.height = `${displayY2 - displayY1}px`;

            box.innerHTML = `<div class="box-label" style="background-color: ${meta.color}">${det.nama_buah} - ${det.confidence}%</div>`;
            boxesContainer.appendChild(box);

            // Draw List Item
            const item = document.createElement('div');
            item.className = 'detect-item';
            if (signature === selectedId) {
                item.classList.add('active');
                foundSelectedInCurrentFrame = true;
                // Auto-update info panel values silently
                selectObject(signature, det); 
            }
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

            item.addEventListener('click', () => selectObject(signature, det));
            detectList.appendChild(item);
        });

        // If nothing is selected currently but we have items, we don't force select.
        // Wait, requirement: "Jika user klik salah satu hasil deteksi pada panel kanan atas: Maka panel informasi berubah".
        // It implies empty state until clicked. We leave it as is.
    }
});
