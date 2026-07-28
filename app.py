from flask import Flask, render_template, request, jsonify
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os

app = Flask(__name__)

# Load model
try:
    model = YOLO('model/best.pt')
except Exception as e:
    model = None
    print(f"Error loading model: {e}")

CLASS_MAP = {
    0: ("Anggur", "Layak Konsumsi"),
    1: ("Anggur", "Tidak Layak Konsumsi"),
    2: ("Jeruk", "Layak Konsumsi"),
    3: ("Jeruk", "Tidak Layak Konsumsi"),
    4: ("Pisang", "Layak Konsumsi"),
    5: ("Pisang", "Tidak Layak Konsumsi")
}

INFO_MAP = {
    "Anggur": "Anggur merupakan sumber resveratrol, vitamin K, vitamin C, dan tembaga. Sangat baik untuk kesehatan jantung dan membantu mengurangi peradangan dalam tubuh.",
    "Jeruk": "Jeruk adalah sumber utama vitamin C, serat makanan, dan antioksidan. Konsumsi secara teratur sangat mendukung sistem kekebalan tubuh dan menjaga kesehatan kulit.",
    "Pisang": "Pisang sangat kaya akan kalium, vitamin B6, dan vitamin C. Cocok untuk memberikan energi secara cepat dan menjaga kesehatan saluran pencernaan."
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/detection')
def detection():
    return render_template('detection.html')

@app.route('/upload')
def upload():
    return render_template('upload.html')

@app.route('/api/detect', methods=['POST'])
def detect():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({"error": "No image provided"}), 400
        
    image_data = data['image']
    
    if ',' in image_data:
        image_data = image_data.split(',')[1]
        
    try:
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if model is None:
            return jsonify({"error": "Model not loaded"}), 500
            
        results = model(img)
        detections = []
        
        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                if conf >= 0.70:
                    cls_id = int(box.cls[0])
                    confidence = round(conf * 100, 1)
                    
                    if cls_id in CLASS_MAP:
                        nama_buah, status_kelayakan = CLASS_MAP[cls_id]
                        informasi_buah = INFO_MAP.get(nama_buah, "")
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        
                        detections.append({
                            "nama_buah": nama_buah,
                            "status_kelayakan": status_kelayakan,
                            "confidence": confidence,
                            "informasi_buah": informasi_buah,
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2
                        })
                        
        return jsonify(detections)
                
    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))