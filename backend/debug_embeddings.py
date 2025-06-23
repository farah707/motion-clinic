import os
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import json
import pandas as pd

def debug_embeddings():
    """Debug the embeddings to see what's happening with similarity matching."""
    
    # Load CT embeddings
    ct_path = "data/medical_images/ct/diagnosis_image_embeddings.pkl"
    ct_data_path = "data/medical_images/ct/patient_data.json"
    
    print("=== DEBUGGING CT EMBEDDINGS ===")
    
    # Load embeddings
    with open(ct_path, "rb") as f:
        embeddings = pickle.load(f)
    
    # Load patient data as DataFrame
    df = pd.read_json(ct_data_path)
    
    print(f"Number of embeddings: {len(embeddings)}")
    print(f"Number of patient records: {len(df)}")
    print(f"DataFrame columns: {list(df.columns)}")
    
    # Show some sample diagnoses
    print("\nSample diagnoses in dataset:")
    diagnoses = df['diagnosis'].dropna().unique()
    for i, diag in enumerate(diagnoses[:10]):
        print(f"  {i+1}. {diag}")
    
    # Show embedding shapes and values
    print("\nEmbedding analysis:")
    for diag, emb in list(embeddings.items())[:5]:
        print(f"  Diagnosis: {diag}")
        print(f"    Shape: {emb.shape}")
        print(f"    Min: {emb.min():.4f}, Max: {emb.max():.4f}, Mean: {emb.mean():.4f}")
        print(f"    Norm: {np.linalg.norm(emb):.4f}")
    
    # Test similarity between embeddings
    print("\nSimilarity between embeddings:")
    diag_list = list(embeddings.keys())
    for i in range(min(3, len(diag_list))):
        for j in range(i+1, min(4, len(diag_list))):
            diag1, diag2 = diag_list[i], diag_list[j]
            emb1, emb2 = embeddings[diag1], embeddings[diag2]
            sim = cosine_similarity([emb1], [emb2])[0][0]
            print(f"  {diag1} vs {diag2}: {sim:.4f}")
    
    # Check if embeddings are normalized
    print("\nChecking if embeddings are normalized:")
    norms = [np.linalg.norm(emb) for emb in embeddings.values()]
    print(f"  Min norm: {min(norms):.4f}")
    print(f"  Max norm: {max(norms):.4f}")
    print(f"  Mean norm: {np.mean(norms):.4f}")
    
    # Test with a dummy embedding
    print("\nTesting with dummy embedding:")
    dummy_emb = np.random.randn(1024)  # Same size as DenseNet features
    dummy_emb = dummy_emb / np.linalg.norm(dummy_emb)  # Normalize
    
    similarities = []
    for diag, emb in embeddings.items():
        sim = cosine_similarity([dummy_emb], [emb])[0][0]
        similarities.append((diag, sim))
    
    similarities.sort(key=lambda x: x[1], reverse=True)
    print("Top 5 matches with dummy embedding:")
    for diag, sim in similarities[:5]:
        print(f"  {diag}: {sim:.4f}")

if __name__ == "__main__":
    debug_embeddings() 