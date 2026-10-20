# WARG AI Engine — Deployment Guide

This document covers deploying the AI Engine (FastAPI + PyTorch) to a container host 
so the production Express backend on Render can reach it.

---

## Why can't we run this on Render Free Tier?

The AI Engine loads **PyTorch + MobileSAM + MobileNetV2** at startup, consuming ~400-500 MB 
of RAM before serving a single request. Render's free tier gives 512 MB — any image 
processing request pushes it over the limit, causing an OOM kill and a **502 Bad Gateway**.

**Minimum requirement: 1 GB RAM. Recommended: 2 GB.**

---

## Required secret: `AI_KEY`

The container image sets `WARG_ENV=production`, which makes the service **refuse to boot**
when `AI_KEY` is missing — previously it silently authenticated the Express backend with a
hard-coded fallback key. Generate a strong random value (e.g. `openssl rand -hex 32`) and set
the **same value** on both sides:

- **AI engine (Lightsail):** container environment variable `AI_KEY`
- **Express backend (Render):** environment variable `AI_KEY`

Local development is unaffected: without `WARG_ENV=production`, both sides fall back to the
shared dev key.

---

## Model weights (`weights/mobile_sam.pt`)

`mobile_sam.pt` (~40 MB) is no longer committed to git — download it before building the
Docker image or running locally. Without it, the SAM endpoint reports `"sam": false` on
`/health`:

```bash
cd ai-engine
curl -L -o weights/mobile_sam.pt https://github.com/ChaoningZhang/MobileSAM/raw/master/weights/mobile_sam.pt
```

---

## Texture Matcher Tuning

Texture matching uses MobileNetV2 features with lighting normalization and
center-crop scales. The pass threshold remains 0.50. These optional environment
variables can be set on the AI engine to compare configurations:

| Variable | Default | Rollback / meaning |
|----------|---------|--------------------|
| `TEXTURE_CLAHE_CLIP` | `2.0` | Set to `0` to disable local contrast normalization |
| `TEXTURE_CLAHE_GRID` | `8` | CLAHE tile grid size |
| `TEXTURE_BLUR_KERNEL` | `3` | Odd Gaussian blur size; set to `0` to disable |
| `TEXTURE_TAP_LAYER` | unset | Full feature trunk; values `2`-`18` select an earlier layer |
| `TEXTURE_PYRAMID_SCALES` | `1.0,0.75,0.5,0.25` | Center-crop fractions; set to `1.0` for single-scale matching |

Use real positive and negative camera samples to compare configurations before
changing production settings. For example, from `ai-engine`:

```powershell
.\venv\Scripts\python.exe .\scripts\calibrate_texture.py `
  --reference .\reference.jpg `
  --matches .\samples\matches `
  --non-matches .\samples\non-matches
```

The report shows the score range and the proportion of each group meeting the
unchanged 0.50 pass threshold. A higher match score is only an improvement if
non-matches do not also become more likely to pass.

---

## Deploying to AWS Lightsail (Container Service)

### Prerequisites
- An AWS account with Lightsail access
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed
- Docker installed locally

### Step-by-step

```bash
# 1. Build the Docker image locally
cd ai-engine
docker build -t warg-ai-engine .

# 2. Create a Lightsail container service (Micro = 1 GB RAM)
aws lightsail create-container-service --service-name warg-ai-engine --power micro --scale 1 --region eu-west-1

# 3. Push the image to Lightsail
aws lightsail push-container-image --service-name warg-ai-engine --label warg-ai --image warg-ai-engine:latest --region eu-west-1

# 4. Create a deployment (replace YOUR_IMAGE_TAG with the output from step 3, e.g. :warg-ai-engine.warg-ai.1)
aws lightsail create-container-service-deployment --service-name warg-ai-engine --containers "{\"warg-ai\":{\"image\":\"YOUR_IMAGE_TAG\",\"ports\":{\"8080\":\"HTTP\"},\"environment\":{\"PORT\":\"8080\",\"AI_KEY\":\"YOUR_AI_KEY\"}}}" --public-endpoint "{\"containerName\":\"warg-ai\",\"containerPort\":8080}" --region eu-west-1

# 5. Get the public URL
aws lightsail get-container-services --service-name warg-ai-engine --region eu-west-1
```

---

## After Deploying: Connect Express to the AI Engine

Once you have the AI Engine URL from AWS, update the **Render dashboard**:

1. Go to [Render Dashboard](https://dashboard.render.com) → your backend service
2. Navigate to **Environment** → **Environment Variables**
3. Set (or update):
   ```
   AI_SERVICE_URL = https://your-ai-engine-url.com
   ```
4. Click **Save Changes** — Render will redeploy automatically.

### Verify it works
```bash
# Test the health endpoint
curl https://your-ai-engine-url.com/health

# Expected response:
# {"status":"ok","models":{"sam":true,"mobilenet":true,"hsv":true,"sift":true,"symmetry":true}}
```

---

## Local Development (unchanged)

For local development, nothing changes. Run the AI engine as before:
(Note: You will need the tesseract binary installed locally. e.g. `brew install tesseract` on macOS or `apt install tesseract-ocr` on Linux)

```bash
cd ai-engine
uvicorn main:app --reload --port 8000
```

And the Express server will use `AI_SERVICE_URL=http://localhost:8000` from your local `.env`.
