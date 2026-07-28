from ultralytics import YOLO

# Load model
model = YOLO("model/best.pt")

# Tampilkan nama class
print("Class pada model:")
print(model.names)