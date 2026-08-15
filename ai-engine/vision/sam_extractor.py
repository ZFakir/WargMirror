import cv2
import numpy as np
import torch
from segment_anything import sam_model_registry, SamPredictor

# Initialise SAM (Requires downloading the model checkpoint locally)
# e.g., sam_vit_h_4b8939.pth
MODEL_TYPE = "vit_h"
CHECKPOINT_PATH = "weights/sam_vit_h_4b8939.pth"

try:
    sam = sam_model_registry[MODEL_TYPE](checkpoint=CHECKPOINT_PATH)
    sam.to(device="cuda" if torch.cuda.is_available() else "cpu")
    predictor = SamPredictor(sam)
except Exception as e:
    print(f"Warning: SAM weights not found. Ensure {CHECKPOINT_PATH} exists.")
    predictor = None

def calculate_jaccard_index(mask1: np.ndarray, mask2: np.ndarray) -> float:
    """
    Calculates the Jaccard Index (Intersection over Union) of two binary masks.
    """
    intersection = np.logical_and(mask1, mask2)
    union = np.logical_or(mask1, mask2)
    
    if union.sum() == 0:
        return 0.0
        
    return float(intersection.sum() / union.sum())

def extract_and_compare(image_bytes: bytes, target_mask_bytes: bytes) -> float:
    """
    Extracts the primary shape from the image and compares it to the target mask.
    """
    # Convert incoming bytes to OpenCV numpy arrays
    nparr_img = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr_img, cv2.IMREAD_COLOR)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    nparr_target = np.frombuffer(target_mask_bytes, np.uint8)
    target_mask = cv2.imdecode(nparr_target, cv2.IMREAD_GRAYSCALE)
    _, target_mask_bin = cv2.threshold(target_mask, 127, 255, cv2.THRESH_BINARY)
    target_mask_bool = target_mask_bin > 0

    # Extract shape using SAM
    predictor.set_image(image_rgb)
    
    # Provide a center point prompt to SAM to extract the central object
    h, w = image_rgb.shape[:2]
    center_point = np.array([[w // 2, h // 2]])
    input_label = np.array([1]) # 1 indicates a foreground point
    
    masks, scores, _ = predictor.predict(
        point_coords=center_point,
        point_labels=input_label,
        multimask_output=False
    )
    
    extracted_mask_bool = masks[0]
    
    # Evaluate using Jaccard Index
    return calculate_jaccard_index(extracted_mask_bool, target_mask_bool)