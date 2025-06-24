#!/usr/bin/env python3
"""
Lightweight RAG Medical Assistant - Fast Response Version
Optimized for speed over accuracy
"""

import pandas as pd
import numpy as np
import faiss
import json
import os
import argparse
import sys
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import re
from typing import List, Dict, Any

class LightweightMedicalRAG:
    def __init__(self, data_path: str = "data/raw/patients_data.csv"):
        self.data_path = data_path
        self.df = None
        self.embedder = None
        self.index = None
        self.corpus_embeddings = None
        
    def load_and_preprocess_data(self):
        """Load and preprocess the medical dataset - lightweight version"""
        print("Loading medical dataset...")
        
        # Load the dataset
        self.df = pd.read_csv(self.data_path)
        
        # Clean column names
        self.df.rename(columns={
            'Medications perscribed ': 'Medications prescribed',
            'Patient id+G9E5A1:G11A1:G1A1:H90': 'Patient id'
        }, inplace=True)
        
        # Sample data for faster processing (use first 2000 cases)
        if len(self.df) > 2000:
            self.df = self.df.head(2000).copy()
            print(f"Using first 2000 cases for faster processing")
        
        # Create shorter combined text for faster processing
        self.df["combined_text"] = (
            self.df["Complain"].fillna("") + " " +
            self.df["Diagnosis"].fillna("") + " " +
            self.df["Treatment plan"].fillna("")
        ).str.strip()
        
        # Remove empty rows
        self.df = self.df[self.df["combined_text"].str.len() > 10].copy()
        
        print(f"Loaded {len(self.df)} medical cases")
        return self.df
    
    def create_embeddings_and_index(self):
        """Create embeddings and FAISS index - using smaller model"""
        print("Creating embeddings with lightweight model...")
        
        # Use smaller, faster model
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Encode all combined texts with smaller batch size for memory efficiency
        self.corpus_embeddings = self.embedder.encode(
            self.df["combined_text"].tolist(), 
            show_progress_bar=True,
            batch_size=16,  # Smaller batch size for faster processing
            convert_to_numpy=True,
            normalize_embeddings=True  # Normalize for better performance
        )
        
        # Create FAISS index with optimization
        embedding_dim = self.corpus_embeddings.shape[1]
        self.index = faiss.IndexFlatIP(embedding_dim)  # Use Inner Product for normalized embeddings
        self.index.add(np.array(self.corpus_embeddings))
        
        print(f"Created FAISS index with {len(self.corpus_embeddings)} embeddings")
    
    def retrieve_similar_cases(self, input_text: str, age: int = None, 
                             gender: str = None, top_n: int = 1) -> List[Dict]:
        """Retrieve similar medical cases - optimized for speed"""
        input_embedding = self.embedder.encode([input_text], normalize_embeddings=True)
        D, I = self.index.search(np.array(input_embedding), top_n)
        candidates = self.df.iloc[I[0]]
        
        result = []
        for i, (_, row) in enumerate(candidates.iterrows()):
            case_info = {
                'patient_id': row.get('Patient id', 'Unknown'),
                'diagnosis': row.get('Diagnosis', 'Unknown'),
                'treatment': row.get('Treatment plan', 'Unknown'),
                'medications': row.get('Medications prescribed', 'Unknown'),
                'similarity_score': float(D[0][i])
            }
            result.append(case_info)
        
        return result
    
    def generate_lightweight_response(self, query: str, retrieved_cases: List[Dict] = None) -> str:
        """Generate response using template-based approach for speed"""
        if not retrieved_cases:
            return "I'm sorry, I couldn't find similar cases for your query. Please consult a healthcare provider."
        
        most_similar_case = retrieved_cases[0]
        
        # Extract information
        diagnosis = most_similar_case['diagnosis']
        treatment = most_similar_case['treatment']
        medications = most_similar_case['medications']
        
        # Generate structured response
        response = f"""DIAGNOSIS: {diagnosis}

TREATMENT: {treatment}

MEDICATION: {medications}

Based on similar medical cases. Follow-up recommended."""
        
        return response
    
    def save_model_artifacts(self, output_dir: str = "data/models"):
        """Save model artifacts"""
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
            'model_type': 'lightweight',
            'num_cases': len(self.df),
            'embedding_dim': self.corpus_embeddings.shape[1]
        }
        
        with open(f"{output_dir}/model_config.json", 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"Lightweight model artifacts saved to {output_dir}")
    
    def process_medical_query(self, query: str, age: int = None, 
                            gender: str = None) -> Dict[str, Any]:
        """Process a medical query and return structured response"""
        print(f"Processing query: {query}")
        
        # Retrieve similar cases
        retrieved_cases = self.retrieve_similar_cases(query, age, gender)
        
        # Generate response
        response = self.generate_lightweight_response(query, retrieved_cases)
        
        return {
            'query': query,
            'response': response,
            'retrieved_cases': retrieved_cases,
            'timestamp': pd.Timestamp.now().isoformat()
        }

def main():
    """Main function to handle command line arguments"""
    parser = argparse.ArgumentParser(description='Lightweight RAG Medical Assistant')
    parser.add_argument('--mode', choices=['initialize', 'query', 'serve'], default='initialize',
                       help='Mode: initialize (create model), query (process query), or serve (persistent server)')
    parser.add_argument('--query', type=str, help='Medical query to process')
    parser.add_argument('--age', type=int, help='Patient age')
    parser.add_argument('--gender', type=str, help='Patient gender')
    
    args = parser.parse_args()
    
    if args.mode == 'initialize':
        """Initialize and save the lightweight RAG model"""
        processor = LightweightMedicalRAG()
        
        # Load and preprocess data
        processor.load_and_preprocess_data()
        
        # Create embeddings and index
        processor.create_embeddings_and_index()
        
        # Save model artifacts
        processor.save_model_artifacts()
        
        print("Lightweight RAG model initialization completed successfully!")
        
    elif args.mode == 'serve':
        """Serve mode - keep model loaded and respond to queries"""
        processor = LightweightMedicalRAG()
        
        # Load existing model artifacts
        try:
            # Load embedder
            processor.embedder = SentenceTransformer("data/models/embedder_model/")
            
            # Load FAISS index
            processor.index = faiss.read_index("data/models/faiss_index.bin")
            
            # Load processed data
            processor.df = pd.read_csv("data/models/cleaned_patients.csv")
            
            print("Model ready")
            print("Waiting for queries...")
            
            # Read queries from stdin
            for line in sys.stdin:
                try:
                    query_data = json.loads(line.strip())
                    query = query_data.get('query', '')
                    age = query_data.get('age')
                    gender = query_data.get('gender')
                    
                    if query:
                        result = processor.process_medical_query(query, age, gender)
                        print(json.dumps(result) + "RESPONSE_END")
                    else:
                        print(json.dumps({"error": "No query provided"}) + "RESPONSE_END")
                        
                except json.JSONDecodeError:
                    print(json.dumps({"error": "Invalid JSON input"}) + "RESPONSE_END")
                except Exception as e:
                    print(json.dumps({"error": str(e)}) + "RESPONSE_END")
                    
        except Exception as e:
            print(f"Error loading model artifacts: {e}")
            print("Please run initialization mode first")
            sys.exit(1)
        
    elif args.mode == 'query':
        """Process a medical query"""
        if not args.query:
            print("Error: Query is required for query mode")
            sys.exit(1)
            
        processor = LightweightMedicalRAG()
        
        # Load existing model artifacts
        try:
            # Load embedder
            processor.embedder = SentenceTransformer("data/models/embedder_model/")
            
            # Load FAISS index
            processor.index = faiss.read_index("data/models/faiss_index.bin")
            
            # Load processed data
            processor.df = pd.read_csv("data/models/cleaned_patients.csv")
            
        except Exception as e:
            print(f"Error loading model artifacts: {e}")
            print("Please run initialization mode first")
            sys.exit(1)
        
        # Process query
        result = processor.process_medical_query(args.query, args.age, args.gender)
        
        # Output JSON result
        print(json.dumps(result))

if __name__ == "__main__":
    main() 