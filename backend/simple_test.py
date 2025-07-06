import os
import sys
import json

print("Testing basic imports...")

try:
    import numpy as np
    print("✓ numpy imported successfully")
except ImportError as e:
    print(f"✗ numpy import failed: {e}")

try:
    import pandas as pd
    print("✓ pandas imported successfully")
except ImportError as e:
    print(f"✗ pandas import failed: {e}")

try:
    import torch
    print("✓ torch imported successfully")
except ImportError as e:
    print(f"✗ torch import failed: {e}")

try:
    import torchvision
    print("✓ torchvision imported successfully")
except ImportError as e:
    print(f"✗ torchvision import failed: {e}")

try:
    from PIL import Image
    print("✓ PIL imported successfully")
except ImportError as e:
    print(f"✗ PIL import failed: {e}")

try:
    from sklearn.metrics.pairwise import cosine_similarity
    print("✓ scikit-learn imported successfully")
except ImportError as e:
    print(f"✗ scikit-learn import failed: {e}")

print("\nTesting file access...")
base_data_path = os.path.join(os.path.dirname(__file__), 'data', 'medical_images')
for model_type in ['ct', 'mri', 'xray']:
    model_path = os.path.join(base_data_path, model_type)
    if os.path.exists(model_path):
        print(f"✓ {model_type} directory exists")
        embeddings_file = os.path.join(model_path, "diagnosis_image_embeddings.pkl")
        if os.path.exists(embeddings_file):
            print(f"  ✓ {model_type} embeddings file exists")
        else:
            print(f"  ✗ {model_type} embeddings file missing")
    else:
        print(f"✗ {model_type} directory missing")

print("\nBasic setup test completed!") 