
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Opportunity = {
  id: number;
  businessId: number;
  status: string;
  relevanceScore: number | null;
  qualificationReason: string | null;
  discoveredAt: string;
  projectName: string;
  projectDescription: string | null;
  projectLocation: string | null;
  projectType: string | null;
  projectStage: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

export default function OpportunitiesPage() {
  const params = useParams();
  const businessId = String(params.businessId);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/opportunities`
      );

      const data: {
        opportunities?: Opportunity[];
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load opportunities.");
      }

      setOpportunities(data.opportunities || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  function formatDate(value: string) {
    if (!value) return "Date unavailable";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function statusColor(status: string) {
    switch (status.toUpperCase()) {
      case "QUALIFIED":
        return "bg-green-950 text-green-400";
      case "REJECTED":
        return "bg-red-950 text-red-400";
      case "DISCOVERED":
        return "bg-blue-950 text-blue-400";
      default:
        return "bg-slate-800 text-slate-300";
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-400 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-5 text-3xl font-bold">
              Opportunities
            </h1>

            <p className="mt-2 text-slate-400">
              Manage and review projects relevant to your business.
            </p>
          </div>

          <Link
            href={`/businesses/${businessId}/opportunities/new`}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
          >
            + Add Opportunity
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Total Opportunities
          </p>
          <p className="mt-1 text-3xl font-bold">
            {opportunities.length}
          </p>
        </div>

        {loading && (
          <p className="mt-8 text-center text-slate-400">
            Loading opportunities...
          </p>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-xl border border-red-800 bg-red-950 p-6 text-red-300">
            <p>{error}</p>
            <button
              onClick={fetchOpportunities}
              className="mt-4 rounded-lg bg-red-900 px-4 py-2"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && opportunities.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
            <div className="text-4xl">🏗️</div>
            <h2 className="mt-4 text-xl font-semibold">
              No opportunities yet
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Add your first project opportunity to start building your lead pipeline.
            </p>
            <Link
              href={`/businesses/${businessId}/opportunities/new`}
              className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
            >
              Add Your First Opportunity
            </Link>
          </div>
        )}

        {!loading && !error && opportunities.length > 0 && (
          <div className="mt-8 space-y-4">
            {opportunities.map((opportunity) => (
              <article
                key={opportunity.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold">
                      {opportunity.projectName}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {opportunity.projectDescription ||
                        "No project description available."}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(opportunity.status)}`}
                  >
                    {opportunity.status}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
                  {opportunity.projectLocation && (
                    <span>📍 {opportunity.projectLocation}</span>
                  )}
                  {opportunity.projectType && (
                    <span>🏗️ {opportunity.projectType}</span>
                  )}
                  {opportunity.projectStage && (
                    <span>Stage: {opportunity.projectStage}</span>
                  )}
                  <span>
                    Added: {formatDate(opportunity.discoveredAt)}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Relevance Score
                    </p>
                    <p className="mt-1 font-semibold text-blue-400">
                      {opportunity.relevanceScore != null
                        ? `${opportunity.relevanceScore}%`
                        : "Not evaluated"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {opportunity.sourceUrl && (
                      <a
                        href={opportunity.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-400 hover:text-white"
                      >
                        View Source ↗
                      </a>
                    )}

                    <Link
                      href={`/businesses/${businessId}/opportunities/${opportunity.id}`}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
