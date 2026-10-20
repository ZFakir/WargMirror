import io
import math
import os
import warnings

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import models, transforms


def _read_float_env(name: str, default: float, minimum: float = 0.0) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        parsed = float(value)
        if not math.isfinite(parsed) or parsed < minimum:
            raise ValueError
        return parsed
    except ValueError:
        warnings.warn(f"Invalid {name}={value!r}; using {default}.", RuntimeWarning)
        return default


def _read_int_env(
    name: str,
    default: int,
    minimum: int,
    maximum: int | None = None,
    *,
    odd: bool = False,
) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        parsed = int(value)
        if parsed < minimum or (maximum is not None and parsed > maximum):
            raise ValueError
        if odd and parsed != 0 and parsed % 2 == 0:
            raise ValueError
        return parsed
    except ValueError:
        warnings.warn(f"Invalid {name}={value!r}; using {default}.", RuntimeWarning)
        return default


def _read_pyramid_scales() -> tuple[float, ...]:
    value = os.getenv("TEXTURE_PYRAMID_SCALES", "1.0,0.75,0.5,0.25")
    if not value.strip():
        return (1.0,)
    try:
        scales = tuple(float(item.strip()) for item in value.split(","))
        if not scales or any(not 0.0 < scale <= 1.0 for scale in scales):
            raise ValueError
        if 1.0 not in scales:
            scales = (1.0, *scales)
        return tuple(dict.fromkeys(scales))
    except ValueError:
        warnings.warn(
            f"Invalid TEXTURE_PYRAMID_SCALES={value!r}; using the default scale pyramid.",
            RuntimeWarning,
        )
        return (1.0, 0.75, 0.5, 0.25)


def _read_tap_layer() -> int:
    value = os.getenv("TEXTURE_TAP_LAYER")
    if value is None or value == "0":
        return 0
    try:
        parsed = int(value)
        if not 2 <= parsed <= 18:
            raise ValueError
        return parsed
    except ValueError:
        warnings.warn(
            f"Invalid TEXTURE_TAP_LAYER={value!r}; using the full feature trunk.",
            RuntimeWarning,
        )
        return 0


TEXTURE_CLAHE_CLIP = _read_float_env("TEXTURE_CLAHE_CLIP", 2.0)
TEXTURE_CLAHE_GRID = _read_int_env("TEXTURE_CLAHE_GRID", 8, 1)
TEXTURE_BLUR_KERNEL = _read_int_env(
    "TEXTURE_BLUR_KERNEL", 3, 0, odd=True
)
TEXTURE_TAP_LAYER = _read_tap_layer()
TEXTURE_PYRAMID_SCALES = _read_pyramid_scales()
MATCH_THRESHOLD = 0.50  # Keep in sync with the texture pass threshold in main.py.

# Suppress torchvision warnings in production logs
warnings.filterwarnings("ignore", category=UserWarning)

# Load MobileNet pre-trained on ImageNet
weights = models.MobileNet_V2_Weights.DEFAULT
mobilenet = models.mobilenet_v2(weights=weights)
mobilenet.eval()
feature_extractor = (
    mobilenet.features
    if TEXTURE_TAP_LAYER == 0
    else mobilenet.features[:TEXTURE_TAP_LAYER]
)

# Standard ImageNet preprocessing pipeline
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def _prepare_grayscale(image_bytes: bytes) -> Image.Image:
    """Decode and standardize lighting/contrast before feature extraction."""
    with Image.open(io.BytesIO(image_bytes)) as source:
        gray = np.asarray(source.convert("L"))

    if TEXTURE_CLAHE_CLIP > 0:
        clahe = cv2.createCLAHE(
            clipLimit=TEXTURE_CLAHE_CLIP,
            tileGridSize=(TEXTURE_CLAHE_GRID, TEXTURE_CLAHE_GRID),
        )
        gray = clahe.apply(gray)
    if TEXTURE_BLUR_KERNEL > 0:
        gray = cv2.GaussianBlur(gray, (TEXTURE_BLUR_KERNEL, TEXTURE_BLUR_KERNEL), 0)
    return Image.fromarray(gray).convert("RGB")


def _center_crop(image: Image.Image, scale: float) -> Image.Image:
    if scale == 1.0:
        return image
    width, height = image.size
    crop_width = max(1, round(width * scale))
    crop_height = max(1, round(height * scale))
    left = (width - crop_width) // 2
    top = (height - crop_height) // 2
    return image.crop((left, top, left + crop_width, top + crop_height))


def _embed_image(image: Image.Image) -> torch.Tensor:
    img_tensor = preprocess(image).unsqueeze(0)
    with torch.no_grad():
        features = feature_extractor(img_tensor)
        return F.adaptive_avg_pool2d(features, (1, 1)).flatten(1)


def get_mobilenet_embedding(image_bytes: bytes) -> torch.Tensor:
    """
    Reads an image, standardizes local contrast, and extracts its MobileNet
    feature vector. Set TEXTURE_TAP_LAYER to 2-18 to experiment with earlier
    feature layers; the default 0 uses the full MobileNet feature trunk.
    """
    return _embed_image(_prepare_grayscale(image_bytes))


def evaluate_texture(upload_bytes: bytes, reference_bytes: bytes) -> float:
    """
    Compare normalized texture features across centered framing scales.

    The scale variants are crops, not resized full images, so the existing
    Resize(256) preprocessing does not erase the scale change.
    """
    reference_embedding = get_mobilenet_embedding(reference_bytes)
    upload_image = _prepare_grayscale(upload_bytes)

    scores = []
    for scale in TEXTURE_PYRAMID_SCALES:
        upload_embedding = _embed_image(_center_crop(upload_image, scale))
        scores.append(F.cosine_similarity(upload_embedding, reference_embedding).item())

    return max(scores)
