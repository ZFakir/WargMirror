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

## Option A: Google Cloud Run (Free Tier) — Recommended

### Prerequisites
- A Google Cloud account (students: check for [Google Cloud for Education](https://cloud.google.com/edu/) credits)
- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed

### Free Tier Allowance (per month)
| Resource         | Free Quota                          |
|------------------|-------------------------------------|
| CPU              | 180,000 vCPU-seconds (~50 hrs)      |
| Memory           | 360,000 GiB-seconds (~100 GB-hrs)   |
| Requests         | 2 million                           |
| Container builds | 120 build-minutes                   |

### Step-by-step

```bash
# 1. Authenticate and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# 3. Navigate to the ai-engine directory
cd ai-engine

# 4. Deploy directly from source (Cloud Build will use the Dockerfile)
gcloud run deploy warg-ai-engine \
  --source . \
  --region africa-south1 \
  --memory 2Gi \
  --cpu 1 \
  --timeout 120 \
  --allow-unauthenticated \
  --port 8080

# 5. Note the Service URL printed at the end (e.g. https://warg-ai-engine-xxxxx-bq.a.run.app)
```

> **Note on cold starts:** Cloud Run scales to zero when idle. The first request after 
> inactivity takes ~10-20 seconds while PyTorch loads. For a university demo this is 
> acceptable. To eliminate cold starts, add `--min-instances 1` (costs ~$5-10/month).

---

## Option B: AWS Lightsail (Container Service)

### Prerequisites
- An AWS account with Lightsail access
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed
- Docker installed locally

### Step-by-step

```bash
# 1. Build the Docker image locally
cd ai-engine
docker build -t warg-ai-engine .

# 2. Create a Lightsail container service (Micro = 1 GB RAM, $10/month)
aws lightsail create-container-service \
  --service-name warg-ai-engine \
  --power micro \
  --scale 1

# 3. Push the image to Lightsail
aws lightsail push-container-image \
  --service-name warg-ai-engine \
  --label warg-ai \
  --image warg-ai-engine:latest

# 4. Create a deployment (replace IMAGE_TAG with the output from step 3)
aws lightsail create-container-service-deployment \
  --service-name warg-ai-engine \
  --containers '{
    "warg-ai": {
      "image": "IMAGE_TAG",
      "ports": {"8080": "HTTP"},
      "environment": {"PORT": "8080"}
    }
  }' \
  --public-endpoint '{"containerName": "warg-ai", "containerPort": 8080}'

# 5. Get the public URL
aws lightsail get-container-services --service-name warg-ai-engine
```

---

## After Deploying: Connect Express to the AI Engine

Once you have the AI Engine URL (from either platform), update the **Render dashboard**:

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

```bash
cd ai-engine
uvicorn main:app --reload --port 8000
```

And the Express server will use `AI_SERVICE_URL=http://localhost:8000` from your local `.env`.
