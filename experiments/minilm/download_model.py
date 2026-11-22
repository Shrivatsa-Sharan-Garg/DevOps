import os
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
load_dotenv()

drive_path = os.getenv("MINILM_MODEL_PATH") or os.getenv("MODEL_PATH")

if not drive_path:
    raise RuntimeError("Set MINILM_MODEL_PATH to the destination folder before running this optional download helper.")

print(f"Downloading model to: {drive_path} ...")

os.makedirs(drive_path, exist_ok=True)

model = SentenceTransformer("sentence-transformers/paraphrase-MiniLM-L6-v2")

model.save(drive_path)

print("Model successfully downloaded and saved to Google Drive!")
