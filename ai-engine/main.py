from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel
from vision import sam_extractor, hsv_matcher, mobilenet_extractor, then_vs_now, symmetry

app = FastAPI(title="WARG AI Engine")


# ── Response Models ──────────────────────────────────────────────

class EvaluationResult(BaseModel):
    confidence_score: float
    passed: bool
    message: str


class ColourHistogramResult(BaseModel):
    histogram: list[float]
    bins: int


class TextureEmbeddingResult(BaseModel):
    embedding: list[float]
    dimensions: int



# ══════════════════════════════════════════════════════════════════
#  EVALUATION ENDPOINTS (Player snap → authoritative scoring)
# ══════════════════════════════════════════════════════════════════

@app.post("/api/v1/sam-extract", response_model=EvaluationResult)
async def evaluate_shape(image: UploadFile = File(...), target_mask: UploadFile = File(...)):
    """
    Receives image payloads from Express.
    Runs Meta's SAM and calculates the Aligned Jaccard Index.
    """
    image_bytes = await image.read()
    target_bytes = await target_mask.read()
    
    # Run dynamic crosshair extraction and align masks
    iou_score = sam_extractor.extract_and_compare(image_bytes, target_bytes)
    
    return EvaluationResult(
        confidence_score=iou_score,
        passed=(iou_score >= 0.75), # Safely rejects the 66% fabric tests
        message="Shape extraction and evaluation complete."
    )

@app.post("/api/v1/hsv-match", response_model=EvaluationResult)
async def evaluate_colour(image: UploadFile = File(...), reference_image: UploadFile = File(...)):
    """
    Evaluates Bhattacharyya distance using HSV color-space histograms.
    
    Accepts TWO image files: the player's upload and the creator's
    reference image.  Both are converted to HSV histograms and compared.
    """
    image_bytes = await image.read()
    reference_bytes = await reference_image.read()
    similarity_score = hsv_matcher.compare_histograms(image_bytes, reference_bytes)
    
    return EvaluationResult(
        confidence_score=similarity_score,
        passed=(similarity_score >= 0.80),
        message="Colour evaluation complete."
    )

@app.post("/api/v1/texture-match", response_model=EvaluationResult)
async def evaluate_texture(image: UploadFile = File(...), reference_image: UploadFile = File(...)):
    image_bytes = await image.read()
    reference_bytes = await reference_image.read()
    
    # Extract feature vectors and evaluate via Cosine Similarity
    similarity = mobilenet_extractor.evaluate_texture(image_bytes, reference_bytes)
    
    return EvaluationResult(
        confidence_score=similarity,
        passed=(similarity >= 0.60), # Tuned threshold for high-dimensional embeddings
        message="Texture evaluation complete."
    )

@app.post("/api/v1/sift-match", response_model=EvaluationResult)
async def evaluate_sift(image: UploadFile = File(...), archival_image: UploadFile = File(...)):
    image_bytes = await image.read()
    archival_bytes = await archival_image.read()
    
    result = then_vs_now.evaluate_archival_sift(image_bytes, archival_bytes)
    
    return EvaluationResult(
        confidence_score=float(result["matches"]),
        passed=result["passed"],
        message="SIFT evaluation complete."
    )

@app.post("/api/v1/symmetry", response_model=EvaluationResult)
async def evaluate_symmetry_endpoint(image: UploadFile = File(...)):
    image_bytes = await image.read()
    
    result = symmetry.evaluate_symmetry(image_bytes)
    
    return EvaluationResult(
        confidence_score=result["similarity_score"],
        passed=result["passed"],
        message="Symmetry evaluation complete."
    )