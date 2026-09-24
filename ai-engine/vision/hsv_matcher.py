import cv2
import numpy as np

def extract_hsv_histogram(image_bytes: bytes, mask_bytes: bytes = None) -> np.ndarray:
    """
    Decodes an image byte stream, converts it to HSV colour-space, 
    and extracts a normalized 1D Hue histogram to ignore lighting conditions.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Decode mask if provided (e.g., from SAM)
    mask = None
    if mask_bytes:
        mask_arr = np.frombuffer(mask_bytes, np.uint8)
        mask = cv2.imdecode(mask_arr, cv2.IMREAD_GRAYSCALE)
        _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    
    # 1D Histogram (Hue ONLY) with 8 coarse bins to forgive lighting shifts
    hist = cv2.calcHist(
        [hsv_image], 
        [0],         # Channel: H
        mask,        # Ignore the background if mask is provided
        [8],         # Coarse bins
        [0, 180]     # Range: H(0-179)
    )
    
    cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
    return hist.flatten()

def compare_histograms(upload_bytes: bytes, reference_bytes: bytes, mask_bytes: bytes = None) -> float:
    """
    Compares the Hue distributions of two images using the Bhattacharyya distance.
    """
    hist_upload = extract_hsv_histogram(upload_bytes, mask_bytes)
    hist_reference = extract_hsv_histogram(reference_bytes) # Reference assumed to be pre-cropped/clean
    
    distance = cv2.compareHist(hist_upload, hist_reference, cv2.HISTCMP_BHATTACHARYYA)
    similarity = max(0.0, 1.0 - distance)
    
    return similarity