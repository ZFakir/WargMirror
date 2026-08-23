import cv2
import numpy as np

def compute_ssim(img1, img2):
    """Pure OpenCV implementation of Structural Similarity Index"""
    i1 = img1.astype(np.float64)
    i2 = img2.astype(np.float64)
    
    C1 = (0.01 * 255)**2
    C2 = (0.03 * 255)**2
    kernel_size = (11, 11) 
    sigma = 1.5
    
    mu1 = cv2.GaussianBlur(i1, kernel_size, sigma)
    mu2 = cv2.GaussianBlur(i2, kernel_size, sigma)
    
    mu1_sq = mu1 ** 2
    mu2_sq = mu2 ** 2
    mu1_mu2 = mu1 * mu2
    
    sigma1_sq = cv2.GaussianBlur(i1 ** 2, kernel_size, sigma) - mu1_sq
    sigma2_sq = cv2.GaussianBlur(i2 ** 2, kernel_size, sigma) - mu2_sq
    sigma12 = cv2.GaussianBlur(i1 * i2, kernel_size, sigma) - mu1_mu2
    
    num = (2 * mu1_mu2 + C1) * (2 * sigma12 + C2)
    den = (mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2)
    ssim_map = num / den
    
    return ssim_map.mean()

def evaluate_symmetry(image_bytes):
    """
    Simulates a center-axis cut, mirrors one half, and calculates the SSIM score.
    """
    # Decode byte stream
    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image buffer.")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply a heavy blur to melt away clouds, textures, and small asymmetrical details
    blurred = cv2.GaussianBlur(gray, (15, 15), 0)
    
    h, w = blurred.shape
    midpoint = w // 2
    
    # Extract the left and right halves from the BLURRED image
    left_half = blurred[:, :midpoint]
    right_half = blurred[:, midpoint:midpoint*2] 
    
    # Mirror and compare
    mirrored_left = cv2.flip(left_half, 1)
    score = compute_ssim(mirrored_left, right_half)
    
    # Convert score to a friendly 0-100% metric
    similarity_pct = max(0.0, float(score)) * 100
    
    # The threshold is deliberately generous to account for minor camera skew
    passed = similarity_pct >= 40.0
    
    return {
        "similarity_score": round(similarity_pct, 2),
        "passed": bool(passed)
    }