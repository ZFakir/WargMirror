import argparse
import io
import statistics
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vision.mobilenet_extractor import (
    MATCH_THRESHOLD,
    TEXTURE_BLUR_KERNEL,
    TEXTURE_CLAHE_CLIP,
    TEXTURE_CLAHE_GRID,
    TEXTURE_PYRAMID_SCALES,
    TEXTURE_TAP_LAYER,
    evaluate_texture,
)


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def _image_files(directory: Path) -> list[Path]:
    if not directory.is_dir():
        raise ValueError(f"Image directory does not exist: {directory}")
    return sorted(
        path for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def _validate_image(path: Path) -> bytes:
    image_bytes = path.read_bytes()
    with Image.open(io.BytesIO(image_bytes)) as image:
        image.verify()
    return image_bytes


def _summarize(label: str, scores: list[tuple[str, float]]) -> None:
    if not scores:
        print(f"{label}: no supported images found")
        return
    values = [score for _, score in scores]
    passed = sum(score >= MATCH_THRESHOLD for score in values)
    print(
        f"{label}: n={len(values)}, min={min(values):.4f}, "
        f"median={statistics.median(values):.4f}, max={max(values):.4f}, "
        f">={MATCH_THRESHOLD:.2f}={passed}/{len(values)} "
        f"({passed / len(values):.1%})"
    )
    for name, score in scores:
        print(f"  {score:.4f}  {name}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Score texture-match and non-match camera samples against one reference."
    )
    parser.add_argument("--reference", required=True, type=Path)
    parser.add_argument("--matches", required=True, type=Path)
    parser.add_argument("--non-matches", required=True, type=Path)
    args = parser.parse_args()

    reference_bytes = _validate_image(args.reference)
    match_files = _image_files(args.matches)
    non_match_files = _image_files(args.non_matches)
    if not match_files:
        parser.error(f"No supported images found in matches directory: {args.matches}")
    if not non_match_files:
        parser.error(
            f"No supported images found in non-matches directory: {args.non_matches}"
        )

    print(
        "Configuration: "
        f"CLAHE clip={TEXTURE_CLAHE_CLIP}, grid={TEXTURE_CLAHE_GRID}, "
        f"blur={TEXTURE_BLUR_KERNEL}, tap={TEXTURE_TAP_LAYER or 'full'}, "
        f"scales={','.join(str(scale) for scale in TEXTURE_PYRAMID_SCALES)}"
    )

    for label, paths in (("Matches", match_files), ("Non-matches", non_match_files)):
        scores = []
        for path in paths:
            score = evaluate_texture(_validate_image(path), reference_bytes)
            scores.append((path.name, score))
        _summarize(label, scores)


if __name__ == "__main__":
    main()
