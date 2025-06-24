import os
import pickle
import numpy as np
import pandas as pd

def debug_xray_data():
    """Debug the X-ray embeddings and patient data."""
    
    xray_path = "data/medical_images/xray/diagnosis_image_embeddings.pkl"
    xray_data_path = "data/medical_images/xray/patient_data.json"
    
    print("=== DEBUGGING X-RAY DATA ===")
    
    # Load embeddings
    with open(xray_path, "rb") as f:
        embeddings = pickle.load(f)
    
    # Load patient data
    df = pd.read_json(xray_data_path)
    
    print(f"Number of embeddings: {len(embeddings)}")
    print(f"Number of patient records: {len(df)}")
    print(f"DataFrame columns: {list(df.columns)}")
    
    # Show some sample diagnoses
    print("\nSample diagnoses in X-ray dataset:")
    diagnoses = df['diagnosis'].dropna().unique()
    for i, diag in enumerate(diagnoses[:15]):
        print(f"  {i+1}. {diag}")
    
    # Show sample treatments
    print("\nSample treatments:")
    treatments = df['treatment'].dropna().unique()
    for i, treatment in enumerate(treatments[:10]):
        print(f"  {i+1}. {treatment}")
    
    # Check for medications column (try different possible names)
    med_columns = [col for col in df.columns if 'medic' in col.lower()]
    print(f"\nMedication-related columns: {med_columns}")
    
    if med_columns:
        med_col = med_columns[0]  # Use the first medication column found
        print(f"\nSample medications (from '{med_col}' column):")
        medications = df[med_col].dropna().unique()
        for i, med in enumerate(medications[:10]):
            print(f"  {i+1}. {med}")
    
    # Show embedding analysis
    print("\nEmbedding analysis:")
    for diag, emb in list(embeddings.items())[:5]:
        print(f"  Diagnosis: {diag}")
        print(f"    Shape: {emb.shape}")
        print(f"    Norm: {np.linalg.norm(emb):.4f}")

if __name__ == "__main__":
    debug_xray_data() 