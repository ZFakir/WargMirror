import cv2
import numpy as np
import torch
from segment_anything import sam_model_registry, SamPredictor

# Initialise SAM (Requires downloading the model checkpoint locally)
MODEL_TYPE = "vit_h"
CHECKPOINT_PATH = "weights/sam_vit_h_4b8939.pth"

try:
    sam = sam_model_registry[MODEL_TYPE](checkpoint=CHECKPOINT_PATH)
    sam.to(device="cuda" if torch.cuda.is_available() else "cpu")
    predictor = SamPredictor(sam)
except Exception as e:
    print(f"Warning: SAM weights not found. Ensure {CHECKPOINT_PATH} exists.")
    predictor = None

def crop_and_align_masks(ref_mask: np.ndarray, player_mask: np.ndarray):
    """Crops both masks to their bounding boxes and aligns their dimensions."""
    # 1. Find the bounding box for the reference mask
    ref_coords = cv2.findNonZero(ref_mask.astype(np.uint8))
    if ref_coords is None:
        return ref_mask, player_mask # Fallback if empty
    rx, ry, rw, rh = cv2.boundingRect(ref_coords)
    ref_cropped = ref_mask[ry:ry+rh, rx:rx+rw]
    
    # 2. Find the bounding box for the player mask
    player_coords = cv2.findNonZero(player_mask.astype(np.uint8))
    if player_coords is None:
        return ref_cropped, np.zeros_like(ref_cropped) # Fallback if SAM extracted nothing
    px, py, pw, ph = cv2.boundingRect(player_coords)
    player_cropped = player_mask[py:py+ph, px:px+pw]
    
    # 3. Resize the player's cropped mask to match the reference crop exactly
    player_aligned = cv2.resize(
        player_cropped.astype(np.uint8), 
        (rw, rh), 
        interpolation=cv2.INTER_NEAREST
    ).astype(bool)
    
    return ref_cropped.astype(bool), player_aligned

def calculate_jaccard_index(mask1: np.ndarray, mask2: np.ndarray) -> float:
    """Calculates the Jaccard Index (Intersection over Union)."""
    intersection = np.logical_and(mask1, mask2).sum()
    union = np.logical_or(mask1, mask2).sum()
    
    if union == 0:
        return 0.0
    return float(intersection / union)

def extract_and_compare(image_bytes: bytes, target_mask_bytes: bytes) -> float:
    """
    Extracts the primary shape using a 5-point crosshair and calculates 
    the aligned Jaccard Index against the target mask.
    """
    # Load player image
    nparr_img = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr_img, cv2.IMREAD_COLOR)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Load reference mask
    nparr_target = np.frombuffer(target_mask_bytes, np.uint8)
    target_mask = cv2.imdecode(nparr_target, cv2.IMREAD_GRAYSCALE)
    _, target_mask_bin = cv2.threshold(target_mask, 127, 255, cv2.THRESH_BINARY)
    ref_mask_bool = target_mask_bin > 0

    # Extract shape using SAM with 5-point crosshair
    predictor.set_image(image_rgb)
    h, w = image_rgb.shape[:2]
    cx, cy = w // 2, h // 2
    offset = int(min(h, w) * 0.15)
    
    dynamic_points = np.array([
        [cx, cy], [cx, cy - offset], [cx, cy + offset], 
        [cx - offset, cy], [cx + offset, cy]
    ])
    input_labels = np.array([1, 1, 1, 1, 1])
    
    masks, _, _ = predictor.predict(
        point_coords=dynamic_points,
        point_labels=input_labels,
        multimask_output=False
    )
    
    player_mask_bool = masks[0]
    
    # Align and Evaluate
    aligned_ref, aligned_player = crop_and_align_masks(ref_mask_bool, player_mask_bool)
    return calculate_jaccard_index(aligned_ref, aligned_player)