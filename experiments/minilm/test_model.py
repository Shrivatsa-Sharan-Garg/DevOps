import os
from pathlib import Path
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv
load_dotenv()

# Pull MODEL_PATH and provide a fallback if it's still missing
MODEL_PATH = os.getenv("MODEL_PATH")

print(f"Loading local model from: {MODEL_PATH} ...")
model = SentenceTransformer(MODEL_PATH)
print("Model loaded successfully!")

# Define sample user demands to test semantic matching
sentences = [
    "I need a dark mode toggle for the dashboard.",
    "Can you add a night theme option in settings?",
    "Send me an email notification when a developer accepts a prompt."
]

print("\nGenerating local embeddings...")
embeddings = model.encode(sentences)

# Calculate similarity between sentences
similarity_matrix = cosine_similarity(embeddings)

print("\n--- Semantic Similarity Results ---")
print(f"Sentence 1: '{sentences[0]}'")
print(f"Sentence 2: '{sentences[1]}'")
print(f"-> Similarity Score: {similarity_matrix[0][1]:.4f} (High score = same intent/feature)\n")

print(f"Sentence 1: '{sentences[0]}'")
print(f"Sentence 3: '{sentences[2]}'")
print(f"-> Similarity Score: {similarity_matrix[0][2]:.4f} (Low score = different features)")