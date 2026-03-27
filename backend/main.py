import os
import json
import re
from datetime import datetime
from urllib.parse import urlparse

import httpx
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

app = FastAPI(title="CommitCraft API")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are a professional technical writer specializing in software changelogs. 
You will receive a list of raw git commit messages and must transform them into a clean, professional changelog.

Rules:
- Group changes into these categories: Features, Bug Fixes, Performance, Breaking Changes, Internal
- Rewrite cryptic or vague commit messages into clear plain English
- Ignore noise commits like "fix typo", "wip", "temp", "test", "merge branch"
- Combine related commits into a single changelog entry where appropriate
- Flag any breaking changes prominently
- If a category has no entries, omit it entirely
- Keep each entry concise, one sentence maximum

Return ONLY valid JSON in this exact format, no markdown, no preamble:
{
  "summary": "One sentence overview of this release",
  "categories": {
    "features": ["entry 1", "entry 2"],
    "bug_fixes": ["entry 1"],
    "performance": [],
    "breaking_changes": [],
    "internal": ["entry 1"]
  }
}"""


class GenerateRequest(BaseModel):
    repo_url: str
    since: str
    until: str


def parse_repo_url(repo_url: str) -> tuple[str, str]:
    """Extract owner and repo name from a GitHub URL."""
    parsed = urlparse(repo_url.strip())
    if parsed.netloc not in ("github.com", "www.github.com"):
        raise HTTPException(status_code=400, detail="URL must be a GitHub repository URL (github.com)")
    parts = parsed.path.strip("/").split("/")
    if len(parts) < 2 or not parts[0] or not parts[1]:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL format. Expected: https://github.com/owner/repo")
    owner = parts[0]
    repo = parts[1].removesuffix(".git")
    return owner, repo


async def fetch_commits(owner: str, repo: str, since: str, until: str) -> list[dict]:
    """Fetch commits from the GitHub REST API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits"
    params = {"since": f"{since}T00:00:00Z", "until": f"{until}T23:59:59Z", "per_page": 100}
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}

    github_token = os.getenv("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, params=params, headers=headers)

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Repository '{owner}/{repo}' not found or is private")
    if response.status_code == 403:
        raise HTTPException(status_code=429, detail="GitHub API rate limit exceeded. Try again in a few minutes.")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GitHub API returned an unexpected error (status {response.status_code})")

    return response.json()


def build_commit_list(commits: list[dict]) -> str:
    """Format commits into a plain-text list for the LLM."""
    lines = []
    for c in commits:
        sha = c.get("sha", "")[:7]
        message = c.get("commit", {}).get("message", "").split("\n")[0].strip()
        if message:
            lines.append(f"- [{sha}] {message}")
    return "\n".join(lines)


async def generate_changelog(commit_text: str) -> dict:
    """Send commit list to Gemini and parse the structured JSON response."""
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )

    try:
        response = model.generate_content(
            f"Here are the git commits to transform into a changelog:\n\n{commit_text}"
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")

    raw = response.text.strip()

    # Strip markdown code fences if the model wraps the output despite the mime type
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Gemini returned a malformed response. Please try again.")


@app.post("/generate")
async def generate(request: GenerateRequest):
    # Validate dates
    try:
        since_dt = datetime.strptime(request.since, "%Y-%m-%d")
        until_dt = datetime.strptime(request.until, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")

    if since_dt > until_dt:
        raise HTTPException(status_code=400, detail="'since' date must be before 'until' date")

    owner, repo = parse_repo_url(request.repo_url)
    commits = await fetch_commits(owner, repo, request.since, request.until)

    if not commits:
        raise HTTPException(
            status_code=404,
            detail=f"No commits found in '{owner}/{repo}' between {request.since} and {request.until}",
        )

    commit_text = build_commit_list(commits)
    changelog = await generate_changelog(commit_text)

    return {
        "repo": f"{owner}/{repo}",
        "since": request.since,
        "until": request.until,
        "commit_count": len(commits),
        "changelog": changelog,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
