import cv2
import numpy as np
import pytesseract
import re
import difflib

THRESHOLD = 0.75

def extract_text(image_bytes: bytes) -> str:
    """
    Decode image and preprocess specifically for engraved/weathered plaque text
    before running Tesseract.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Upscale if the image is small
    height, width = gray.shape
    if height < 1000 or width < 1000:
        gray = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    
    # Light denoise
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Adaptive thresholding to cope with uneven lighting/glare on metal or stone
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    text = pytesseract.image_to_string(thresh)
    return text

def normalize_text(text: str) -> str:
    """
    Lowercase, strip, collapse whitespace, strip punctuation.
    """
    text = text.lower()
    # Strip punctuation
    text = re.sub(r'[^\w\s]', '', text)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def compare_texts(text_a: str, text_b: str) -> float:
    """
    Use Python's built-in difflib to compare strings. Returns 0.0 - 1.0.
    """
    return difflib.SequenceMatcher(None, text_a, text_b).ratio()

def evaluate_plaque(image_bytes: bytes, reference_bytes: bytes) -> dict:
    """
    Extract, normalize both images, compare, and return EvaluationResult shape.
    """
    text_upload = extract_text(image_bytes)
    text_ref = extract_text(reference_bytes)
    
    norm_upload = normalize_text(text_upload)
    norm_ref = normalize_text(text_ref)
    
    # If the reference text is completely empty after extraction,
    # we can't do a meaningful comparison. Avoid division-by-zero type logic in difflib.
    if not norm_ref:
        return {
            "confidence_score": 0.0,
            "passed": False,
            "message": "Reference image contained no readable text."
        }
        
    similarity = compare_texts(norm_upload, norm_ref)
    
    return {
        "confidence_score": similarity,
        "passed": bool(similarity >= THRESHOLD),
        "message": "OCR evaluation complete."
    }
