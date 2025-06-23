import os
import sys
import argparse
import json
import numpy as np
import pandas as pd
from PIL import Image
import torch
from sklearn.metrics.pairwise import cosine_similarity
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM, BlipProcessor, BlipForConditionalGeneration
from torchvision.models import densenet121
import torchvision.transforms as transforms
from difflib import get_close_matches
import pickle

# --- Model & Tokenizer Loading ---
# We load models once to be efficient.
# In a real server, these would be loaded once when the server starts.
try:
    # LLM for generation
    llm_model_name = "microsoft/phi-2"
    tokenizer = AutoTokenizer.from_pretrained(llm_model_name, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(llm_model_name, trust_remote_code=True, device_map="auto", torch_dtype=torch.float16)
    rag_pipeline = pipeline("text-generation", model=model, tokenizer=tokenizer)

    # Image embedder
    image_embedder = densenet121(weights='DenseNet121_Weights.DEFAULT')
    image_embedder.classifier = torch.nn.Identity()
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
    """Encodes an image into a vector using a pre-trained model."""
    try:
        image = Image.open(image_path).convert('RGB')
        img_tensor = transform(image).unsqueeze(0)
        with torch.no_grad():
            features = image_embedder(img_tensor)
        return features.squeeze().numpy()
    except Exception as e:
        raise RuntimeError(f"Failed to encode image at {image_path}: {str(e)}")


def get_image_caption(image_path):
    """Generates a caption for an image."""
    try:
        raw_image = Image.open(image_path).convert('RGB')
        inputs = caption_processor(raw_image, return_tensors="pt")
        out = caption_model.generate(**inputs)
        return caption_processor.decode(out[0], skip_special_tokens=True)
    except Exception as e:
        raise RuntimeError(f"Failed to generate caption for {image_path}: {str(e)}")


def find_closest_diagnosis(query_emb, diagnosis_embeddings, threshold=0.85):
    """Finds the most similar diagnosis from pre-computed embeddings."""
    max_sim = -1
    best_diag = None
    for diag, emb in diagnosis_embeddings.items():
        sim = cosine_similarity([query_emb], [emb])[0][0]
        if sim > max_sim:
            max_sim = sim
            best_diag = diag
    return (best_diag, max_sim) if max_sim >= threshold else (None, max_sim)


def get_context_for_diagnosis(diagnosis_name, df):
    """Retrieves patient context from a DataFrame based on diagnosis."""
    if not diagnosis_name or df is None:
        return None
    matches = get_close_matches(diagnosis_name.lower(), df['diagnosis'].dropna().str.lower(), n=1, cutoff=0.6)
    if not matches:
        return None
    row = df[df['diagnosis'].str.lower() == matches[0]].iloc[0]
    return row.to_dict()


def call_llm(prompt):
    """Calls the LLM to generate text based on a prompt."""
    try:
        response = rag_pipeline(prompt, max_new_tokens=300, do_sample=False, temperature=0.0)
        generated_text = response[0]["generated_text"]
        # Clean the response by removing the prompt
        if generated_text.startswith(prompt):
            return generated_text[len(prompt):].strip()
        return generated_text.strip()
    except Exception as e:
        raise RuntimeError(f"LLM generation failed: {str(e)}")


def format_final_report(diagnosis, treatment, medications, recommendations, follow_up):
    """Formats the final report into a structured dictionary."""
    return {
        "final_diagnosis": diagnosis,
        "treatment_plan": treatment,
        "medication_prescribed": medications,
        "recommendations": recommendations,
        "follow_up": follow_up
    }

def generate_llm_report(prompt):
    """Generates and parses a structured report from the LLM."""
    llm_output = call_llm(prompt)
    
    # Basic parsing of the LLM output
    diagnosis = "Could not determine"
    treatment = "Could not determine"
    medication = "Could not determine"
    recommendations = "Consult a specialist."
    follow_up = "Follow up as recommended by your doctor."
    
    lines = llm_output.split('\n')
    for line in lines:
        if "final diagnosis" in line.lower():
            diagnosis = line.split(":", 1)[-1].strip()
        elif "treatment plan" in line.lower():
            treatment = line.split(":", 1)[-1].strip()
        elif "medication prescribed" in line.lower() or "medications" in line.lower():
            medication = line.split(":", 1)[-1].strip()
        elif "recommendations" in line.lower():
            recommendations = line.split(":", 1)[-1].strip()
        elif "follow-up" in line.lower():
            follow_up = line.split(":", 1)[-1].strip()

    return format_final_report(diagnosis, treatment, medication, recommendations, follow_up)


def run_analysis(image_path, model_type):
    """Main analysis function."""
    base_data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'medical_images', model_type)
    
    # --- Load Data ---
    try:
        embeddings_path = os.path.join(base_data_path, "diagnosis_image_embeddings.pkl")
        with open(embeddings_path, "rb") as f:
            diagnosis_embeddings = pickle.load(f)
        
        patient_data_path = os.path.join(base_data_path, "patient_data.json")
        df = pd.read_json(patient_data_path)
    except FileNotFoundError as e:
        return {"error": f"Data file not found for type '{model_type}': {str(e)}"}
    except Exception as e:
        return {"error": f"Failed to load data for type '{model_type}': {str(e)}"}

    # --- Run Pipeline ---
    try:
        query_embedding = encode_image(image_path)
        diagnosis, sim_score = find_closest_diagnosis(query_embedding, diagnosis_embeddings)

        report = {}
        if diagnosis:
            context = get_context_for_diagnosis(diagnosis, df)
            if context:
                # Found a matching diagnosis with context in our dataset
                report = format_final_report(
                    diagnosis=context.get('diagnosis', 'N/A'),
                    treatment=context.get('treatment', 'N/A'),
                    medications=context.get('medications', 'N/A'),
                    recommendations="Maintain physical therapy and regular checkups.",
                    follow_up="Re-evaluate every 3-6 months."
                )
                report["source"] = "Dataset Match"
            else:
                # Found a diagnosis but no context, generate with LLM
                prompt = f"Generate a detailed medical report for a patient with a likely diagnosis of {diagnosis} based on a {model_type.upper()} scan. Include treatment, medication, recommendations, and follow-up."
                report = generate_llm_report(prompt)
                report["source"] = "LLM Generation (No Context)"
        else:
            # No matching diagnosis, use image captioning and LLM
            caption = get_image_caption(image_path)
            prompt = f"Generate a detailed medical report based on the following {model_type.upper()} scan summary: '{caption}'. Include a potential diagnosis, treatment plan, medications, recommendations, and follow-up."
            report = generate_llm_report(prompt)
            report["source"] = "LLM Generation (Image Caption)"

        report["similarity_score"] = f"{sim_score:.2%}" if sim_score is not None else "N/A"
        return report

    except Exception as e:
        return {"error": str(e)}

# --- Main Execution ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Medical Image Analysis Engine")
    parser.add_argument("--image_path", type=str, required=True, help="Path to the user-uploaded image.")
    parser.add_argument("--model_type", type=str, required=True, choices=['ct', 'xray', 'mri'], help="Type of medical image.")
    
    args = parser.parse_args()
    
    try:
        result = run_analysis(args.image_path, args.model_type)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}), file=sys.stderr)
        sys.exit(1) 