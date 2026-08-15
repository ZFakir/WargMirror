import cv2
import numpy as np
from skimage import feature

def extract_lbp_histogram(image_bytes: bytes, radius=3, n_points=24) -> np.ndarray:
    """
    Extracts a Local Binary Pattern (LBP) histogram from an image[cite: 7].
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Texture matching operates on greyscale[cite: 7]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Compute the LBP
    lbp = feature.local_binary_pattern(gray, n_points, radius, method="uniform")
    
    # Build the histogram
    (hist, _) = np.histogram(
        lbp.ravel(),
        bins=np.arange(0, n_points + 3),
        range=(0, n_points + 2)
    )
    
    # Normalise the histogram
    hist = hist.astype("float")
    hist /= (hist.sum() + 1e-7)
    
    return hist

def chi_squared_distance(hist_a: np.ndarray, hist_b: np.ndarray, eps: float = 1e-10) -> float:
    """
    Calculates the Chi-Squared distance between two histograms[cite: 7].
    Lower values indicate higher similarity.
    """
    distance = 0.5 * np.sum([((a - b) ** 2) / (a + b + eps) for (a, b) in zip(hist_a, hist_b)])
    return float(distance)

def evaluate_texture(upload_bytes: bytes, reference_bytes: bytes) -> float:
    """
    Compares two texture images and returns a similarity score.
    """
    hist_upload = extract_lbp_histogram(upload_bytes)
    hist_reference = extract_lbp_histogram(reference_bytes)
    
    distance = chi_squared_distance(hist_upload, hist_reference)
    
    # Invert the distance so 1.0 is a perfect match and 0.0 is completely different
    # This aligns the return payload with the shape and colour engines
    similarity_score = max(0.0, 1.0 - distance)
    return similarity_score