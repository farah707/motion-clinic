#!/usr/bin/env python3
"""
RAG Medical Assistant - Backend Integration Script
Based on Colab RAG pipeline for medical appointment system
"""

import pandas as pd
import numpy as np
import faiss
import json
import os
import pickle
import argparse
import sys
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import re
from typing import List, Dict, Any

class MedicalRAGProcessor:
    def __init__(self, data_path: str = "data/raw/patients_data.csv"):
        self.data_path = data_path
        self.df = None
        self.embedder = None
        self.index = None
        self.tokenizer = None
        self.model = None
        self.corpus_embeddings = None
        
    def load_and_preprocess_data(self):
        """Load and preprocess the medical dataset"""
        print("Loading medical dataset...")
        
        # Load the dataset
        self.df = pd.read_csv(self.data_path)
        
        # Clean column names
        self.df.rename(columns={
            'Medications perscribed ': 'Medications prescribed',
            'Patient id+G9E5A1:G11A1:G1A1:H90': 'Patient id'
        }, inplace=True)
        
        # Combine fields into a single text field for retrieval
        self.df["combined_text"] = (
            "Complaint: " + self.df["Complain"].fillna("") +
            ". Diagnosis: " + self.df["Diagnosis"].fillna("") +
            ". History: " + self.df["History"].fillna("") +
            ". Treatment: " + self.df["Treatment plan"].fillna("") +
            ". Medications: " + self.df["Medications prescribed"].fillna("")
        )
        
        print(f"Loaded {len(self.df)} medical cases")
        return self.df
    
    def create_embeddings_and_index(self):
        """Create embeddings and FAISS index"""
        print("Creating embeddings and FAISS index...")
        
        # Load Sentence-BERT model
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Encode all combined texts
        self.corpus_embeddings = self.embedder.encode(
            self.df["combined_text"].tolist(), 
            show_progress_bar=True
        )
        
        # Create FAISS index
        embedding_dim = self.corpus_embeddings.shape[1]
        self.index = faiss.IndexFlatL2(embedding_dim)
        self.index.add(np.array(self.corpus_embeddings))
        
        print(f"Created FAISS index with {len(self.corpus_embeddings)} embeddings")
        
    def load_bio_gpt_model(self):
        """Load BioGPT model for response generation"""
        print("Loading BioGPT model...")
        
        self.tokenizer = AutoTokenizer.from_pretrained("microsoft/BioGPT")
        self.model = AutoModelForCausalLM.from_pretrained("microsoft/BioGPT")
        
        print("BioGPT model loaded successfully")
    
    def retrieve_similar_cases(self, input_text: str, age: int = None, 
                             gender: str = None, top_n: int = 5, filter_top: int = 3) -> List[Dict]:
        """Retrieve similar medical cases based on input"""
        # First get more candidates than needed
        input_embedding = self.embedder.encode([input_text])
        D, I = self.index.search(np.array(input_embedding), top_n * 3)
        candidates = self.df.iloc[I[0]]
        
        # Score with combined age and semantic similarity
        result = []
        for _, row in candidates.iterrows():
            # Basic semantic similarity
            semantic_score = float(cosine_similarity(
                [input_embedding[0]],
                [self.embedder.encode([row['combined_text']])[0]]
            )[0][0])
            
            # Apply age penalty if we have age data
            age_factor = 1.0
            if age is not None and 'Age' in self.df.columns:
                try:
                    patient_age = int(age)
                    case_age = int(row['Age']) if not pd.isna(row['Age']) else 0
                    # Reduce score by 20% for every decade difference
                    age_diff = abs(patient_age - case_age) / 10
                    age_factor = max(0.2, 1.0 - (age_diff * 0.2))
                except:
                    pass
            
            final_score = semantic_score * age_factor
            
            case_info = {
                'patient_id': row.get('Patient id', 'Unknown'),
                'diagnosis': row.get('Diagnosis', 'Unknown'),
                'treatment': row.get('Treatment plan', 'Unknown'),
                'medications': row.get('Medications prescribed', 'Unknown'),
                'combined_text': row['combined_text'],
                'similarity_score': final_score
            }
            result.append(case_info)
        
        # Sort by adjusted similarity score
        result.sort(key=lambda x: x['similarity_score'], reverse=True)
        return result[:filter_top]
    
    def generate_response(self, prompt: str, retrieved_cases: List[Dict] = None) -> str:
        """Generate response using BioGPT model"""
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
        
        # Use more appropriate generation settings
        outputs = self.model.generate(
            **inputs,
            max_new_tokens=500,
            num_beams=4,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            no_repeat_ngram_size=2
        )
        
        raw_response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return self.format_response(raw_response, prompt, retrieved_cases)
    
    def format_response(self, raw_response: str, original_prompt: str, 
                       retrieved_cases: List[Dict] = None) -> str:
        """Format the response into a structured medical recommendation"""
        # Remove the original prompt from the response if included
        if raw_response.startswith(original_prompt):
            raw_response = raw_response[len(original_prompt):].strip()
        
        # Remove "Answer:" if present
        raw_response = raw_response.replace("Answer:", "").strip()
        
        # Check if response is too short or incomplete (less than 50 words)
        if len(raw_response.split()) < 50 and retrieved_cases:
            # Build a response based on retrieved cases
            most_similar_case = retrieved_cases[0]
            
            # Extract the diagnosis from the most similar case
            diagnosis = most_similar_case['diagnosis']
            
            # Collect unique treatments and medications from top cases
            treatments = []
            medications = []
            for case in retrieved_cases[:2]:
                if case['treatment'] and case['treatment'] not in treatments:
                    treatments.append(case['treatment'])
                if case['medications'] and case['medications'] not in medications:
                    medications.append(case['medications'])
            
            # Format structured response
            formatted_response = f"""
=== MEDICAL RECOMMENDATION ===

DIAGNOSIS:
Based on similar cases and symptoms described, likely {diagnosis}.

TREATMENT PLAN:
"""
            # Add treatments
            for i, treatment in enumerate(treatments, 1):
                formatted_response += f"{i}. {treatment}\n"
            
            formatted_response += "\nRECOMMENDED MEDICATIONS:\n"
            # Add medications
            for i, medication in enumerate(medications, 1):
                formatted_response += f"{i}. {medication}\n"
            
            formatted_response += """
FOLLOW-UP:
Regular check-up recommended in 2 weeks to monitor progress.
"""
            return formatted_response
        
        # If response seems complete enough, try to structure it
        if "DIAGNOSIS:" not in raw_response.upper() and "TREATMENT:" not in raw_response.upper():
            # Extract possible diagnosis from text
            diagnosis_match = re.search(r'(?i)diagnosis:?\s*(.*?)(?=treatment|\n\n|$)', raw_response)
            diagnosis = diagnosis_match.group(1).strip() if diagnosis_match else "Not specified"
            
            # Extract treatment info
            treatment_match = re.search(r'(?i)treatment:?\s*(.*?)(?=medication|\n\n|$)', raw_response)
            treatment = treatment_match.group(1).strip() if treatment_match else "Not specified"
            
            # Extract medication info
            medication_match = re.search(r'(?i)medication:?\s*(.*?)(?=follow|\n\n|$)', raw_response)
            medication = medication_match.group(1).strip() if medication_match else "Not specified"
            
            # Format structured response
            formatted_response = f"""
=== MEDICAL RECOMMENDATION ===

DIAGNOSIS:
{diagnosis}

TREATMENT PLAN:
{treatment}

RECOMMENDED MEDICATIONS:
{medication}

FOLLOW-UP:
Regular check-up recommended to monitor progress.
"""
            return formatted_response
        
        return raw_response
    
    def save_model_artifacts(self, output_dir: str = "data/models"):
        """Save all model artifacts for later use"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save FAISS index
        faiss.write_index(self.index, f"{output_dir}/faiss_index.bin")
        
        # Save embeddings
        np.save(f"{output_dir}/corpus_embeddings.npy", self.corpus_embeddings)
        
        # Save embedder model
        self.embedder.save(f"{output_dir}/embedder_model/")
        
        # Save processed dataframe
        self.df.to_csv(f"{output_dir}/cleaned_patients.csv", index=False)
        
        # Save model configuration
        config = {
            'embedding_model': 'all-MiniLM-L6-v2',
            'generator_model': 'microsoft/BioGPT',
            'num_cases': len(self.df),
            'embedding_dim': self.corpus_embeddings.shape[1]
        }
        
        with open(f"{output_dir}/model_config.json", 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"Model artifacts saved to {output_dir}")
    
    def process_medical_query(self, query: str, age: int = None, 
                            gender: str = None) -> Dict[str, Any]:
        """Process a medical query and return structured response"""
        print(f"Processing query: {query}")
        
        # Retrieve similar cases
        retrieved_cases = self.retrieve_similar_cases(query, age, gender)
        
        # Generate response
        prompt = f"Patient query: {query}. Based on similar medical cases, provide a diagnosis and treatment plan."
        response = self.generate_response(prompt, retrieved_cases)
        
        return {
            'query': query,
            'response': response,
            'retrieved_cases': retrieved_cases,
            'timestamp': pd.Timestamp.now().isoformat()
        }

def main():
    """Main function to handle command line arguments"""
    parser = argparse.ArgumentParser(description='RAG Medical Assistant')
    parser.add_argument('--mode', choices=['initialize', 'query'], default='initialize',
                       help='Mode: initialize (create model) or query (process query)')
    parser.add_argument('--query', type=str, help='Medical query to process')
    parser.add_argument('--age', type=int, help='Patient age')
    parser.add_argument('--gender', type=str, help='Patient gender')
    
    args = parser.parse_args()
    
    if args.mode == 'initialize':
        """Initialize and save the RAG model"""
        processor = MedicalRAGProcessor()
        
        # Load and preprocess data
        processor.load_and_preprocess_data()
        
        # Create embeddings and index
        processor.create_embeddings_and_index()
        
        # Load BioGPT model
        processor.load_bio_gpt_model()
        
        # Save model artifacts
        processor.save_model_artifacts()
        
        print("RAG model initialization completed successfully!")
        
    elif args.mode == 'query':
        """Process a medical query"""
        if not args.query:
            print("Error: Query is required for query mode")
            sys.exit(1)
            
        processor = MedicalRAGProcessor()
        
        # Load existing model artifacts
        try:
            # Load embedder
            processor.embedder = SentenceTransformer("data/models/embedder_model/")
            
            # Load FAISS index
            processor.index = faiss.read_index("data/models/faiss_index.bin")
            
            # Load processed data
            processor.df = pd.read_csv("data/models/cleaned_patients.csv")
            
            # Load BioGPT
            processor.tokenizer = AutoTokenizer.from_pretrained("microsoft/BioGPT")
            processor.model = AutoModelForCausalLM.from_pretrained("microsoft/BioGPT")
            
        except Exception as e:
            print(f"Error loading model artifacts: {e}")
            print("Please run initialization mode first")
            sys.exit(1)
        
        # Process query
        result = processor.process_medical_query(args.query, args.age, args.gender)
        
        # Output JSON result
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main() 