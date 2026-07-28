# Multi-Object Detection Dashboard Implementation Plan

Tujuan dari revisi ini adalah mengubah SmartFresh Detection Page menjadi dashboard multi-objek profesional yang memaksimalkan potensi YOLOv8. 

## User Review Required
1. **Statistik Multi-Objek tanpa Tracking ID**: Karena model dasar YOLOv8 tidak memiliki Object Tracker bawaan (seperti ByteTrack/SORT) untuk melacak ID objek unik dari satu frame ke frame lain, saya akan menggunakan pendekatan **Heuristic Cooldown**:
   - Sistem akan menyimpan jumlah objek "aktif" di depan layar (misalnya 2 pisang).
   - Jika jumlah pisang di frame terbaru bertambah menjadi 3, sistem akan menambah statistik +1.
   - Jika satu pisang hilang dari layar (jumlah turun ke 1), sistem tidak akan mengurangi jumlah "aktif" seketika. Sistem akan menunggu selama *3 detik (cooldown)*. Jika pisang tersebut tetap hilang selama 3 detik, barulah sistem "merelakan" pisang tersebut dan menurunkan status "aktif" menjadi 1.
   - Dengan ini, frame yang berkedip/flickering tidak akan menyebabkan statistik bertambah berulang-ulang tanpa batas. Apakah ini sesuai dengan harapan Anda?

## Proposed Changes

### `app.py`
- Mengubah response dari `/api/detect`. Alih-alih hanya mengembalikan 1 objek dengan confidence tertinggi, backend akan memproses *looping* untuk seluruh `results.boxes`.
- Semua deteksi dengan `confidence >= 0.70` akan dimasukkan ke dalam list/array.
- Response JSON akan berupa:
  ```json
  [
    { "nama_buah": "Pisang", "status_kelayakan": "Layak Konsumsi", "confidence": 92.1, "x1": ..., "y1": ..., "x2": ..., "y2": ..., "informasi_buah": "..." },
    ...
  ]
  ```
- Jika tidak ada deteksi yang lolos, kembalikan list kosong `[]`.

### `templates/detection.html`
- **Panel Hasil Deteksi (Kanan Atas)**: Dirombak menjadi container list yang dapat di-*scroll* (overflow-y: auto) dan menampung item-item hasil deteksi secara dinamis.
- **Panel Informasi Buah (Kanan Bawah)**: Tampilan default "Arahkan kamera..." akan terganti ketika user melakukan *click* pada salah satu list item di panel kanan atas. UI akan memuat rincian: Nama Buah, Status (Layak/Tidak Layak Konsumsi), Confidence Model (%), Deskripsi, dan Nutrisi (Tag list).

### `static/css/style.css`
- Menghapus CSS property `.box-emoji` secara permanen.
- Menambahkan styling untuk list deteksi (`.detect-list`, `.detect-item`, `.detect-item:hover`, `.detect-item.active`).
- Memastikan tidak ada rule `transform: scaleX(-1)` pada `#webcam-video`.
- Merapikan desain formatur status panel dan layout dashboard profesional.

### `static/js/main.js`
- **Multi Bounding Box**: Menghapus single-box DOM dan menggantinya dengan iterasi pembentukan div `.bounding-box` dinamis sesuai jumlah objek dalam JSON array response.
- **List & Info Panel**: Saat data diterima, merender list di sebelah kanan atas. Menambahkan *event listener* agar saat sebuah baris diklik, panel di bawahnya menampilkan detail. Jika objek yang dipilih hilang dari layar di frame selanjutnya, panel detail tetap menampilkan info terakhir (atau di-reset sesuai preferensi UI yang stabil).
- **Statistik Cerdas**: Mengimplementasikan logika *heuristic cooldown* 3 detik untuk menjaga perhitungan total sesi buah tetap masuk akal dan mencegah pelonjakan stat tak terkendali.

## Verification Plan
1. Python backend akan dikembangkan dan diuji *dry-run* (memastikan sintaks mapping berjalan lancar dengan list).
2. UI akan dikembangkan untuk mematuhi kaidah dashboard (list responsif, scrollbar bersih, warna modern sesuai *sage green* theme).
3. Logic cooldown JS akan dieksekusi setiap frame untuk divalidasi tidak membanjiri stat.
4. Anda akan diminta untuk mencoba jalankan `python app.py` dan menyorot kamera ke buah asli setelah implementasi selesai.
