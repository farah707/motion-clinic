import os
import sys
import json
from scripts.lightweight_image_analyzer import run_analysis

# Test the analysis with a dummy image path
# You'll need to replace this with an actual image path
test_image_path = "test_image.jpg"  # Replace with actual image path
model_type = "mri"  # or "ct" or "xray"

print(f"Testing image analysis with model type: {model_type}")

# Check if test image exists
if not os.path.exists(test_image_path):
    print(f"Test image not found: {test_image_path}")
    print("Please upload an image to test with, or create a test image.")
    sys.exit(1)

try:
    result = run_analysis(test_image_path, model_type)
    print("Analysis Result:")
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f"Error during analysis: {e}")
    import traceback
    traceback.print_exc() 