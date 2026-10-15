# MasalNest — Free-Tier Deployment Guide

> Deploy MasalNest with **zero cost** using Vercel, Render, and Neon PostgreSQL free tiers.

---

## Deployment Stack

| Component        | Service             | Tier   |
|------------------|---------------------|--------|
| Frontend (Vite)  | Vercel              | Free   |
| Backend (FastAPI)| Render              | Free   |
| Database         | Neon PostgreSQL     | Free   |
| AI Provider      | Groq (existing)     | Free   |

---

## 1. Local Development (SQLite — No Changes Needed)

The default configuration uses SQLite for local development:

```bash
# Backend
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt

# Copy and configure environment
copy .env.example .env         # Windows
# cp .env.example .env         # macOS/Linux

# Add your Groq API key to .env
# GROQ_API_KEY="gsk_your_actual_key"

# Run the backend
uvicorn app.main:app --reload --port 8000

# (Optional) Seed sample data
python seed.py
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` (frontend) and `http://localhost:8000` (backend).

---

## 2. Create a Free Neon PostgreSQL Database

1. Go to [https://neon.tech](https://neon.tech) and sign up (free, no credit card).
2. Click **Create a project** → choose a region close to your Render deployment.
3. Once created, go to **Dashboard → Connection Details**.
4. Copy the **connection string**. It will look like:

   ```
   postgresql://neondb_owner:abc123@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

> [!IMPORTANT]
> The MasalNest backend automatically converts `postgresql://` to `postgresql+asyncpg://` for SQLAlchemy. You do NOT need to modify the URL manually.

### Neon Free Tier Limits (as of 2024)

| Resource             | Free Tier Limit          |
|----------------------|--------------------------|
| Storage              | 512 MB                   |
| Compute hours/month  | 191.9 hours              |
| Branches             | 10                       |
| Databases per branch | Unlimited                |

> [!NOTE]
> Neon's free tier includes auto-suspend after 5 minutes of inactivity. The first request after suspension may take 1-3 seconds while the compute restarts.

---

## 3. Deploy the Backend on Render

### 3.1 Create a Render Web Service

1. Go to [https://render.com](https://render.com) and sign up (free).
2. Click **New → Web Service**.
3. Connect your GitHub/GitLab repository.
4. Configure the service:

   | Setting          | Value                                         |
   |------------------|-----------------------------------------------|
   | **Name**         | `masalnest-api`                               |
   | **Root Directory**| `backend`                                    |
   | **Runtime**      | `Python`                                      |
   | **Build Command**| `pip install -r requirements.txt`             |
   | **Start Command**| `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | **Plan**         | Free                                          |

### 3.2 Set Environment Variables

In the Render dashboard → **Environment** tab, add these variables:

| Variable              | Value                                                  |
|-----------------------|--------------------------------------------------------|
| `DATABASE_URL`        | Your Neon connection string (from step 2)              |
| `GROQ_API_KEY`        | Your Groq API key                                      |
| `GROQ_MODEL_NAME`     | `meta-llama/llama-4-scout-17b-16e-instruct` (or your preferred model) |
| `CORS_ORIGINS`        | `["https://your-app.vercel.app"]`                      |
| `DEBUG`               | `False`                                                |
| `PYTHON_VERSION`      | `3.12.0` (optional, ensures consistent runtime)        |

> [!WARNING]
> Never commit real values for `DATABASE_URL` or `GROQ_API_KEY` to source control. The `.gitignore` already excludes `.env` files.

### 3.3 Verify the Backend

After deployment completes, visit:
- `https://masalnest-api.onrender.com/health` — should return `{"status": "healthy", ...}`
- `https://masalnest-api.onrender.com/docs` — interactive API documentation

### Render Free Tier Limits

| Resource              | Free Tier Limit                                   |
|-----------------------|---------------------------------------------------|
| Web services          | 1 (with 750 free hours/month across all services) |
| RAM                   | 512 MB                                            |
| Auto-sleep            | After 15 minutes of inactivity                    |
| Cold start            | ~30-60 seconds after sleep                        |

> [!NOTE]
> Render free tier services spin down after inactivity. The first request after sleep will be slow while the service restarts. This is normal for free-tier hosting.

---

## 4. Deploy the Frontend on Vercel

### 4.1 Create a Vercel Project

1. Go to [https://vercel.com](https://vercel.com) and sign up (free).
2. Click **Add New → Project** and import your repository.
3. Configure the project:

   | Setting              | Value         |
   |----------------------|---------------|
   | **Root Directory**   | `frontend`    |
   | **Framework Preset** | `Vite`        |
   | **Build Command**    | `npm run build` |
   | **Output Directory** | `dist`        |

### 4.2 Set Environment Variables

In Vercel → **Settings → Environment Variables**:

| Variable              | Value                                               |
|-----------------------|-----------------------------------------------------|
| `VITE_API_BASE_URL`   | `https://masalnest-api.onrender.com/api/v1`         |

> [!IMPORTANT]
> Vite environment variables must be prefixed with `VITE_` to be available in the browser bundle. The frontend code at `src/api.js` already reads `VITE_API_BASE_URL`.

### 4.3 Verify the Frontend

Visit your Vercel URL (e.g., `https://your-app.vercel.app`). The dashboard should load and connect to the backend API.

---

## 5. Configure CORS

After both services are deployed, ensure the backend's `CORS_ORIGINS` includes your Vercel frontend URL.

In Render environment variables:
```
CORS_ORIGINS=["https://your-app.vercel.app"]
```

The backend already extends CORS with localhost origins for development, so this only needs your production frontend URL.

---

## 6. Seed the Production Database (Optional)

To populate sample data on the production database:

1. Clone the repo locally.
2. Set `DATABASE_URL` in your local `backend/.env` to the Neon connection string.
3. Run:
   ```bash
   cd backend
   python seed.py
   ```

The seed script is idempotent — running it multiple times will not create duplicate records.

> [!CAUTION]
> When running locally against the production database, be careful not to accidentally delete or modify real data. Switch `DATABASE_URL` back to SQLite after seeding.

---

## 7. Testing the Deployed Application

### Quick Smoke Test

1. **Health check**: `GET https://masalnest-api.onrender.com/health`
2. **Create a lead**: Use the frontend form or the API at `/docs`
3. **Analyze a lead**: Click "Analyze" on any lead in the dashboard
4. **Chat with LeadPilot**: Open a lead and use the chat interface
5. **Follow-up tasks**: Create and complete tasks from the lead detail page

### Existing Backend Tests (Local, SQLite)

```bash
cd backend
.\venv\Scripts\activate
pytest -v
```

These tests run against in-memory SQLite and verify all application logic. They do not require a PostgreSQL connection.

> [!NOTE]
> The existing test suite validates application logic using in-memory SQLite. Full PostgreSQL integration testing requires a real Neon connection and is recommended as a manual verification step after deployment.

---

## 8. Environment Variables Reference

| Variable               | Required | Default                                   | Description                          |
|------------------------|----------|-------------------------------------------|--------------------------------------|
| `DATABASE_URL`         | No       | `sqlite+aiosqlite:///./masal_ai.db`       | Database connection string           |
| `GROQ_API_KEY`         | Yes*     | (empty)                                   | Groq API key for AI features         |
| `GROQ_MODEL_NAME`      | No       | `openai/gpt-oss-120b`                     | LLM model name                       |
| `GROQ_TIMEOUT_SECONDS` | No       | `30`                                      | LLM request timeout                  |
| `GROQ_MAX_RETRIES`     | No       | `2`                                       | LLM retry count                      |
| `CORS_ORIGINS`         | No       | `["http://localhost:5173", ...]`           | Allowed CORS origins (JSON array)    |
| `DEBUG`                | No       | `False`                                   | Enable debug logging and SQL echo    |
| `APP_NAME`             | No       | `MasalNest`                               | Application display name             |
| `SCORE_HOT_THRESHOLD`  | No       | `70`                                      | Score threshold for "hot" leads      |
| `SCORE_WARM_THRESHOLD` | No       | `40`                                      | Score threshold for "warm" leads     |

\* Required for AI analysis, chat, and extraction features. Lead CRUD and scoring work without it.

---

## 9. Known Free-Tier Limitations

### Render Free Tier
- **Cold starts**: Services sleep after 15 minutes of inactivity. First request after sleep takes ~30-60 seconds.
- **Build limits**: 750 free hours/month shared across all services.
- **No persistent disk**: Use Neon for all persistent data (already configured).

### Neon Free Tier
- **Auto-suspend**: Compute pauses after 5 minutes of inactivity. First query after pause takes 1-3 seconds.
- **Storage**: 512 MB limit. MasalNest's schema is lightweight; this is sufficient for hundreds of leads.
- **Policy changes**: Free tier terms may change. Monitor [neon.tech/pricing](https://neon.tech/pricing) for updates.

### Vercel Free Tier
- **Bandwidth**: 100 GB/month.
- **Serverless functions**: Not used (MasalNest frontend is a static Vite build).
- **Commercial use**: Vercel's free tier is for personal/hobby projects. Review their terms for commercial deployments.

### Combined Cold Start Latency
When both Render and Neon have slept, the first request may take up to 60+ seconds (Render boot + Neon wake). Subsequent requests will be fast. For always-on behavior, paid tiers are required.

---

## 10. Troubleshooting

| Issue                                  | Solution                                                    |
|----------------------------------------|-------------------------------------------------------------|
| Backend returns 500 on first request   | Wait for Render cold start to complete (~30-60s)            |
| "relation does not exist" error        | Tables are created on startup; ensure the service fully started |
| CORS errors in browser console         | Verify `CORS_ORIGINS` includes your exact Vercel URL        |
| "could not connect to server"          | Check Neon project is active and `DATABASE_URL` is correct  |
| AI features return errors              | Verify `GROQ_API_KEY` is set and valid                      |
| Frontend shows "Network Error"         | Verify `VITE_API_BASE_URL` points to your Render URL        |
