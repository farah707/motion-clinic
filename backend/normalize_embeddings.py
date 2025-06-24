import os
import pickle
import numpy as np

def normalize_embeddings(modality):
    base_path = f"data/medical_images/{modality}"
    emb_path = os.path.join(base_path, "diagnosis_image_embeddings.pkl")
    backup_path = os.path.join(base_path, "diagnosis_image_embeddings_backup.pkl")
    print(f"\nProcessing {modality.upper()}...")

    # Backup original
    if not os.path.exists(backup_path):
        os.rename(emb_path, backup_path)
        print(f"Backed up original embeddings to {backup_path}")
    else:
        print(f"Backup already exists at {backup_path}")

    # Load embeddings
    with open(backup_path, "rb") as f:
        embeddings = pickle.load(f)

    # Normalize
    norm_embeddings = {}
    for diag, emb in embeddings.items():
        norm = np.linalg.norm(emb)
        if norm == 0:
            print(f"Warning: zero norm for {diag}, skipping.")
            continue
        norm_embeddings[diag] = emb / norm

    # Save normalized
    with open(emb_path, "wb") as f:
        pickle.dump(norm_embeddings, f)
    print(f"Saved normalized embeddings to {emb_path}")

if __name__ == "__main__":
    for modality in ["ct", "mri", "xray"]:
        normalize_embeddings(modality)
    print("\nAll embeddings normalized! You can now re-run your analysis.")