import cv2
import numpy as np

def extract_hsv_histogram(image_bytes: bytes, mask_bytes: bytes = None) -> np.ndarray:
    """
    Decodes an image byte stream, converts it to HSV colour-space,
    and extracts a normalized 2D Hue-Saturation histogram.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    mask = None
    if mask_bytes:
        mask_arr = np.frombuffer(mask_bytes, np.uint8)
        mask = cv2.imdecode(mask_arr, cv2.IMREAD_GRAYSCALE)
        _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

    # Saturation gate – discard pixels with S < 30 (achromatic pixels)
    sat_mask = cv2.inRange(hsv_image[:, :, 1], 30, 255)

    if mask is not None:
        mask = cv2.bitwise_and(mask, sat_mask)
    else:
        mask = sat_mask

    if cv2.countNonZero(mask) < 0.01 * mask.size:
        return np.zeros(12 * 8, dtype=np.float32)

    hist = cv2.calcHist(
        [hsv_image],
        [0, 1],            # Channels: H + S
        mask,
        [12, 8],           # 12 hue bins, 8 saturation bins
        [0, 180, 0, 256]   # Ranges: H(0-179), S(0-255)
    )

    cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
    return hist.flatten()

def smooth_hue_histogram(hist_2d):
    """Simple 3-tap wrap-around blur on axis 0 (hue), applied twice for more spread."""
    out = np.zeros_like(hist_2d)
    # Pass 1
    for i in range(12):
        prev_i, next_i = (i - 1) % 12, (i + 1) % 12
        out[i, :] = 0.25 * hist_2d[prev_i, :] + 0.5 * hist_2d[i, :] + 0.25 * hist_2d[next_i, :]
    # Pass 2
    out2 = np.zeros_like(hist_2d)
    for i in range(12):
        prev_i, next_i = (i - 1) % 12, (i + 1) % 12
        out2[i, :] = 0.25 * out[prev_i, :] + 0.5 * out[i, :] + 0.25 * out[next_i, :]
    return out2

def compare_histograms(upload_bytes: bytes, reference_bytes: bytes, mask_bytes: bytes = None) -> float:
    """
    Compares the Hue distributions using the Combination Approach:
    70% Dominant Hue Distance + 30% Smoothed Histogram Similarity.
    """
    hist_upload = extract_hsv_histogram(upload_bytes, mask_bytes)
    hist_reference = extract_hsv_histogram(reference_bytes)
    
    if np.max(hist_upload) == 0 or np.max(hist_reference) == 0:
        return 0.0

    # 1. Smoothed Histogram Score
    h_up_s = smooth_hue_histogram(hist_upload.reshape(12,8)).flatten()
    h_ref_s = smooth_hue_histogram(hist_reference.reshape(12,8)).flatten()
    
    h_up_s = (h_up_s / (np.max(h_up_s) + 1e-8)).astype(np.float32)
    h_ref_s = (h_ref_s / (np.max(h_ref_s) + 1e-8)).astype(np.float32)
    
    dist_hist = cv2.compareHist(h_up_s, h_ref_s, cv2.HISTCMP_BHATTACHARYYA)
    hist_score = max(0.0, 1.0 - dist_hist)

    # 2. Dominant Hue Score
    hue_up = h_up_s.reshape(12,8).sum(axis=1)
    hue_ref = h_ref_s.reshape(12,8).sum(axis=1)
    
    dom_up_bin = np.argmax(hue_up)
    dom_ref_bin = np.argmax(hue_ref)
    
    dist_bins = min(abs(dom_up_bin - dom_ref_bin), 12 - abs(dom_up_bin - dom_ref_bin))
    
    # Normalize hue distance score: 0 bins = 1.0, 6 bins (180 degrees) = 0.0
    hue_score = max(0.0, 1.0 - (dist_bins / 6.0))

    # Combine them (70% Hue, 30% Histogram)
    similarity = (hist_score * 0.3) + (hue_score * 0.7)
    
    return float(similarity)