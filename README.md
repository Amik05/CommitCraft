# CommitCraft

AI-powered changelog generator. Point it at any public GitHub repository, pick a date range, and get a clean professional changelog in seconds — powered by Google Gemini.

## Stack

| Layer    | Technology                   |
| -------- | ---------------------------- |
| Frontend | React 18, Vite, Tailwind CSS |
| Backend  | Python, FastAPI              |
| LLM      | Google Gemini 2.0 Flash      |
| Data     | GitHub REST API              |

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API key (free tier works)

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Swagger docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Reference

### `POST /generate`

Generates a changelog from commits in a GitHub repository.

**Request body:**

```json
{
  "repo_url": "https://github.com/facebook/react",
  "since": "2026-03-01",
  "until": "2026-03-19"
}
```

**Response:**

```json
{
  "repo": "facebook/react",
  "since": "2026-03-01",
  "until": "2026-03-19",
  "commit_count": 14,
  "changelog": {
    "summary": "One sentence overview of this release",
    "categories": {
      "features": ["entry 1"],
      "bug_fixes": ["entry 1"],
      "internal": ["entry 1"]
    }
  }
}
```

### `GET /health`

Returns `{"status": "ok"}`. Used by Railway for health checks.

---

## Deployment

### Backend → Railway

1. Push this repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Select the repo and set the **Root Directory** to `backend`.
4. Add environment variables in the Railway dashboard:
   - `GEMINI_API_KEY` — your Gemini API key
   - `FRONTEND_URL` — your Vercel app URL (after deploying frontend, e.g. `https://commitcraft.vercel.app`)
5. Railway auto-detects `requirements.txt`. Set the **Start Command** to:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
6. Deploy. Copy the generated Railway URL (e.g. `https://commitcraft-production.up.railway.app`).

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo.
2. Set the **Root Directory** to `frontend`.
3. Vercel auto-detects Vite. Framework preset: **Vite**.
4. Add environment variable:
   - `VITE_API_URL` — your Railway backend URL (e.g. `https://commitcraft-production.up.railway.app`)
5. Deploy.
6. Copy the Vercel URL, then go back to Railway and update `FRONTEND_URL` to this value.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Required | Description                                      |
| -------------- | -------- | ------------------------------------------------ |
| `GEMINI_API_KEY` | Yes    | Google Gemini API key from AI Studio             |
| `GITHUB_TOKEN` | No       | GitHub PAT — increases rate limit from 60 → 5000 req/hr |
| `FRONTEND_URL` | No       | Your Vercel app URL for CORS (default: localhost) |

### Frontend

| Variable       | Required | Description                        |
| -------------- | -------- | ---------------------------------- |
| `VITE_API_URL` | No       | Backend URL (default: localhost:8000) |
