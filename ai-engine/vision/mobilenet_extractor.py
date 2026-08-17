import io
import torch
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import warnings

# Suppress torchvision warnings in production logs
warnings.filterwarnings("ignore", category=UserWarning)

# Load MobileNet pre-trained on ImageNet
weights = models.MobileNet_V2_Weights.DEFAULT
mobilenet = models.mobilenet_v2(weights=weights)
mobilenet.eval() # Evaluation mode

# Standard ImageNet preprocessing pipeline
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def get_mobilenet_embedding(image_bytes: bytes) -> torch.Tensor:
    """
    Reads a byte stream, strips color data for lighting agnosticism, 
    and passes it through MobileNet to extract a 1D feature vector.
    """
    # Load from bytes, strip color ('L'), and format for MobileNet ('RGB')
    img = Image.open(io.BytesIO(image_bytes)).convert('L').convert('RGB')
    img_tensor = preprocess(img).unsqueeze(0)
    
    with torch.no_grad():
        # Extract features and pool into a flat 1D vector (1280 dimensions)
        features = mobilenet.features(img_tensor)
        embedding = F.adaptive_avg_pool2d(features, (1, 1)).flatten(1)
        
    return embedding

def evaluate_texture(upload_bytes: bytes, reference_bytes: bytes) -> float:
    """
    Evaluates the structural similarity of two images using cosine distance[cite: 7].
    """
    emb_ref = get_mobilenet_embedding(reference_bytes)
    emb_up = get_mobilenet_embedding(upload_bytes)
    
    # Calculate Cosine Similarity[cite: 7]
    similarity = F.cosine_similarity(emb_up, emb_ref).item()
    
    return similarity