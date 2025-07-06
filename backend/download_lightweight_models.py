import os
import sys
from transformers.models.blip import BlipProcessor, BlipForConditionalGeneration
from torchvision.models import densenet121
import torch

print("Starting lightweight model downloads...")
print("These models will work on your 8GB RAM system.")

try:
    print("\n1. Downloading BLIP model for image captioning...")
    print("   This model is ~1GB and will provide detailed image descriptions.")
    caption_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    caption_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
    print("✓ BLIP model downloaded successfully")

    print("\n2. Loading DenseNet121 for image embedding...")
    print("   This model is pre-trained and will extract image features.")
    image_embedder = densenet121(weights='DenseNet121_Weights.DEFAULT')
    image_embedder.classifier = torch.nn.Linear(1024, 1024)
    image_embedder.eval()
    print("✓ DenseNet121 loaded successfully")

    print("\n🎉 Lightweight models downloaded successfully!")
    print("You can now use these models for image analysis.")
    print("Note: For text generation, you'll need to use a smaller model or cloud service.")

except Exception as e:
    print(f"❌ Error downloading models: {str(e)}")
    print("Please check your internet connection and try again.")
    sys.exit(1) 