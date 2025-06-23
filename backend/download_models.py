import os
import sys
from transformers import AutoTokenizer, AutoModelForCausalLM, BlipProcessor, BlipForConditionalGeneration
from torchvision.models import densenet121
import torch

print("Starting model downloads...")

try:
    print("1. Downloading Phi-2 model for text generation...")
    llm_model_name = "microsoft/phi-2"
    tokenizer = AutoTokenizer.from_pretrained(llm_model_name, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(llm_model_name, trust_remote_code=True, device_map="auto", torch_dtype=torch.float16)
    print("✓ Phi-2 model downloaded successfully")

    print("2. Loading DenseNet121 for image embedding...")
    image_embedder = densenet121(weights='DenseNet121_Weights.DEFAULT')
    image_embedder.classifier = torch.nn.Identity()
    image_embedder.eval()
    print("✓ DenseNet121 loaded successfully")

    print("3. Downloading BLIP model for image captioning...")
    caption_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    caption_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
    print("✓ BLIP model downloaded successfully")

    print("\n🎉 All models downloaded successfully!")
    print("You can now run the image analyzer.")

except Exception as e:
    print(f"❌ Error downloading models: {str(e)}")
    print("Please check your internet connection and try again.")
    sys.exit(1) 