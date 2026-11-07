import os
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
load_dotenv()

drive_path = os.getenv("MODEL_PATH")

print(f"Downloading model to: {drive_path} ...")

os.makedirs(drive_path, exist_ok=True)

model = SentenceTransformer("sentence-transformers/paraphrase-MiniLM-L6-v2")

model.save(drive_path)

print("Model successfully downloaded and saved to Google Drive!")