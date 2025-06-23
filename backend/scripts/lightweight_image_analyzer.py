import os
import sys
import argparse
import json
import numpy as np
import pandas as pd
from PIL import Image
import torch
from sklearn.metrics.pairwise import cosine_similarity
from transformers.models.blip import BlipProcessor, BlipForConditionalGeneration
from torchvision.models import densenet121
import torchvision.transforms as transforms
from difflib import get_close_matches
import pickle

# --- Model Loading ---
try:
    # Image embedder
    image_embedder = densenet121(weights='DenseNet121_Weights.DEFAULT')
    image_embedder.classifier = torch.nn.Linear(1024, 1024)
    image_embedder.eval()

    # Image captioner
    caption_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    caption_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

    # Image transform
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
except Exception as e:
    print(json.dumps({"error": f"Model loading failed: {str(e)}"}), file=sys.stderr)
    sys.exit(1)

# --- Helper Functions ---

def encode_image(image_path):
    """Encodes an image into a vector using DenseNet121."""
    try:
        image = Image.open(image_path).convert('RGB')
        img_tensor = transform(image).unsqueeze(0)
        with torch.no_grad():
            features = image_embedder(img_tensor)
        
        # Convert to numpy and normalize to unit length
        query_emb = features.squeeze().numpy()
        query_norm = np.linalg.norm(query_emb)
        if query_norm > 0:
            query_emb = query_emb / query_norm
        
        return query_emb
    except Exception as e:
        raise RuntimeError(f"Failed to encode image at {image_path}: {str(e)}")

def get_image_caption(image_path):
    """Generates a caption for an image using BLIP."""
    try:
        raw_image = Image.open(image_path).convert('RGB')
        inputs = caption_processor(raw_image, return_tensors="pt")
        out = caption_model.generate(**inputs)
        return caption_processor.decode(out[0], skip_special_tokens=True)
    except Exception as e:
        raise RuntimeError(f"Failed to generate caption for {image_path}: {str(e)}")

def find_closest_diagnosis(query_emb, diagnosis_embeddings, threshold=0.01):
    """Finds the most similar diagnosis from pre-computed embeddings."""
    max_sim = -1
    best_diag = None
    best_emb = None
    
    print(f"DEBUG: Looking for matches in {len(diagnosis_embeddings)} diagnoses", file=sys.stderr)
    
    for diag, emb in diagnosis_embeddings.items():
        try:
            # Normalize stored embedding to unit length
            emb_norm = np.linalg.norm(emb)
            if emb_norm > 0:
                emb_normalized = emb / emb_norm
            else:
                continue
            
            sim = cosine_similarity([query_emb], [emb_normalized])[0][0]
            # Ensure similarity is between 0 and 1
            sim = max(0, min(1, sim))
            if sim > max_sim:
                max_sim = sim
                best_diag = diag
                best_emb = emb
        except Exception as e:
            print(f"DEBUG: Error calculating similarity for {diag}: {e}", file=sys.stderr)
            continue
    
    print(f"DEBUG: Best match found: {best_diag} with similarity: {max_sim:.2%}", file=sys.stderr)
    # Always return the best match, regardless of threshold
    return (best_diag, max_sim) if best_diag else (None, max_sim)

def get_context_for_diagnosis(diagnosis_name, df):
    """Retrieves patient context from a DataFrame based on diagnosis."""
    if not diagnosis_name or df is None:
        return None
    
    print(f"DEBUG: Looking for diagnosis: {diagnosis_name}", file=sys.stderr)
    print(f"DEBUG: Available diagnoses: {df['diagnosis'].dropna().unique()[:5]}", file=sys.stderr)
    
    matches = get_close_matches(diagnosis_name.lower(), df['diagnosis'].dropna().str.lower(), n=1, cutoff=0.6)
    if not matches:
        print(f"DEBUG: No close matches found for {diagnosis_name}", file=sys.stderr)
        return None
    
    print(f"DEBUG: Found match: {matches[0]}", file=sys.stderr)
    row = df[df['diagnosis'].str.lower() == matches[0]].iloc[0]
    return row.to_dict()

def generate_simple_report(image_caption, model_type, diagnosis=None):
    """Generates a simple medical report based on image caption and diagnosis."""
    if diagnosis:
        return {
            "final_diagnosis": diagnosis,
            "treatment_plan": "Based on the image analysis, consult with a specialist for proper treatment.",
            "medication_prescribed": "Medication should be prescribed by a qualified healthcare provider.",
            "recommendations": f"Follow up with a {model_type.upper()} specialist for detailed evaluation.",
            "follow_up": "Schedule a follow-up appointment within 2-4 weeks."
        }
    else:
        # Extract diagnosis from caption
        caption_lower = image_caption.lower()
        extracted_diagnosis = "Image analysis completed. Professional evaluation recommended."
        
        # Common medical terms to look for in captions
        medical_terms = {
            'fracture': 'Fracture detected',
            'broken': 'Fracture detected', 
            'crack': 'Fracture detected',
            'dislocation': 'Joint dislocation',
            'sprain': 'Ligament sprain',
            'strain': 'Muscle strain',
            'arthritis': 'Arthritis',
            'tumor': 'Tumor detected',
            'cancer': 'Cancerous growth',
            'infection': 'Infection detected',
            'pneumonia': 'Pneumonia',
            'tuberculosis': 'Tuberculosis',
            'heart disease': 'Heart disease',
            'stroke': 'Stroke',
            'aneurysm': 'Aneurysm',
            'hernia': 'Hernia',
            'ulcer': 'Ulcer',
            'inflammation': 'Inflammation',
            'swelling': 'Swelling',
            'edema': 'Edema'
        }
        
        for term, diagnosis_text in medical_terms.items():
            if term in caption_lower:
                extracted_diagnosis = diagnosis_text
                break
        
        return {
            "final_diagnosis": extracted_diagnosis,
            "treatment_plan": "Consult with a medical specialist for proper diagnosis and treatment.",
            "medication_prescribed": "Medication should be prescribed by a qualified healthcare provider.",
            "recommendations": f"Based on the {model_type.upper()} scan analysis, professional medical evaluation is advised.",
            "follow_up": "Schedule an appointment with a specialist for detailed analysis."
        }

def run_analysis(image_path, model_type):
    """Main analysis function."""
    base_data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'medical_images', model_type)
    
    print(f"DEBUG: Analyzing {model_type} image: {image_path}", file=sys.stderr)
    print(f"DEBUG: Using data path: {base_data_path}", file=sys.stderr)
    
    # --- Load Data ---
    try:
        embeddings_path = os.path.join(base_data_path, "diagnosis_image_embeddings.pkl")
        with open(embeddings_path, "rb") as f:
            diagnosis_embeddings = pickle.load(f)
        
        patient_data_path = os.path.join(base_data_path, "patient_data.json")
        df = pd.read_json(patient_data_path)
        
        print(f"DEBUG: Loaded {len(diagnosis_embeddings)} embeddings and {len(df)} patient records", file=sys.stderr)
    except FileNotFoundError as e:
        return {"error": f"Data file not found for type '{model_type}': {str(e)}"}
    except Exception as e:
        return {"error": f"Failed to load data for type '{model_type}': {str(e)}"}

    # --- Run Pipeline ---
    try:
        query_embedding = encode_image(image_path)
        print(f"DEBUG: Image encoded successfully, embedding shape: {query_embedding.shape}", file=sys.stderr)
        
        diagnosis, sim_score = find_closest_diagnosis(query_embedding, diagnosis_embeddings)

        report = {}
        if diagnosis:  # Always use the best match, regardless of similarity score
            print(f"DEBUG: Found diagnosis match: {diagnosis} with score: {sim_score:.2%}", file=sys.stderr)
            context = get_context_for_diagnosis(diagnosis, df)
            if context:
                # Found a matching diagnosis with context in our dataset
                print(f"DEBUG: Using dataset context for diagnosis", file=sys.stderr)
                report = {
                    "final_diagnosis": context.get('diagnosis', 'N/A'),
                    "treatment_plan": context.get('treatment', 'N/A'),
                    "medication_prescribed": context.get('medications_perscribed', 'N/A'),
                    "recommendations": f"Based on {model_type.upper()} analysis, maintain physical therapy and regular checkups.",
                    "follow_up": "Re-evaluate every 3-6 months."
                }
                report["source"] = "Dataset Match"
            else:
                # Found a diagnosis but no context
                print(f"DEBUG: No context found for diagnosis: {diagnosis}", file=sys.stderr)
                report = generate_simple_report("", model_type, diagnosis)
                report["source"] = "Image Analysis (No Context)"
        else:
            # No matching diagnosis, use image captioning
            print(f"DEBUG: No diagnosis match found, using image captioning", file=sys.stderr)
            caption = get_image_caption(image_path)
            print(f"DEBUG: Generated caption: {caption}", file=sys.stderr)
            report = generate_simple_report(caption, model_type)
            report["source"] = "Image Analysis (Caption)"

        # Ensure similarity score is positive
        sim_score = max(0, sim_score) if sim_score is not None else 0
        report["similarity_score"] = f"{sim_score:.2%}"
        return report

    except Exception as e:
        print(f"DEBUG: Error in analysis: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {"error": str(e)}

# --- Main Execution ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lightweight Medical Image Analysis Engine")
    parser.add_argument("--image_path", type=str, required=True, help="Path to the user-uploaded image.")
    parser.add_argument("--model_type", type=str, required=True, choices=['ct', 'xray', 'mri'], help="Type of medical image.")
    
    args = parser.parse_args()
    
    try:
        result = run_analysis(args.image_path, args.model_type)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}), file=sys.stderr)
        sys.exit(1) 