from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
from vision import sam_extractor, hsv_matcher, mobilenet_extractor 

app = FastAPI(title="WARG AI Engine")

class EvaluationResult(BaseModel):
    confidence_score: float
    passed: bool
    message: str

@app.post("/api/v1/sam-extract", response_model=EvaluationResult)
async def evaluate_shape(image: UploadFile = File(...), game_id: str = Form(...)):
    """
    Receives image payload from Express.
    Runs Meta's SAM and calculates the Jaccard Index.
    """
    # Read image bytes
    image_bytes = await image.read()
    
    # Run SAM extraction
    iou_score = sam_extractor.process_image(image_bytes, game_id)
    
    # Evaluate against game threshold
    passed = iou_score >= 0.75 
    
    return EvaluationResult(
        confidence_score=iou_score,
        passed=passed,
        message="Shape extraction complete."
    )

@app.post("/api/v1/hsv-match", response_model=EvaluationResult)
async def evaluate_colour(image: UploadFile = File(...), target_colour: str = Form(...)):
    """
    Evaluates Bhattacharyya distance using HSV color-space histograms.
    """
    image_bytes = await image.read()
    similarity_score = hsv_matcher.compare_histograms(image_bytes, target_colour)
    
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