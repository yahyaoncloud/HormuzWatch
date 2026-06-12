# Render Deployment Guide

To deploy the HormuzWatch MVP on Render using two separate free-tier accounts, follow these steps.

## Prerequisites
1. **GitHub Repository**: Ensure all your latest code (including the `render-go.yaml` and `render-ml.yaml` files) is pushed to your GitHub repository.
2. **Supabase Database**: Ensure your PostgreSQL database is active and you have your `DATABASE_URL` and `SUPABASE_URL` ready.

---

## Account A: Go Backend

### Step 1: Link GitHub & Blueprint
1. Log into your **first** Render account.
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render-go.yaml` file in the root directory.

### Step 2: Configure Environment Variables
The blueprint will prompt you to fill in the missing environment variables that cannot be hardcoded for security reasons:
*   `DATABASE_URL`: Your Supabase connection string (e.g., `postgresql://postgres:[PASSWORD]@...`).
*   `SUPABASE_URL`: Your Supabase API URL (e.g., `https://dipuwvlnauqkjrqcfeqw.supabase.co`).
*   `ML_INFERENCE_URL`: Leave this blank for now. We will fill it in after deploying Account B.

### Step 3: Deploy
1. Click **Apply**.
2. Render will spin up the Go Web Service!

---

## Account B: Python ML Inference

### Step 1: Link GitHub
1. Log into your **second** Render account.
2. Click **New +** and select **Web Service**.
3. Connect the same GitHub repository.

### Step 2: Configure Settings
Since Render expects Blueprints in the root, and we used `render-go.yaml` for Account A, we will configure this one manually (or use the blueprint by renaming it to `render.yaml` on a specific branch). Manually:
*   **Name**: `hormuzwatch-ml`
*   **Root Directory**: `ml-inference`
*   **Environment**: `Python 3`
*   **Build Command**: `pip install -r requirements.txt`
*   **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
*   **Environment Variables**:
    *   `PYTHON_VERSION` = `3.11.0`

### Step 3: Deploy
1. Click **Create Web Service**.
2. Wait for the Python application to build and deploy.
3. Once live, copy the URL provided by Render (e.g., `https://hormuzwatch-ml.onrender.com`).

---

## Final Step: Link the Services

1. Go back to **Account A** in Render.
2. Navigate to the `hormuzwatch-server` (Go) Web Service settings.
3. Go to **Environment**.
4. Update the `ML_INFERENCE_URL` variable with the URL you copied from Account B (e.g., `https://hormuzwatch-ml.onrender.com`).
5. Render will restart the Go server, and your intelligence pipeline will be fully connected!
