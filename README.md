# CommitCraft

Transform raw git commit history into a clean, professional changelog using AI. Point it at any public GitHub repository, pick a date range, and get structured release notes in seconds.

**Live demo:** [commit-craft-hazel.vercel.app](https://commit-craft-hazel.vercel.app)

![CommitCraft screenshot](https://i.imgur.com/placeholder.png)

---

## How it works

1. Enter a public GitHub repo URL and a date range
2. The backend fetches all commits from the GitHub REST API
3. Commit messages are sent to **Google Gemini 2.5 Flash**
4. Gemini groups and rewrites them into a structured changelog
5. Results are displayed with category badges and a Copy to Markdown button

---

## Tech stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 18, Vite, Tailwind CSS        |
| Backend  | Python 3.9+, FastAPI, httpx         |
| LLM      | Google Gemini 2.5 Flash             |
| Data     | GitHub REST API (no auth required)  |
| Hosting  | Frontend → Vercel, Backend → Railway |

---

## Project structure

```
commitcraft/
├── backend/
│   ├── main.py           # FastAPI app — /generate endpoint
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Full single-page UI
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

---

## Running locally

### Prerequisites

- Python 3.9+
- Node.js 18+
- A Google Gemini API key — get one free at [aistudio.google.com](https://aistudio.google.com)

### Backend

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Open .env and set GEMINI_API_KEY=your_key_here

# Start the server
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000` — interactive docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Deployment

### Backend → Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Set **Root Directory** to `backend`
4. Set **Start Command** to:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Add environment variables under the **Variables** tab:

   | Variable | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | Your Gemini API key |
   | `FRONTEND_URL` | Your Vercel app URL (add after step below) |

6. Deploy and copy the Railway URL (e.g. `https://commitcraft-production.up.railway.app`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite** (auto-detected)
4. Add environment variable:

   | Variable | Value |
   | --- | --- |
   | `VITE_API_URL` | Your Railway backend URL |

5. Deploy and copy the Vercel URL
6. Go back to Railway → Variables → set `FRONTEND_URL` to your Vercel URL → redeploy

---

## API reference

### `POST /generate`

Fetches commits from GitHub and returns an AI-generated changelog.

**Request**

```json
{
  "repo_url": "https://github.com/facebook/react",
  "since": "2026-03-01",
  "until": "2026-03-19"
}
```

**Response**

```json
{
  "repo": "facebook/react",
  "since": "2026-03-01",
  "until": "2026-03-19",
  "commit_count": 14,
  "changelog": {
    "summary": "This release focuses on performance improvements and internal refactoring.",
    "categories": {
      "features": ["Added support for concurrent rendering in edge cases"],
      "bug_fixes": ["Resolved hydration mismatch in server-rendered components"],
      "internal": ["Upgraded build tooling and cleaned up legacy test helpers"]
    }
  }
}
```

**Error responses**

| Status | Cause |
| --- | --- |
| `400` | Invalid URL or date format |
| `404` | Repository not found, or no commits in range |
| `429` | Gemini or GitHub API rate limit hit |
| `502` | Upstream API error |

### `GET /health`

Returns `{"status": "ok"}`. Used by Railway for health checks.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Google Gemini API key from [AI Studio](https://aistudio.google.com) |
| `FRONTEND_URL` | No | Your deployed frontend URL — added to CORS allow list |
| `GITHUB_TOKEN` | No | GitHub personal access token — raises rate limit from 60 to 5,000 req/hr |

### Frontend

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | No | Backend base URL (defaults to `http://localhost:8000`) |

---

## Notes on Gemini free tier

The free tier for `gemini-2.5-flash` allows 1,500 requests/day and resets at midnight Pacific time. If you hit the limit, you can either wait for the reset or enable billing in your [Google Cloud Console](https://console.cloud.google.com/billing) — at typical usage costs it's essentially free.
