import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { getWeeklySummary, generateWeeklySummary } from "./api";

function formatTimestamp(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WeeklySummaryCard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getWeeklySummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate() {
    setError("");
    setGenerating(true);
    try {
      const data = await generateWeeklySummary();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-brand-700">
        <Sparkles size={18} />
        <h3 className="text-lg font-bold text-brand-900">This week in review</h3>
      </div>

      {loading && <p className="mt-3 text-sm text-brand-700">Loading...</p>}

      {!loading && summary && (
        <>
          <p className="mt-3 text-brand-900">{summary.summary_text}</p>
          <p className="mt-3 text-xs text-brand-700">
            {summary.generated_by_ai ? "AI-generated" : "Quick stats"} ·{" "}
            {formatTimestamp(summary.created_at)}
          </p>
        </>
      )}

      {!loading && !summary && (
        <>
          <p className="mt-3 text-sm text-brand-700">
            No summary yet for this week.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-4 rounded-xl bg-gradient-to-r from-brand-700 to-brand-900
                       px-4 py-2 text-sm font-semibold text-brand-50 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate summary"}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
