import { useState, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function toMarkdown(repo, since, until, changelog) {
  const { summary, categories } = changelog;
  const categoryLabels = {
    features: "Features",
    bug_fixes: "Bug Fixes",
    performance: "Performance",
    breaking_changes: "Breaking Changes",
    internal: "Internal",
  };

  const lines = [
    `## Changelog — ${repo}`,
    `_${since} → ${until}_`,
    "",
    `**Summary:** ${summary}`,
  ];

  for (const [key, label] of Object.entries(categoryLabels)) {
    const entries = categories[key];
    if (!entries || entries.length === 0) continue;
    lines.push("", `### ${label}`);
    entries.forEach((e) => lines.push(`- ${e}`));
  }

  return lines.join("\n");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const CATEGORY_META = {
  features: { label: "Features", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  bug_fixes: { label: "Bug Fixes", badge: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-400" },
  breaking_changes: { label: "Breaking Changes", badge: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-400" },
  performance: { label: "Performance", badge: "bg-blue-500/15 text-blue-400 border-blue-500/30", dot: "bg-blue-400" },
  internal: { label: "Internal", badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", dot: "bg-zinc-400" },
};

function CategorySection({ categoryKey, entries }) {
  const meta = CATEGORY_META[categoryKey] || {
    label: categoryKey,
    badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    dot: "bg-zinc-400",
  };

  if (!entries || entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${meta.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>
      <ul className="space-y-2 pl-1">
        {entries.map((entry, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
            <span className="mt-2 w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
            <span className="leading-relaxed">{entry}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-all duration-150"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Markdown
        </>
      )}
    </button>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [since, setSince] = useState(daysAgoISO(30));
  const [until, setUntil] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      setResult(null);
      setLoading(true);

      try {
        const res = await fetch(`${API_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo_url: repoUrl, since, until }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.detail || "An unexpected error occurred.");
          return;
        }

        setResult(data);
      } catch (err) {
        setError("Could not reach the backend. Make sure it is running on http://localhost:8000.");
      } finally {
        setLoading(false);
      }
    },
    [repoUrl, since, until]
  );

  const categoryOrder = ["features", "bug_fixes", "performance", "breaking_changes", "internal"];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-500 font-medium tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Powered by Google Gemini
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            Commit<span className="text-zinc-500">Craft</span>
          </h1>
          <p className="text-zinc-500 text-base sm:text-lg leading-relaxed">
            Transform raw git commits into professional changelogs with AI.
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
              GitHub Repository
            </label>
            <input
              type="url"
              required
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                Since
              </label>
              <input
                type="date"
                required
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                Until
              </label>
              <input
                type="date"
                required
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 rounded-lg bg-white text-black font-semibold text-sm hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner />
                Analyzing commits…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Changelog
              </>
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-8 flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Meta bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span className="font-mono">{result.repo}</span>
                <span className="text-zinc-700">·</span>
                <span>{result.commit_count} commit{result.commit_count !== 1 ? "s" : ""}</span>
                <span className="text-zinc-700">·</span>
                <span>{result.since} → {result.until}</span>
              </div>
              <CopyButton
                text={toMarkdown(result.repo, result.since, result.until, result.changelog)}
              />
            </div>

            {/* Summary card */}
            <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Summary</p>
              <p className="text-sm text-zinc-200 leading-relaxed">{result.changelog.summary}</p>
            </div>

            {/* Category sections */}
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/60 space-y-6">
              {categoryOrder.map((key) => {
                const entries = result.changelog.categories?.[key];
                if (!entries || entries.length === 0) return null;
                return <CategorySection key={key} categoryKey={key} entries={entries} />;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-10 text-xs text-zinc-700">
        CommitCraft · AI-powered changelogs
      </footer>
    </div>
  );
}
