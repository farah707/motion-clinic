# RAG Model Dataset Directory

This directory contains the datasets and training data for the RAG (Retrieval-Augmented Generation) medical assistant.

## Directory Structure

```
backend/data/
├── raw/                    # Raw medical datasets
│   ├── medical_texts/      # Medical literature, textbooks, papers
│   ├── patient_queries/    # Sample patient questions and queries
│   ├── symptoms/           # Symptom descriptions and classifications
│   └── treatments/         # Treatment protocols and guidelines
├── processed/              # Processed and cleaned data
│   ├── embeddings/         # Vector embeddings for retrieval
│   ├── documents/          # Processed documents for RAG
│   └── training/           # Training datasets
├── models/                 # Trained model files
│   ├── checkpoints/        # Model checkpoints
│   ├── configs/           # Model configuration files
│   └── saved_models/      # Final trained models
└── vector_store/          # Vector database files
    ├── faiss/             # FAISS index files
    ├── pinecone/          # Pinecone vector store
    └── chroma/            # ChromaDB files
```

## Dataset Guidelines

### 1. Medical Data Sources
- **Medical Literature**: Peer-reviewed papers, textbooks, guidelines
- **Clinical Guidelines**: WHO, CDC, medical association guidelines
- **Drug Information**: FDA-approved drug information
- **Symptom Databases**: Comprehensive symptom descriptions
- **Treatment Protocols**: Evidence-based treatment approaches

### 2. Data Quality Requirements
- **Accuracy**: All medical information must be from reliable sources
- **Currency**: Information should be up-to-date (within 5 years)
- **Completeness**: Include full context and disclaimers
- **Safety**: Include appropriate medical disclaimers

### 3. Data Processing Steps
1. **Data Collection**: Gather from reliable medical sources
2. **Cleaning**: Remove duplicates, format consistently
3. **Annotation**: Add metadata, categories, tags
4. **Validation**: Medical expert review for accuracy
5. **Vectorization**: Create embeddings for retrieval
6. **Indexing**: Build searchable vector indices

### 4. Privacy and Compliance
- **HIPAA Compliance**: Ensure patient data privacy
- **Anonymization**: Remove any personal identifiers
- **Consent**: Use only publicly available medical information
- **Audit Trail**: Maintain records of data sources

## Integration with Colab

### Exporting from Colab
1. **Model Export**: Save your trained model in a compatible format
2. **Vector Store**: Export your vector database
3. **Configuration**: Save model parameters and settings
4. **Dependencies**: Document required libraries and versions

### Importing to Backend
1. **File Transfer**: Copy model files to `backend/data/models/`
2. **Vector Store**: Copy vector database to `backend/data/vector_store/`
3. **Configuration**: Update model configs in `backend/utils/ragModel.js`
4. **Testing**: Verify model loads and responds correctly

## Usage Examples

### Adding New Medical Data
```bash
# Add new medical documents
cp new_medical_document.pdf backend/data/raw/medical_texts/

# Process and add to vector store
python scripts/process_data.py --input raw/medical_texts/new_medical_document.pdf --output processed/documents/

# Update vector embeddings
python scripts/update_embeddings.py --input processed/documents/ --output vector_store/faiss/
```

### Training New Model
```bash
# Train model with new data
python scripts/train_rag.py --data processed/training/ --output models/saved_models/

# Test model performance
python scripts/evaluate_model.py --model models/saved_models/latest --test_data processed/testing/
```

## Safety Considerations

### Medical Disclaimer
All AI responses should include appropriate medical disclaimers:
- "This information is for educational purposes only"
- "Consult a healthcare provider for medical advice"
- "Not a substitute for professional medical care"

### Response Filtering
- Filter out potentially harmful medical advice
- Flag responses that require immediate medical attention
- Provide clear escalation paths for urgent situations

### Quality Assurance
- Regular model performance evaluation
- Medical expert review of responses
- Continuous monitoring and improvement
- User feedback collection and analysis 