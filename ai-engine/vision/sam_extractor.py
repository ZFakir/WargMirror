import os
import cv2
import numpy as np
import torch
from mobile_sam import sam_model_registry, SamPredictor

# Initialise SAM (Requires downloading the model checkpoint locally)
MODEL_TYPE = "vit_t"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECKPOINT_PATH = os.path.join(BASE_DIR, "weights", "mobile_sam.pt")

try:
    sam = sam_model_registry[MODEL_TYPE](checkpoint=CHECKPOINT_PATH)
    sam.to(device="cuda" if torch.cuda.is_available() else "cpu")
    predictor = SamPredictor(sam)
except Exception as e:
    print(f"Warning: SAM weights not found at {CHECKPOINT_PATH}. Error: {e}")
    predictor = None

# Side length of the square canvas used to compare masks without distortion.
_ALIGN_SIZE = 128

def _letterbox_mask(mask: np.ndarray) -> np.ndarray:
    """Pads a mask to a centered square and uniformly resizes it, keeping aspect."""
    height, width = mask.shape
    side = max(height, width)
    canvas = np.zeros((side, side), dtype=np.uint8)
    top, left = (side - height) // 2, (side - width) // 2
    canvas[top:top + height, left:left + width] = mask
    resized = cv2.resize(canvas, (_ALIGN_SIZE, _ALIGN_SIZE), interpolation=cv2.INTER_NEAREST)
    return resized.astype(bool)

def crop_and_align_masks(ref_mask: np.ndarray, player_mask: np.ndarray):
    """Crops both masks to their bounding boxes and aligns them with aspect preserved."""
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
    
    # 3. Letterbox both crops so only position and scale are normalized -
    #    aspect ratio (a primary shape cue) is preserved, unlike stretching.
    ref_aligned = _letterbox_mask(ref_cropped.astype(np.uint8))
    player_aligned = _letterbox_mask(player_cropped.astype(np.uint8))
    
    return ref_aligned, player_aligned

def calculate_jaccard_index(mask1: np.ndarray, mask2: np.ndarray) -> float:
    """Calculates the Jaccard Index (Intersection over Union)."""
    intersection = np.logical_and(mask1, mask2).sum()
    union = np.logical_or(mask1, mask2).sum()
    
    if union == 0:
        return 0.0
    return float(intersection / union)


def _decode_rgb_image(image_bytes: bytes) -> np.ndarray:
    encoded = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode shape-match image.")
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def _segment_center_object(image_rgb: np.ndarray) -> np.ndarray:
    """Segment an object selected by a five-point center prompt."""
    if predictor is None:
        raise RuntimeError("SAM predictor not initialized. Model weights are likely missing.")

    predictor.set_image(image_rgb)
    height, width = image_rgb.shape[:2]
    center_x, center_y = width // 2, height // 2
    offset = int(min(height, width) * 0.15)
    points = np.array([
        [center_x, center_y],
        [center_x, center_y - offset],
        [center_x, center_y + offset],
        [center_x - offset, center_y],
        [center_x + offset, center_y],
    ])
    labels = np.ones(len(points), dtype=np.int32)
    masks, _, _ = predictor.predict(
        point_coords=points,
        point_labels=labels,
        multimask_output=False,
    )
    return masks[0].astype(bool)


def extract_and_compare(image_bytes: bytes, reference_image_bytes: bytes) -> float:
    """
    Segments the centered object in both photos and compares their aligned masks.
    """
    reference_rgb = _decode_rgb_image(reference_image_bytes)
    image_rgb = _decode_rgb_image(image_bytes)

    # Capture the reference mask before setting the predictor to the player image.
    reference_mask = _segment_center_object(reference_rgb)
    player_mask = _segment_center_object(image_rgb)
    
    # Align and Evaluate
    aligned_ref, aligned_player = crop_and_align_masks(reference_mask, player_mask)
    return calculate_jaccard_index(aligned_ref, aligned_player)