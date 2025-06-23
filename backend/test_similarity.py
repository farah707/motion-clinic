import os
import pickle
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as transforms
from torchvision.models import densenet121
from sklearn.metrics.pairwise import cosine_similarity

def test_image_similarity(image_path, modality="ct"):
    """Test similarity between a new image and stored embeddings."""
    
    # Load normalized embeddings
    emb_path = f"data/medical_images/{modality}/diagnosis_image_embeddings.pkl"
    with open(emb_path, "rb") as f:
        embeddings = pickle.load(f)
    
    print(f"Loaded {len(embeddings)} embeddings for {modality.upper()}")
    
    # Load and process the image
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    image = Image.open(image_path).convert('RGB')
    img_tensor = transform(image).unsqueeze(0)
    
    # Load DenseNet model
    model = densenet121(weights='DenseNet121_Weights.DEFAULT')
    model.classifier = torch.nn.Linear(1024, 1024)
    model.eval()
    
    # Extract features
    with torch.no_grad():
        features = model(img_tensor)
    
    query_emb = features.squeeze().numpy()
    
    # Normalize the query embedding
    query_norm = np.linalg.norm(query_emb)
    query_emb_normalized = query_emb / query_norm
    
    print(f"Query embedding norm: {query_norm:.4f}")
    print(f"Query embedding normalized norm: {np.linalg.norm(query_emb_normalized):.4f}")
    
    # Compare with stored embeddings
    similarities = []
    for diag, emb in embeddings.items():
        emb_norm = np.linalg.norm(emb)
        print(f"Stored embedding '{diag}' norm: {emb_norm:.4f}")
        
        # Normalize stored embedding
        emb_normalized = emb / emb_norm
        
        # Calculate similarity
        sim = cosine_similarity([query_emb_normalized], [emb_normalized])[0][0]
        similarities.append((diag, sim))
    
    # Sort by similarity
    similarities.sort(key=lambda x: x[1], reverse=True)
    
    print(f"\nTop 5 matches:")
    for diag, sim in similarities[:5]:
        print(f"  {diag}: {sim:.4f} ({sim*100:.2f}%)")
    
    print(f"\nBottom 5 matches:")
    for diag, sim in similarities[-5:]:
        print(f"  {diag}: {sim:.4f} ({sim*100:.2f}%)")

if __name__ == "__main__":
    # Replace with the path to your test image
    test_image = "uploads/test_image.jpg"  # Update this path
    
    if os.path.exists(test_image):
        test_image_similarity(test_image, "ct")
    else:
        print(f"Test image not found: {test_image}")
        print("Please upload an image first, then update the path in this script.") 